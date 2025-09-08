@echo off
setlocal enabledelayedexpansion

echo 🚀 QoderResume Setup Script
echo ==========================

REM Check Node.js version
echo 📦 Checking Node.js version...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION:v=%") do set MAJOR_VERSION=%%i

if %MAJOR_VERSION% LSS 18 (
    echo ❌ Node.js version must be 18 or higher. Current version: 
    node --version
    exit /b 1
)
echo ✅ Node.js detected
node --version

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm and try again.
    exit /b 1
)
echo ✅ npm detected
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

REM Setup environment file
echo 🔧 Setting up environment file...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo ✅ Created .env file from .env.example
        echo ⚠️  Please update the .env file with your actual configuration values:
        echo    - DATABASE_URL (PostgreSQL connection string)
        echo    - REDIS_URL (Redis connection string)
        echo    - GEMINI_API_KEY (Google AI API key)
        echo    - NEXTAUTH_SECRET (Generate a secure random string)
        echo    - JWT_SECRET (Generate a secure random string)
    ) else (
        echo ❌ .env.example file not found
        exit /b 1
    )
) else (
    echo ✅ .env file already exists
)

REM Check Docker
echo 🐳 Checking Docker availability...
docker --version >nul 2>&1
if not errorlevel 1 (
    docker info >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Docker is available and running
        
        echo 🗄️  Starting database services...
        docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
        
        echo ⏳ Waiting for services to be ready...
        timeout /t 10 /nobreak >nul
        
        echo ✅ Database services started
    ) else (
        echo ⚠️  Docker is installed but not running
        echo    Please start Docker Desktop and run this script again
    )
) else (
    echo ⚠️  Docker not found. Please install Docker for automatic service setup
    echo    Or manually setup PostgreSQL and Redis services
)

REM Run database migrations
echo 🗄️  Setting up database schema...
npm run migration:run >nul 2>&1
if not errorlevel 1 (
    echo ✅ Database migrations completed
) else (
    echo ⚠️  Database migrations failed. Please ensure:
    echo    - PostgreSQL is running and accessible
    echo    - DATABASE_URL in .env is correct
    echo    - Database exists and is accessible
)

REM Build the application
echo 🏗️  Building application...
npm run build
if errorlevel 1 (
    echo ❌ Build failed. Please check for errors and try again.
    exit /b 1
)
echo ✅ Application built successfully

REM Run tests
echo 🧪 Running tests...
npm run test >nul 2>&1
if not errorlevel 1 (
    echo ✅ Tests passed
) else (
    echo ⚠️  Some tests failed. Please review test output.
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo    1. Update .env file with your actual configuration
echo    2. Start the development server: npm run dev
echo    3. Open http://localhost:3000 in your browser
echo.
echo 🔧 Available commands:
echo    npm run dev          - Start development servers
echo    npm run build        - Build for production  
echo    npm run start        - Start production server
echo    npm run test         - Run tests
echo    npm run lint         - Check code quality
echo    npm run db:health    - Check database health
echo.
echo 📚 Documentation:
echo    - API Docs: http://localhost:3001/api/docs
echo    - Health Check: http://localhost:3001/health
echo.

pause