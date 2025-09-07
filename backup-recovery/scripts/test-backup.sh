#!/bin/bash
# QoderResume Backup Testing Script
# Automated testing of backup integrity and restoration procedures

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
TEST_DB_NAME="${TEST_DATABASE_NAME:-qoder_resume_test}"

# =============================================================================
# TEST CONFIGURATION
# =============================================================================
TEST_TYPES=("integrity" "restoration" "performance" "encryption")
SELECTED_TESTS=""
VERBOSE=false
CLEANUP_AFTER=true
TEST_RESULTS_DIR="$BACKUP_BASE_DIR/test-results"

# =============================================================================
# COMMAND LINE ARGUMENTS
# =============================================================================
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -t, --tests TESTS        Comma-separated list of tests to run
                            Available: integrity,restoration,performance,encryption,all
    -v, --verbose           Enable verbose output
    --no-cleanup           Don't cleanup test artifacts after completion
    -h, --help             Show this help message

Examples:
    $0 -t integrity,restoration
    $0 -t all -v
    $0 --no-cleanup
    
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tests)
            SELECTED_TESTS="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP_AFTER=false
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
LOG_FILE="${BACKUP_LOG_DIR}/test_${TIMESTAMP}.log"
TEST_REPORT="$TEST_RESULTS_DIR/test_report_${TIMESTAMP}.html"

# Ensure directories exist
mkdir -p "$BACKUP_LOG_DIR" "$TEST_RESULTS_DIR"

# Logging function
log() {
    local level="$1"
    shift
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo "$message" | tee -a "$LOG_FILE"
    
    if [[ "$VERBOSE" == "true" ]] || [[ "$level" == "ERROR" ]] || [[ "$level" == "WARN" ]]; then
        echo "$message"
    fi
}

# =============================================================================
# TEST RESULT TRACKING
# =============================================================================
declare -A TEST_RESULTS
declare -A TEST_DURATIONS
declare -A TEST_DETAILS

record_test_result() {
    local test_name="$1"
    local result="$2"  # PASS, FAIL, SKIP
    local duration="$3"
    local details="$4"
    
    TEST_RESULTS["$test_name"]="$result"
    TEST_DURATIONS["$test_name"]="$duration"
    TEST_DETAILS["$test_name"]="$details"
    
    log "INFO" "Test '$test_name': $result (${duration}s)"
}

# =============================================================================
# NOTIFICATION FUNCTIONS
# =============================================================================
send_test_notification() {
    local severity="$1"
    local subject="$2"
    local message="$3"
    
    if [[ "$MONITORING_ENABLED" == "true" ]]; then
        # Email notification
        if [[ -n "${TEST_NOTIFICATION_EMAIL:-}" ]]; then
            echo "$message" | mail -s "[$severity] QoderResume Backup Test: $subject" "$TEST_NOTIFICATION_EMAIL"
        fi
    fi
}

# =============================================================================
# BACKUP DISCOVERY
# =============================================================================
find_latest_backups() {
    local db_backup=""
    local file_backup=""
    
    # Find latest database backup
    db_backup=$(find "$BACKUP_BASE_DIR/database" -name "*.backup" -o -name "*.sql*" | sort -r | head -n 1)
    
    # Find latest file backup
    file_backup=$(find "$BACKUP_BASE_DIR/files" -name "*.tar.gz" -o -name "*.zip" | sort -r | head -n 1)
    
    echo "$db_backup|$file_backup"
}

# =============================================================================
# INTEGRITY TESTING
# =============================================================================
test_backup_integrity() {
    local test_start_time=$(date +%s)
    log "INFO" "Starting backup integrity tests"
    
    local backups
    backups=$(find_latest_backups)
    IFS='|' read -ra BACKUP_ARRAY <<< "$backups"
    local db_backup="${BACKUP_ARRAY[0]}"
    local file_backup="${BACKUP_ARRAY[1]}"
    
    local failed_tests=0
    local total_tests=0
    
    # Test database backup integrity
    if [[ -f "$db_backup" ]]; then
        total_tests=$((total_tests + 1))
        log "INFO" "Testing database backup integrity: $db_backup"
        
        case "$db_backup" in
            *.backup)
                if pg_restore --list "$db_backup" >/dev/null 2>&1; then
                    log "INFO" "Database backup integrity: PASS"
                else
                    log "ERROR" "Database backup integrity: FAIL"
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            *.sql.gz)
                if gunzip -t "$db_backup" 2>/dev/null; then
                    log "INFO" "Database backup compression integrity: PASS"
                else
                    log "ERROR" "Database backup compression integrity: FAIL"
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            *.sql)
                if [[ -s "$db_backup" ]]; then
                    log "INFO" "Database backup file integrity: PASS"
                else
                    log "ERROR" "Database backup file integrity: FAIL"
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
        esac
    else
        log "WARN" "No database backup found for integrity testing"
    fi
    
    # Test file backup integrity
    if [[ -f "$file_backup" ]]; then
        total_tests=$((total_tests + 1))
        log "INFO" "Testing file backup integrity: $file_backup"
        
        case "$file_backup" in
            *.tar.gz)
                if tar -tzf "$file_backup" >/dev/null 2>&1; then
                    log "INFO" "File backup integrity: PASS"
                else
                    log "ERROR" "File backup integrity: FAIL"
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            *.zip)
                if unzip -t "$file_backup" >/dev/null 2>&1; then
                    log "INFO" "File backup integrity: PASS"
                else
                    log "ERROR" "File backup integrity: FAIL"
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
        esac
    else
        log "WARN" "No file backup found for integrity testing"
    fi
    
    # Test checksum files
    local checksum_files
    checksum_files=$(find "$BACKUP_BASE_DIR" -name "checksums.sha256" -newer "$db_backup" 2>/dev/null)
    
    for checksum_file in $checksum_files; do
        total_tests=$((total_tests + 1))
        log "INFO" "Verifying checksums: $checksum_file"
        
        local checksum_dir
        checksum_dir=$(dirname "$checksum_file")
        
        if (cd "$checksum_dir" && sha256sum -c "checksums.sha256" >/dev/null 2>&1); then
            log "INFO" "Checksum verification: PASS"
        else
            log "ERROR" "Checksum verification: FAIL"
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    local result="PASS"
    if [[ $failed_tests -gt 0 ]]; then
        result="FAIL"
    elif [[ $total_tests -eq 0 ]]; then
        result="SKIP"
    fi
    
    record_test_result "integrity" "$result" "$test_duration" "$failed_tests/$total_tests tests failed"
}

# =============================================================================
# RESTORATION TESTING
# =============================================================================
test_backup_restoration() {
    local test_start_time=$(date +%s)
    log "INFO" "Starting backup restoration tests"
    
    local backups
    backups=$(find_latest_backups)
    IFS='|' read -ra BACKUP_ARRAY <<< "$backups"
    local db_backup="${BACKUP_ARRAY[0]}"
    
    if [[ ! -f "$db_backup" ]]; then
        log "WARN" "No database backup found for restoration testing"
        record_test_result "restoration" "SKIP" "0" "No backup file found"
        return
    fi
    
    log "INFO" "Testing restoration of: $db_backup"
    
    # Create test database
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop test database if exists
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS \"$TEST_DB_NAME\";" 2>/dev/null || true
    
    # Create test database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"$TEST_DB_NAME\" OWNER \"$DB_USER\";"
    
    local restoration_success=true
    
    # Perform test restoration
    case "$db_backup" in
        *.backup)
            if ! pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
                --verbose "$db_backup" 2>/dev/null; then
                restoration_success=false
            fi
            ;;
        *.sql.gz)
            if ! gunzip -c "$db_backup" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" 2>/dev/null; then
                restoration_success=false
            fi
            ;;
        *.sql)
            if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" -f "$db_backup" 2>/dev/null; then
                restoration_success=false
            fi
            ;;
    esac
    
    # Validate restoration
    local table_count=0
    if [[ "$restoration_success" == "true" ]]; then
        table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" \
            -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs || echo "0")
        
        if [[ "$table_count" -eq 0 ]]; then
            restoration_success=false
        fi
    fi
    
    # Cleanup test database
    if [[ "$CLEANUP_AFTER" == "true" ]]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS \"$TEST_DB_NAME\";" 2>/dev/null || true
    fi
    
    unset PGPASSWORD
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    local result="PASS"
    local details="Restored $table_count tables successfully"
    
    if [[ "$restoration_success" != "true" ]]; then
        result="FAIL"
        details="Restoration failed"
    fi
    
    record_test_result "restoration" "$result" "$test_duration" "$details"
}

# =============================================================================
# PERFORMANCE TESTING
# =============================================================================
test_backup_performance() {
    local test_start_time=$(date +%s)
    log "INFO" "Starting backup performance tests"
    
    local backups
    backups=$(find_latest_backups)
    IFS='|' read -ra BACKUP_ARRAY <<< "$backups"
    local db_backup="${BACKUP_ARRAY[0]}"
    local file_backup="${BACKUP_ARRAY[1]}"
    
    local performance_issues=0
    
    # Test database backup size and time
    if [[ -f "$db_backup" ]]; then
        local backup_dir
        backup_dir=$(dirname "$db_backup")
        
        if [[ -f "$backup_dir/metadata.json" ]]; then
            local duration
            duration=$(grep -o '"duration_seconds": *[0-9]*' "$backup_dir/metadata.json" | grep -o '[0-9]*' || echo "0")
            
            local file_size
            file_size=$(stat -f%z "$db_backup" 2>/dev/null || stat -c%s "$db_backup" 2>/dev/null || echo "0")
            
            log "INFO" "Database backup duration: ${duration}s, size: $(numfmt --to=iec-i --suffix=B $file_size)"
            
            # Check against thresholds
            if [[ $duration -gt ${BACKUP_TIME_WARNING_THRESHOLD:-3600} ]]; then
                log "WARN" "Database backup took longer than expected: ${duration}s"
                performance_issues=$((performance_issues + 1))
            fi
            
            # Check backup size reasonableness (should be > 1MB for real data)
            if [[ $file_size -lt 1048576 ]]; then
                log "WARN" "Database backup size seems too small: $(numfmt --to=iec-i --suffix=B $file_size)"
                performance_issues=$((performance_issues + 1))
            fi
        fi
    fi
    
    # Test file backup performance
    if [[ -f "$file_backup" ]]; then
        local backup_dir
        backup_dir=$(dirname "$file_backup")
        
        if [[ -f "$backup_dir/metadata.json" ]]; then
            local duration
            duration=$(grep -o '"duration_seconds": *[0-9]*' "$backup_dir/metadata.json" | grep -o '[0-9]*' || echo "0")
            
            log "INFO" "File backup duration: ${duration}s"
            
            if [[ $duration -gt ${BACKUP_TIME_WARNING_THRESHOLD:-3600} ]]; then
                log "WARN" "File backup took longer than expected: ${duration}s"
                performance_issues=$((performance_issues + 1))
            fi
        fi
    fi
    
    # Test restore performance
    local restore_start_time=$(date +%s)
    if [[ -f "$db_backup" ]]; then
        # Quick validation restore (just check if it can be read)
        case "$db_backup" in
            *.backup)
                pg_restore --list "$db_backup" >/dev/null 2>&1
                ;;
            *.sql.gz)
                gunzip -t "$db_backup" 2>/dev/null
                ;;
        esac
    fi
    local restore_end_time=$(date +%s)
    local restore_duration=$((restore_end_time - restore_start_time))
    
    log "INFO" "Backup validation duration: ${restore_duration}s"
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    local result="PASS"
    local details="$performance_issues performance issues found"
    
    if [[ $performance_issues -gt 0 ]]; then
        result="WARN"
    fi
    
    record_test_result "performance" "$result" "$test_duration" "$details"
}

# =============================================================================
# ENCRYPTION TESTING
# =============================================================================
test_backup_encryption() {
    local test_start_time=$(date +%s)
    log "INFO" "Starting backup encryption tests"
    
    if [[ "$ENCRYPTION_ENABLED" != "true" ]]; then
        log "INFO" "Encryption not enabled, skipping encryption tests"
        record_test_result "encryption" "SKIP" "0" "Encryption disabled"
        return
    fi
    
    local encrypted_files
    encrypted_files=$(find "$BACKUP_BASE_DIR" -name "*.gpg" -newer "$BACKUP_BASE_DIR" 2>/dev/null | wc -l)
    
    local encryption_issues=0
    
    # Check if encrypted files exist
    if [[ $encrypted_files -eq 0 ]]; then
        log "WARN" "No encrypted backup files found"
        encryption_issues=$((encryption_issues + 1))
    else
        log "INFO" "Found $encrypted_files encrypted backup files"
        
        # Test decryption of a sample file
        local sample_encrypted
        sample_encrypted=$(find "$BACKUP_BASE_DIR" -name "*.gpg" | head -n 1)
        
        if [[ -f "$sample_encrypted" ]]; then
            local test_decrypt_file="$TEST_RESULTS_DIR/test_decrypt_${TIMESTAMP}"
            
            if gpg --quiet --batch --yes --decrypt --output "$test_decrypt_file" "$sample_encrypted" 2>/dev/null; then
                log "INFO" "Sample file decryption: PASS"
                rm -f "$test_decrypt_file"
            else
                log "ERROR" "Sample file decryption: FAIL"
                encryption_issues=$((encryption_issues + 1))
            fi
        fi
    fi
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    local result="PASS"
    local details="$encryption_issues encryption issues found"
    
    if [[ $encryption_issues -gt 0 ]]; then
        result="FAIL"
    fi
    
    record_test_result "encryption" "$result" "$test_duration" "$details"
}

# =============================================================================
# HTML REPORT GENERATION
# =============================================================================
generate_html_report() {
    log "INFO" "Generating HTML test report"
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0
    
    for test_name in "${!TEST_RESULTS[@]}"; do
        total_tests=$((total_tests + 1))
        case "${TEST_RESULTS[$test_name]}" in
            "PASS") passed_tests=$((passed_tests + 1)) ;;
            "FAIL") failed_tests=$((failed_tests + 1)) ;;
            "SKIP") skipped_tests=$((skipped_tests + 1)) ;;
        esac
    done
    
    cat > "$TEST_REPORT" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>QoderResume Backup Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #007acc; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { padding: 15px; border-radius: 5px; text-align: center; min-width: 100px; }
        .pass { background-color: #d4edda; color: #155724; }
        .fail { background-color: #f8d7da; color: #721c24; }
        .skip { background-color: #fff3cd; color: #856404; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
        th { background: #f2f2f2; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .status-skip { color: #ffc107; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>QoderResume Backup Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Run ID: $TIMESTAMP</p>
    </div>
    
    <div class="summary">
        <div class="metric pass">
            <h3>$passed_tests</h3>
            <p>Passed</p>
        </div>
        <div class="metric fail">
            <h3>$failed_tests</h3>
            <p>Failed</p>
        </div>
        <div class="metric skip">
            <h3>$skipped_tests</h3>
            <p>Skipped</p>
        </div>
        <div class="metric">
            <h3>$total_tests</h3>
            <p>Total</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration (s)</th>
            <th>Details</th>
        </tr>
EOF

    for test_name in "${!TEST_RESULTS[@]}"; do
        local status="${TEST_RESULTS[$test_name]}"
        local duration="${TEST_DURATIONS[$test_name]}"
        local details="${TEST_DETAILS[$test_name]}"
        local status_class="status-$(echo "$status" | tr '[:upper:]' '[:lower:]')"
        
        cat >> "$TEST_REPORT" << EOF
        <tr>
            <td>$test_name</td>
            <td class="$status_class">$status</td>
            <td>$duration</td>
            <td>$details</td>
        </tr>
EOF
    done
    
    cat >> "$TEST_REPORT" << EOF
    </table>
    
    <h2>System Information</h2>
    <table>
        <tr><td>Hostname</td><td>$(hostname)</td></tr>
        <tr><td>OS</td><td>$(uname -s) $(uname -r)</td></tr>
        <tr><td>Database</td><td>PostgreSQL</td></tr>
        <tr><td>Backup Directory</td><td>$BACKUP_BASE_DIR</td></tr>
        <tr><td>Log File</td><td>$LOG_FILE</td></tr>
    </table>
    
    <h2>Recommendations</h2>
    <ul>
EOF

    if [[ $failed_tests -gt 0 ]]; then
        cat >> "$TEST_REPORT" << EOF
        <li style="color: #dc3545;">Address failed tests immediately - backup system may not be reliable</li>
EOF
    fi
    
    if [[ $skipped_tests -gt 0 ]]; then
        cat >> "$TEST_REPORT" << EOF
        <li style="color: #ffc107;">Review skipped tests and ensure all backup components are properly configured</li>
EOF
    fi
    
    if [[ $failed_tests -eq 0 ]] && [[ $skipped_tests -eq 0 ]]; then
        cat >> "$TEST_REPORT" << EOF
        <li style="color: #28a745;">All tests passed - backup system is functioning correctly</li>
EOF
    fi
    
    cat >> "$TEST_REPORT" << EOF
        <li>Schedule regular backup testing (weekly recommended)</li>
        <li>Monitor backup performance trends</li>
        <li>Verify cloud storage accessibility</li>
    </ul>
</body>
</html>
EOF

    log "INFO" "HTML report generated: $TEST_REPORT"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log "INFO" "Starting QoderResume backup testing"
    
    # Determine which tests to run
    local tests_to_run=()
    
    if [[ -z "$SELECTED_TESTS" ]] || [[ "$SELECTED_TESTS" == "all" ]]; then
        tests_to_run=("${TEST_TYPES[@]}")
    else
        IFS=',' read -ra tests_to_run <<< "$SELECTED_TESTS"
    fi
    
    log "INFO" "Running tests: ${tests_to_run[*]}"
    
    # Run selected tests
    for test_type in "${tests_to_run[@]}"; do
        case "$test_type" in
            "integrity")
                test_backup_integrity
                ;;
            "restoration")
                test_backup_restoration
                ;;
            "performance")
                test_backup_performance
                ;;
            "encryption")
                test_backup_encryption
                ;;
            *)
                log "WARN" "Unknown test type: $test_type"
                ;;
        esac
    done
    
    # Generate report
    generate_html_report
    
    # Calculate overall result
    local overall_result="PASS"
    for test_name in "${!TEST_RESULTS[@]}"; do
        if [[ "${TEST_RESULTS[$test_name]}" == "FAIL" ]]; then
            overall_result="FAIL"
            break
        fi
    done
    
    # Send notification
    local total_tests=${#TEST_RESULTS[@]}
    local summary="$total_tests tests completed. Overall result: $overall_result"
    
    if [[ "$overall_result" == "FAIL" ]]; then
        send_test_notification "CRITICAL" "Backup tests failed" "$summary"
    else
        send_test_notification "INFO" "Backup tests completed" "$summary"
    fi
    
    log "INFO" "Backup testing completed. Overall result: $overall_result"
    log "INFO" "Test report available at: $TEST_REPORT"
    
    # Exit with appropriate code
    if [[ "$overall_result" == "FAIL" ]]; then
        exit 1
    fi
}

# Run main function
main "$@"