#!/bin/bash

# QoderResume Production Monitoring Startup Script
# This script starts the complete monitoring infrastructure

set -e

echo "🚀 Starting QoderResume Production Monitoring Infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
print_status "Creating monitoring directories..."
mkdir -p logs
mkdir -p monitoring/prometheus/data
mkdir -p monitoring/grafana/data
mkdir -p monitoring/elasticsearch/data

# Set permissions
print_status "Setting up permissions..."
chmod 755 logs
chmod -R 755 monitoring/

# Start monitoring infrastructure
print_status "Starting monitoring infrastructure..."

# Start core monitoring stack (Prometheus, Grafana, Alertmanager)
print_status "Starting core monitoring stack..."
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Wait for services to be ready
print_status "Waiting for core services to be ready..."
sleep 30

# Check if Prometheus is ready
print_status "Checking Prometheus..."
timeout 60 bash -c 'until curl -f http://localhost:9090/-/ready > /dev/null 2>&1; do sleep 2; done'
if [ $? -eq 0 ]; then
    print_success "Prometheus is ready at http://localhost:9090"
else
    print_error "Prometheus failed to start"
fi

# Check if Grafana is ready
print_status "Checking Grafana..."
timeout 60 bash -c 'until curl -f http://localhost:3002/api/health > /dev/null 2>&1; do sleep 2; done'
if [ $? -eq 0 ]; then
    print_success "Grafana is ready at http://localhost:3002"
    print_status "Default login: admin/admin123"
else
    print_error "Grafana failed to start"
fi

# Check if Alertmanager is ready
print_status "Checking Alertmanager..."
timeout 60 bash -c 'until curl -f http://localhost:9093/-/ready > /dev/null 2>&1; do sleep 2; done'
if [ $? -eq 0 ]; then
    print_success "Alertmanager is ready at http://localhost:9093"
else
    print_error "Alertmanager failed to start"
fi

# Start logging infrastructure (optional)
if [ "$1" = "--with-logging" ] || [ "$1" = "-l" ]; then
    print_status "Starting logging infrastructure..."
    docker-compose -f monitoring/docker-compose.logging.yml up -d
    
    print_status "Waiting for logging services to be ready..."
    sleep 45
    
    # Check if Elasticsearch is ready
    print_status "Checking Elasticsearch..."
    timeout 120 bash -c 'until curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; do sleep 3; done'
    if [ $? -eq 0 ]; then
        print_success "Elasticsearch is ready at http://localhost:9200"
    else
        print_warning "Elasticsearch may not be ready yet. Check logs with: docker logs qoder-elasticsearch"
    fi
    
    # Check if Kibana is ready
    print_status "Checking Kibana..."
    timeout 120 bash -c 'until curl -f http://localhost:5601/api/status > /dev/null 2>&1; do sleep 3; done'
    if [ $? -eq 0 ]; then
        print_success "Kibana is ready at http://localhost:5601"
    else
        print_warning "Kibana may not be ready yet. Check logs with: docker logs qoder-kibana"
    fi
fi

# Display status
print_status "Checking all services status..."
docker-compose -f monitoring/docker-compose.monitoring.yml ps

if [ "$1" = "--with-logging" ] || [ "$1" = "-l" ]; then
    docker-compose -f monitoring/docker-compose.logging.yml ps
fi

# Display URLs
echo ""
echo "🎉 Monitoring Infrastructure Started Successfully!"
echo ""
echo "📊 Monitoring URLs:"
echo "  Prometheus:   http://localhost:9090"
echo "  Grafana:      http://localhost:3002 (admin/admin123)"
echo "  Alertmanager: http://localhost:9093"
echo "  Node Exporter: http://localhost:9100/metrics"

if [ "$1" = "--with-logging" ] || [ "$1" = "-l" ]; then
    echo ""
    echo "📋 Logging URLs:"
    echo "  Elasticsearch: http://localhost:9200"
    echo "  Kibana:        http://localhost:5601"
fi

echo ""
echo "🔍 To view application metrics:"
echo "  Application:  http://localhost:3001/metrics"
echo "  Health Check: http://localhost:3001/api/health"

echo ""
echo "📈 Recommended next steps:"
echo "  1. Import Grafana dashboards from monitoring/grafana/dashboards/"
echo "  2. Configure alerting channels in monitoring/alertmanager/alertmanager.yml"
echo "  3. Start your QoderResume application: npm run dev"
echo "  4. Test alerts: ./monitoring/scripts/test-alerts.sh"

if [ "$1" = "--with-logging" ] || [ "$1" = "-l" ]; then
    echo "  5. Set up Kibana index patterns and dashboards"
fi

echo ""
print_success "Monitoring infrastructure is ready! 🚀"