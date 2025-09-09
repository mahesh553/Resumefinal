# QoderResume IDE Setup Guide

**Version**: 1.0.0  
**Last Updated**: September 5, 2025  
**Project**: QoderResume - AI-Powered Resume Optimization Platform

This document provides comprehensive setup instructions for the QoderResume development environment, including all necessary installations, extensions, and configurations.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Core Development Tools](#core-development-tools)
- [IDE Setup](#ide-setup)
- [Project Dependencies](#project-dependencies)
- [Database & Infrastructure](#database--infrastructure)
- [Optional Tools](#optional-tools)
- [Environment Configuration](#environment-configuration)
- [Verification Steps](#verification-steps)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

### System Requirements

- **OS**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: 10GB+ free space
- **Internet**: Stable connection for package downloads

### Core Software Installation

#### 1. Node.js & npm

**Required Version**: Node.js 18+ with compatible npm

**Installation**:

```bash
# Download from official website
https://nodejs.org/

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version   # Should show compatible version
```

**Alternative (using nvm)**:

```bash
# Windows (using nvm-windows)
nvm install 18.17.0
nvm use 18.17.0

# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.17.0
nvm use 18.17.0
```

#### 2. Git

```bash
# Download from official website
https://git-scm.com/

# Verify installation
git --version
```

#### 3. Docker & Docker Compose

**Required for**: Database, Redis, and containerized deployment

```bash
# Download Docker Desktop
https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
docker-compose --version
```

## 🎯 IDE Setup

### Visual Studio Code (Recommended)

#### Essential Extensions

Install these extensions for optimal development experience:

```json
{
  "recommendations": [
    // Language Support
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",

    // Framework Support
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "formulahendry.auto-rename-tag",
    "bradlc.vscode-tailwindcss",

    // Database & DevOps
    "ms-vscode.vscode-docker",
    "ckolkman.vscode-postgres",
    "bradlc.vscode-tailwindcss",

    // Productivity
    "christian-kohler.path-intellisense",
    "formulahendry.auto-close-tag",
    "ms-vscode.vscode-todo-highlight",
    "gruntfuggly.todo-tree",

    // Git Integration
    "mhutchie.git-graph",
    "eamodio.gitlens",

    // API Development
    "humao.rest-client",
    "ms-vscode.vscode-thunder-client",

    // AI & Development Assistant
    "github.copilot",
    "github.copilot-chat"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json` in project root:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"],
    ["clsx\\(([^)]*)\\)", "'([^']*)'"]
  ],
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "css.validate": false,
  "less.validate": false,
  "scss.validate": false
}
```

### Alternative IDEs

#### WebStorm

- Install Node.js plugin
- Enable TypeScript support
- Configure Tailwind CSS intelligence
- Set up ESLint integration

#### Cursor

- Same extensions as VS Code
- Enable AI assistance features
- Configure TypeScript support

## 📦 Project Dependencies

### Core Dependencies Installation

**⚠️ Important**: Use `--legacy-peer-deps` flag due to NestJS dependency conflicts.

```bash
# Navigate to project root
cd c:\Resume

# Install all dependencies
npm install --legacy-peer-deps

# If installation fails, try:
npm cache clean --force
npm install --legacy-peer-deps --verbose
```

### Frontend-Specific Dependencies

```bash
# UI & Animation Libraries
npm install framer-motion react-icons react-hot-toast --legacy-peer-deps

# Utility Libraries
npm install clsx tailwind-merge --legacy-peer-deps

# Form Management
npm install react-hook-form @hookform/resolvers zod --legacy-peer-deps

# File Upload
npm install react-dropzone --legacy-peer-deps

# State Management
npm install @tanstack/react-query --legacy-peer-deps

# Authentication
npm install next-auth --legacy-peer-deps
```

### Backend-Specific Dependencies

```bash
# Core NestJS
npm install @nestjs/common @nestjs/core @nestjs/platform-express --legacy-peer-deps

# Database & ORM
npm install @nestjs/typeorm typeorm pg --legacy-peer-deps

# Queue System
npm install @nestjs/bull bull bullmq ioredis --legacy-peer-deps

# Authentication & Security
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs --legacy-peer-deps

# File Processing
npm install multer pdf-parse mammoth sharp --legacy-peer-deps

# AI Providers
npm install @google/generative-ai openai @anthropic-ai/sdk --legacy-peer-deps
```

### Development Dependencies

```bash
# TypeScript & Types
npm install -D typescript @types/node @types/react @types/react-dom --legacy-peer-deps

# Testing
npm install -D jest @types/jest ts-jest @nestjs/testing --legacy-peer-deps
npm install -D @playwright/test playwright --legacy-peer-deps

# Linting & Formatting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --legacy-peer-deps
npm install -D prettier eslint-config-prettier --legacy-peer-deps

# Build Tools
npm install -D @nestjs/cli concurrently nodemon --legacy-peer-deps
```

## 🗄️ Database & Infrastructure

### PostgreSQL Setup

#### Option 1: Docker (Recommended)

```bash
# Navigate to docker directory
cd infrastructure/docker

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify containers are running
docker ps
```

#### Option 2: Local Installation

```bash
# Download PostgreSQL 15+
https://www.postgresql.org/download/

# Create database
createdb qoder_resume_dev
```

### Redis Setup

#### Option 1: Docker (Recommended)

```bash
# Already included in docker-compose.yml
docker-compose up -d redis
```

#### Option 2: Local Installation

```bash
# Windows (using chocolatey)
choco install redis-64

# macOS (using homebrew)
brew install redis

# Ubuntu
sudo apt install redis-server
```

### Database Tools

#### pgAdmin (PostgreSQL GUI)

```bash
# Download from
https://www.pgadmin.org/download/

# Or use Docker
docker run -p 80:80 -e PGADMIN_DEFAULT_EMAIL=admin@admin.com -e PGADMIN_DEFAULT_PASSWORD=root dpage/pgadmin4
```

#### Redis CLI Tools

```bash
# Install redis-cli
npm install -g redis-cli

# Or use Redis Desktop Manager
https://resp.app/
```

## 🔧 Optional Tools

### API Development

```bash
# Postman
https://www.postman.com/downloads/

# Insomnia
https://insomnia.rest/download

# HTTPie (CLI)
pip install httpie
```

### Database Management

```bash
# DBeaver (Universal Database Tool)
https://dbeaver.io/download/

# TablePlus (macOS/Windows)
https://tableplus.com/
```

### Monitoring & Debugging

```bash
# Redis Commander
npm install -g redis-commander

# PM2 (Process Manager)
npm install -g pm2
```

## ⚙️ Environment Configuration

### Environment Variables Setup

1. **Copy environment template**:

```bash
cp .env.example .env
```

2. **Configure environment variables**:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/qoder_resume_dev"
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=qoder_resume_dev

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Stripe Configuration (for payments)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Application Configuration
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:3000
```

### TypeScript Configuration

Ensure proper TypeScript configuration is in place:

**Root `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/frontend/*"],
      "@/components/*": ["./src/frontend/components/*"],
      "@/lib/*": ["./src/frontend/lib/*"],
      "@/types/*": ["./src/frontend/types/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

## ✅ Verification Steps

### 1. Verify Node.js Environment

```bash
node --version
npm --version
```

### 2. Verify Project Dependencies

```bash
npm list --depth=0
```

### 3. Verify TypeScript Compilation

```bash
npx tsc --noEmit
```

### 4. Verify Linting

```bash
npm run lint
```

### 5. Verify Database Connection

```bash
# Start infrastructure
cd infrastructure/docker
docker-compose up -d

# Test connection
docker exec -it postgres_container psql -U postgres -d qoder_resume_dev
```

### 6. Verify Build Process

```bash
# Frontend build
npm run build:frontend

# Backend build
npm run build:backend

# Full build
npm run build
```

### 7. Verify Development Server

```bash
# Start development servers
npm run dev

# Should start:
# - Frontend on http://localhost:3000
# - Backend on http://localhost:3001
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. Dependency Installation Conflicts

```bash
# Solution: Use legacy peer deps
npm install --legacy-peer-deps

# If still failing, clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 2. TypeScript Path Resolution Issues

- Check `baseUrl` and `paths` in `tsconfig.json`
- Ensure VS Code is using workspace TypeScript version
- Restart TypeScript language server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

#### 3. Database Connection Issues

```bash
# Check Docker containers
docker ps

# Restart containers
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs postgres
```

#### 4. ESLint Configuration Issues

- Ensure `.eslintrc.json` is properly configured
- Add file exclusions for configuration files
- Use simplified configuration for NestJS compatibility

#### 5. Framer Motion Type Errors

- Use `{...(props as any)}` for motion components
- Ensure proper TypeScript configuration
- Update framer-motion to latest compatible version

### Performance Optimization Tips

1. **Enable VS Code TypeScript optimization**:
   - Set `typescript.preferences.includePackageJsonAutoImports: "auto"`
   - Enable `typescript.suggest.autoImports: true`

2. **Configure Git ignore patterns**:

   ```gitignore
   node_modules/
   .next/
   dist/
   .env
   .env.local
   uploads/
   ```

3. **Optimize Docker setup**:
   - Use volume mounts for development
   - Configure proper resource limits
   - Use multi-stage builds for production

## 📚 Additional Resources

### Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

### Community Resources

- [QoderResume GitHub Repository](https://github.com/your-org/qoder-resume)
- [Project Discord/Slack Channel](#)
- [Development Guidelines](./CONTRIBUTING.md)

### Support Contacts

- **Technical Lead**: [contact-email]
- **DevOps**: [devops-email]
- **Project Manager**: [pm-email]

---

**Note**: This document should be updated whenever new dependencies or tools are added to the project. Keep it in sync with the actual project requirements.

**Last Verified**: September 5, 2025  
**Next Review**: October 5, 2025
