#!/bin/bash

# QoderResume Development Setup Script

echo "🚀 Setting up QoderResume development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
fi

# Start Docker services (PostgreSQL and Redis)
echo "🐳 Starting Docker services..."
cd infrastructure/docker
docker-compose up -d postgres redis
cd ../..

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run database migrations (when implemented)
echo "🗄️  Setting up database..."
# npm run migration:run

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update your .env file with actual API keys and credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Frontend: http://localhost:3000"
echo "4. Backend API: http://localhost:3001"
echo "5. API Docs: http://localhost:3001/api/docs"