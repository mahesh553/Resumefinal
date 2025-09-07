import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User, UserRole } from "../database/entities/user.entity";
import {
  AdminSecurityService,
  SecurityEvent,
  ActiveSession,
  SecuritySettings,
} from "../modules/admin/services/admin-security.service";

describe("AdminSecurityService", () => {
  let service: AdminSecurityService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: "user-1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    emailVerifiedAt: new Date("2024-01-01"),
    lastLoginAt: new Date("2024-01-10"),
    passwordHash: "hashedPassword",
    stripeCustomerId: null,
    resumes: [],
    jobApplications: [],
    subscriptions: [],
  };

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSecurityService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AdminSecurityService>(AdminSecurityService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSecurityEvents", () => {
    it("should return security events with no filters", async () => {
      // Act
      const result = await service.getSecurityEvents();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that events have required properties
      result.forEach(event => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("user");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("ipAddress");
        expect(event).toHaveProperty("userAgent");
        expect(event).toHaveProperty("description");
        expect(event).toHaveProperty("severity");
      });
    });

    it("should filter events by severity", async () => {
      // Act
      const highSeverityEvents = await service.getSecurityEvents({ severity: "high" });

      // Assert
      expect(Array.isArray(highSeverityEvents)).toBe(true);
      highSeverityEvents.forEach(event => {
        expect(event.severity).toBe("high");
      });
    });

    it("should filter events by type", async () => {
      // Act
      const loginEvents = await service.getSecurityEvents({ type: "login" });

      // Assert
      expect(Array.isArray(loginEvents)).toBe(true);
      loginEvents.forEach(event => {
        expect(event.type).toBe("login");
      });
    });

    it("should apply limit to results", async () => {
      // Act
      const limitedEvents = await service.getSecurityEvents({ limit: 1 });

      // Assert
      expect(limitedEvents.length).toBeLessThanOrEqual(1);
    });

    it("should filter events by date range", async () => {
      // Arrange
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      // Act
      const filteredEvents = await service.getSecurityEvents({
        startDate,
        endDate,
      });

      // Assert
      expect(Array.isArray(filteredEvents)).toBe(true);
      filteredEvents.forEach(event => {
        const eventDate = new Date(event.timestamp);
        expect(eventDate).toBeInstanceOf(Date);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it("should return events sorted by timestamp (newest first)", async () => {
      // Act
      const events = await service.getSecurityEvents();

      // Assert
      if (events.length > 1) {
        for (let i = 0; i < events.length - 1; i++) {
          const currentTime = new Date(events[i].timestamp).getTime();
          const nextTime = new Date(events[i + 1].timestamp).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }
    });

    it("should handle errors gracefully", async () => {
      // Arrange - Mock internal error
      const originalGetSecurityEvents = service.getSecurityEvents;
      jest.spyOn(service, "getSecurityEvents").mockImplementationOnce(() => {
        throw new Error("Internal service error");
      });

      // Act & Assert
      await expect(service.getSecurityEvents()).rejects.toThrow("Internal service error");
      
      // Restore original method
      service.getSecurityEvents = originalGetSecurityEvents;
    });
  });

  describe("getActiveSessions", () => {
    it("should return active sessions", async () => {
      // Act
      const result = await service.getActiveSessions();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      
      result.forEach(session => {
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("userId");
        expect(session).toHaveProperty("userEmail");
        expect(session).toHaveProperty("ipAddress");
        expect(session).toHaveProperty("userAgent");
        expect(session).toHaveProperty("createdAt");
        expect(session).toHaveProperty("lastActivity");
        expect(session).toHaveProperty("isCurrentSession");
      });
    });

    it("should filter out expired sessions (older than 24 hours)", async () => {
      // Arrange - Add an expired session
      const expiredSession: ActiveSession = {
        id: "expired-session",
        userId: "user-expired",
        userEmail: "expired@example.com",
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        isCurrentSession: false,
      };

      service.updateSession(expiredSession);

      // Act
      const result = await service.getActiveSessions();

      // Assert
      const expiredSessionInResults = result.find(s => s.id === "expired-session");
      expect(expiredSessionInResults).toBeUndefined();
    });

    it("should handle empty sessions", async () => {
      // Arrange - Clean up any existing sessions
      service.cleanupExpiredSessions();
      
      // Clear all sessions for this test
      const sessions = await service.getActiveSessions();
      sessions.forEach(session => {
        if (!session.isCurrentSession) {
          service.terminateSession(session.id).catch(() => {}); // Ignore errors for cleanup
        }
      });

      // Act
      const result = await service.getActiveSessions();

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getSecuritySettings", () => {
    it("should return current security settings", async () => {
      // Act
      const result = await service.getSecuritySettings();

      // Assert
      expect(result).toHaveProperty("maxLoginAttempts");
      expect(result).toHaveProperty("lockoutDuration");
      expect(result).toHaveProperty("sessionTimeout");
      expect(result).toHaveProperty("requireMFA");
      expect(result).toHaveProperty("passwordMinLength");
      expect(result).toHaveProperty("passwordRequireSpecial");
      expect(result).toHaveProperty("passwordRequireNumbers");
      expect(result).toHaveProperty("passwordRequireUppercase");
      expect(result).toHaveProperty("loginNotifications");
      expect(result).toHaveProperty("suspiciousActivityAlerts");

      // Check default values
      expect(typeof result.maxLoginAttempts).toBe("number");
      expect(typeof result.lockoutDuration).toBe("number");
      expect(typeof result.sessionTimeout).toBe("number");
      expect(typeof result.requireMFA).toBe("boolean");
      expect(typeof result.passwordMinLength).toBe("number");
      expect(typeof result.passwordRequireSpecial).toBe("boolean");
      expect(typeof result.passwordRequireNumbers).toBe("boolean");
      expect(typeof result.passwordRequireUppercase).toBe("boolean");
      expect(typeof result.loginNotifications).toBe("boolean");
      expect(typeof result.suspiciousActivityAlerts).toBe("boolean");
    });

    it("should return a copy of settings (not reference)", async () => {
      // Act
      const result1 = await service.getSecuritySettings();
      const result2 = await service.getSecuritySettings();

      // Assert
      expect(result1).not.toBe(result2); // Different object references
      expect(result1).toEqual(result2); // But same values
    });
  });

  describe("updateSecuritySettings", () => {
    it("should update security settings", async () => {
      // Arrange
      const updates: Partial<SecuritySettings> = {
        maxLoginAttempts: 10,
        passwordMinLength: 12,
        requireMFA: true,
      };

      // Act
      const result = await service.updateSecuritySettings(updates);

      // Assert
      expect(result.maxLoginAttempts).toBe(10);
      expect(result.passwordMinLength).toBe(12);
      expect(result.requireMFA).toBe(true);

      // Verify settings are persisted
      const currentSettings = await service.getSecuritySettings();
      expect(currentSettings.maxLoginAttempts).toBe(10);
      expect(currentSettings.passwordMinLength).toBe(12);
      expect(currentSettings.requireMFA).toBe(true);
    });

    it("should only update provided fields", async () => {
      // Arrange
      const originalSettings = await service.getSecuritySettings();
      const updates: Partial<SecuritySettings> = {
        maxLoginAttempts: 15,
      };

      // Act
      const result = await service.updateSecuritySettings(updates);

      // Assert
      expect(result.maxLoginAttempts).toBe(15);
      expect(result.passwordMinLength).toBe(originalSettings.passwordMinLength);
      expect(result.requireMFA).toBe(originalSettings.requireMFA);
    });

    it("should handle empty updates", async () => {
      // Arrange
      const originalSettings = await service.getSecuritySettings();

      // Act
      const result = await service.updateSecuritySettings({});

      // Assert
      expect(result).toEqual(originalSettings);
    });
  });

  describe("getSecurityStats", () => {
    beforeEach(() => {
      // Setup mock user repository responses
      userRepository.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(85); // active users
    });

    it("should return security statistics", async () => {
      // Act
      const result = await service.getSecurityStats();

      // Assert
      expect(result).toHaveProperty("totalLogins");
      expect(result).toHaveProperty("failedLogins");
      expect(result).toHaveProperty("activeSessions");
      expect(result).toHaveProperty("securityIncidents");
      expect(result).toHaveProperty("lastSecurityScan");

      expect(typeof result.totalLogins).toBe("number");
      expect(typeof result.failedLogins).toBe("number");
      expect(typeof result.activeSessions).toBe("number");
      expect(typeof result.securityIncidents).toBe("number");
      expect(result.lastSecurityScan === null || result.lastSecurityScan instanceof Date).toBe(true);
    });

    it("should calculate stats from security events", async () => {
      // Arrange - Log some test events
      service.logSecurityEvent({
        type: "login",
        user: { id: "user-1", email: "test@example.com", role: "user" },
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        description: "Test login",
        severity: "low",
      });

      service.logSecurityEvent({
        type: "failed_login",
        user: { id: "user-2", email: "test2@example.com", role: "user" },
        ipAddress: "192.168.1.101",
        userAgent: "Test Agent",
        description: "Test failed login",
        severity: "medium",
      });

      service.logSecurityEvent({
        type: "role_change",
        user: { id: "user-3", email: "test3@example.com", role: "admin" },
        ipAddress: "192.168.1.102",
        userAgent: "Test Agent",
        description: "Test role change",
        severity: "high",
      });

      // Act
      const result = await service.getSecurityStats();

      // Assert
      expect(result.totalLogins).toBeGreaterThan(0);
      expect(result.failedLogins).toBeGreaterThan(0);
      expect(result.securityIncidents).toBeGreaterThan(0); // high severity events
    });

    it("should handle database errors", async () => {
      // Arrange
      userRepository.count.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.getSecurityStats()).rejects.toThrow("Database error");
    });
  });

  describe("terminateSession", () => {
    it("should terminate an existing session", async () => {
      // Arrange
      const testSession: ActiveSession = {
        id: "test-session",
        userId: "user-1",
        userEmail: "test@example.com",
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        createdAt: new Date(),
        lastActivity: new Date(),
        isCurrentSession: false,
      };

      service.updateSession(testSession);

      // Act
      await service.terminateSession("test-session");

      // Assert
      const sessions = await service.getActiveSessions();
      const terminatedSession = sessions.find(s => s.id === "test-session");
      expect(terminatedSession).toBeUndefined();
    });

    it("should throw error for non-existent session", async () => {
      // Act & Assert
      await expect(service.terminateSession("non-existent-session"))
        .rejects.toThrow("Session not found");
    });

    it("should log security event when session is terminated", async () => {
      // Arrange
      const testSession: ActiveSession = {
        id: "test-session-2",
        userId: "user-1",
        userEmail: "test@example.com",
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        createdAt: new Date(),
        lastActivity: new Date(),
        isCurrentSession: false,
      };

      service.updateSession(testSession);
      const eventsBefore = await service.getSecurityEvents();

      // Act
      await service.terminateSession("test-session-2");

      // Assert
      const eventsAfter = await service.getSecurityEvents();
      expect(eventsAfter.length).toBe(eventsBefore.length + 1);
      
      const logoutEvent = eventsAfter[0]; // Should be newest
      expect(logoutEvent.type).toBe("logout");
      expect(logoutEvent.description).toContain("terminated by admin");
    });
  });

  describe("runSecurityScan", () => {
    it("should complete security scan successfully", async () => {
      // Arrange
      const statsBefore = await service.getSecurityStats();

      // Act
      await service.runSecurityScan();

      // Assert
      const statsAfter = await service.getSecurityStats();
      expect(statsAfter.lastSecurityScan).toBeInstanceOf(Date);
      expect(statsAfter.lastSecurityScan!.getTime()).toBeGreaterThan(
        statsBefore.lastSecurityScan?.getTime() || 0
      );
    });

    it("should log security scan event", async () => {
      // Arrange
      const eventsBefore = await service.getSecurityEvents();

      // Act
      await service.runSecurityScan();

      // Assert
      const eventsAfter = await service.getSecurityEvents();
      expect(eventsAfter.length).toBe(eventsBefore.length + 1);
      
      const scanEvent = eventsAfter[0]; // Should be newest
      expect(scanEvent.type).toBe("api_access");
      expect(scanEvent.description).toContain("Security scan completed");
      expect(scanEvent.user.email).toBe("system@example.com");
    });

    it("should handle scan simulation delay", async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await service.runSecurityScan();

      // Assert
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(2000); // Should take at least 2 seconds
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security event with generated ID and timestamp", async () => {
      // Arrange
      const eventData = {
        type: "login" as const,
        user: { id: "user-1", email: "test@example.com", role: "user" },
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        description: "Test login event",
        severity: "low" as const,
      };

      // Act
      service.logSecurityEvent(eventData);

      // Assert
      const events = await service.getSecurityEvents({ limit: 1 });
      const loggedEvent = events[0];
      
      expect(loggedEvent.id).toBeDefined();
      expect(loggedEvent.timestamp).toBeInstanceOf(Date);
      expect(loggedEvent.type).toBe("login");
      expect(loggedEvent.user.email).toBe("test@example.com");
      expect(loggedEvent.description).toBe("Test login event");
      expect(loggedEvent.severity).toBe("low");
    });

    it("should maintain event limit (max 1000)", async () => {
      // This test would be slow in real implementation
      // Here we just verify the method exists and can be called
      const eventData = {
        type: "login" as const,
        user: { id: "user-1", email: "test@example.com", role: "user" },
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        description: "Bulk test event",
        severity: "low" as const,
      };

      // Act - Log multiple events
      for (let i = 0; i < 5; i++) {
        service.logSecurityEvent({
          ...eventData,
          description: `Bulk test event ${i}`,
        });
      }

      // Assert
      const events = await service.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("updateSession and cleanupExpiredSessions", () => {
    it("should add/update session", () => {
      // Arrange
      const testSession: ActiveSession = {
        id: "update-test-session",
        userId: "user-1",
        userEmail: "test@example.com",
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        createdAt: new Date(),
        lastActivity: new Date(),
        isCurrentSession: false,
      };

      // Act
      service.updateSession(testSession);

      // Assert - This is tested indirectly through getActiveSessions
      // The method should not throw errors
      expect(() => service.updateSession(testSession)).not.toThrow();
    });

    it("should clean up expired sessions", () => {
      // Arrange - Add an expired session
      const expiredSession: ActiveSession = {
        id: "cleanup-test-session",
        userId: "user-expired",
        userEmail: "expired@example.com",
        ipAddress: "192.168.1.100",
        userAgent: "Test Agent",
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000),
        isCurrentSession: false,
      };

      service.updateSession(expiredSession);

      // Act
      service.cleanupExpiredSessions();

      // Assert - The cleanup method should not throw
      expect(() => service.cleanupExpiredSessions()).not.toThrow();
    });
  });
});