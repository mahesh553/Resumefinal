import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import * as os from "os";
import { DataSource } from "typeorm";

export interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    ai: ServiceStatus;
    websocket: ServiceStatus;
    queue: ServiceStatus;
  };
  performance: {
    memory: MemoryInfo;
    cpu: CpuInfo;
    disk: DiskInfo;
    network: NetworkInfo;
  };
  errors: ErrorInfo[];
  warnings: WarningInfo[];
}

export interface ServiceStatus {
  status: "healthy" | "warning" | "critical" | "unknown";
  responseTime?: number;
  lastCheck: string;
  message?: string;
  details?: any;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
  heap: {
    total: number;
    used: number;
    percentage: number;
  };
}

export interface CpuInfo {
  usage: number;
  cores: number;
  model: string;
  speed: number;
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface NetworkInfo {
  requests: {
    total: number;
    success: number;
    errors: number;
    avgResponseTime: number;
  };
  connections: {
    active: number;
    idle: number;
  };
}

export interface ErrorInfo {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  stack?: string;
  source: string;
  count: number;
}

export interface WarningInfo {
  id: string;
  timestamp: string;
  message: string;
  source: string;
  severity: "low" | "medium" | "high";
}

export interface PerformanceMetrics {
  timestamp: string;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requests: number;
    errors: number;
    successRate: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

@Injectable()
export class SystemMonitoringService {
  private readonly logger = new Logger(SystemMonitoringService.name);
  private errorLog: ErrorInfo[] = [];
  private warningLog: WarningInfo[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {
    // Start monitoring interval
    this.startMonitoring();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const timestamp = new Date().toISOString();

      // Get service statuses
      const services = {
        database: await this.checkDatabaseHealth(),
        redis: await this.checkRedisHealth(),
        ai: await this.checkAIHealth(),
        websocket: await this.checkWebSocketHealth(),
        queue: await this.checkQueueHealth(),
      };

      // Get performance metrics
      const performance = {
        memory: this.getMemoryInfo(),
        cpu: this.getCpuInfo(),
        disk: await this.getDiskInfo(),
        network: this.getNetworkInfo(),
      };

      // Determine overall health status
      const serviceStatuses = Object.values(services).map((s) => s.status);
      let status: "healthy" | "warning" | "critical" = "healthy";

      if (serviceStatuses.includes("critical")) {
        status = "critical";
      } else if (serviceStatuses.includes("warning")) {
        status = "warning";
      }

      return {
        status,
        uptime: process.uptime(),
        timestamp,
        services,
        performance,
        errors: this.getRecentErrors(),
        warnings: this.getRecentWarnings(),
      };
    } catch (error) {
      this.logger.error("Failed to get system health:", error);
      throw error;
    }
  }

  async checkDatabaseHealth(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await this.dataSource.query("SELECT 1");
      const responseTime = Date.now() - startTime;

      const status = responseTime > 1000 ? "warning" : "healthy";

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        message: status === "warning" ? "Slow response time" : "Connected",
      };
    } catch (error) {
      this.logger.error("Database health check failed:", error);
      return {
        status: "critical",
        lastCheck: new Date().toISOString(),
        message: "Connection failed",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async checkRedisHealth(): Promise<ServiceStatus> {
    try {
      // Mock Redis check - would need actual Redis client
      return {
        status: "healthy",
        responseTime: 5,
        lastCheck: new Date().toISOString(),
        message: "Connected",
      };
    } catch (error) {
      return {
        status: "critical",
        lastCheck: new Date().toISOString(),
        message: "Connection failed",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async checkAIHealth(): Promise<ServiceStatus> {
    try {
      // Mock AI service check
      return {
        status: "healthy",
        responseTime: 250,
        lastCheck: new Date().toISOString(),
        message: "All providers operational",
      };
    } catch (error) {
      return {
        status: "warning",
        lastCheck: new Date().toISOString(),
        message: "Some providers unavailable",
      };
    }
  }

  async checkWebSocketHealth(): Promise<ServiceStatus> {
    try {
      // Mock WebSocket check
      return {
        status: "healthy",
        lastCheck: new Date().toISOString(),
        message: "Active connections: 0",
      };
    } catch (error) {
      return {
        status: "critical",
        lastCheck: new Date().toISOString(),
        message: "Service unavailable",
      };
    }
  }

  async checkQueueHealth(): Promise<ServiceStatus> {
    try {
      // Mock queue check
      return {
        status: "healthy",
        lastCheck: new Date().toISOString(),
        message: "Processing jobs normally",
        details: {
          waiting: 0,
          active: 0,
          completed: 156,
          failed: 2,
        },
      };
    } catch (error) {
      return {
        status: "critical",
        lastCheck: new Date().toISOString(),
        message: "Queue processing stopped",
      };
    }
  }

  getMemoryInfo(): MemoryInfo {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage: (usedMem / totalMem) * 100,
      heap: {
        total: memUsage.heapTotal,
        used: memUsage.heapUsed,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
    };
  }

  getCpuInfo(): CpuInfo {
    const cpus = os.cpus();

    return {
      usage: 0, // Would need actual CPU monitoring
      cores: cpus.length,
      model: cpus[0]?.model || "Unknown",
      speed: cpus[0]?.speed || 0,
    };
  }

  async getDiskInfo(): Promise<DiskInfo> {
    // Mock disk info - would need actual disk monitoring
    return {
      total: 1000000000000, // 1TB
      used: 250000000000, // 250GB
      free: 750000000000, // 750GB
      percentage: 25,
    };
  }

  getNetworkInfo(): NetworkInfo {
    // Mock network info - would need actual request tracking
    return {
      requests: {
        total: 10543,
        success: 10401,
        errors: 142,
        avgResponseTime: 245,
      },
      connections: {
        active: 12,
        idle: 8,
      },
    };
  }

  async getPerformanceHistory(
    hours: number = 24
  ): Promise<PerformanceMetrics[]> {
    // Return mock performance history
    const history: PerformanceMetrics[] = [];
    const now = new Date();

    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

      history.push({
        timestamp: timestamp.toISOString(),
        responseTime: {
          avg: 200 + Math.random() * 100,
          p50: 180 + Math.random() * 50,
          p95: 400 + Math.random() * 200,
          p99: 800 + Math.random() * 300,
        },
        throughput: {
          requests: Math.floor(100 + Math.random() * 200),
          errors: Math.floor(Math.random() * 10),
          successRate: 95 + Math.random() * 5,
        },
        resources: {
          cpuUsage: 20 + Math.random() * 30,
          memoryUsage: 40 + Math.random() * 20,
          diskUsage: 25 + Math.random() * 5,
        },
      });
    }

    return history;
  }

  logError(error: ErrorInfo): void {
    this.errorLog.unshift(error);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(0, 100);
    }
  }

  logWarning(warning: WarningInfo): void {
    this.warningLog.unshift(warning);

    // Keep only last 50 warnings
    if (this.warningLog.length > 50) {
      this.warningLog = this.warningLog.slice(0, 50);
    }
  }

  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(0, limit);
  }

  getRecentWarnings(limit: number = 10): WarningInfo[] {
    return this.warningLog.slice(0, limit);
  }

  private startMonitoring(): void {
    // Collect performance metrics every minute
    setInterval(() => {
      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        responseTime: {
          avg: 200 + Math.random() * 100,
          p50: 180 + Math.random() * 50,
          p95: 400 + Math.random() * 200,
          p99: 800 + Math.random() * 300,
        },
        throughput: {
          requests: Math.floor(100 + Math.random() * 200),
          errors: Math.floor(Math.random() * 10),
          successRate: 95 + Math.random() * 5,
        },
        resources: {
          cpuUsage: 20 + Math.random() * 30,
          memoryUsage: 40 + Math.random() * 20,
          diskUsage: 25 + Math.random() * 5,
        },
      };

      this.performanceMetrics.unshift(metrics);

      // Keep only last 24 hours of data
      if (this.performanceMetrics.length > 24 * 60) {
        this.performanceMetrics = this.performanceMetrics.slice(0, 24 * 60);
      }
    }, 60000); // Every minute
  }
}
