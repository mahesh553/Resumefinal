import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const redisConfig = this.configService.get('redis.nativeConfig');
      
      this.logger.log('Initializing Redis client with native redis package');
      this.logger.log(`Connecting to: ${redisConfig.socket.host}:${redisConfig.socket.port}`);
      
      this.client = createClient(redisConfig);

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.client.on('end', () => {
        this.logger.log('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.logger.log('Redis connection established successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Redis client:', error);
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping get operation');
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping set operation');
      return false;
    }

    try {
      await this.client.set(key, value, options);
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<string | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping setex operation');
      return null;
    }

    try {
      await this.client.set(key, value, { EX: seconds });
      return 'OK';
    } catch (error) {
      this.logger.error(`Error setting key ${key} with expiration:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping del operation');
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping exists operation');
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping hincrby operation');
      return 0;
    }

    try {
      return await this.client.hIncrBy(key, field, increment);
    } catch (error) {
      this.logger.error(`Error incrementing hash field ${key}.${field}:`, error);
      return 0;
    }
  }

  async hincrbyfloat(key: string, field: string, increment: number): Promise<number> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping hincrbyfloat operation');
      return 0;
    }

    try {
      return parseFloat(await this.client.hIncrByFloat(key, field, increment));
    } catch (error) {
      this.logger.error(`Error incrementing hash field ${key}.${field} by float:`, error);
      return 0;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping hgetall operation');
      return {};
    }

    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      this.logger.error(`Error getting all hash fields ${key}:`, error);
      return {};
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping expire operation');
      return false;
    }

    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping flushAll operation');
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      this.logger.error('Error flushing Redis:', error);
      return false;
    }
  }

  getClient(): RedisClientType | null {
    return this.isConnected ? this.client : null;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Error pinging Redis:', error);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.logger.log('Redis client disconnected on module destroy');
      } catch (error) {
        this.logger.error('Error disconnecting Redis client:', error);
      }
    }
  }
}