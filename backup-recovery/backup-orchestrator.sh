#!/bin/bash
# QoderResume Backup & Disaster Recovery Orchestrator
# Central management script for all backup and recovery operations

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/configs/backup.conf"

# Source configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Set defaults
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/qoder-resume}"
BACKUP_LOG_DIR="${BACKUP_LOG_DIR:-/var/log/qoder-backup}"
OPERATION=""
COMPONENT=""
DRY_RUN=false
VERBOSE=false

# =============================================================================
# COMMAND LINE PARSING
# =============================================================================
usage() {
    cat << EOF
QoderResume Backup & Disaster Recovery Orchestrator

Usage: $0 OPERATION [COMPONENT] [OPTIONS]

OPERATIONS:
    backup               Perform backup operations
    restore              Perform restoration operations
    test                 Run backup testing and validation
    monitor              Show backup system status
    cleanup              Clean up old backups and logs
    setup                Initial setup and configuration
    status               Show current backup status

COMPONENTS:
    database             PostgreSQL database operations
    files                File storage operations
    redis                Redis cache operations
    config               Configuration backup/restore
    all                  All components (default)

OPTIONS:
    --dry-run           Show what would be done without executing
    --verbose           Enable verbose output
    --force             Force operation without confirmation
    --schedule          Show backup schedule
    --health            Show system health
    -h, --help          Show this help message

EXAMPLES:
    $0 backup database          # Backup database only
    $0 backup all               # Backup all components
    $0 restore database --dry-run  # Show restoration steps
    $0 test integrity           # Test backup integrity
    $0 monitor                  # Show backup status
    $0 cleanup --force          # Clean up old backups
    $0 setup                    # Initial system setup
    
EOF
}

# Parse command line arguments
parse_args() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi
    
    OPERATION="$1"
    shift
    
    # Parse component if provided
    if [[ $# -gt 0 ]] && [[ "$1" != --* ]]; then
        COMPONENT="$1"
        shift
    fi
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --schedule)
                show_schedule
                exit 0
                ;;
            --health)
                show_health
                exit 0
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
    
    # Set default component
    if [[ -z "$COMPONENT" ]]; then
        COMPONENT="all"
    fi
}

# =============================================================================
# LOGGING SETUP
# =============================================================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${BACKUP_LOG_DIR}/orchestrator_${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p "$BACKUP_LOG_DIR"

# Logging function
log() {
    local level="$1"
    shift
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo "$message" | tee -a "$LOG_FILE"
    
    if [[ "$VERBOSE" == "true" ]] || [[ "$level" == "ERROR" ]] || [[ "$level" == "WARN" ]]; then
        echo "$message" >&2
    fi
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================
check_prerequisites() {
    log "INFO" "Checking system prerequisites"
    
    local missing_tools=()
    
    # Check required tools
    local required_tools=("pg_dump" "pg_restore" "psql" "redis-cli" "aws" "rsync" "tar" "gzip" "gpg")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Check directory permissions
    local required_dirs=("$BACKUP_BASE_DIR" "$BACKUP_LOG_DIR")
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            log "INFO" "Creating directory: $dir"
            mkdir -p "$dir"
        fi
        
        if [[ ! -w "$dir" ]]; then
            log "ERROR" "No write permission for directory: $dir"
            return 1
        fi
    done
    
    # Check disk space
    local available_space
    available_space=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log "WARN" "Low disk space: $(numfmt --to=iec-i --suffix=B $((available_space * 1024)))"
    fi
    
    log "INFO" "Prerequisites check completed"
}

show_schedule() {
    cat << EOF
QoderResume Backup Schedule

DAILY BACKUPS:
  02:00 - Full database backup
  03:00 - File storage backup
  01:00 - Configuration backup
  04:00 - Cleanup old backups
  05:00 - Backup verification

HOURLY BACKUPS:
  Every 6 hours - Incremental database backup
  Every 2 hours - Redis snapshot
  Every 4 hours - Cloud sync

CONTINUOUS:
  Every 15 minutes - WAL archive backup
  Every 30 minutes - Health checks

WEEKLY TASKS:
  Sunday 05:00 - Backup testing
  Sunday 06:00 - Compression of old backups
  Saturday 02:00 - Cloud storage cleanup

MONTHLY TASKS:
  1st Sunday 07:00 - Full disaster recovery test
  1st of month 10:00 - Monthly analysis
  15th 03:00 - Encryption key rotation

EOF
}

show_health() {
    log "INFO" "Checking backup system health"
    
    echo "=== QoderResume Backup System Health ==="
    echo
    
    # Check backup services
    echo "BACKUP SERVICES:"
    if systemctl is-active --quiet cron; then
        echo "  ✓ Cron service: Running"
    else
        echo "  ✗ Cron service: Not running"
    fi
    
    # Check database connectivity
    echo
    echo "DATABASE CONNECTIVITY:"
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo "  ✓ PostgreSQL: Connected"
    else
        echo "  ✗ PostgreSQL: Connection failed"
    fi
    
    # Check Redis connectivity
    echo
    echo "REDIS CONNECTIVITY:"
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        echo "  ✓ Redis: Connected"
    else
        echo "  ✗ Redis: Connection failed"
    fi
    
    # Check recent backups
    echo
    echo "RECENT BACKUPS:"
    local db_backup
    db_backup=$(find "$BACKUP_BASE_DIR/database" -name "*.backup" -o -name "*.sql*" 2>/dev/null | sort -r | head -n 1)
    if [[ -n "$db_backup" ]]; then
        local db_age
        db_age=$(( ($(date +%s) - $(stat -f%m "$db_backup" 2>/dev/null || stat -c%Y "$db_backup")) / 3600 ))
        echo "  Database: $(basename "$db_backup") (${db_age}h ago)"
    else
        echo "  Database: No backups found"
    fi
    
    local file_backup
    file_backup=$(find "$BACKUP_BASE_DIR/files" -name "*.tar.gz" 2>/dev/null | sort -r | head -n 1)
    if [[ -n "$file_backup" ]]; then
        local file_age
        file_age=$(( ($(date +%s) - $(stat -f%m "$file_backup" 2>/dev/null || stat -c%Y "$file_backup")) / 3600 ))
        echo "  Files: $(basename "$file_backup") (${file_age}h ago)"
    else
        echo "  Files: No backups found"
    fi
    
    # Check storage usage
    echo
    echo "STORAGE USAGE:"
    df -h "$BACKUP_BASE_DIR" | tail -n 1 | awk '{print "  Local storage: " $3 " used, " $4 " available (" $5 " used)"}'
    
    # Check cloud connectivity
    if [[ "$CLOUD_BACKUP_ENABLED" == "true" ]]; then
        echo
        echo "CLOUD STORAGE:"
        if aws s3 ls "s3://$CLOUD_BUCKET" >/dev/null 2>&1; then
            echo "  ✓ AWS S3: Connected"
        else
            echo "  ✗ AWS S3: Connection failed"
        fi
    fi
    
    echo
}

# =============================================================================
# BACKUP OPERATIONS
# =============================================================================
perform_backup() {
    local component="$1"
    
    log "INFO" "Starting backup operation for: $component"
    
    case "$component" in
        "database")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would backup database"
            else
                "$SCRIPT_DIR/scripts/backup-database.sh"
            fi
            ;;
        "files")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would backup files"
            else
                "$SCRIPT_DIR/scripts/backup-files.sh"
            fi
            ;;
        "redis")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would backup Redis"
            else
                "$SCRIPT_DIR/scripts/backup-redis.sh"
            fi
            ;;
        "config")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would backup configuration"
            else
                "$SCRIPT_DIR/scripts/backup-config.sh"
            fi
            ;;
        "all")
            for comp in database files redis config; do
                perform_backup "$comp"
            done
            ;;
        *)
            log "ERROR" "Unknown backup component: $component"
            return 1
            ;;
    esac
}

# =============================================================================
# RESTORE OPERATIONS
# =============================================================================
perform_restore() {
    local component="$1"
    
    log "INFO" "Starting restore operation for: $component"
    
    # Confirmation for restore operations
    if [[ "$DRY_RUN" != "true" ]] && [[ "${FORCE:-false}" != "true" ]]; then
        echo "WARNING: This will restore $component from backup."
        echo "This operation may result in data loss!"
        read -p "Are you sure you want to continue? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Restore operation cancelled by user"
            return 0
        fi
    fi
    
    case "$component" in
        "database")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would restore database"
            else
                "$SCRIPT_DIR/scripts/restore-database.sh" -t full
            fi
            ;;
        "files")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would restore files"
            else
                "$SCRIPT_DIR/scripts/restore-files.sh"
            fi
            ;;
        "redis")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would restore Redis"
            else
                "$SCRIPT_DIR/scripts/restore-redis.sh"
            fi
            ;;
        "config")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "INFO" "DRY RUN: Would restore configuration"
            else
                "$SCRIPT_DIR/scripts/restore-config.sh"
            fi
            ;;
        "all")
            for comp in config database redis files; do
                perform_restore "$comp"
            done
            ;;
        *)
            log "ERROR" "Unknown restore component: $component"
            return 1
            ;;
    esac
}

# =============================================================================
# TEST OPERATIONS
# =============================================================================
perform_test() {
    local test_type="$1"
    
    log "INFO" "Starting test operation: $test_type"
    
    case "$test_type" in
        "integrity"|"restoration"|"performance"|"encryption"|"all")
            "$SCRIPT_DIR/scripts/test-backup.sh" -t "$test_type" ${VERBOSE:+--verbose}
            ;;
        *)
            log "ERROR" "Unknown test type: $test_type"
            return 1
            ;;
    esac
}

# =============================================================================
# MONITORING OPERATIONS
# =============================================================================
perform_monitor() {
    log "INFO" "Starting monitoring operation"
    
    show_health
    
    echo
    echo "=== Recent Backup Activity ==="
    
    # Show recent log entries
    if [[ -d "$BACKUP_LOG_DIR" ]]; then
        find "$BACKUP_LOG_DIR" -name "*.log" -mtime -1 -exec tail -n 5 {} \; 2>/dev/null | grep -E "(INFO|WARN|ERROR)" | tail -20
    fi
    
    echo
    echo "=== Backup Schedule Status ==="
    
    # Check if cron jobs are properly configured
    if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
        echo "  ✓ Backup cron jobs are configured"
    else
        echo "  ✗ Backup cron jobs not found"
    fi
}

# =============================================================================
# CLEANUP OPERATIONS
# =============================================================================
perform_cleanup() {
    log "INFO" "Starting cleanup operation"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would cleanup old backups and logs"
        
        # Show what would be cleaned
        echo "Files that would be removed:"
        find "$BACKUP_BASE_DIR" -type f -mtime +${DAILY_RETENTION:-90} 2>/dev/null | head -20
        find "$BACKUP_LOG_DIR" -name "*.log" -mtime +30 2>/dev/null | head -10
    else
        "$SCRIPT_DIR/scripts/cleanup-old-backups.sh"
    fi
}

# =============================================================================
# SETUP OPERATIONS
# =============================================================================
perform_setup() {
    log "INFO" "Starting backup system setup"
    
    echo "=== QoderResume Backup System Setup ==="
    echo
    
    # Create directory structure
    echo "Creating directory structure..."
    local dirs=(
        "$BACKUP_BASE_DIR/database"
        "$BACKUP_BASE_DIR/files"
        "$BACKUP_BASE_DIR/redis"
        "$BACKUP_BASE_DIR/config"
        "$BACKUP_BASE_DIR/wal"
        "$BACKUP_LOG_DIR"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        echo "  Created: $dir"
    done
    
    # Set permissions
    echo
    echo "Setting permissions..."
    chmod 755 "$BACKUP_BASE_DIR"
    chmod 750 "$BACKUP_LOG_DIR"
    
    # Install cron jobs
    echo
    echo "Installing cron jobs..."
    if [[ -f "$SCRIPT_DIR/templates/crontab.template" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "DRY RUN: Would install cron jobs"
        else
            sudo cp "$SCRIPT_DIR/templates/crontab.template" /etc/cron.d/qoder-backup
            sudo chmod 644 /etc/cron.d/qoder-backup
            sudo chown root:root /etc/cron.d/qoder-backup
            sudo systemctl restart cron
            echo "  Cron jobs installed"
        fi
    fi
    
    # Test configuration
    echo
    echo "Testing configuration..."
    check_prerequisites
    
    echo
    echo "Setup completed successfully!"
    echo "You can now run: $0 backup all"
}

# =============================================================================
# STATUS OPERATIONS
# =============================================================================
show_status() {
    log "INFO" "Showing backup system status"
    
    echo "=== QoderResume Backup System Status ==="
    echo
    
    # Show configuration
    echo "CONFIGURATION:"
    echo "  Base directory: $BACKUP_BASE_DIR"
    echo "  Log directory: $BACKUP_LOG_DIR"
    echo "  Database: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Redis: $REDIS_HOST:$REDIS_PORT"
    echo "  Cloud backup: ${CLOUD_BACKUP_ENABLED:-false}"
    echo "  Encryption: ${ENCRYPTION_ENABLED:-false}"
    echo
    
    # Show last backup times
    echo "LAST BACKUP TIMES:"
    local components=("database" "files" "redis" "config")
    
    for comp in "${components[@]}"; do
        local latest_backup
        latest_backup=$(find "$BACKUP_BASE_DIR/$comp" -type f 2>/dev/null | sort -r | head -n 1)
        if [[ -n "$latest_backup" ]]; then
            local backup_time
            backup_time=$(stat -f%m "$latest_backup" 2>/dev/null || stat -c%Y "$latest_backup")
            echo "  $comp: $(date -d "@$backup_time" '+%Y-%m-%d %H:%M:%S')"
        else
            echo "  $comp: Never"
        fi
    done
    
    echo
    show_health
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    # Parse command line arguments
    parse_args "$@"
    
    log "INFO" "QoderResume Backup Orchestrator started"
    log "INFO" "Operation: $OPERATION, Component: $COMPONENT"
    
    # Check prerequisites unless this is a setup operation
    if [[ "$OPERATION" != "setup" ]]; then
        check_prerequisites
    fi
    
    # Execute operation
    case "$OPERATION" in
        "backup")
            perform_backup "$COMPONENT"
            ;;
        "restore")
            perform_restore "$COMPONENT"
            ;;
        "test")
            perform_test "$COMPONENT"
            ;;
        "monitor")
            perform_monitor
            ;;
        "cleanup")
            perform_cleanup
            ;;
        "setup")
            perform_setup
            ;;
        "status")
            show_status
            ;;
        *)
            log "ERROR" "Unknown operation: $OPERATION"
            usage
            exit 1
            ;;
    esac
    
    log "INFO" "Operation completed successfully"
}

# Execute main function with all arguments
main "$@"