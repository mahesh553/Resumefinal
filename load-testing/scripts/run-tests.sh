#!/bin/bash
# QoderResume Load Testing Execution Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOAD_TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="${LOAD_TEST_DIR}/reports/results"
CONFIG_DIR="${LOAD_TEST_DIR}/configs"

# Default test parameters
TEST_TYPE="all"
ENVIRONMENT="local"
SKIP_SETUP=false
CLEANUP_AFTER=true

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
QoderResume Load Testing Script

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --type TYPE         Test type: smoke|load|stress|spike|component|integration|scale|all (default: all)
    -e, --env ENV          Environment: local|staging|prod (default: local) 
    --skip-setup           Skip environment setup
    --no-cleanup           Skip cleanup after tests
    -h, --help             Show this help message

EXAMPLES:
    $0                           # Run all tests with default settings
    $0 -t smoke                  # Run only smoke tests
    $0 -t component --skip-setup # Run component tests without setup
    $0 -e staging -t load        # Run load tests against staging

TEST TYPES:
    smoke       - Quick validation tests (5 minutes)
    load        - Normal load tests (15 minutes) 
    stress      - Stress testing (30 minutes)
    spike       - Spike load testing (10 minutes)
    component   - Component-level tests (20 minutes)
    integration - Integration workflow tests (25 minutes)
    scale       - Concurrent users scale tests (45 minutes)
    all         - Complete test suite (2+ hours)
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                TEST_TYPE="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --skip-setup)
                SKIP_SETUP=true
                shift
                ;;
            --no-cleanup)
                CLEANUP_AFTER=false
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Environment setup
setup_environment() {
    if [[ "$SKIP_SETUP" == "true" ]]; then
        print_status "Skipping environment setup"
        return
    fi

    print_status "Setting up load testing environment..."

    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    # Load environment variables
    if [[ -f "$CONFIG_DIR/environment.env" ]]; then
        set -a
        source "$CONFIG_DIR/environment.env"
        set +a
        print_success "Environment variables loaded"
    else
        print_warning "Environment file not found, using defaults"
    fi

    # Check if K6 is installed
    if ! command -v k6 &> /dev/null; then
        print_error "K6 is not installed. Please install K6 first."
        print_status "Install K6: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    # Check if Artillery is installed (optional)
    if ! command -v artillery &> /dev/null; then
        print_warning "Artillery not found. Artillery tests will be skipped."
    fi

    # Check application availability
    check_application_availability
    
    print_success "Environment setup complete"
}

# Check if the application is running and accessible
check_application_availability() {
    local backend_url="${BACKEND_URL:-http://localhost:3001}"
    local frontend_url="${FRONTEND_URL:-http://localhost:3000}"

    print_status "Checking application availability..."

    # Check backend health
    if curl -f -s "$backend_url/health" >/dev/null 2>&1; then
        print_success "Backend is accessible at $backend_url"
    else
        print_error "Backend is not accessible at $backend_url"
        print_status "Please ensure the application is running: npm run dev"
        exit 1
    fi

    # Check frontend (optional check)
    if curl -f -s "$frontend_url" >/dev/null 2>&1; then
        print_success "Frontend is accessible at $frontend_url"
    else
        print_warning "Frontend may not be accessible at $frontend_url"
    fi
}

# Run smoke tests
run_smoke_tests() {
    print_status "Running smoke tests..."
    
    k6 run --config "$CONFIG_DIR/k6.json" \
        --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
        --duration 5m \
        --vus 5 \
        "$LOAD_TEST_DIR/k6/component/api-endpoints.js"
    
    print_success "Smoke tests completed"
}

# Run component tests
run_component_tests() {
    print_status "Running component-level tests..."
    
    local component_tests=(
        "api-endpoints.js"
        "ai-services.js" 
        "database-operations.js"
    )
    
    for test in "${component_tests[@]}"; do
        print_status "Running $test..."
        
        k6 run --config "$CONFIG_DIR/k6.json" \
            --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
            --out json="$REPORTS_DIR/component-${test%.js}-$(date +%Y%m%d-%H%M%S).json" \
            "$LOAD_TEST_DIR/k6/component/$test"
    done
    
    print_success "Component tests completed"
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    local integration_tests=(
        "user-journey.js"
        "admin-workflows.js"
    )
    
    for test in "${integration_tests[@]}"; do
        print_status "Running $test..."
        
        k6 run --config "$CONFIG_DIR/k6.json" \
            --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
            --out json="$REPORTS_DIR/integration-${test%.js}-$(date +%Y%m%d-%H%M%S).json" \
            "$LOAD_TEST_DIR/k6/integration/$test"
    done
    
    print_success "Integration tests completed"
}

# Run scale tests
run_scale_tests() {
    print_status "Running scale tests..."
    
    k6 run --config "$CONFIG_DIR/k6.json" \
        --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
        --out json="$REPORTS_DIR/scale-concurrent-users-$(date +%Y%m%d-%H%M%S).json" \
        "$LOAD_TEST_DIR/k6/scale/concurrent-users.js"
    
    print_success "Scale tests completed"
}

# Run load tests (normal traffic simulation)
run_load_tests() {
    print_status "Running load tests..."
    
    k6 run --config "$CONFIG_DIR/k6.json" \
        --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
        --stages '[
            {"duration": "2m", "target": 50},
            {"duration": "10m", "target": 100}, 
            {"duration": "2m", "target": 0}
        ]' \
        --out json="$REPORTS_DIR/load-test-$(date +%Y%m%d-%H%M%S).json" \
        "$LOAD_TEST_DIR/k6/integration/user-journey.js"
    
    print_success "Load tests completed"
}

# Run stress tests (high traffic simulation)
run_stress_tests() {
    print_status "Running stress tests..."
    
    k6 run --config "$CONFIG_DIR/k6.json" \
        --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
        --stages '[
            {"duration": "5m", "target": 100},
            {"duration": "10m", "target": 300},
            {"duration": "10m", "target": 500},
            {"duration": "5m", "target": 0}
        ]' \
        --out json="$REPORTS_DIR/stress-test-$(date +%Y%m%d-%H%M%S).json" \
        "$LOAD_TEST_DIR/k6/integration/user-journey.js"
    
    print_success "Stress tests completed"
}

# Run spike tests (sudden traffic bursts)
run_spike_tests() {
    print_status "Running spike tests..."
    
    k6 run --config "$CONFIG_DIR/k6.json" \
        --env BACKEND_URL="${BACKEND_URL:-http://localhost:3001}" \
        --stages '[
            {"duration": "2m", "target": 100},
            {"duration": "1m", "target": 1000},
            {"duration": "2m", "target": 1000}, 
            {"duration": "1m", "target": 100},
            {"duration": "2m", "target": 0}
        ]' \
        --out json="$REPORTS_DIR/spike-test-$(date +%Y%m%d-%H%M%S).json" \
        "$LOAD_TEST_DIR/k6/integration/user-journey.js"
    
    print_success "Spike tests completed"
}

# Generate consolidated report
generate_report() {
    print_status "Generating consolidated test report..."
    
    local report_file="$REPORTS_DIR/consolidated-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>QoderResume Load Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #007acc; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { background-color: #d4edda; border-color: #c3e6cb; }
        .fail { background-color: #f8d7da; border-color: #f5c6cb; }
        .warning { background-color: #fff3cd; border-color: #ffeeba; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border-radius: 5px; background: #f8f9fa; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>QoderResume Load Testing Report</h1>
        <p>Generated on: $(date)</p>
        <p>Test Type: $TEST_TYPE | Environment: $ENVIRONMENT</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <p>Load testing completed for QoderResume platform.</p>
        <p>Check individual test result files in the reports directory for detailed metrics.</p>
    </div>
    
    <div class="section">
        <h2>Files Generated</h2>
        <ul>
EOF

    # List all result files
    find "$REPORTS_DIR" -name "*.json" -newer "$0" | while read -r file; do
        echo "            <li>$(basename "$file")</li>" >> "$report_file"
    done

    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <ol>
            <li>Review individual test results for performance metrics</li>
            <li>Check for any failed thresholds or error patterns</li>
            <li>Analyze system resource usage during tests</li>
            <li>Optimize identified bottlenecks</li>
            <li>Re-run tests after optimizations</li>
        </ol>
    </div>
</body>
</html>
EOF

    print_success "Report generated: $report_file"
}

# Cleanup function
cleanup() {
    if [[ "$CLEANUP_AFTER" == "true" ]]; then
        print_status "Performing cleanup..."
        # Add any cleanup tasks here if needed
        print_success "Cleanup completed"
    fi
}

# Main execution function
main() {
    print_status "Starting QoderResume Load Testing"
    print_status "Test Type: $TEST_TYPE | Environment: $ENVIRONMENT"
    
    setup_environment
    
    # Run tests based on type
    case "$TEST_TYPE" in
        smoke)
            run_smoke_tests
            ;;
        load)
            run_load_tests
            ;;
        stress)
            run_stress_tests
            ;;
        spike)
            run_spike_tests
            ;;
        component)
            run_component_tests
            ;;
        integration)
            run_integration_tests
            ;;
        scale)
            run_scale_tests
            ;;
        all)
            print_status "Running complete test suite..."
            run_smoke_tests
            run_component_tests
            run_integration_tests
            run_load_tests
            run_stress_tests
            run_spike_tests
            run_scale_tests
            ;;
        *)
            print_error "Unknown test type: $TEST_TYPE"
            show_usage
            exit 1
            ;;
    esac
    
    generate_report
    cleanup
    
    print_success "Load testing completed successfully!"
    print_status "Check the reports directory for detailed results: $REPORTS_DIR"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Parse arguments and run main function
parse_args "$@"
main