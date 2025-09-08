@echo off
REM QoderResume Production Monitoring Startup Script for Windows
REM This script starts the complete monitoring infrastructure

echo 🚀 Starting QoderResume Production Monitoring Infrastructure...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose and try again.
    exit /b 1
)

REM Create necessary directories
echo [INFO] Creating monitoring directories...
if not exist "logs" mkdir logs
if not exist "monitoring\prometheus\data" mkdir monitoring\prometheus\data
if not exist "monitoring\grafana\data" mkdir monitoring\grafana\data
if not exist "monitoring\elasticsearch\data" mkdir monitoring\elasticsearch\data

REM Start monitoring infrastructure
echo [INFO] Starting monitoring infrastructure...

REM Start core monitoring stack (Prometheus, Grafana, Alertmanager)
echo [INFO] Starting core monitoring stack...
docker-compose -f monitoring\docker-compose.monitoring.yml up -d

REM Wait for services to be ready
echo [INFO] Waiting for core services to be ready...
timeout /t 30 /nobreak >nul

REM Check if Prometheus is ready
echo [INFO] Checking Prometheus...
powershell -Command "& {$timeout = 60; $timer = 0; do { Start-Sleep -Seconds 2; $timer += 2; try { $response = Invoke-WebRequest -Uri 'http://localhost:9090/-/ready' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Prometheus is ready at http://localhost:9090'; break } } catch { } } while ($timer -lt $timeout); if ($timer -ge $timeout) { Write-Host '[ERROR] Prometheus failed to start' }}"

REM Check if Grafana is ready
echo [INFO] Checking Grafana...
powershell -Command "& {$timeout = 60; $timer = 0; do { Start-Sleep -Seconds 2; $timer += 2; try { $response = Invoke-WebRequest -Uri 'http://localhost:3002/api/health' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Grafana is ready at http://localhost:3002'; Write-Host '[INFO] Default login: admin/admin123'; break } } catch { } } while ($timer -lt $timeout); if ($timer -ge $timeout) { Write-Host '[ERROR] Grafana failed to start' }}"

REM Check if Alertmanager is ready
echo [INFO] Checking Alertmanager...
powershell -Command "& {$timeout = 60; $timer = 0; do { Start-Sleep -Seconds 2; $timer += 2; try { $response = Invoke-WebRequest -Uri 'http://localhost:9093/-/ready' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Alertmanager is ready at http://localhost:9093'; break } } catch { } } while ($timer -lt $timeout); if ($timer -ge $timeout) { Write-Host '[ERROR] Alertmanager failed to start' }}"

REM Start logging infrastructure if requested
if "%1"=="--with-logging" goto start_logging
if "%1"=="-l" goto start_logging
goto skip_logging

:start_logging
echo [INFO] Starting logging infrastructure...
docker-compose -f monitoring\docker-compose.logging.yml up -d

echo [INFO] Waiting for logging services to be ready...
timeout /t 45 /nobreak >nul

REM Check if Elasticsearch is ready
echo [INFO] Checking Elasticsearch...
powershell -Command "& {$timeout = 120; $timer = 0; do { Start-Sleep -Seconds 3; $timer += 3; try { $response = Invoke-WebRequest -Uri 'http://localhost:9200/_cluster/health' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Elasticsearch is ready at http://localhost:9200'; break } } catch { } } while ($timer -lt $timeout); if ($timer -ge $timeout) { Write-Host '[WARNING] Elasticsearch may not be ready yet. Check logs with: docker logs qoder-elasticsearch' }}"

REM Check if Kibana is ready
echo [INFO] Checking Kibana...
powershell -Command "& {$timeout = 120; $timer = 0; do { Start-Sleep -Seconds 3; $timer += 3; try { $response = Invoke-WebRequest -Uri 'http://localhost:5601/api/status' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCCESS] Kibana is ready at http://localhost:5601'; break } } catch { } } while ($timer -lt $timeout); if ($timer -ge $timeout) { Write-Host '[WARNING] Kibana may not be ready yet. Check logs with: docker logs qoder-kibana' }}"

:skip_logging

REM Display status
echo [INFO] Checking all services status...
docker-compose -f monitoring\docker-compose.monitoring.yml ps

if "%1"=="--with-logging" (
    docker-compose -f monitoring\docker-compose.logging.yml ps
)
if "%1"=="-l" (
    docker-compose -f monitoring\docker-compose.logging.yml ps
)

REM Display URLs
echo.
echo 🎉 Monitoring Infrastructure Started Successfully!
echo.
echo 📊 Monitoring URLs:
echo   Prometheus:   http://localhost:9090
echo   Grafana:      http://localhost:3002 ^(admin/admin123^)
echo   Alertmanager: http://localhost:9093
echo   Node Exporter: http://localhost:9100/metrics

if "%1"=="--with-logging" (
    echo.
    echo 📋 Logging URLs:
    echo   Elasticsearch: http://localhost:9200
    echo   Kibana:        http://localhost:5601
)
if "%1"=="-l" (
    echo.
    echo 📋 Logging URLs:
    echo   Elasticsearch: http://localhost:9200
    echo   Kibana:        http://localhost:5601
)

echo.
echo 🔍 To view application metrics:
echo   Application:  http://localhost:3001/metrics
echo   Health Check: http://localhost:3001/api/health

echo.
echo 📈 Recommended next steps:
echo   1. Import Grafana dashboards from monitoring\grafana\dashboards\
echo   2. Configure alerting channels in monitoring\alertmanager\alertmanager.yml
echo   3. Start your QoderResume application: npm run dev
echo   4. Test alerts: monitoring\scripts\test-alerts.bat

if "%1"=="--with-logging" (
    echo   5. Set up Kibana index patterns and dashboards
)
if "%1"=="-l" (
    echo   5. Set up Kibana index patterns and dashboards
)

echo.
echo [SUCCESS] Monitoring infrastructure is ready! 🚀

pause