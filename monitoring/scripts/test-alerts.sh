#!/bin/bash

# QoderResume Monitoring Alert Testing Script
# This script tests various alert conditions to ensure monitoring is working

set -e

echo "🧪 Testing QoderResume Monitoring Alerts..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if monitoring services are running
check_service() {
    local service_name=$1
    local url=$2
    
    print_status "Checking $service_name..."
    if curl -f "$url" > /dev/null 2>&1; then
        print_success "$service_name is responding"
        return 0
    else
        print_error "$service_name is not responding at $url"
        return 1
    fi
}

# Test Prometheus metrics endpoint
test_prometheus_metrics() {
    print_status "Testing Prometheus metrics collection..."
    
    # Check if application metrics endpoint is available
    if curl -f http://localhost:3001/metrics > /dev/null 2>&1; then
        print_success "Application metrics endpoint is working"
    else
        print_error "Application metrics endpoint is not available"
        echo "  Make sure the QoderResume application is running: npm run dev"
        return 1
    fi
    
    # Check if Prometheus is scraping metrics
    response=$(curl -s "http://localhost:9090/api/v1/query?query=up{job=\"qoder-resume-backend\"}")
    if echo "$response" | grep -q '"value":\[.*,"1"\]'; then
        print_success "Prometheus is successfully scraping application metrics"
    else
        print_error "Prometheus is not scraping application metrics"
        echo "  Response: $response"
        return 1
    fi
}

# Test alert rules
test_alert_rules() {
    print_status "Testing alert rules configuration..."
    
    # Check if alert rules are loaded
    response=$(curl -s "http://localhost:9090/api/v1/rules")
    rule_count=$(echo "$response" | grep -o '"groups":\[' | wc -l)
    
    if [ "$rule_count" -gt 0 ]; then
        print_success "Alert rules are loaded in Prometheus"
        
        # List some key alerts
        echo "  Checking for critical alerts..."
        if echo "$response" | grep -q "ApplicationDown"; then
            echo "    ✓ ApplicationDown alert found"
        fi
        if echo "$response" | grep -q "HighErrorRate"; then
            echo "    ✓ HighErrorRate alert found"
        fi
        if echo "$response" | grep -q "CriticalCPUUsage"; then
            echo "    ✓ CriticalCPUUsage alert found"
        fi
    else
        print_error "No alert rules found in Prometheus"
        return 1
    fi
}

# Test Alertmanager
test_alertmanager() {
    print_status "Testing Alertmanager configuration..."
    
    # Check Alertmanager config
    response=$(curl -s "http://localhost:9093/api/v1/status")
    if echo "$response" | grep -q '"status":"success"'; then
        print_success "Alertmanager is running and configured"
    else
        print_error "Alertmanager configuration issue"
        return 1
    fi
    
    # Check for active alerts
    alerts_response=$(curl -s "http://localhost:9093/api/v1/alerts")
    alert_count=$(echo "$alerts_response" | grep -o '"fingerprint"' | wc -l)
    echo "  Current active alerts: $alert_count"
}

# Test Grafana dashboards
test_grafana() {
    print_status "Testing Grafana dashboards..."
    
    # Check if Grafana is accessible
    if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
        print_success "Grafana is accessible"
        
        # Check for dashboards (requires auth, so just check if the endpoint exists)
        dashboard_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/search)
        if [ "$dashboard_response" = "401" ] || [ "$dashboard_response" = "200" ]; then
            print_success "Grafana API is responding (authentication required for full test)"
            echo "  To test dashboards manually:"
            echo "    1. Go to http://localhost:3002"
            echo "    2. Login with admin/admin123"
            echo "    3. Import dashboards from monitoring/grafana/dashboards/"
        else
            print_error "Grafana API issue (HTTP $dashboard_response)"
            return 1
        fi
    else
        print_error "Grafana is not accessible"
        return 1
    fi
}

# Simulate load to trigger metrics
simulate_load() {
    print_status "Simulating application load to generate metrics..."
    
    # Make multiple requests to generate HTTP metrics
    for i in {1..10}; do
        curl -s http://localhost:3001/api/health > /dev/null 2>&1 || true
        curl -s http://localhost:3000/ > /dev/null 2>&1 || true
        sleep 0.5
    done
    
    print_success "Load simulation completed"
    echo "  Check metrics in Grafana to see if data is being collected"
}

# Generate test alert (simulate high error rate)
test_error_alert() {
    print_status "Testing error rate alerting (optional - requires app to be running)..."
    
    # Try to generate some 404 errors
    for i in {1..5}; do
        curl -s http://localhost:3001/api/nonexistent-endpoint > /dev/null 2>&1 || true
        sleep 1
    done
    
    echo "  Generated test errors. Check Alertmanager for alerts in a few minutes:"
    echo "    http://localhost:9093/#/alerts"
}

# Main test execution
main() {
    echo "Starting monitoring system tests..."
    echo ""
    
    # Basic service checks
    check_service "Prometheus" "http://localhost:9090/-/ready"
    check_service "Grafana" "http://localhost:3002/api/health"
    check_service "Alertmanager" "http://localhost:9093/-/ready"
    
    echo ""
    
    # Detailed tests
    test_prometheus_metrics
    echo ""
    
    test_alert_rules
    echo ""
    
    test_alertmanager
    echo ""
    
    test_grafana
    echo ""
    
    simulate_load
    echo ""
    
    # Optional: Test error alerting
    read -p "Do you want to test error alerting? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_error_alert
        echo ""
    fi
    
    echo "🎉 Monitoring test completed!"
    echo ""
    echo "📋 Manual verification steps:"
    echo "  1. Open Grafana: http://localhost:3002 (admin/admin123)"
    echo "  2. Import dashboards from monitoring/grafana/dashboards/"
    echo "  3. Check Prometheus targets: http://localhost:9090/targets"
    echo "  4. Review alert rules: http://localhost:9090/alerts"
    echo "  5. Monitor alerts: http://localhost:9093/#/alerts"
    echo ""
    echo "📊 To create a comprehensive test:"
    echo "  1. Start load testing: cd load-testing && npm run test"
    echo "  2. Monitor dashboards during load test"
    echo "  3. Verify alerts trigger appropriately"
}

# Run main function
main "$@"