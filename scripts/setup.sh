#!/bin/bash

set -e

echo "🚀 QoderResume Setup Script"
echo "=========================="

# Check Node.js version
echo "📦 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi
echo "✅ npm $(npm --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Setup environment file
echo "🔧 Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update the .env file with your actual configuration values:"
        echo "   - DATABASE_URL (PostgreSQL connection string)"
        echo "   - REDIS_URL (Redis connection string)"
        echo "   - GEMINI_API_KEY (Google AI API key)"
        echo "   - NEXTAUTH_SECRET (Generate with: openssl rand -base64 32)"
        echo "   - JWT_SECRET (Generate with: openssl rand -base64 32)"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

# Check Docker
echo "🐳 Checking Docker availability..."
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "✅ Docker is available and running"
        
        echo "🗄️  Starting database services..."
        docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
        
        echo "⏳ Waiting for services to be ready..."
        sleep 10
        
        echo "✅ Database services started"
    else
        echo "⚠️  Docker is installed but not running"
        echo "   Please start Docker Desktop and run this script again"
    fi
else
    echo "⚠️  Docker not found. Please install Docker for automatic service setup"
    echo "   Or manually setup PostgreSQL and Redis services"
fi

# Run database migrations (if services are available)
echo "🗄️  Setting up database schema..."
if npm run migration:run 2>/dev/null; then
    echo "✅ Database migrations completed"
else
    echo "⚠️  Database migrations failed. Please ensure:"
    echo "   - PostgreSQL is running and accessible"
    echo "   - DATABASE_URL in .env is correct"
    echo "   - Database exists and is accessible"
fi

# Build the application
echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Application built successfully"
else
    echo "❌ Build failed. Please check for errors and try again."
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
if npm run test 2>/dev/null; then
    echo "✅ Tests passed"
else
    echo "⚠️  Some tests failed. Please review test output."
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env file with your actual configuration"
echo "   2. Start the development server: npm run dev"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 Available commands:"
echo "   npm run dev          - Start development servers"
echo "   npm run build        - Build for production"
echo "   npm run start        - Start production server"
echo "   npm run test         - Run tests"
echo "   npm run lint         - Check code quality"
echo "   npm run db:health    - Check database health"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:3002/api/docs"
echo "   - Health Check: http://localhost:3002/health"
echo ""#!/bin/bash

set -e

echo "🚀 QoderResume Setup Script"
echo "=========================="

# Check Node.js version
echo "📦 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi
echo "✅ npm $(npm --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Setup environment file
echo "🔧 Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update the .env file with your actual configuration values:"
        echo "   - DATABASE_URL (PostgreSQL connection string)"
        echo "   - REDIS_URL (Redis connection string)"
        echo "   - GEMINI_API_KEY (Google AI API key)"
        echo "   - NEXTAUTH_SECRET (Generate with: openssl rand -base64 32)"
        echo "   - JWT_SECRET (Generate with: openssl rand -base64 32)"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

# Check Docker
echo "🐳 Checking Docker availability..."
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "✅ Docker is available and running"
        
        echo "🗄️  Starting database services..."
        docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
        
        echo "⏳ Waiting for services to be ready..."
        sleep 10
        
        echo "✅ Database services started"
    else
        echo "⚠️  Docker is installed but not running"
        echo "   Please start Docker Desktop and run this script again"
    fi
else
    echo "⚠️  Docker not found. Please install Docker for automatic service setup"
    echo "   Or manually setup PostgreSQL and Redis services"
fi

# Run database migrations (if services are available)
echo "🗄️  Setting up database schema..."
if npm run migration:run 2>/dev/null; then
    echo "✅ Database migrations completed"
else
    echo "⚠️  Database migrations failed. Please ensure:"
    echo "   - PostgreSQL is running and accessible"
    echo "   - DATABASE_URL in .env is correct"
    echo "   - Database exists and is accessible"
fi

# Build the application
echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Application built successfully"
else
    echo "❌ Build failed. Please check for errors and try again."
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
if npm run test 2>/dev/null; then
    echo "✅ Tests passed"
else
    echo "⚠️  Some tests failed. Please review test output."
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env file with your actual configuration"
echo "   2. Start the development server: npm run dev"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 Available commands:"
echo "   npm run dev          - Start development servers"
echo "   npm run build        - Build for production"
echo "   npm run start        - Start production server"
echo "   npm run test         - Run tests"
echo "   npm run lint         - Check code quality"
echo "   npm run db:health    - Check database health"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:3002/api/docs"
echo "   - Health Check: http://localhost:3002/health"
echo ""