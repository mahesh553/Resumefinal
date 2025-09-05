# QoderResume - AI-Powered Resume Optimization Platform

A comprehensive monolith web application that helps users optimize their resumes using AI-powered analysis, ATS scoring, and job description matching.

## 📈 Development Status

### ✅ Completed (Phase 1 - Core Infrastructure)
- **✅ Project Structure**: Next.js frontend + NestJS backend monolith architecture
- **✅ Database & Cache**: PostgreSQL entities, Redis with BullMQ queues configured
- **✅ Authentication**: JWT with role-based access control (User/Admin) implemented
- **✅ File Upload System**: Secure PDF/DOCX/TXT validation with 10MB limits
- **✅ AI Integration**: Gemini (primary) + OpenAI (fallback) + cost optimization

### 🔄 In Progress (Phase 1 - Feature Development)
- **🔄 Resume Analysis Module**: AI parsing, ATS scoring, and skill extraction
- **🔄 Job Tracker**: CRUD operations for job applications with status tracking
- **🔄 JD Matching**: AI-powered resume-job description comparison
- **🔄 Resume Versions**: Version management with 10-version retention policy
- **🔄 Payment System**: Stripe integration with Free and Pro plans
- **🔄 WebSocket Communication**: Real-time progress updates
- **🔄 Admin Dashboard**: System monitoring and user management
- **🔄 Frontend UI**: Responsive components with Tailwind CSS
- **🔄 Testing Framework**: Jest and Playwright setup
- **🔄 Deployment**: Docker containerization

## 🚀 Features

### Core Features (Phase 1)
- **User Authentication**: JWT-based login/registration with NextAuth.js ✅
- **Resume Analysis**: AI-powered parsing with ATS scoring and skill extraction 🔄
- **Job Tracker**: Complete CRUD operations for job applications 🔄
- **JD Matching**: Keyword-based resume-job description comparison 🔄
- **Resume Versions**: Automatic version management (10-version retention) 🔄
- **Real-time Updates**: WebSocket integration for progress tracking 🔄
- **Payment System**: Stripe integration with Free and Pro plans 🔄
- **Admin Dashboard**: System monitoring and user management 🔄

### Technology Stack
- **Frontend**: Next.js 14 with App Router, React 18, Tailwind CSS
- **Backend**: NestJS with Express, TypeORM, BullMQ
- **Database**: Supabase PostgreSQL with Redis cache
- **AI Providers**: Gemini (primary), OpenAI & Claude (fallbacks)
- **Payment**: Stripe integration
- **WebSocket**: Socket.IO for real-time communication
- **Deployment**: Docker containerization with Nginx

## 📊 Current Implementation Status

### ✅ Infrastructure & Security (100% Complete)
- **Monolithic Architecture**: Next.js 14 + NestJS with clear module boundaries
- **Database**: PostgreSQL with TypeORM entities and proper relationships
- **Cache & Queues**: Redis with BullMQ for background processing
- **Authentication**: JWT with refresh tokens and role-based access control
- **File Processing**: Secure upload validation for PDF, DOCX, TXT formats
- **Security**: Input validation, rate limiting, CORS, Helmet headers

### ✅ AI Integration (100% Complete)
- **Primary Provider**: Gemini API configured and functional
- **Fallback Strategy**: OpenAI integration ready for failover
- **Cost Optimization**: Usage tracking, prompt caching, tiered selection
- **Error Handling**: Robust fallback mechanism with health monitoring
- **Performance**: Redis caching for AI responses (24h TTL)

### 📝 Key Technical Achievements
- **Environment**: Fully configured with Gemini API key
- **Build System**: Backend compiles successfully with all modules
- **Type Safety**: Full TypeScript implementation with proper error handling
- **Code Quality**: Follows NestJS best practices and clean architecture
- **Scalability**: Queue-based processing ready for high load

### 🛠 Ready for Development
The core infrastructure is solid and ready for feature development:
- AI providers configured and tested
- Database schema implemented
- Authentication system operational
- File upload pipeline secure
- Background job processing enabled

## 🏗️ Architecture

This application follows a **monolith architecture** with clear module boundaries:

```
src/
├── frontend/          # Next.js application
├── backend/           # NestJS application  
├── shared/            # Shared types and schemas
└── infrastructure/    # Docker, Nginx, scripts
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Quick Start

**Windows:**
```cmd
.\infrastructure\scripts\setup-dev.bat
```

**Linux/MacOS:**
```bash
chmod +x infrastructure/scripts/setup-dev.sh
./infrastructure/scripts/setup-dev.sh
```

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Update .env with your API keys and database credentials
   ```

3. **Start infrastructure services:**
   ```bash
   cd infrastructure/docker
   docker-compose up -d postgres redis
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build production version
- `npm run start` - Start production servers
- `npm run test` - Run tests
- `npm run lint` - Lint code

## 🌐 Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📊 Subscription Plans

### Free Plan
- 7 resume analyses per month
- 7 JD matching operations per month
- Basic features

### Pro Plan
- 12 resume analyses per day
- 12 JD matching operations per day  
- Bulk upload support
- Calendar integration
- Priority support

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control (User/Admin)
- File upload validation and scanning
- Rate limiting on all endpoints
- CORS protection
- Helmet security headers

## 📈 Performance Optimizations

- **Multi-layer caching**: Browser, API response, LLM output, provider health
- **Database indexing**: GIN indexes for full-text search, composite indexes
- **Queue prioritization**: BullMQ for background processing
- **CDN ready**: Static asset optimization

## 🚢 Deployment

### Docker Production
```bash
cd infrastructure/docker
docker-compose up -d
```

### Environment Variables
See `.env.example` for complete configuration options.

## 📝 API Documentation

Interactive API documentation is available at `/api/docs` when running the development server.

## 🧪 Testing

- Unit tests with Jest
- Integration tests with Supertest  
- End-to-end tests with Playwright

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes  
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ by the QoderResume Team