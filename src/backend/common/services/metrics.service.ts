import { Injectable, Logger } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from "prom-client";

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // HTTP Request Metrics
  public readonly httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  });

  public readonly httpRequestTotal = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
  });

  // Database Metrics
  public readonly databaseConnectionsActive = new Gauge({
    name: "database_connections_active",
    help: "Number of active database connections",
  });

  public readonly databaseQueryDuration = new Histogram({
    name: "database_query_duration_seconds",
    help: "Duration of database queries in seconds",
    labelNames: ["query_type"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  public readonly databaseQueryTotal = new Counter({
    name: "database_queries_total",
    help: "Total number of database queries",
    labelNames: ["query_type", "status"],
  });

  // Redis Metrics
  public readonly redisConnectionsActive = new Gauge({
    name: "redis_connections_active",
    help: "Number of active Redis connections",
  });

  public readonly redisCommandDuration = new Histogram({
    name: "redis_command_duration_seconds",
    help: "Duration of Redis commands in seconds",
    labelNames: ["command"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  });

  public readonly redisCommandTotal = new Counter({
    name: "redis_commands_total",
    help: "Total number of Redis commands",
    labelNames: ["command", "status"],
  });

  // Queue Metrics
  public readonly queueJobsActive = new Gauge({
    name: "queue_jobs_active",
    help: "Number of active queue jobs",
    labelNames: ["queue_name"],
  });

  public readonly queueJobsWaiting = new Gauge({
    name: "queue_jobs_waiting",
    help: "Number of waiting queue jobs",
    labelNames: ["queue_name"],
  });

  public readonly queueJobsCompleted = new Counter({
    name: "queue_jobs_completed_total",
    help: "Total number of completed queue jobs",
    labelNames: ["queue_name", "status"],
  });

  public readonly queueJobDuration = new Histogram({
    name: "queue_job_duration_seconds",
    help: "Duration of queue job processing in seconds",
    labelNames: ["queue_name", "job_type"],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  });

  // AI Provider Metrics
  public readonly aiRequestDuration = new Histogram({
    name: "ai_request_duration_seconds",
    help: "Duration of AI provider requests in seconds",
    labelNames: ["provider", "operation"],
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120],
  });

  public readonly aiRequestTotal = new Counter({
    name: "ai_requests_total",
    help: "Total number of AI provider requests",
    labelNames: ["provider", "operation", "status"],
  });

  public readonly aiTokensUsed = new Counter({
    name: "ai_tokens_used_total",
    help: "Total number of AI tokens used",
    labelNames: ["provider", "type"],
  });

  // Authentication Metrics
  public readonly authAttemptsTotal = new Counter({
    name: "auth_attempts_total",
    help: "Total number of authentication attempts",
    labelNames: ["method", "status"],
  });

  public readonly authFailuresTotal = new Counter({
    name: "auth_failures_total",
    help: "Total number of authentication failures",
    labelNames: ["method", "reason"],
  });

  // Application Metrics
  public readonly applicationErrors = new Counter({
    name: "application_errors_total",
    help: "Total number of application errors",
    labelNames: ["error_type", "severity"],
  });

  public readonly applicationMemoryUsage = new Gauge({
    name: "application_memory_usage_bytes",
    help: "Application memory usage in bytes",
    labelNames: ["type"],
  });

  public readonly applicationCpuUsage = new Gauge({
    name: "application_cpu_usage_percent",
    help: "Application CPU usage percentage",
  });

  // File System Metrics
  public readonly fileOperations = new Counter({
    name: "file_operations_total",
    help: "Total number of file operations",
    labelNames: ["operation", "status"],
  });

  public readonly fileSize = new Histogram({
    name: "file_size_bytes",
    help: "Size of processed files in bytes",
    labelNames: ["file_type"],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600],
  });

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register,
      prefix: "qoder_resume_",
    });

    this.logger.log("Metrics service initialized with Prometheus client");
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    this.applicationMemoryUsage.set({ type: "rss" }, memUsage.rss);
    this.applicationMemoryUsage.set({ type: "heap_total" }, memUsage.heapTotal);
    this.applicationMemoryUsage.set({ type: "heap_used" }, memUsage.heapUsed);
    this.applicationMemoryUsage.set({ type: "external" }, memUsage.external);
  }

  /**
   * Update CPU metrics
   */
  updateCpuMetrics(): void {
    const cpuUsage = process.cpuUsage();
    const totalUsage = cpuUsage.user + cpuUsage.system;
    // Convert to percentage (approximation)
    const usagePercent = (totalUsage / 1000000 / process.uptime()) * 100;
    this.applicationCpuUsage.set(Math.min(usagePercent, 100));
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    queryType: string,
    duration: number,
    success: boolean
  ): void {
    const status = success ? "success" : "error";
    this.databaseQueryTotal.inc({ query_type: queryType, status });
    this.databaseQueryDuration.observe({ query_type: queryType }, duration);
  }

  /**
   * Record Redis command metrics
   */
  recordRedisCommand(
    command: string,
    duration: number,
    success: boolean
  ): void {
    const status = success ? "success" : "error";
    this.redisCommandTotal.inc({ command, status });
    this.redisCommandDuration.observe({ command }, duration);
  }

  /**
   * Record queue job metrics
   */
  recordQueueJob(
    queueName: string,
    jobType: string,
    duration: number,
    status: string
  ): void {
    this.queueJobsCompleted.inc({ queue_name: queueName, status });
    this.queueJobDuration.observe(
      { queue_name: queueName, job_type: jobType },
      duration
    );
  }

  /**
   * Record AI request metrics
   */
  recordAiRequest(
    provider: string,
    operation: string,
    duration: number,
    status: string,
    tokensUsed?: { input?: number; output?: number }
  ): void {
    this.aiRequestTotal.inc({ provider, operation, status });
    this.aiRequestDuration.observe({ provider, operation }, duration);

    if (tokensUsed) {
      if (tokensUsed.input) {
        this.aiTokensUsed.inc({ provider, type: "input" }, tokensUsed.input);
      }
      if (tokensUsed.output) {
        this.aiTokensUsed.inc({ provider, type: "output" }, tokensUsed.output);
      }
    }
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(
    method: string,
    success: boolean,
    failureReason?: string
  ): void {
    const status = success ? "success" : "failure";
    this.authAttemptsTotal.inc({ method, status });

    if (!success && failureReason) {
      this.authFailuresTotal.inc({ method, reason: failureReason });
    }
  }

  /**
   * Record application error
   */
  recordError(
    errorType: string,
    severity: "low" | "medium" | "high" | "critical"
  ): void {
    this.applicationErrors.inc({ error_type: errorType, severity });
  }

  /**
   * Record file operation
   */
  recordFileOperation(
    operation: string,
    success: boolean,
    fileSize?: number,
    fileType?: string
  ): void {
    const status = success ? "success" : "error";
    this.fileOperations.inc({ operation, status });

    if (fileSize && fileType) {
      this.fileSize.observe({ file_type: fileType }, fileSize);
    }
  }

  /**
   * Update queue metrics
   */
  updateQueueMetrics(
    queueName: string,
    activeJobs: number,
    waitingJobs: number
  ): void {
    this.queueJobsActive.set({ queue_name: queueName }, activeJobs);
    this.queueJobsWaiting.set({ queue_name: queueName }, waitingJobs);
  }

  /**
   * Update database connection metrics
   */
  updateDatabaseConnections(activeConnections: number): void {
    this.databaseConnectionsActive.set(activeConnections);
  }

  /**
   * Update Redis connection metrics
   */
  updateRedisConnections(activeConnections: number): void {
    this.redisConnectionsActive.set(activeConnections);
  }
}
