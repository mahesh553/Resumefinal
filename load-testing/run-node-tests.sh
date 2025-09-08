#!/bin/bash

# QoderResume Load Testing Runner
# This script provides an alternative to K6 using Node.js

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
LOAD_TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to check if backend is running
check_backend() {
    log "Checking if backend is running at $BACKEND_URL..."
    
    if curl -f -s "$BACKEND_URL/api/health" >/dev/null 2>&1; then
        success "Backend is accessible"
        return 0
    else
        error "Backend is not accessible at $BACKEND_URL"
        error "Please start the backend with: npm run dev:backend"
        return 1
    fi
}

# Function to install dependencies
install_deps() {
    log "Installing load test dependencies..."
    cd "$LOAD_TEST_DIR"
    
    if [ ! -f "package.json" ]; then
        error "package.json not found in load testing directory"
        return 1
    fi
    
    npm install
    success "Dependencies installed"
}

# Function to run different test types
run_test() {
    local test_type="$1"
    local concurrent_users="$2"
    local duration="$3"
    
    log "Running $test_type test..."
    log "Concurrent Users: $concurrent_users"
    log "Duration: ${duration}s"
    
    cd "$LOAD_TEST_DIR"
    
    BACKEND_URL="$BACKEND_URL" \
    CONCURRENT_USERS="$concurrent_users" \
    TEST_DURATION="$duration" \
    node node-load-test.js
    
    if [ $? -eq 0 ]; then
        success "$test_type test completed successfully"
    else
        error "$test_type test failed"
        return 1
    fi
}

# Main function
main() {
    local test_type="${1:-smoke}"
    
    log "Starting QoderResume Load Testing"
    log "Test Type: $test_type"
    log "Backend URL: $BACKEND_URL"
    
    # Check backend availability
    if ! check_backend; then
        exit 1
    fi
    
    # Install dependencies
    if ! install_deps; then
        exit 1
    fi
    
    # Run tests based on type
    case "$test_type" in
        "smoke")
            run_test "smoke" 5 60
            ;;
        "load")
            run_test "load" 20 300
            ;;
        "stress")
            run_test "stress" 50 600
            ;;
        "spike")
            run_test "spike" 100 120
            ;;
        "custom")
            local users="${2:-10}"
            local duration="${3:-300}"
            run_test "custom" "$users" "$duration"
            ;;
        *)
            error "Unknown test type: $test_type"
            echo "Usage: $0 [smoke|load|stress|spike|custom] [users] [duration]"
            echo ""
            echo "Examples:"
            echo "  $0 smoke                    # Quick 5-user, 1-minute test"
            echo "  $0 load                     # 20-user, 5-minute test"
            echo "  $0 stress                   # 50-user, 10-minute test"
            echo "  $0 spike                    # 100-user, 2-minute burst test"
            echo "  $0 custom 30 180           # Custom 30-user, 3-minute test"
            exit 1
            ;;
    esac
    
    success "Load testing completed!"
    log "Check the reports/results directory for detailed reports"
}

# Run main function with all arguments
main "$@"