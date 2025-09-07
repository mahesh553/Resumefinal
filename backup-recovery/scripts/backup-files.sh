#!/bin/bash
# QoderResume File Storage Backup Script
# Automated backup of user uploads, application files, and configurations

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
FILE_SOURCE_DIRS="${FILE_SOURCE_DIRS:-/app/uploads,/app/storage}"

# =============================================================================
# LOGGING SETUP
# =============================================================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${BACKUP_LOG_DIR}/file_backup_${TIMESTAMP}.log"
BACKUP_DIR="${BACKUP_BASE_DIR}/files/${TIMESTAMP}"

# Ensure directories exist
mkdir -p "$BACKUP_BASE_DIR/files" "$BACKUP_LOG_DIR" "$BACKUP_DIR"

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
        log "ERROR" "File backup failed with exit code: $exit_code"
        send_alert "CRITICAL" "File backup failed" "Exit code: $exit_code"
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
            echo "$message" | mail -s "[$severity] QoderResume File Backup: $subject" "$ALERT_EMAIL"
        fi
        
        # Slack notification
        if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"[$severity] QoderResume File Backup: $subject\\n$message\"}" \
                "$ALERT_SLACK_WEBHOOK" || true
        fi
    fi
}

# =============================================================================
# FILE SIZE CALCULATION
# =============================================================================
calculate_source_size() {
    local total_size=0
    
    IFS=',' read -ra DIRS <<< "$FILE_SOURCE_DIRS"
    for dir in "${DIRS[@]}"; do
        if [[ -d "$dir" ]]; then
            local dir_size
            dir_size=$(du -sb "$dir" 2>/dev/null | cut -f1)
            total_size=$((total_size + dir_size))
            log "INFO" "Source directory $dir size: $(numfmt --to=iec-i --suffix=B $dir_size)"
        else
            log "WARN" "Source directory not found: $dir"
        fi
    done
    
    log "INFO" "Total source size: $(numfmt --to=iec-i --suffix=B $total_size)"
    echo "$total_size" > "$BACKUP_DIR/source_size.txt"
}

# =============================================================================
# BACKUP VALIDATION
# =============================================================================
validate_backup() {
    local backup_file="$1"
    
    log "INFO" "Validating backup archive: $backup_file"
    
    # Check file exists and has content
    if [[ ! -f "$backup_file" ]] || [[ ! -s "$backup_file" ]]; then
        log "ERROR" "Backup file is missing or empty"
        return 1
    fi
    
    # Test archive integrity
    if [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
            log "ERROR" "Backup archive integrity check failed"
            return 1
        fi
    elif [[ "$backup_file" == *.zip ]]; then
        if ! unzip -t "$backup_file" >/dev/null 2>&1; then
            log "ERROR" "Backup archive integrity check failed"
            return 1
        fi
    fi
    
    log "INFO" "Backup validation successful"
    return 0
}

# =============================================================================
# INCREMENTAL BACKUP DETECTION
# =============================================================================
find_last_backup() {
    local last_backup_dir
    last_backup_dir=$(find "$BACKUP_BASE_DIR/files" -maxdepth 1 -type d -name "20*" | sort -r | head -n 1)
    
    if [[ -n "$last_backup_dir" ]] && [[ -f "$last_backup_dir/file_list.txt" ]]; then
        echo "$last_backup_dir"
    else
        echo ""
    fi
}

# =============================================================================
# RSYNC BACKUP FUNCTION
# =============================================================================
perform_rsync_backup() {
    local source_dir="$1"
    local backup_subdir="$2"
    local target_dir="$BACKUP_DIR/$backup_subdir"
    
    mkdir -p "$target_dir"
    
    # Build rsync options
    local rsync_opts=(
        --archive
        --verbose
        --progress
        --stats
        --human-readable
        --partial
        --inplace
        --compress
    )
    
    # Add bandwidth limit if configured
    if [[ -n "${RSYNC_BANDWIDTH_LIMIT:-}" ]]; then
        rsync_opts+=(--bwlimit="$RSYNC_BANDWIDTH_LIMIT")
    fi
    
    # Add timeout if configured
    if [[ -n "${RSYNC_TIMEOUT:-}" ]]; then
        rsync_opts+=(--timeout="$RSYNC_TIMEOUT")
    fi
    
    # Add exclude patterns
    if [[ -n "${FILE_EXCLUDE_PATTERNS:-}" ]]; then
        IFS=',' read -ra PATTERNS <<< "$FILE_EXCLUDE_PATTERNS"
        for pattern in "${PATTERNS[@]}"; do
            rsync_opts+=(--exclude="$pattern")
        done
    fi
    
    # Perform rsync backup
    log "INFO" "Starting rsync backup: $source_dir -> $target_dir"
    
    local rsync_start_time=$(date +%s)
    
    if rsync "${rsync_opts[@]}" "$source_dir/" "$target_dir/"; then
        local rsync_end_time=$(date +%s)
        local rsync_duration=$((rsync_end_time - rsync_start_time))
        log "INFO" "Rsync completed in ${rsync_duration} seconds"
        return 0
    else
        log "ERROR" "Rsync failed for directory: $source_dir"
        return 1
    fi
}

# =============================================================================
# ARCHIVE CREATION
# =============================================================================
create_archive() {
    local archive_format="${1:-tar.gz}"
    local archive_file
    
    case "$archive_format" in
        "tar.gz")
            archive_file="$BACKUP_DIR/../qoder_files_${TIMESTAMP}.tar.gz"
            log "INFO" "Creating tar.gz archive: $archive_file"
            
            tar -czf "$archive_file" -C "$BACKUP_DIR" . \
                --exclude="*.tmp" \
                --exclude="*.log"
            ;;
        "zip")
            archive_file="$BACKUP_DIR/../qoder_files_${TIMESTAMP}.zip"
            log "INFO" "Creating zip archive: $archive_file"
            
            (cd "$BACKUP_DIR" && zip -r "$archive_file" . -x "*.tmp" "*.log")
            ;;
        *)
            log "ERROR" "Unsupported archive format: $archive_format"
            return 1
            ;;
    esac
    
    # Validate the created archive
    if ! validate_backup "$archive_file"; then
        log "ERROR" "Archive validation failed"
        return 1
    fi
    
    # Calculate archive size and compression ratio
    local original_size
    original_size=$(du -sb "$BACKUP_DIR" | cut -f1)
    local archive_size
    archive_size=$(stat -f%z "$archive_file" 2>/dev/null || stat -c%s "$archive_file")
    local compression_ratio
    compression_ratio=$(echo "scale=2; ($original_size - $archive_size) * 100 / $original_size" | bc -l)
    
    log "INFO" "Archive created successfully"
    log "INFO" "Original size: $(numfmt --to=iec-i --suffix=B $original_size)"
    log "INFO" "Archive size: $(numfmt --to=iec-i --suffix=B $archive_size)"
    log "INFO" "Compression ratio: ${compression_ratio}%"
    
    echo "$archive_file"
}

# =============================================================================
# CHECKSUM GENERATION
# =============================================================================
generate_checksums() {
    log "INFO" "Generating file checksums"
    
    local checksum_file="$BACKUP_DIR/checksums.sha256"
    
    # Generate checksums for all backed up files
    find "$BACKUP_DIR" -type f ! -name "*.sha256" ! -name "*.log" -exec sha256sum {} \; > "$checksum_file"
    
    log "INFO" "Checksums saved to: $checksum_file"
}

# =============================================================================
# FILE LIST GENERATION
# =============================================================================
generate_file_list() {
    log "INFO" "Generating file list"
    
    local file_list="$BACKUP_DIR/file_list.txt"
    
    # Create detailed file list with sizes and timestamps
    find "$BACKUP_DIR" -type f -exec ls -la {} \; > "$file_list"
    
    # Create simple file list for incremental comparison
    find "$BACKUP_DIR" -type f -printf "%P\n" > "$BACKUP_DIR/file_list_simple.txt"
    
    log "INFO" "File list saved to: $file_list"
}

# =============================================================================
# MAIN BACKUP FUNCTION
# =============================================================================
perform_file_backup() {
    local backup_start_time=$(date +%s)
    log "INFO" "Starting file storage backup"
    
    # Calculate source size
    calculate_source_size
    
    # Process each source directory
    IFS=',' read -ra DIRS <<< "$FILE_SOURCE_DIRS"
    for source_dir in "${DIRS[@]}"; do
        if [[ -d "$source_dir" ]]; then
            local dir_name=$(basename "$source_dir")
            log "INFO" "Backing up directory: $source_dir"
            
            if ! perform_rsync_backup "$source_dir" "$dir_name"; then
                log "ERROR" "Failed to backup directory: $source_dir"
                return 1
            fi
        else
            log "WARN" "Source directory not found, skipping: $source_dir"
        fi
    done
    
    # Generate file list and checksums
    generate_file_list
    generate_checksums
    
    # Create compressed archive if enabled
    local archive_file=""
    if [[ "$FILE_COMPRESSION" == "true" ]]; then
        archive_file=$(create_archive "tar.gz")
        
        # Remove uncompressed backup directory after successful archive creation
        if [[ -n "$archive_file" ]] && [[ -f "$archive_file" ]]; then
            rm -rf "$BACKUP_DIR"
            # Update backup directory to point to the archive
            BACKUP_DIR=$(dirname "$archive_file")
        fi
    fi
    
    # Calculate backup duration
    local backup_end_time=$(date +%s)
    local backup_duration=$((backup_end_time - backup_start_time))
    
    log "INFO" "File backup completed in ${backup_duration} seconds"
    
    # Record backup metadata
    cat > "$BACKUP_DIR/metadata.json" << EOF
{
    "backup_type": "files",
    "compression": $FILE_COMPRESSION,
    "encryption": $FILE_ENCRYPTION,
    "timestamp": "$TIMESTAMP",
    "start_time": "$backup_start_time",
    "end_time": "$backup_end_time",
    "duration_seconds": $backup_duration,
    "source_directories": "$FILE_SOURCE_DIRS",
    "archive_file": "$(basename "$archive_file")",
    "backup_directory": "$BACKUP_DIR"
}
EOF
    
    log "INFO" "File backup completed successfully"
    
    # Check backup time against thresholds
    if [[ $backup_duration -gt ${BACKUP_TIME_CRITICAL_THRESHOLD:-7200} ]]; then
        send_alert "CRITICAL" "File backup took too long" "Duration: ${backup_duration}s"
    elif [[ $backup_duration -gt ${BACKUP_TIME_WARNING_THRESHOLD:-3600} ]]; then
        send_alert "WARNING" "File backup slower than expected" "Duration: ${backup_duration}s"
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
    
    log "INFO" "Uploading file backup to cloud storage"
    
    local cloud_path="files/${TIMESTAMP}/"
    
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
    if [[ "$FILE_ENCRYPTION" != "true" ]]; then
        log "INFO" "File encryption disabled, skipping"
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
# MAIN EXECUTION
# =============================================================================
main() {
    log "INFO" "Starting QoderResume file backup process"
    log "INFO" "Source directories: $FILE_SOURCE_DIRS"
    log "INFO" "Compression: $FILE_COMPRESSION, Encryption: $FILE_ENCRYPTION"
    
    # Check if backup is enabled
    if [[ "$FILE_BACKUP_ENABLED" != "true" ]]; then
        log "INFO" "File backup is disabled"
        exit 0
    fi
    
    # Perform the backup
    perform_file_backup
    
    # Encrypt if enabled
    encrypt_backup
    
    # Upload to cloud if enabled
    upload_to_cloud
    
    # Send success notification
    send_alert "INFO" "File backup completed successfully" "Backup location: $BACKUP_DIR"
    
    log "INFO" "File backup process completed successfully"
}

# Run main function
main "$@"