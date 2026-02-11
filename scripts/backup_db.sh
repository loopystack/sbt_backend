#!/bin/bash

# Database Backup Script for Sports Betting Platform
# Usage: ./backup_db.sh [environment]

set -e  # Exit on any error

# Configuration - Modify these for your environment
BACKUP_DIR="/home/deploy/db_backup"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sportsbetting}"
DB_USER="${DB_USER:-betting_master}"

# Environment-specific settings
ENVIRONMENT="${1:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="${DB_NAME}_${ENVIRONMENT}_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Environment: $ENVIRONMENT"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_DIR/$BACKUP_FILENAME"

# Create the backup
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_DIR/$BACKUP_FILENAME"

# Verify backup file was created and has content
if [ -s "$BACKUP_DIR/$BACKUP_FILENAME" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
    echo "Backup completed successfully!"
    echo "Backup size: $BACKUP_SIZE"
    echo "Backup location: $BACKUP_DIR/$BACKUP_FILENAME"

    # Optional: Create a latest symlink
    ln -sf "$BACKUP_FILENAME" "$BACKUP_DIR/${DB_NAME}_${ENVIRONMENT}_latest.sql"

    # Optional: Clean up old backups (keep last 7 days)
    echo "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "${DB_NAME}_${ENVIRONMENT}_*.sql" -mtime +7 -delete

    echo "Backup cleanup completed."
else
    echo "ERROR: Backup file was not created or is empty!"
    exit 1
fi

echo "Database backup process completed."