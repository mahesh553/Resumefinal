import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../../database/entities/user.entity";

export interface SecurityEvent {
  id: string;
  type:
    | "login"
    | "logout"
    | "failed_login"
    | "password_change"
    | "role_change"
    | "permission_change"
    | "api_access";
  user: {
    id: string;
    email: string;
    role: string;
  };
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: Record<string, any>;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: Date;
  lastActivity: Date;
  isCurrentSession: boolean;
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireMFA: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

export interface SecurityStats {
  totalLogins: number;
  failedLogins: number;
  activeSessions: number;
  securityIncidents: number;
  lastSecurityScan: Date | null;
}

@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  // In-memory storage for demo purposes (in production, use a proper database)
  private securityEvents: SecurityEvent[] = [];
  private activeSessions: Map<string, ActiveSession> = new Map();
  private securitySettings: SecuritySettings = {
    maxLoginAttempts: 5,
    lockoutDuration: 300000, // 5 minutes in milliseconds
    sessionTimeout: 3600000, // 1 hour in milliseconds
    requireMFA: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
  };
  private lastSecurityScan: Date | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    this.initializeMockData();
  }

  // Initialize with some mock data for demonstration
  private initializeMockData() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoDaysAgo = new Date(now.getTime() - 172800000);

    // Mock security events
    this.securityEvents = [
      {
        id: "event-1",
        type: "login",
        user: { id: "user-1", email: "admin@example.com", role: "admin" },
        timestamp: oneHourAgo,
        ipAddress: "192.168.1.100",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        description: "Admin user successful login",
        severity: "low",
      },
      {
        id: "event-2",
        type: "failed_login",
        user: { id: "user-2", email: "user@example.com", role: "user" },
        timestamp: twoDaysAgo,
        ipAddress: "203.0.113.45",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        description: "Failed login attempt - invalid password",
        severity: "medium",
      },
      {
        id: "event-3",
        type: "role_change",
        user: { id: "user-3", email: "newadmin@example.com", role: "admin" },
        timestamp: twoDaysAgo,
        ipAddress: "192.168.1.100",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        description: "User promoted to admin role",
        severity: "high",
      },
    ];

    // Mock active sessions
    this.activeSessions.set("session-1", {
      id: "session-1",
      userId: "user-1",
      userEmail: "admin@example.com",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "New York, NY",
      createdAt: oneHourAgo,
      lastActivity: now,
      isCurrentSession: true,
    });

    this.activeSessions.set("session-2", {
      id: "session-2",
      userId: "user-2",
      userEmail: "user@example.com",
      ipAddress: "203.0.113.45",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "San Francisco, CA",
      createdAt: twoDaysAgo,
      lastActivity: oneHourAgo,
      isCurrentSession: false,
    });
  }

  async getSecurityEvents(filters?: {
    severity?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityEvent[]> {
    try {
      let events = [...this.securityEvents];

      // Apply filters
      if (filters?.severity && filters.severity !== "all") {
        events = events.filter((event) => event.severity === filters.severity);
      }

      if (filters?.type) {
        events = events.filter((event) => event.type === filters.type);
      }

      if (filters?.startDate) {
        events = events.filter(
          (event) => new Date(event.timestamp) >= filters.startDate!
        );
      }

      if (filters?.endDate) {
        events = events.filter(
          (event) => new Date(event.timestamp) <= filters.endDate!
        );
      }

      // Sort by timestamp (newest first)
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply limit
      if (filters?.limit) {
        events = events.slice(0, filters.limit);
      }

      return events;
    } catch (error) {
      this.logger.error("Failed to get security events:", error);
      throw error;
    }
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    try {
      // Convert Map to Array and filter out expired sessions
      const sessions = Array.from(this.activeSessions.values());
      const now = new Date();

      // Filter out sessions that haven't been active in the last 24 hours
      return sessions.filter((session) => {
        const timeSinceLastActivity =
          now.getTime() - new Date(session.lastActivity).getTime();
        return timeSinceLastActivity < 86400000; // 24 hours
      });
    } catch (error) {
      this.logger.error("Failed to get active sessions:", error);
      throw error;
    }
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    return { ...this.securitySettings };
  }

  async updateSecuritySettings(
    updates: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    try {
      this.securitySettings = { ...this.securitySettings, ...updates };
      this.logger.log("Security settings updated", { updates });

      // In a real implementation, persist to database
      return { ...this.securitySettings };
    } catch (error) {
      this.logger.error("Failed to update security settings:", error);
      throw error;
    }
  }

  async getSecurityStats(): Promise<SecurityStats> {
    try {
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({
        where: { isActive: true },
      });

      // Calculate stats from events
      const totalLogins = this.securityEvents.filter(
        (e) => e.type === "login"
      ).length;
      const failedLogins = this.securityEvents.filter(
        (e) => e.type === "failed_login"
      ).length;
      const securityIncidents = this.securityEvents.filter((e) =>
        ["high", "critical"].includes(e.severity)
      ).length;

      return {
        totalLogins,
        failedLogins,
        activeSessions: this.activeSessions.size,
        securityIncidents,
        lastSecurityScan: this.lastSecurityScan,
      };
    } catch (error) {
      this.logger.error("Failed to get security stats:", error);
      throw error;
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    try {
      if (!this.activeSessions.has(sessionId)) {
        throw new Error("Session not found");
      }

      const session = this.activeSessions.get(sessionId)!;

      // Log security event
      this.logSecurityEvent({
        type: "logout",
        user: { id: session.userId, email: session.userEmail, role: "user" },
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        description: "Session terminated by admin",
        severity: "medium",
      });

      // Remove session
      this.activeSessions.delete(sessionId);

      this.logger.log(`Session ${sessionId} terminated by admin`);
    } catch (error) {
      this.logger.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  async runSecurityScan(): Promise<void> {
    try {
      this.logger.log("Starting security scan...");

      // Simulate security scan
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.lastSecurityScan = new Date();

      // Log security event
      this.logSecurityEvent({
        type: "api_access",
        user: { id: "system", email: "system@example.com", role: "admin" },
        ipAddress: "127.0.0.1",
        userAgent: "QoderResume Security Scanner",
        description: "Security scan completed",
        severity: "low",
      });

      this.logger.log("Security scan completed");
    } catch (error) {
      this.logger.error("Failed to run security scan:", error);
      throw error;
    }
  }

  // Helper method to log security events
  logSecurityEvent(eventData: Omit<SecurityEvent, "id" | "timestamp">): void {
    const event: SecurityEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.securityEvents.unshift(event); // Add to beginning of array

    // Keep only the last 1000 events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(0, 1000);
    }

    this.logger.log("Security event logged", {
      type: event.type,
      severity: event.severity,
      user: event.user.email,
    });
  }

  // Helper method to add/update active session
  updateSession(sessionData: ActiveSession): void {
    this.activeSessions.set(sessionData.id, sessionData);
  }

  // Helper method to clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const timeSinceLastActivity =
        now.getTime() - new Date(session.lastActivity).getTime();

      if (timeSinceLastActivity > expiredThreshold) {
        this.activeSessions.delete(sessionId);
        this.logger.log(`Expired session ${sessionId} cleaned up`);
      }
    }
  }
}
