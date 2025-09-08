# QoderResume - Deployment Instructions and API Integration Guide

## 📋 Table of Contents

- [Deployment Overview](#deployment-overview)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [API Integration Guide](#api-integration-guide)
- [Configuration Management](#configuration-management)
- [Production Optimization](#production-optimization)
- [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

## 🚀 Deployment Overview

QoderResume is a full-stack application with Next.js frontend and NestJS backend, designed for flexible deployment across various environments.

### **Architecture Summary**
```
Frontend (Next.js:3000) ←→ Backend (NestJS:3001) ←→ External Services (AI/DB)
```

### **Deployment Targets**
- **Development**: Local with hot reload
- **Staging**: Production-like testing environment  
- **Production**: High-availability with monitoring

## ⚙️ Environment Setup

### **Prerequisites**
- Node.js 18+ (LTS recommended)
- Docker 20+ and Docker Compose 2+
- PostgreSQL 15+ and Redis 7+
- AI Provider API keys (Gemini, OpenAI, Claude)

### **Core Environment Variables**
```bash
# Application
NODE_ENV=production
PORT=3001
FRONTEND_PORT=3000

# Database
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=qoder_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=qoder_resume

# Cache & Queue
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-32-chars
NEXTAUTH_URL=https://yourdomain.com
JWT_SECRET=your-jwt-secret-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AI Providers
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_CACHE_TTL=86400

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,docx,txt
UPLOAD_DESTINATION=uploads
```

### **Environment-Specific Overrides**

**Development (.env.development)**
```bash
NODE_ENV=development
LOG_LEVEL=debug
AI_CACHE_TTL=3600  # 1 hour for faster development
CORS_ORIGIN=http://localhost:3000
```

**Production (.env.production)**
```bash
NODE_ENV=production
LOG_LEVEL=warn
AI_CACHE_TTL=86400  # 24 hours for cost optimization
```

## 🏗️ Deployment Methods

### **Method 1: Docker Deployment (Recommended)**

#### **Quick Setup**
```bash
# Clone and configure
git clone https://github.com/yourusername/qoder-resume.git
cd qoder-resume
cp .env.example .env
# Edit .env with your configuration

# Deploy with Docker
cd infrastructure/docker
docker-compose up -d

# Verify deployment
docker-compose ps
```

#### **Docker Compose Configuration**
```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: ../..
      dockerfile: infrastructure/docker/Dockerfile
    ports:
      - "3000:3000"
      - "3001:3001"
    env_file:
      - ../../.env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: qoder_resume
      POSTGRES_USER: qoder_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### **Method 2: Manual VPS Deployment**

#### **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install and configure PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE qoder_resume;
CREATE USER qoder_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE qoder_resume TO qoder_user;
\q

# Install Redis
sudo apt install redis-server
```

#### **Application Deployment**
```bash
# Deploy application
git clone https://github.com/yourusername/qoder-resume.git
cd qoder-resume
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env configuration
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### **PM2 Configuration**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'qoder-resume-backend',
      script: 'dist/src/backend/main.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
    },
    {
      name: 'qoder-resume-frontend',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 1,
      max_memory_restart: '512M',
    },
  ],
};
```

### **Method 3: Cloud Platform Deployment**

#### **Vercel (Frontend)**
```bash
npm i -g vercel
vercel login
vercel --prod
# Configure environment variables in dashboard
```

#### **Railway**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### **Heroku**
```bash
heroku create qoder-resume-app
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
```

## 🔌 API Integration Guide

### **Authentication Flow**
```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth API
    participant D as Database
    participant R as Redis

    C->>A: POST /api/auth/login
    A->>D: Validate credentials
    A->>R: Store session
    A-->>C: JWT + Refresh token
    
    C->>A: API call with JWT
    A->>A: Validate JWT
    A-->>C: Response data
```

### **Core API Endpoints**

#### **Authentication**

**POST /api/auth/register**
```typescript
interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: UserData;
}

// Example
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName": "John", "lastName": "Doe", "email": "john@example.com", "password": "securePassword123"}'
```

**POST /api/auth/login**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserData;
}

// Example
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "securePassword123"}'
```

#### **Resume Management**

**POST /api/resumes/upload**
```typescript
interface UploadResponse {
  id: string;
  filename: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  jobId?: string;
}

// Example
curl -X POST http://localhost:3001/api/resumes/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@resume.pdf" \
  -F "title=Software Engineer Resume"
```

**GET /api/resumes/:id/analysis**
```typescript
interface AnalysisResponse {
  id: string;
  resumeId: string;
  atsScore: number;
  suggestions: SuggestionItem[];
  skills: { technical: string[]; soft: string[] };
  analysis: object;
  createdAt: string;
}

// Example
curl -X GET http://localhost:3001/api/resumes/123/analysis \
  -H "Authorization: Bearer your-jwt-token"
```

#### **Job Description Matching**

**POST /api/analysis/job-match**
```typescript
interface JobMatchRequest {
  resumeId: string;
  jobDescription: string;
  jobTitle?: string;
  companyName?: string;
}

interface JobMatchResponse {
  matchScore: number;
  keywordAnalysis: {
    matched: string[];
    missing: string[];
    suggestions: string[];
  };
  skillsGap: object;
  recommendations: RecommendationItem[];
  optimizedKeywords: string[];
}

// Example
curl -X POST http://localhost:3001/api/analysis/job-match \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"resumeId": "resume-123", "jobDescription": "Software Engineer position requiring React, Node.js..."}'
```

#### **Job Application Tracking**

**GET /api/jobs**
```typescript
interface JobQuery {
  page?: number;
  limit?: number;
  status?: 'applied' | 'interview' | 'offer' | 'rejected';
  companyName?: string;
  position?: string;
}

interface JobListResponse {
  applications: JobApplication[];
  pagination: PaginationInfo;
  stats: { total: number; byStatus: Record<string, number> };
}
```

**POST /api/jobs**
```typescript
interface CreateJobRequest {
  companyName: string;
  position: string;
  jobDescription?: string;
  applicationUrl?: string;
  status: JobStatus;
  appliedDate: string;
  notes?: string;
  resumeVersionId?: string;
}
```

**PUT /api/jobs/:id**
```typescript
interface UpdateJobRequest {
  status?: JobStatus;
  notes?: string;
  interviewDate?: string;
  followUpDate?: string;
}

// Example
curl -X PUT http://localhost:3001/api/jobs/123 \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "interview", "interviewDate": "2024-01-15T10:00:00Z"}'
```

#### **Analytics**

**GET /api/analytics/overview**
```typescript
interface AnalyticsOverview {
  totalResumes: number;
  averageAtsScore: number;
  totalApplications: number;
  applicationStats: { applied: number; interviews: number; offers: number; rejected: number };
  trends: { atsScoreImprovement: number; responseRate: number; interviewRate: number };
  recommendations: RecommendationItem[];
}
```

### **Authentication Integration**

#### **JWT Token Management**
```typescript
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return data.user;
    }
    throw new Error('Login failed');
  }

  async refreshTokens() {
    if (!this.refreshToken) throw new Error('No refresh token');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    }
    return false;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }
}
```

#### **API Client with Auto Token Refresh**
```typescript
class APIClient {
  constructor(private authService: AuthService) {}

  async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.authService.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      const refreshed = await this.authService.refreshTokens();
      if (refreshed) {
        return fetch(url, {
          ...options,
          headers: {
            ...this.authService.getAuthHeaders(),
            ...options.headers,
          },
        });
      }
      throw new Error('Authentication failed');
    }

    return response;
  }
}
```

### **Rate Limiting**

#### **Backend Rate Limiting**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 100, // Requests per window
    }),
  ],
})
export class AppModule {}

// Custom limits for endpoints
@Post('login')
@Throttle(5, 300) // 5 requests per 5 minutes
async login(@Body() loginDto: LoginDto) {}

@Post('register')
@Throttle(3, 3600) // 3 requests per hour
async register(@Body() registerDto: RegisterDto) {}
```

#### **Error Response Format**
```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Example error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 🔧 Configuration Management

### **Database Configuration**
```typescript
// TypeORM Configuration
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  },
};
```

### **Redis Configuration**
```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
};
```

### **AI Provider Configuration**
```typescript
export const aiProvidersConfig = [
  {
    name: 'gemini',
    priority: 1,
    enabled: !!process.env.GEMINI_API_KEY,
    config: {
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash',
      timeout: 60000,
    },
  },
  {
    name: 'openai',
    priority: 2,
    enabled: !!process.env.OPENAI_API_KEY,
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      timeout: 45000,
    },
  },
  {
    name: 'claude',
    priority: 3,
    enabled: !!process.env.ANTHROPIC_API_KEY,
    config: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229',
      timeout: 45000,
    },
  },
];
```

## 🚀 Production Optimization

### **Database Optimization**
```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_resumes_user_id ON resumes(user_id);
CREATE INDEX CONCURRENTLY idx_resumes_created_at ON resumes(created_at DESC);
CREATE INDEX CONCURRENTLY idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX CONCURRENTLY idx_job_applications_status ON job_applications(status);
CREATE INDEX CONCURRENTLY idx_job_applications_applied_date ON job_applications(applied_date DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_resumes_processing ON resumes(status) WHERE status = 'processing';
CREATE INDEX CONCURRENTLY idx_active_applications ON job_applications(status) WHERE status IN ('applied', 'interview');
```

### **Security Configuration**
```typescript
// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### **Nginx Configuration**
```nginx
# infrastructure/nginx/nginx.conf
upstream backend { server app:3001; }
upstream frontend { server app:3000; }

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # API requests
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend requests
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring and Troubleshooting

### **Health Check Endpoints**
```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        ai: await this.checkAIProviders(),
      },
    };
  }
}
```

### **Common Issues and Solutions**

#### **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U qoder_user -d qoder_resume

# Check connection pool
SELECT * FROM pg_stat_activity WHERE datname = 'qoder_resume';
```

#### **Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Check memory usage
redis-cli info memory

# Monitor Redis logs
tail -f /var/log/redis/redis-server.log
```

#### **AI Provider Issues**
```bash
# Test API connectivity
curl -H "Authorization: Bearer ${GEMINI_API_KEY}" \
  https://generativelanguage.googleapis.com/v1/models

# Check rate limits and quotas in provider dashboards
# Monitor API usage and costs
```

#### **Application Logs**
```bash
# View PM2 logs
pm2 logs qoder-resume-backend
pm2 logs qoder-resume-frontend

# View Docker logs
docker-compose logs -f app

# Application-specific logging
tail -f logs/application.log
```

### **Deployment Checklist**

#### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database migrations applied  
- [ ] SSL certificates installed
- [ ] AI provider API keys validated
- [ ] Security configurations verified

#### **Post-Deployment**
- [ ] Health checks passing
- [ ] Authentication working
- [ ] File upload functional
- [ ] AI analysis processing
- [ ] Database connectivity verified
- [ ] Redis cache operational

#### **Performance Verification**
- [ ] Response times < 3s
- [ ] Error rates < 1%
- [ ] Database queries optimized
- [ ] Cache hit rates > 80%
- [ ] Memory usage stable

---

**This guide provides comprehensive deployment and integration instructions for the QoderResume platform. For additional support, refer to the troubleshooting section or contact technical support.**