#!/bin/bash

# Sports Betting Platform Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environments: production, staging, development
# Actions: full, update, rollback

set -e

ENVIRONMENT="${1:-staging}"
ACTION="${2:-full}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as sportsbet user (or root for initial setup)
check_permissions() {
    if [[ "$ENVIRONMENT" == "production" && "$EUID" -ne 0 && "$USER" != "sportsbet" ]]; then
        log_error "Production deployment must be run as root or sportsbet user"
        exit 1
    fi
}

# Load environment-specific configuration
load_environment_config() {
    local config_file="$PROJECT_ROOT/config.${ENVIRONMENT}.env"

    if [[ ! -f "$config_file" ]]; then
        log_error "Environment configuration file not found: $config_file"
        log_error "Please create $config_file based on the template"
        exit 1
    fi

    log_info "Loading $ENVIRONMENT environment configuration"

    # Export all variables from config file
    set -a
    source "$config_file"
    set +a

    # Validate critical variables
    if [[ -z "$DATABASE_URL" ]]; then
        log_error "DATABASE_URL not set in configuration"
        exit 1
    fi

    if [[ -z "$SECRET_KEY" ]]; then
        log_error "SECRET_KEY not set in configuration"
        exit 1
    fi
}

# Database operations
setup_database() {
    log_info "Setting up database for $ENVIRONMENT"

    # Extract database connection details
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

    # Test database connection
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Database connection failed"
        exit 1
    fi

    # Run migrations
    log_info "Running database migrations"
    cd "$PROJECT_ROOT"
    if [[ "$USER" == "sportsbet" ]]; then
        ./venv/bin/alembic upgrade head
    else
        sudo -u sportsbet ./venv/bin/alembic upgrade head
    fi

    log_success "Database setup completed"
}

# Application deployment
deploy_application() {
    log_info "Deploying application for $ENVIRONMENT"

    # Create necessary directories
    sudo mkdir -p /opt/sportsbet/{backend,frontend,logs,backups}
    sudo chown -R sportsbet:sportsbet /opt/sportsbet

    # Copy backend code
    log_info "Copying backend code"
    sudo rsync -av --delete --exclude='.git' --exclude='__pycache__' \
        "$PROJECT_ROOT/" /opt/sportsbet/backend/

    # Setup Python virtual environment
    log_info "Setting up Python environment"
    cd /opt/sportsbet/backend
    sudo -u sportsbet python3 -m venv venv
    sudo -u sportsbet ./venv/bin/pip install --upgrade pip
    sudo -u sportsbet ./venv/bin/pip install -r requirements.txt

    # Copy environment configuration
    log_info "Installing environment configuration"
    sudo mkdir -p /etc/sportsbet
    sudo cp "$PROJECT_ROOT/config.${ENVIRONMENT}.env" /etc/sportsbet/env
    sudo chmod 600 /etc/sportsbet/env
    sudo chown sportsbet:sportsbet /etc/sportsbet/env

    log_success "Application deployment completed"
}

# Service management
manage_services() {
    local action="$1"

    log_info "$action services for $ENVIRONMENT"

    # Install systemd services if not already installed
    if [[ ! -f "/etc/systemd/system/sportsbet-api.service" ]]; then
        log_info "Installing systemd services"
        sudo cp "$PROJECT_ROOT/systemd/"*.service /etc/systemd/system/
        sudo cp "$PROJECT_ROOT/systemd/"*.timer /etc/systemd/system/
        sudo systemctl daemon-reload
    fi

    # Environment-specific service configuration
    if [[ "$ENVIRONMENT" == "development" ]]; then
        # Disable timers in development
        sudo systemctl disable sportsbet-reconciliation.timer 2>/dev/null || true
    else
        # Enable timers in staging/production
        sudo systemctl enable sportsbet-reconciliation.timer 2>/dev/null || true
    fi

    case "$action" in
        "start")
            sudo ./opt/sportsbet/backend/scripts/manage_services.sh start all
            ;;
        "stop")
            sudo ./opt/sportsbet/backend/scripts/manage_services.sh stop all
            ;;
        "restart")
            sudo ./opt/sportsbet/backend/scripts/manage_services.sh restart all
            ;;
    esac

    log_success "Service management completed"
}

# Nginx configuration
setup_nginx() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_warn "Skipping Nginx setup for development environment"
        return
    fi

    log_info "Setting up Nginx for $ENVIRONMENT"

    # Install nginx config
    sudo cp "$PROJECT_ROOT/nginx/sportsbet.conf" /etc/nginx/sites-available/sportsbet

    # Customize domain for environment
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        sudo sed -i 's/yourdomain\.com/staging.yourdomain.com/g' /etc/nginx/sites-available/sportsbet
    else
        sudo sed -i 's/yourdomain\.com/yourdomain.com/g' /etc/nginx/sites-available/sportsbet
    fi

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/sportsbet /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    if sudo nginx -t; then
        log_success "Nginx configuration valid"
        sudo systemctl reload nginx
    else
        log_error "Nginx configuration invalid"
        exit 1
    fi
}

# SSL setup for production/staging
setup_ssl() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_warn "Skipping SSL setup for development environment"
        return
    fi

    log_info "Setting up SSL certificates for $ENVIRONMENT"

    # Determine domain
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        DOMAIN="staging.yourdomain.com"
    else
        DOMAIN="yourdomain.com"
    fi

    # Stop nginx for standalone mode
    sudo systemctl stop nginx

    # Obtain certificate
    sudo certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN"

    # Start nginx
    sudo systemctl start nginx

    log_success "SSL setup completed"
}

# Verification
verify_deployment() {
    log_info "Verifying deployment for $ENVIRONMENT"

    # Wait for services to start
    sleep 10

    # Check service status
    if ./opt/sportsbet/backend/scripts/manage_services.sh status > /dev/null 2>&1; then
        log_success "Services are running"
    else
        log_error "Services are not running properly"
        exit 1
    fi

    # Check database health
    if curl -s -f "http://localhost:5001/api/admin/system/health/db" > /dev/null 2>&1; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        exit 1
    fi

    # Environment-specific checks
    if [[ "$ENVIRONMENT" != "development" ]]; then
        # Check SSL
        if curl -s -f --connect-timeout 10 "https://$DOMAIN/api/health" > /dev/null 2>&1; then
            log_success "SSL and API access verified"
        else
            log_error "SSL or API access verification failed"
            exit 1
        fi
    fi

    log_success "Deployment verification completed"
}

# Rollback function
rollback() {
    log_warn "Initiating rollback for $ENVIRONMENT"

    # Stop services
    manage_services "stop"

    # Restore previous backup (if exists)
    if [[ -f "/opt/sportsbet/backup.tar.gz" ]]; then
        log_info "Restoring from backup"
        cd /opt/sportsbet
        sudo tar -xzf backup.tar.gz
    else
        log_error "No backup found for rollback"
        exit 1
    fi

    # Restart services
    manage_services "start"

    log_success "Rollback completed"
}

# Main deployment logic
main() {
    log_info "Starting deployment for $ENVIRONMENT environment"

    check_permissions
    load_environment_config

    case "$ACTION" in
        "full")
            log_info "Performing full deployment"

            # Create backup before deployment
            if [[ -d "/opt/sportsbet/backend" ]]; then
                log_info "Creating backup before deployment"
                cd /opt
                sudo tar -czf sportsbet_backup_$(date +%Y%m%d_%H%M%S).tar.gz sportsbet/
            fi

            deploy_application
            setup_database
            setup_nginx

            if [[ "$ENVIRONMENT" != "development" ]]; then
                setup_ssl
            fi

            manage_services "restart"
            verify_deployment
            ;;

        "update")
            log_info "Performing application update"

            # Quick update without full setup
            deploy_application
            setup_database
            manage_services "restart"
            verify_deployment
            ;;

        "rollback")
            rollback
            ;;

        *)
            log_error "Unknown action: $ACTION"
            log_info "Available actions: full, update, rollback"
            exit 1
            ;;
    esac

    log_success "Deployment completed successfully for $ENVIRONMENT"

    # Environment-specific post-deployment messages
    case "$ENVIRONMENT" in
        "production")
            log_warn "PRODUCTION DEPLOYMENT COMPLETE"
            log_warn "Admin simulation endpoints: DISABLED"
            log_warn "Rate limiting: ENABLED"
            log_warn "IP restrictions: ENFORCED"
            ;;
        "staging")
            log_info "STAGING DEPLOYMENT COMPLETE"
            log_info "Admin simulation endpoints: ENABLED"
            log_info "Rate limiting: ENABLED"
            log_info "IP restrictions: DISABLED"
            ;;
        "development")
            log_info "DEVELOPMENT DEPLOYMENT COMPLETE"
            log_info "Full features available for development"
            ;;
    esac
}

# Run main function
main "$@"