#!/bin/bash

# QoderResume Monitoring Infrastructure Validation Script
# This script validates the entire monitoring setup

set -e

echo "🔍 Validating QoderResume Monitoring Infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[VALIDATE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
}

VALIDATION_ERRORS=0

# Function to report validation error
validation_error() {
    print_error "$1"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
}

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_success "$description exists: $file"
        return 0
    else
        validation_error "$description missing: $file"
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        print_success "$description exists: $dir"
        return 0
    else
        validation_error "$description missing: $dir"
        return 1
    fi
}

echo ""
echo "📁 Validating File Structure..."

# Check monitoring directories
check_directory "monitoring" "Monitoring root directory"
check_directory "monitoring/scripts" "Monitoring scripts directory"
check_directory "monitoring/grafana/dashboards" "Grafana dashboards directory"
check_directory "monitoring/grafana/provisioning" "Grafana provisioning directory"
check_directory "monitoring/prometheus" "Prometheus directory"
check_directory "monitoring/alertmanager" "Alertmanager directory"
check_directory "monitoring/logging" "Logging directory"
check_directory "logs" "Application logs directory"

# Check key configuration files
echo ""
echo "⚙️ Validating Configuration Files..."

check_file "monitoring/docker-compose.monitoring.yml" "Monitoring Docker Compose"
check_file "monitoring/docker-compose.logging.yml" "Logging Docker Compose"
check_file "monitoring/alertmanager/alertmanager.yml" "Alertmanager configuration"
check_file "monitoring/prometheus/production-alert-rules.yml" "Production alert rules"
check_file "load-testing/monitoring/prometheus/prometheus.yml" "Prometheus configuration"

# Check Grafana dashboards
check_file "monitoring/grafana/dashboards/production-monitoring.json" "Production monitoring dashboard"
check_file "monitoring/grafana/dashboards/application-dashboard.json" "Application dashboard"
check_file "monitoring/grafana/dashboards/alerts-sla-dashboard.json" "Alerts & SLA dashboard"

# Check Grafana provisioning
check_file "monitoring/grafana/provisioning/datasources/prometheus.yml" "Grafana datasource configuration"
check_file "monitoring/grafana/provisioning/dashboards/qoder-resume.yml" "Grafana dashboard provider"

# Check logging configuration
check_file "monitoring/logging/logstash/config/logstash.yml" "Logstash configuration"
check_file "monitoring/logging/logstash/pipeline/logstash.conf" "Logstash pipeline"
check_file "monitoring/logging/filebeat/config/filebeat.yml" "Filebeat configuration"
check_file "monitoring/logging/kibana/config/kibana.yml" "Kibana configuration"

# Check scripts
check_file "monitoring/scripts/start-monitoring.sh" "Linux monitoring startup script"
check_file "monitoring/scripts/start-monitoring.bat" "Windows monitoring startup script"
check_file "monitoring/scripts/test-alerts.sh" "Alert testing script"

# Check backend monitoring code
echo ""
echo "💻 Validating Backend Monitoring Code..."

check_file "src/backend/common/services/metrics.service.ts" "Metrics service"
check_file "src/backend/common/services/apm.service.ts" "APM service"
check_file "src/backend/common/controllers/metrics.controller.ts" "Metrics controller"
check_file "src/backend/common/interceptors/metrics.interceptor.ts" "Metrics interceptor"
check_file "src/backend/common/interceptors/logging.interceptor.ts" "Logging interceptor"
check_file "src/backend/common/middleware/performance.middleware.ts" "Performance middleware"
check_file "src/backend/common/monitoring.module.ts" "Monitoring module"

# Check documentation
echo ""
echo "📚 Validating Documentation..."

check_file "monitoring/MONITORING_GUIDE.md" "Monitoring guide"

# Validate YAML syntax
echo ""
echo "🔧 Validating Configuration Syntax..."

validate_yaml() {
    local file=$1
    local description=$2
    
    if command -v yq > /dev/null 2>&1; then
        if yq eval '.' "$file" > /dev/null 2>&1; then
            print_success "$description has valid YAML syntax"
        else
            validation_error "$description has invalid YAML syntax"
        fi
    elif python3 -c "import yaml" 2>/dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" > /dev/null 2>&1; then
            print_success "$description has valid YAML syntax"
        else
            validation_error "$description has invalid YAML syntax"
        fi
    else
        print_warning "Cannot validate YAML syntax (yq or python3+yaml not available)"
    fi
}

validate_yaml "monitoring/alertmanager/alertmanager.yml" "Alertmanager configuration"
validate_yaml "monitoring/prometheus/production-alert-rules.yml" "Production alert rules"
validate_yaml "load-testing/monitoring/prometheus/prometheus.yml" "Prometheus configuration"
validate_yaml "monitoring/logging/logstash/config/logstash.yml" "Logstash configuration"
validate_yaml "monitoring/logging/filebeat/config/filebeat.yml" "Filebeat configuration"
validate_yaml "monitoring/logging/kibana/config/kibana.yml" "Kibana configuration"

# Validate JSON syntax
echo ""
echo "🔧 Validating JSON Configuration..."

validate_json() {
    local file=$1
    local description=$2
    
    if command -v jq > /dev/null 2>&1; then
        if jq empty "$file" > /dev/null 2>&1; then
            print_success "$description has valid JSON syntax"
        else
            validation_error "$description has invalid JSON syntax"
        fi
    elif python3 -c "import json" 2>/dev/null; then
        if python3 -c "import json; json.load(open('$file'))" > /dev/null 2>&1; then
            print_success "$description has valid JSON syntax"
        else
            validation_error "$description has invalid JSON syntax"
        fi
    else
        print_warning "Cannot validate JSON syntax (jq or python3 not available)"
    fi
}

validate_json "monitoring/grafana/dashboards/production-monitoring.json" "Production monitoring dashboard"
validate_json "monitoring/grafana/dashboards/application-dashboard.json" "Application dashboard"
validate_json "monitoring/grafana/dashboards/alerts-sla-dashboard.json" "Alerts & SLA dashboard"

# Check TypeScript compilation
echo ""
echo "🏗️ Validating Backend Build..."

print_status "Building backend to check for compilation errors..."
if npm run build:backend > /dev/null 2>&1; then
    print_success "Backend builds successfully with monitoring code"
else
    validation_error "Backend build failed - check monitoring code integration"
fi

# Check for missing dependencies
echo ""
echo "📦 Validating Dependencies..."

check_dependency() {
    local dep=$1
    local description=$2
    
    if npm list "$dep" > /dev/null 2>&1; then
        print_success "$description is installed"
    else
        validation_error "$description is missing - run: npm install $dep"
    fi
}

check_dependency "prom-client" "Prometheus client"
check_dependency "winston" "Winston logging"
check_dependency "uuid" "UUID for correlation IDs"

# Validate alert rules syntax
echo ""
echo "🚨 Validating Alert Rules..."

if command -v promtool > /dev/null 2>&1; then
    print_status "Validating alert rules with promtool..."
    if promtool check rules monitoring/prometheus/production-alert-rules.yml > /dev/null 2>&1; then
        print_success "Production alert rules syntax is valid"
    else
        validation_error "Production alert rules have syntax errors"
    fi
else
    print_warning "promtool not available - cannot validate alert rules syntax"
fi

# Check script permissions
echo ""
echo "🔐 Validating Script Permissions..."

if [ -x "monitoring/scripts/start-monitoring.sh" ]; then
    print_success "Start monitoring script is executable"
else
    print_warning "Start monitoring script is not executable - run: chmod +x monitoring/scripts/start-monitoring.sh"
fi

if [ -x "monitoring/scripts/test-alerts.sh" ]; then
    print_success "Test alerts script is executable"
else
    print_warning "Test alerts script is not executable - run: chmod +x monitoring/scripts/test-alerts.sh"
fi

# Summary
echo ""
echo "📋 Validation Summary"
echo "==================="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed! Monitoring infrastructure is ready for production.${NC}"
    echo ""
    echo "✅ What's been validated:"
    echo "  • Complete file structure"
    echo "  • Configuration syntax"
    echo "  • Backend code integration"
    echo "  • Dependencies"
    echo "  • Documentation"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Start monitoring: ./monitoring/scripts/start-monitoring.sh"
    echo "  2. Start your application: npm run dev"
    echo "  3. Import Grafana dashboards from monitoring/grafana/dashboards/"
    echo "  4. Configure alert notifications in monitoring/alertmanager/alertmanager.yml"
    echo "  5. Test alerts: ./monitoring/scripts/test-alerts.sh"
    echo ""
    echo "📊 Access your monitoring:"
    echo "  • Grafana: http://localhost:3002 (admin/admin123)"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Alertmanager: http://localhost:9093"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $VALIDATION_ERRORS validation error(s) found. Please fix the issues above.${NC}"
    echo ""
    echo "🔧 Common fixes:"
    echo "  • Missing files: Check if files were created correctly"
    echo "  • Syntax errors: Validate YAML/JSON configuration files"
    echo "  • Build errors: Check TypeScript code integration"
    echo "  • Dependencies: Run npm install with missing packages"
    echo ""
    exit 1
fi