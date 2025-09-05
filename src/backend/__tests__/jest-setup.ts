import 'reflect-metadata';

// Set test environment variables
(process.env as any).NODE_ENV = 'test';
(process.env as any).JWT_SECRET = 'test-jwt-secret-32-characters-minimum';
(process.env as any).JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters-minimum';
(process.env as any).DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
(process.env as any).REDIS_HOST = 'localhost';
(process.env as any).REDIS_PORT = '6379';
(process.env as any).AI_CACHE_ENABLED = 'false';