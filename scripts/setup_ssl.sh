#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Usage: ./setup_ssl.sh yourdomain.com [email]

set -e

DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily for standalone mode
log_info "Stopping nginx temporarily..."
systemctl stop nginx

# Obtain SSL certificate
log_info "Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Check if certificate was obtained successfully
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log_info "SSL certificate obtained successfully!"

    # Set proper permissions
    log_info "Setting certificate permissions..."
    chmod 600 "/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    chmod 644 "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    chmod 644 "/etc/letsencrypt/live/$DOMAIN/chain.pem"

    # Create dhparam if it doesn't exist
    if [ ! -f "/etc/ssl/certs/dhparam.pem" ]; then
        log_info "Generating Diffie-Hellman parameters..."
        openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
    fi

else
    log_error "Failed to obtain SSL certificate"
    exit 1
fi

# Restart nginx
log_info "Starting nginx..."
systemctl start nginx

# Test nginx configuration
log_info "Testing nginx configuration..."
if nginx -t; then
    log_info "Nginx configuration is valid"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# Set up automatic renewal
log_info "Setting up automatic certificate renewal..."

# Create renewal hook script
cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh

# Test renewal
log_info "Testing certificate renewal..."
certbot renew --dry-run

# Show certificate info
log_info "SSL certificate information:"
certbot certificates

log_info "SSL setup completed successfully!"
log_info "Your site should now be available at: https://$DOMAIN"
log_info ""
log_warn "Remember to update your DNS records to point to this server"
log_warn "Also update the nginx configuration file with your actual domain name"