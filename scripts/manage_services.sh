#!/bin/bash

# Systemd Service Management Script for Sports Betting Platform
# Usage: ./manage_services.sh [start|stop|restart|status|logs] [service]

set -e

SERVICES=("sportsbet-api" "sportsbet-deposit-monitor" "sportsbet-withdrawal-monitor")
ACTION="${1:-status}"
SERVICE="${2:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Sports Betting Platform Service Manager"
    echo ""
    echo "Usage: $0 [action] [service]"
    echo ""
    echo "Actions:"
    echo "  start     Start services"
    echo "  stop      Stop services"
    echo "  restart   Restart services"
    echo "  status    Show service status"
    echo "  logs      Show service logs"
    echo "  enable    Enable services to start on boot"
    echo "  disable   Disable services from starting on boot"
    echo ""
    echo "Services:"
    echo "  api                    API service only"
    echo "  deposit-monitor        Deposit monitor only"
    echo "  withdrawal-monitor     Withdrawal monitor only"
    echo "  all                    All services (default)"
    echo ""
    echo "Examples:"
    echo "  $0 start all           # Start all services"
    echo "  $0 restart api         # Restart API service"
    echo "  $0 logs deposit-monitor # Show deposit monitor logs"
    echo "  $0 status              # Show status of all services"
}

get_services_to_manage() {
    case "$SERVICE" in
        "api")
            echo "sportsbet-api"
            ;;
        "deposit-monitor")
            echo "sportsbet-deposit-monitor"
            ;;
        "withdrawal-monitor")
            echo "sportsbet-withdrawal-monitor"
            ;;
        "all")
            printf '%s\n' "${SERVICES[@]}"
            ;;
        *)
            log_error "Unknown service: $SERVICE"
            echo "Use 'api', 'deposit-monitor', 'withdrawal-monitor', or 'all'"
            exit 1
            ;;
    esac
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

start_services() {
    check_root
    log_info "Starting services..."

    for service in $(get_services_to_manage); do
        log_info "Starting $service..."
        if systemctl start "$service"; then
            log_info "$service started successfully"
        else
            log_error "Failed to start $service"
        fi
    done
}

stop_services() {
    check_root
    log_info "Stopping services..."

    for service in $(get_services_to_manage); do
        log_info "Stopping $service..."
        if systemctl stop "$service"; then
            log_info "$service stopped successfully"
        else
            log_error "Failed to stop $service"
        fi
    done
}

restart_services() {
    check_root
    log_info "Restarting services..."

    for service in $(get_services_to_manage); do
        log_info "Restarting $service..."
        if systemctl restart "$service"; then
            log_info "$service restarted successfully"
        else
            log_error "Failed to restart $service"
        fi
    done
}

show_status() {
    echo "Sports Betting Platform Services Status"
    echo "========================================"

    for service in "${SERVICES[@]}"; do
        echo ""
        echo "Service: $service"
        echo "------------------"
        if systemctl is-active --quiet "$service"; then
            echo -e "${GREEN}Status: Running${NC}"
        else
            echo -e "${RED}Status: Stopped${NC}"
        fi

        # Show additional status info
        systemctl status "$service" --no-pager -l | grep -E "(Active:|Main PID:|Memory:|CPU:)" || true
    done
}

show_logs() {
    local lines="${3:-50}"

    for service in $(get_services_to_manage); do
        echo ""
        echo "Logs for $service (last $lines lines):"
        echo "======================================"
        journalctl -u "$service" -n "$lines" --no-pager
    done
}

enable_services() {
    check_root
    log_info "Enabling services to start on boot..."

    for service in $(get_services_to_manage); do
        log_info "Enabling $service..."
        if systemctl enable "$service"; then
            log_info "$service enabled successfully"
        else
            log_error "Failed to enable $service"
        fi
    done
}

disable_services() {
    check_root
    log_info "Disabling services from starting on boot..."

    for service in $(get_services_to_manage); do
        log_info "Disabling $service..."
        if systemctl disable "$service"; then
            log_info "$service disabled successfully"
        else
            log_error "Failed to disable $service"
        fi
    done
}

# Main script logic
case "$ACTION" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$@"
        ;;
    "enable")
        enable_services
        ;;
    "disable")
        disable_services
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "Unknown action: $ACTION"
        echo ""
        show_help
        exit 1
        ;;
esac