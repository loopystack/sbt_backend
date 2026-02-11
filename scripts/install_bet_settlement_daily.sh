#!/usr/bin/env bash
# Install daily bet settlement timer (run after odds scraper).
# Run on the server with sudo, from the sbt_backend repo root (or set BACKEND_ROOT).
# Usage: sudo ./scripts/install_bet_settlement_daily.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_ROOT="${BACKEND_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

echo "=== Bet settlement – install daily job ==="
echo "Backend root: $BACKEND_ROOT"
echo ""

echo "Step 1: Copying systemd units to /etc/systemd/system/ ..."
cp -v "$BACKEND_ROOT/systemd/bet-settlement.service" /etc/systemd/system/
cp -v "$BACKEND_ROOT/systemd/bet-settlement.timer"   /etc/systemd/system/

if [ "$BACKEND_ROOT" != "/home/deploy/sbt_backend" ]; then
  echo "Step 2: Patching paths in bet-settlement.service to $BACKEND_ROOT ..."
  sed -i "s|/home/deploy/sbt_backend|$BACKEND_ROOT|g" /etc/systemd/system/bet-settlement.service
else
  echo "Step 2: Using default paths (skip patch)."
fi

echo "Step 3: Reloading systemd and enabling timer ..."
systemctl daemon-reload
systemctl enable bet-settlement.timer
systemctl start bet-settlement.timer

echo ""
echo "=== Done ==="
echo "Timer is active. Next run:"
systemctl list-timers bet-settlement.timer --no-pager
echo ""
echo "To run settlement once now: sudo systemctl start bet-settlement.service"
echo "To view logs: sudo journalctl -u bet-settlement.service -f"
