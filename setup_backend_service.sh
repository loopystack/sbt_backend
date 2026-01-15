#!/bin/bash

# Setup script for SBT Backend systemd service
# Run this script on your DigitalOcean server

set -e

echo "🚀 Setting up SBT Backend systemd service..."

# Configuration
SERVICE_NAME="sbt-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
BACKEND_DIR="/home/deploy/sbt_backend"
VENV_PATH="${BACKEND_DIR}/venv/bin"
USER="deploy"
GROUP="deploy"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash setup_backend_service.sh"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if venv exists
if [ ! -f "${VENV_PATH}/uvicorn" ]; then
    echo "❌ Virtual environment not found: ${VENV_PATH}/uvicorn"
    echo "   Please create and activate the virtual environment first"
    exit 1
fi

# Check if main.py exists
if [ ! -f "${BACKEND_DIR}/main.py" ]; then
    echo "❌ main.py not found: ${BACKEND_DIR}/main.py"
    exit 1
fi

# Create systemd service file
echo "📝 Creating systemd service file..."

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=SBT Backend FastAPI Service
After=network.target postgresql.service

[Service]
Type=simple
User=${USER}
Group=${GROUP}
WorkingDirectory=${BACKEND_DIR}
Environment="PATH=${VENV_PATH}"
ExecStart=${VENV_PATH}/uvicorn main:app --host 0.0.0.0 --port 5001
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"

# Set proper permissions
chmod 644 "$SERVICE_FILE"
echo "✅ Permissions set"

# Reload systemd
systemctl daemon-reload
echo "✅ Systemd daemon reloaded"

# Enable service
systemctl enable "${SERVICE_NAME}.service"
echo "✅ Service enabled (will start on boot)"

# Ask if user wants to start the service now
read -p "Do you want to start the service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start "${SERVICE_NAME}.service"
    echo "✅ Service started"
    
    # Wait a moment and check status
    sleep 2
    systemctl status "${SERVICE_NAME}.service" --no-pager -l
    
    echo ""
    echo "📋 Useful commands:"
    echo "   Check status:  sudo systemctl status ${SERVICE_NAME}.service"
    echo "   View logs:     sudo journalctl -u ${SERVICE_NAME}.service -f"
    echo "   Restart:       sudo systemctl restart ${SERVICE_NAME}.service"
    echo "   Stop:          sudo systemctl stop ${SERVICE_NAME}.service"
else
    echo "ℹ️  Service configured but not started. Start it with:"
    echo "   sudo systemctl start ${SERVICE_NAME}.service"
fi

echo ""
echo "✅ Setup complete!"
