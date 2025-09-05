# QoderResume Quick Reference

## 🚀 Essential Commands

### Development
```bash
# Start full development environment
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend
```

### Building
```bash
# Build everything
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

### Database & Infrastructure
```bash
# Start infrastructure services
cd infrastructure/docker && docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]
```

### Package Management
```bash
# Install new package (ALWAYS use this flag)
npm install [package-name] --legacy-peer-deps

# Update dependencies
npm update --legacy-peer-deps
```

### Testing & Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 🔧 IDE Shortcuts

### VS Code
- `Ctrl+Shift+P`: Command Palette
- `Ctrl+`` `: Toggle Terminal
- `F12`: Go to Definition
- `Shift+F12`: Find All References
- `Ctrl+Shift+F`: Search in Files
- `Ctrl+D`: Select Next Occurrence

### Project Specific
- `Ctrl+Shift+E`: File Explorer
- `Ctrl+Shift+G`: Source Control
- `Ctrl+Shift+X`: Extensions
- `Ctrl+J`: Toggle Panel

## 📁 Important Directories

```
c:\Resume\
├── src/frontend/          # Next.js application
├── src/backend/           # NestJS application
├── src/shared/           # Shared types
├── infrastructure/       # Docker, Nginx configs
└── docs/                # Project documentation
```

## 🐛 Quick Fixes

### Dependency Issues
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### TypeScript Issues
```bash
# Restart TS Server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Database Reset
```bash
docker-compose down
docker volume rm $(docker volume ls -q)
docker-compose up -d
```