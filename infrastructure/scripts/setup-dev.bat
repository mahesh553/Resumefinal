@echo off
REM QoderResume Development Setup Script for Windows

echo 🚀 Setting up QoderResume development environment...

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Create environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from example...
    copy .env.example .env
    echo ⚠️  Please update .env with your actual configuration values
)

REM Start Docker services (PostgreSQL and Redis)
echo 🐳 Starting Docker services...
cd infrastructure\docker
docker-compose up -d postgres redis
cd ..\..

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak > nul

REM Run database migrations (when implemented)
echo 🗄️  Setting up database...
REM npm run migration:run

echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo 1. Update your .env file with actual API keys and credentials
echo 2. Run 'npm run dev' to start the development server
echo 3. Frontend: http://localhost:3000
echo 4. Backend API: http://localhost:3001
echo 5. API Docs: http://localhost:3001/api/docs

pause