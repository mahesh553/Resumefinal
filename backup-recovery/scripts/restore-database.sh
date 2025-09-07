#!/bin/bash
# QoderResume Database Restoration Script
# Automated PostgreSQL restoration with validation and rollback capabilities

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../configs/backup.conf"

# Source configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Set defaults if not configured
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/qoder-resume}"
BACKUP_LOG_DIR="${BACKUP_LOG_DIR:-/var/log/qoder-backup}"
RESTORE_TEMP_DIR="${BACKUP_TEMP_DIR:-/tmp/qoder-backup}/restore"

# =============================================================================
# COMMAND LINE ARGUMENTS
# =============================================================================
RESTORE_TYPE=""
BACKUP_DATE=""
BACKUP_FILE=""
TARGET_TIME=""
FORCE_RESTORE=false
DRY_RUN=false

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE          Restoration type: full, pitr (point-in-time)
    -d, --date DATE          Backup date (YYYYMMDD_HHMMSS)
    -f, --file FILE          Specific backup file to restore
    -T, --target-time TIME   Target time for point-in-time recovery (YYYY-MM-DD HH:MM:SS)
    --force                  Force restore without confirmation
    --dry-run                Simulate restore without making changes
    -h, --help               Show this help message

Examples:
    $0 -t full -d 20241201_020000
    $0 -t pitr -T "2024-12-01 14:30:00"
    $0 -f /backup/database/qoder_resume_20241201_020000.backup
    
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            RESTORE_TYPE="$2"
            shift 2
            ;;
        -d|--date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -T|--target-time)
            TARGET_TIME="$2"
            shift 2
            ;;
        --force)
            FORCE_RESTORE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# =============================================================================
# LOGGING SETUP
# =============================================================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${BACKUP_LOG_DIR}/restore_${TIMESTAMP}.log"

# Ensure directories exist
mkdir -p "$BACKUP_LOG_DIR" "$RESTORE_TEMP_DIR"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# =============================================================================
# ERROR HANDLING
# =============================================================================
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Restoration failed with exit code: $exit_code"
        send_alert "CRITICAL" "Database restoration failed" "Exit code: $exit_code"
    fi
    
    # Clean up temporary files
    rm -rf "$RESTORE_TEMP_DIR"
}

trap cleanup EXIT

# =============================================================================
# NOTIFICATION FUNCTIONS
# =============================================================================
send_alert() {
    local severity="$1"
    local subject="$2"
    local message="$3"
    
    if [[ "$MONITORING_ENABLED" == "true" ]]; then
        # Email notification
        if [[ -n "${ALERT_EMAIL:-}" ]]; then
            echo "$message" | mail -s "[$severity] QoderResume Restore: $subject" "$ALERT_EMAIL"
        fi
        
        # Slack notification
        if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"[$severity] QoderResume Restore: $subject\\n$message\"}" \
                "$ALERT_SLACK_WEBHOOK" || true
        fi
    fi
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================
validate_arguments() {
    # Validate restore type
    if [[ -z "$RESTORE_TYPE" ]]; then
        log "ERROR" "Restore type not specified. Use -t full or -t pitr"
        exit 1
    fi
    
    if [[ "$RESTORE_TYPE" != "full" ]] && [[ "$RESTORE_TYPE" != "pitr" ]]; then
        log "ERROR" "Invalid restore type: $RESTORE_TYPE. Must be 'full' or 'pitr'"
        exit 1
    fi
    
    # Validate point-in-time recovery arguments
    if [[ "$RESTORE_TYPE" == "pitr" ]] && [[ -z "$TARGET_TIME" ]]; then
        log "ERROR" "Target time required for point-in-time recovery"
        exit 1
    fi
    
    # Validate backup file or date
    if [[ -z "$BACKUP_FILE" ]] && [[ -z "$BACKUP_DATE" ]] && [[ "$RESTORE_TYPE" == "full" ]]; then
        log "ERROR" "Either backup file (-f) or backup date (-d) must be specified for full restore"
        exit 1
    fi
}

# =============================================================================
# BACKUP DISCOVERY
# =============================================================================
find_backup_file() {
    if [[ -n "$BACKUP_FILE" ]] && [[ -f "$BACKUP_FILE" ]]; then
        echo "$BACKUP_FILE"
        return 0
    fi
    
    if [[ -n "$BACKUP_DATE" ]]; then
        local backup_dir="$BACKUP_BASE_DIR/database/$BACKUP_DATE"
        if [[ -d "$backup_dir" ]]; then
            # Find the main backup file in the directory
            local backup_file
            backup_file=$(find "$backup_dir" -name "*.backup" -o -name "*.sql*" | head -n 1)
            if [[ -f "$backup_file" ]]; then
                echo "$backup_file"
                return 0
            fi
        fi
        
        # Try cloud storage if local not found
        if [[ "$CLOUD_BACKUP_ENABLED" == "true" ]]; then
            log "INFO" "Local backup not found, checking cloud storage"
            download_from_cloud "$BACKUP_DATE"
            
            backup_file=$(find "$RESTORE_TEMP_DIR" -name "*.backup" -o -name "*.sql*" | head -n 1)
            if [[ -f "$backup_file" ]]; then
                echo "$backup_file"
                return 0
            fi
        fi
    fi
    
    # If no specific backup, find the latest
    log "INFO" "No specific backup specified, finding latest backup"
    local latest_backup
    latest_backup=$(find "$BACKUP_BASE_DIR/database" -name "*.backup" -o -name "*.sql*" | sort -r | head -n 1)
    if [[ -f "$latest_backup" ]]; then
        echo "$latest_backup"
        return 0
    fi
    
    log "ERROR" "No suitable backup file found"
    return 1
}

# =============================================================================
# CLOUD DOWNLOAD
# =============================================================================
download_from_cloud() {
    local backup_date="$1"
    
    if [[ "$CLOUD_BACKUP_ENABLED" != "true" ]]; then
        return 1
    fi
    
    log "INFO" "Downloading backup from cloud storage"
    
    local cloud_path="database/${backup_date}/"
    
    case "$CLOUD_PROVIDER" in
        "aws")
            aws s3 sync "s3://${CLOUD_BUCKET}/${cloud_path}" "$RESTORE_TEMP_DIR/"
            ;;
        *)
            log "ERROR" "Cloud provider '$CLOUD_PROVIDER' not supported"
            return 1
            ;;
    esac
}

# =============================================================================
# DATABASE PRE-RESTORE CHECKS
# =============================================================================
pre_restore_checks() {
    log "INFO" "Performing pre-restore checks"
    
    # Check database connectivity
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "\l" >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to PostgreSQL server"
        return 1
    fi
    
    # Check if target database exists
    local db_exists
    db_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | xargs)
    
    if [[ "$db_exists" == "1" ]]; then
        log "WARN" "Target database '$DB_NAME' already exists"
        
        if [[ "$FORCE_RESTORE" != "true" ]]; then
            echo "Database '$DB_NAME' already exists. This will be dropped and recreated."
            echo "All existing data will be lost!"
            read -p "Are you sure you want to continue? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "INFO" "Restore cancelled by user"
                exit 0
            fi
        fi
        
        # Create backup of existing database before restore
        log "INFO" "Creating backup of existing database before restore"
        local pre_restore_backup="$RESTORE_TEMP_DIR/pre_restore_backup_${TIMESTAMP}.sql"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --verbose --file="$pre_restore_backup"
        log "INFO" "Pre-restore backup saved: $pre_restore_backup"
    fi
    
    unset PGPASSWORD
    log "INFO" "Pre-restore checks completed"
}

# =============================================================================
# DATABASE RESTORATION
# =============================================================================
restore_database() {
    local backup_file="$1"
    local restore_start_time=$(date +%s)
    
    log "INFO" "Starting database restoration from: $backup_file"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would restore database from $backup_file"
        return 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Stop application services to prevent connections
    log "INFO" "Stopping application services"
    if command -v systemctl >/dev/null 2>&1; then
        systemctl stop qoder-resume || true
    fi
    
    # Terminate existing connections to the database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" || true
    
    # Drop and recreate database
    log "INFO" "Dropping and recreating database: $DB_NAME"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
    
    # Determine backup format and restore accordingly
    local backup_format=""
    if [[ "$backup_file" == *.backup ]]; then
        backup_format="custom"
    elif [[ "$backup_file" == *.sql ]] || [[ "$backup_file" == *.sql.gz ]]; then
        backup_format="plain"
    else
        log "ERROR" "Unknown backup format: $backup_file"
        return 1
    fi
    
    # Perform restoration
    case "$backup_format" in
        "custom")
            log "INFO" "Restoring from custom format backup"
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose \
                --jobs="$DB_PARALLEL_JOBS" \
                "$backup_file"
            ;;
        "plain")
            log "INFO" "Restoring from plain SQL backup"
            if [[ "$backup_file" == *.gz ]]; then
                gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
            else
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$backup_file"
            fi
            ;;
    esac
    
    # Update database statistics
    log "INFO" "Updating database statistics"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"
    
    unset PGPASSWORD
    
    # Calculate restoration duration
    local restore_end_time=$(date +%s)
    local restore_duration=$((restore_end_time - restore_start_time))
    
    log "INFO" "Database restoration completed in ${restore_duration} seconds"
    
    # Restart application services
    log "INFO" "Starting application services"
    if command -v systemctl >/dev/null 2>&1; then
        systemctl start qoder-resume || true
    fi
}

# =============================================================================
# POINT-IN-TIME RECOVERY
# =============================================================================
perform_pitr() {
    local target_time="$1"
    
    log "INFO" "Starting point-in-time recovery to: $target_time"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would perform PITR to $target_time"
        return 0
    fi
    
    # Find base backup closest to target time
    local base_backup_dir="$BACKUP_BASE_DIR/base_backup"
    if [[ ! -d "$base_backup_dir" ]]; then
        log "ERROR" "No base backup found for point-in-time recovery"
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Stop PostgreSQL
    log "INFO" "Stopping PostgreSQL for PITR"
    systemctl stop postgresql
    
    # Clear data directory
    local data_dir="/var/lib/postgresql/data"
    rm -rf "$data_dir"/*
    
    # Restore base backup
    log "INFO" "Restoring base backup"
    tar -xzf "$base_backup_dir"/base.tar.gz -C "$data_dir"
    
    # Configure recovery
    cat > "$data_dir/recovery.conf" << EOF
restore_command = 'cp $WAL_ARCHIVE_DIR/%f %p'
recovery_target_time = '$target_time'
recovery_target_action = 'promote'
EOF
    
    # Set proper permissions
    chown -R postgres:postgres "$data_dir"
    chmod 700 "$data_dir"
    
    # Start PostgreSQL for recovery
    log "INFO" "Starting PostgreSQL for recovery"
    systemctl start postgresql
    
    # Wait for recovery to complete
    local recovery_complete=false
    local max_wait=3600  # 1 hour
    local wait_time=0
    
    while [[ $recovery_complete == false ]] && [[ $wait_time -lt $max_wait ]]; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "SELECT 1;" >/dev/null 2>&1; then
            recovery_complete=true
        else
            sleep 10
            wait_time=$((wait_time + 10))
        fi
    done
    
    if [[ $recovery_complete == false ]]; then
        log "ERROR" "Point-in-time recovery did not complete within timeout"
        return 1
    fi
    
    unset PGPASSWORD
    log "INFO" "Point-in-time recovery completed successfully"
}

# =============================================================================
# POST-RESTORE VALIDATION
# =============================================================================
validate_restoration() {
    log "INFO" "Validating database restoration"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check database connectivity
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to restored database"
        return 1
    fi
    
    # Check table counts
    local table_count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | xargs)
    
    log "INFO" "Restored database contains $table_count tables"
    
    # Check for critical tables
    local critical_tables=("users" "resumes" "job_applications")
    for table in "${critical_tables[@]}"; do
        local exists
        exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -t -c "SELECT count(*) FROM information_schema.tables WHERE table_name='$table';" | xargs)
        
        if [[ "$exists" -eq 0 ]]; then
            log "WARN" "Critical table not found: $table"
        else
            log "INFO" "Critical table verified: $table"
        fi
    done
    
    unset PGPASSWORD
    log "INFO" "Database validation completed"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log "INFO" "Starting QoderResume database restoration process"
    
    # Validate arguments
    validate_arguments
    
    # Pre-restore checks
    pre_restore_checks
    
    # Perform restoration based on type
    case "$RESTORE_TYPE" in
        "full")
            local backup_file
            backup_file=$(find_backup_file)
            if [[ $? -ne 0 ]] || [[ -z "$backup_file" ]]; then
                log "ERROR" "Failed to find backup file"
                exit 1
            fi
            
            log "INFO" "Using backup file: $backup_file"
            restore_database "$backup_file"
            ;;
        "pitr")
            perform_pitr "$TARGET_TIME"
            ;;
    esac
    
    # Validate restoration
    validate_restoration
    
    # Send success notification
    send_alert "INFO" "Database restoration completed successfully" "Restore type: $RESTORE_TYPE"
    
    log "INFO" "Database restoration process completed successfully"
}

# Run main function
main "$@"