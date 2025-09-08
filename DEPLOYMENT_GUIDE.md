# QoderResume Deployment Configuration

## Deployment Environments

### 1. Development
- **URL**: http://localhost:3000
- **Database**: Local PostgreSQL or Docker
- **Redis**: Local Redis or Docker  
- **AI Provider**: Gemini (development API key)
- **Environment**: `NODE_ENV=development`

### 2. Staging
- **URL**: https://staging.qoderresume.com
- **Database**: Cloud PostgreSQL (Supabase/AWS RDS)
- **Redis**: Cloud Redis (Redis Cloud/AWS ElastiCache)
- **AI Provider**: Gemini (staging API key)
- **Environment**: `NODE_ENV=staging`

### 3. Production
- **URL**: https://qoderresume.com
- **Database**: Production PostgreSQL (High Availability)
- **Redis**: Production Redis (Clustered)
- **AI Provider**: Gemini (production API key with fallbacks)
- **Environment**: `NODE_ENV=production`

## Environment Variables by Stage

### Required for All Environments
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Cache & Queue
REDIS_URL=redis://host:port

# AI Providers
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key (fallback)
ANTHROPIC_API_KEY=your_anthropic_api_key (fallback)

# Authentication
NEXTAUTH_SECRET=secure_random_string_32_chars
JWT_SECRET=secure_random_string_32_chars

# Application
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
```

### Development Specific
```bash
# Logging
LOG_LEVEL=debug

# AI Configuration
AI_CACHE_TTL=3600  # 1 hour for faster development
```

### Production Specific
```bash
# Logging
LOG_LEVEL=info

# AI Configuration  
AI_CACHE_TTL=86400  # 24 hours for cost optimization

# Performance
DB_POOL_SIZE=20
REDIS_POOL_SIZE=10

# Security
CORS_ORIGIN=https://qoderresume.com
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000

# Monitoring
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

## Deployment Strategies

### 1. Docker Deployment (Recommended)
```bash
# Build and deploy with Docker
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Or build custom image
docker build -f infrastructure/docker/Dockerfile -t qoderresume:latest .
docker run -d --name qoderresume -p 3000:3000 -p 3001:3001 qoderresume:latest
```

### 2. Cloud Platform Deployment

#### Vercel (Frontend + API Routes)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Railway/Render/Heroku
```bash
# Configure buildpacks and environment variables
# Deploy via Git integration
```

#### AWS/GCP/Azure
```bash
# Use container deployment services
# Configure load balancers and auto-scaling
```

### 3. VPS/Dedicated Server
```bash
# Setup with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Security audit clean (`npm audit`)

### Environment Setup
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis connectivity verified
- [ ] AI provider API keys valid

### Performance Testing
- [ ] Load testing completed
- [ ] Database performance optimized
- [ ] CDN configuration (if applicable)
- [ ] Caching strategy validated

### Security
- [ ] SSL/TLS certificates configured
- [ ] CORS settings appropriate
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] File upload restrictions in place

### Monitoring & Observability
- [ ] Health check endpoints working
- [ ] Error logging configured
- [ ] Performance monitoring setup
- [ ] Alert thresholds defined

## Rollback Procedures

### 1. Database Rollback
```bash
# Revert database migrations
npm run migration:revert

# Or restore from backup
pg_restore -d qoder_resume backup_file.sql
```

### 2. Application Rollback
```bash
# Docker rollback to previous image
docker tag qoderresume:v1.0.0 qoderresume:latest
docker restart qoderresume

# Git rollback
git revert <commit-hash>
git push origin main
```

### 3. Environment Rollback
```bash
# Restore previous environment configuration
# Update DNS if necessary
# Verify health checks
```

## Post-Deployment Verification

### 1. Health Checks
- [ ] Application startup successful
- [ ] Health endpoint responding (`/health`)
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] AI providers accessible

### 2. Functional Testing
- [ ] User registration/login working
- [ ] Resume upload and analysis functional
- [ ] Job tracking features operational
- [ ] Admin dashboard accessible (if deployed)

### 3. Performance Monitoring
- [ ] Response times within acceptable limits
- [ ] Error rates below threshold
- [ ] Resource utilization normal
- [ ] Queue processing working

## Maintenance Windows

### Scheduled Maintenance
- **Frequency**: Monthly (first Sunday, 2-4 AM UTC)
- **Activities**: Security updates, database maintenance, performance optimization
- **Communication**: 72-hour advance notice to users

### Emergency Maintenance
- **Trigger**: Critical security issues, data corruption, service outage
- **Response Time**: Within 1 hour of detection
- **Communication**: Real-time status updates

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Database read replicas
- Redis clustering
- CDN implementation

### Vertical Scaling
- Resource monitoring and alerting
- Auto-scaling policies
- Performance bottleneck identification

### Cost Optimization
- AI API usage monitoring
- Database query optimization
- Cache hit rate optimization
- Resource right-sizing