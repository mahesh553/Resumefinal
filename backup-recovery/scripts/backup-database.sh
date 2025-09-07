#!/bin/bash
# QoderResume Database Backup Script
# Automated PostgreSQL backup with compression, encryption, and cloud upload

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
DB_BACKUP_TYPE="${DB_BACKUP_TYPE:-full}"
DB_COMPRESSION="${DB_COMPRESSION:-gzip}"
DB_COMPRESSION_LEVEL="${DB_COMPRESSION_LEVEL:-6}"

# =============================================================================
# LOGGING SETUP
# =============================================================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${BACKUP_LOG_DIR}/db_backup_${TIMESTAMP}.log"
BACKUP_DIR="${BACKUP_BASE_DIR}/database/${TIMESTAMP}"

# Ensure directories exist
mkdir -p "$BACKUP_BASE_DIR/database" "$BACKUP_LOG_DIR" "$BACKUP_DIR"

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
        log "ERROR" "Backup failed with exit code: $exit_code"
        send_alert "CRITICAL" "Database backup failed" "Exit code: $exit_code"
        # Clean up partial backup
        rm -rf "$BACKUP_DIR"
    fi
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
            echo "$message" | mail -s "[$severity] QoderResume Backup: $subject" "$ALERT_EMAIL"
        fi
        
        # Slack notification
        if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"[$severity] QoderResume Backup: $subject\\n$message\"}" \
                "$ALERT_SLACK_WEBHOOK" || true
        fi
    fi
}

# =============================================================================
# BACKUP VALIDATION
# =============================================================================
validate_backup() {
    local backup_file="$1"
    
    log "INFO" "Validating backup file: $backup_file"
    
    # Check file exists and has content
    if [[ ! -f "$backup_file" ]] || [[ ! -s "$backup_file" ]]; then
        log "ERROR" "Backup file is missing or empty"
        return 1
    fi
    
    # Verify backup integrity based on format
    case "$DB_BACKUP_FORMAT" in
        "custom")
            if ! pg_restore --list "$backup_file" >/dev/null 2>&1; then
                log "ERROR" "Backup file integrity check failed"
                return 1
            fi
            ;;
        "plain")
            if [[ "$DB_COMPRESSION" == "gzip" ]]; then
                if ! gunzip -t "$backup_file" 2>/dev/null; then
                    log "ERROR" "Compressed backup file integrity check failed"
                    return 1
                fi
            fi
            ;;
    esac
    
    log "INFO" "Backup validation successful"
    return 0
}

# =============================================================================
# BACKUP SIZE CALCULATION
# =============================================================================
calculate_database_size() {
    local db_size
    db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
    
    if [[ -n "$db_size" ]]; then
        log "INFO" "Database size: $db_size"
        echo "$db_size" > "$BACKUP_DIR/database_size.txt"
    fi
}

# =============================================================================
# MAIN BACKUP FUNCTION
# =============================================================================
perform_database_backup() {
    local backup_start_time=$(date +%s)
    log "INFO" "Starting database backup: $DB_BACKUP_TYPE"
    
    # Calculate database size
    calculate_database_size
    
    # Set backup filename based on type and compression
    local backup_filename="qoder_resume_${TIMESTAMP}"
    local backup_file
    
    case "$DB_BACKUP_FORMAT" in
        "custom")
            backup_filename="${backup_filename}.backup"
            ;;
        "plain")
            backup_filename="${backup_filename}.sql"
            ;;
        "tar")
            backup_filename="${backup_filename}.tar"
            ;;
    esac
    
    if [[ "$DB_COMPRESSION" == "gzip" ]] && [[ "$DB_BACKUP_FORMAT" != "custom" ]]; then
        backup_filename="${backup_filename}.gz"
    fi
    
    backup_file="$BACKUP_DIR/$backup_filename"
    
    # Export password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Perform backup based on type
    case "$DB_BACKUP_TYPE" in
        "full")
            log "INFO" "Performing full database backup"
            
            case "$DB_BACKUP_FORMAT" in
                "custom")
                    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                        --format=custom \
                        --compress="$DB_COMPRESSION_LEVEL" \
                        --verbose \
                        --file="$backup_file" \
                        --jobs="$DB_PARALLEL_JOBS"
                    ;;
                "plain")
                    if [[ "$DB_COMPRESSION" == "gzip" ]]; then
                        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                            --verbose | gzip -"$DB_COMPRESSION_LEVEL" > "$backup_file"
                    else
                        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                            --verbose \
                            --file="$backup_file"
                    fi
                    ;;
                "tar")
                    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                        --format=tar \
                        --verbose \
                        --file="$backup_file"
                    ;;
            esac
            ;;
        
        "incremental")
            log "INFO" "Performing incremental backup (WAL-based)"
            # Note: This requires WAL archiving to be set up
            if [[ "$WAL_ARCHIVE_ENABLED" == "true" ]]; then
                # Create base backup if none exists
                local base_backup_dir="$BACKUP_BASE_DIR/base_backup"
                if [[ ! -d "$base_backup_dir" ]]; then
                    log "INFO" "Creating base backup for incremental backups"
                    mkdir -p "$base_backup_dir"
                    pg_basebackup -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                        -D "$base_backup_dir" -Ft -z -P
                fi
                
                # Archive current WAL files
                local wal_backup_dir="$BACKUP_DIR/wal"
                mkdir -p "$wal_backup_dir"
                
                # Copy WAL files (this would normally be handled by archive_command)
                if [[ -d "$WAL_ARCHIVE_DIR" ]]; then
                    cp -r "$WAL_ARCHIVE_DIR"/* "$wal_backup_dir/" 2>/dev/null || true
                fi
            else
                log "WARN" "WAL archiving not enabled, falling back to full backup"
                DB_BACKUP_TYPE="full"
                perform_database_backup
                return
            fi
            ;;
    esac
    
    # Clear password
    unset PGPASSWORD
    
    # Calculate backup duration
    local backup_end_time=$(date +%s)
    local backup_duration=$((backup_end_time - backup_start_time))
    
    log "INFO" "Backup completed in ${backup_duration} seconds"
    
    # Validate backup
    if ! validate_backup "$backup_file"; then
        log "ERROR" "Backup validation failed"
        return 1
    fi
    
    # Record backup metadata
    cat > "$BACKUP_DIR/metadata.json" << EOF
{
    "backup_type": "$DB_BACKUP_TYPE",
    "backup_format": "$DB_BACKUP_FORMAT",
    "compression": "$DB_COMPRESSION",
    "timestamp": "$TIMESTAMP",
    "start_time": "$backup_start_time",
    "end_time": "$backup_end_time",
    "duration_seconds": $backup_duration,
    "database_name": "$DB_NAME",
    "backup_file": "$backup_filename",
    "file_size": $(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo 0),
    "compression_level": "$DB_COMPRESSION_LEVEL",
    "parallel_jobs": "$DB_PARALLEL_JOBS"
}
EOF
    
    log "INFO" "Database backup completed successfully: $backup_file"
    
    # Check backup time against thresholds
    if [[ $backup_duration -gt ${BACKUP_TIME_CRITICAL_THRESHOLD:-7200} ]]; then
        send_alert "CRITICAL" "Backup took too long" "Duration: ${backup_duration}s (threshold: ${BACKUP_TIME_CRITICAL_THRESHOLD}s)"
    elif [[ $backup_duration -gt ${BACKUP_TIME_WARNING_THRESHOLD:-3600} ]]; then
        send_alert "WARNING" "Backup slower than expected" "Duration: ${backup_duration}s (threshold: ${BACKUP_TIME_WARNING_THRESHOLD}s)"
    fi
}

# =============================================================================
# CLOUD UPLOAD FUNCTION
# =============================================================================
upload_to_cloud() {
    if [[ "$CLOUD_BACKUP_ENABLED" != "true" ]]; then
        log "INFO" "Cloud backup disabled, skipping upload"
        return 0
    fi
    
    log "INFO" "Uploading backup to cloud storage"
    
    local cloud_path="database/${TIMESTAMP}/"
    
    case "$CLOUD_PROVIDER" in
        "aws")
            # Upload to primary region
            aws s3 sync "$BACKUP_DIR/" "s3://${CLOUD_BUCKET}/${cloud_path}" \
                --storage-class "$CLOUD_STORAGE_CLASS" \
                --server-side-encryption AES256
            
            # Upload to DR region if enabled
            if [[ "$CROSS_REGION_BACKUP" == "true" ]]; then
                aws s3 sync "$BACKUP_DIR/" "s3://${CROSS_REGION_BUCKET}/${cloud_path}" \
                    --region "$CROSS_REGION" \
                    --storage-class "$CLOUD_STORAGE_CLASS" \
                    --server-side-encryption AES256
            fi
            ;;
        *)
            log "WARN" "Cloud provider '$CLOUD_PROVIDER' not implemented"
            return 1
            ;;
    esac
    
    log "INFO" "Cloud upload completed"
}

# =============================================================================
# ENCRYPTION FUNCTION
# =============================================================================
encrypt_backup() {
    if [[ "$ENCRYPTION_ENABLED" != "true" ]]; then
        log "INFO" "Encryption disabled, skipping"
        return 0
    fi
    
    log "INFO" "Encrypting backup files"
    
    for file in "$BACKUP_DIR"/*; do
        if [[ -f "$file" ]] && [[ "$file" != *.gpg ]]; then
            gpg --trust-model always --encrypt \
                --recipient "$GPG_RECIPIENT" \
                --cipher-algo AES256 \
                --output "${file}.gpg" \
                "$file"
            
            # Remove unencrypted file
            rm "$file"
            log "INFO" "Encrypted: $(basename "$file")"
        fi
    done
}

# =============================================================================
# CLEANUP FUNCTION
# =============================================================================
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups"
    
    # Remove backups older than retention period
    find "$BACKUP_BASE_DIR/database" -type d -name "20*" -mtime +${DAILY_RETENTION} -exec rm -rf {} \; 2>/dev/null || true
    
    # Clean up WAL files older than retention period
    if [[ -d "$WAL_ARCHIVE_DIR" ]]; then
        find "$WAL_ARCHIVE_DIR" -type f -mtime +${WAL_RETENTION_HOURS:-72} -delete 2>/dev/null || true
    fi
    
    log "INFO" "Cleanup completed"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log "INFO" "Starting QoderResume database backup process"
    log "INFO" "Backup type: $DB_BACKUP_TYPE, Format: $DB_BACKUP_FORMAT, Compression: $DB_COMPRESSION"
    
    # Check if backup is enabled
    if [[ "$DB_BACKUP_ENABLED" != "true" ]]; then
        log "INFO" "Database backup is disabled"
        exit 0
    fi
    
    # Perform the backup
    perform_database_backup
    
    # Encrypt if enabled
    encrypt_backup
    
    # Upload to cloud if enabled
    upload_to_cloud
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Send success notification
    send_alert "INFO" "Database backup completed successfully" "Backup location: $BACKUP_DIR"
    
    log "INFO" "Database backup process completed successfully"
}

# Run main function
main "$@"