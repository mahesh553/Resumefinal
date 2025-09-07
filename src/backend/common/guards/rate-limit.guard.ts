import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { RateLimitException } from "../filters/exception.filters";

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// Rate limit store entry
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval = 60000; // 1 minute
  private lastCleanup = 0;

  // Default configuration
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  // Route-specific configurations
  private readonly routeConfigs: Record<string, RateLimitConfig> = {
    "/api/auth/login": {
      windowMs: 300000, // 5 minutes
      maxRequests: 5, // 5 login attempts per 5 minutes
    },
    "/api/auth/register": {
      windowMs: 3600000, // 1 hour
      maxRequests: 3, // 3 registration attempts per hour
    },
    "/api/resume/upload": {
      windowMs: 60000, // 1 minute
      maxRequests: 10, // 10 uploads per minute
    },
    "/api/jd-matching/analyze": {
      windowMs: 60000, // 1 minute
      maxRequests: 20, // 20 analysis requests per minute
    },
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get configuration for this route
    const config = this.getConfigForRoute(request);

    // Generate key for rate limiting
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : this.defaultKeyGenerator(request);

    // Clean up old entries
    this.cleanup();

    // Get or create rate limit entry
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequestTime: now,
      };
      this.store.set(key, entry);
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    response.setHeader("X-RateLimit-Limit", config.maxRequests);
    response.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, config.maxRequests - entry.count)
    );
    response.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
    response.setHeader("X-RateLimit-Window", config.windowMs);

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      response.setHeader("Retry-After", retryAfter);

      // Log rate limit violation
      this.logger.warn(`Rate limit exceeded for ${key}`, {
        key,
        method: request.method,
        url: request.url,
        count: entry.count,
        limit: config.maxRequests,
        windowMs: config.windowMs,
        retryAfter,
        requestId: request.context?.requestId,
        userId: request.context?.userId,
        ip: request.context?.ip,
      });

      throw new RateLimitException(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }

    // Log warning when approaching limit
    const remaining = config.maxRequests - entry.count;
    if (remaining <= Math.ceil(config.maxRequests * 0.1)) {
      // 10% remaining
      this.logger.warn(
        `Rate limit warning for ${key}: ${remaining} requests remaining`,
        {
          key,
          method: request.method,
          url: request.url,
          remaining,
          limit: config.maxRequests,
          requestId: request.context?.requestId,
        }
      );
    }

    return true;
  }

  private getConfigForRoute(request: Request): RateLimitConfig {
    // Check for exact match
    if (this.routeConfigs[request.url]) {
      return { ...this.defaultConfig, ...this.routeConfigs[request.url] };
    }

    // Check for pattern matches
    for (const [pattern, config] of Object.entries(this.routeConfigs)) {
      if (request.url.startsWith(pattern)) {
        return { ...this.defaultConfig, ...config };
      }
    }

    return this.defaultConfig;
  }

  private defaultKeyGenerator(request: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (request as any).user?.id;
    if (userId) {
      return `user:${userId}:${request.url}`;
    }

    const ip = request.context?.ip || "unknown";
    return `ip:${ip}:${request.url}`;
  }

  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  // Method to get current rate limit status for a key
  getRateLimitStatus(key: string): {
    count: number;
    remaining: number;
    resetTime: number;
    limit: number;
  } | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.defaultConfig.maxRequests - entry.count),
      resetTime: entry.resetTime,
      limit: this.defaultConfig.maxRequests,
    };
  }

  // Method to reset rate limit for a key (admin function)
  resetRateLimit(key: string): boolean {
    return this.store.delete(key);
  }

  // Method to get all active rate limits (admin function)
  getAllRateLimits(): Record<string, RateLimitEntry> {
    const result: Record<string, RateLimitEntry> = {};
    for (const [key, entry] of this.store.entries()) {
      result[key] = { ...entry };
    }
    return result;
  }
}
