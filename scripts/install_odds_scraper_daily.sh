#!/usr/bin/env bash
# Install OddsPortal scraper as a daily systemd timer.
# Run on the server with sudo, from the sbt_backend repo root (or set BACKEND_ROOT).
# Usage: sudo ./scripts/install_odds_scraper_daily.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_ROOT="${BACKEND_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

echo "=== OddsPortal scraper – install daily job ==="
echo "Backend root: $BACKEND_ROOT"
echo ""

# 1. Copy unit files
echo "Step 1: Copying systemd units to /etc/systemd/system/ ..."
cp -v "$BACKEND_ROOT/systemd/odds-scraper.service" /etc/systemd/system/
cp -v "$BACKEND_ROOT/systemd/odds-scraper.timer"   /etc/systemd/system/

# 2. If BACKEND_ROOT is not the default, patch the service file
if [ "$BACKEND_ROOT" != "/home/deploy/sbt_backend" ]; then
  echo "Step 2: Patching paths in odds-scraper.service to $BACKEND_ROOT ..."
  sed -i "s|/home/deploy/sbt_backend|$BACKEND_ROOT|g" /etc/systemd/system/odds-scraper.service
else
  echo "Step 2: Using default paths (skip patch)."
fi

# 3. Reload and enable
echo "Step 3: Reloading systemd and enabling timer ..."
systemctl daemon-reload
systemctl enable odds-scraper.timer
systemctl start odds-scraper.timer

echo ""
echo "=== Done ==="
echo "Timer is active. Next run:"
systemctl list-timers odds-scraper.timer --no-pager
echo ""
echo "To run the scraper once now: sudo systemctl start odds-scraper.service"
echo "To view logs: sudo journalctl -u odds-scraper.service -f"
