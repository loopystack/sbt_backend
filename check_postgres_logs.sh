#!/bin/bash
# Script to find and display PostgreSQL error logs

echo "=== Finding PostgreSQL Log Files ==="
echo ""

# Try common log locations
LOG_PATHS=(
    "/var/log/postgresql/postgresql-14-main.log"
    "/var/log/postgresql/postgresql-13-main.log"
    "/var/log/postgresql/postgresql-12-main.log"
    "/var/log/postgresql/postgresql-15-main.log"
    "/var/log/postgresql/postgresql-16-main.log"
    "/var/lib/postgresql/14/main/log/postgresql-*.log"
    "/var/lib/postgresql/13/main/log/postgresql-*.log"
)

FOUND_LOG=""

for path in "${LOG_PATHS[@]}"; do
    if [ -f "$path" ] || ls $path 1> /dev/null 2>&1; then
        FOUND_LOG="$path"
        echo "Found log file: $path"
        break
    fi
done

if [ -z "$FOUND_LOG" ]; then
    echo "Could not find PostgreSQL log file automatically."
    echo ""
    echo "Please run these commands on your server:"
    echo "  sudo find /var/log -name '*postgresql*.log'"
    echo "  sudo find /var/lib/postgresql -name '*.log'"
    echo ""
    echo "Or check PostgreSQL config:"
    echo "  sudo -u postgres psql -c 'SHOW log_directory;'"
    echo "  sudo -u postgres psql -c 'SHOW log_filename;'"
    exit 1
fi

echo ""
echo "=== Recent Errors (last 50 lines) ==="
echo ""
sudo tail -50 "$FOUND_LOG" | grep -i -E "error|fatal|sportsbetting|betting_master" || sudo tail -50 "$FOUND_LOG"

echo ""
echo "=== To view real-time logs, run: ==="
echo "  sudo tail -f $FOUND_LOG"
