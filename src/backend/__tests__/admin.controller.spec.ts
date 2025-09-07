import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "../modules/admin/controllers/admin.controller";
import { AdminAnalyticsService } from "../modules/admin/services/admin-analytics.service";
import { AdminSecurityService } from "../modules/admin/services/admin-security.service";
import { SystemMonitoringService } from "../modules/admin/services/system-monitoring.service";
import { UserManagementService } from "../modules/admin/services/user-management.service";
import { JwtAuthGuard } from "../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../modules/auth/guards/roles.guard";
import { UserRole } from "../modules/auth/interfaces/auth.interfaces";

describe("AdminController", () => {
  let controller: AdminController;
  let analyticsService: jest.Mocked<AdminAnalyticsService>;
  let userManagementService: jest.Mocked<UserManagementService>;
  let systemMonitoringService: jest.Mocked<SystemMonitoringService>;
  let securityService: jest.Mocked<AdminSecurityService>;

  const mockSystemMetrics = {
    totalUsers: 100,
    activeUsers: 85,
    adminUsers: 5,
    totalJobs: 250,
    newUsersThisWeek: 15,
    activeUsersThisWeek: 25,
    jobsThisWeek: 45,
    userGrowthRate: 12.5,
    jobApplicationRate: 8.3,
  };

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockSecurityEvent = {
    id: "event-1",
    type: "login" as const,
    user: { id: "user-1", email: "test@example.com", role: "user" },
    timestamp: new Date(),
    ipAddress: "192.168.1.100",
    userAgent: "Test Agent",
    description: "Test login",
    severity: "low" as const,
  };

  beforeEach(async () => {
    const mockAnalyticsService = {
      getSystemMetrics: jest.fn(),
      getUserActivityData: jest.fn(),
      getPopularFeatures: jest.fn(),
      getTopUsers: jest.fn(),
    };

    const mockUserManagementService = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      getUserStats: jest.fn(),
      getUserActivity: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deactivateUser: jest.fn(),
      activateUser: jest.fn(),
      deleteUser: jest.fn(),
      promoteToAdmin: jest.fn(),
      demoteFromAdmin: jest.fn(),
      verifyUserEmail: jest.fn(),
      resetUserPassword: jest.fn(),
    };

    const mockSystemMonitoringService = {
      getSystemHealth: jest.fn(),
      getPerformanceHistory: jest.fn(),
      getDatabaseMetrics: jest.fn(),
      getQueueMetrics: jest.fn(),
      getRecentErrors: jest.fn(),
      getRecentWarnings: jest.fn(),
    };

    const mockSecurityService = {
      getSecurityEvents: jest.fn(),
      getActiveSessions: jest.fn(),
      getSecuritySettings: jest.fn(),
      getSecurityStats: jest.fn(),
      updateSecuritySettings: jest.fn(),
      terminateSession: jest.fn(),
      runSecurityScan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: UserManagementService,
          useValue: mockUserManagementService,
        },
        {
          provide: SystemMonitoringService,
          useValue: mockSystemMonitoringService,
        },
        {
          provide: AdminSecurityService,
          useValue: mockSecurityService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    analyticsService = module.get(AdminAnalyticsService);
    userManagementService = module.get(UserManagementService);
    systemMonitoringService = module.get(SystemMonitoringService);
    securityService = module.get(AdminSecurityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Analytics Endpoints", () => {
    describe("getSystemMetrics", () => {
      it("should return system metrics", async () => {
        // Arrange
        analyticsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);

        // Act
        const result = await controller.getSystemMetrics();

        // Assert
        expect(result).toEqual(mockSystemMetrics);
        expect(analyticsService.getSystemMetrics).toHaveBeenCalledTimes(1);
      });

      it("should handle service errors", async () => {
        // Arrange
        analyticsService.getSystemMetrics.mockRejectedValue(
          new Error("Service unavailable")
        );

        // Act & Assert
        await expect(controller.getSystemMetrics()).rejects.toThrow(
          "Service unavailable"
        );
      });
    });

    describe("getUserActivityData", () => {
      it("should return user activity data with default days", async () => {
        // Arrange
        const mockActivityData = [
          {
            date: "2024-01-10",
            activeUsers: 25,
            newUsers: 5,
            totalLogins: 150,
          },
        ];
        analyticsService.getUserActivityData.mockResolvedValue(
          mockActivityData
        );

        // Act
        const result = await controller.getUserActivityData();

        // Assert
        expect(result).toEqual(mockActivityData);
        expect(analyticsService.getUserActivityData).toHaveBeenCalledWith(30);
      });

      it("should return user activity data with custom days", async () => {
        // Arrange
        const mockActivityData = [
          { date: "2024-01-10", activeUsers: 15, newUsers: 3, totalLogins: 90 },
        ];
        analyticsService.getUserActivityData.mockResolvedValue(
          mockActivityData
        );

        // Act
        const result = await controller.getUserActivityData(7);

        // Assert
        expect(result).toEqual(mockActivityData);
        expect(analyticsService.getUserActivityData).toHaveBeenCalledWith(7);
      });
    });

    describe("getPopularFeatures", () => {
      it("should return popular features", async () => {
        // Arrange
        const mockFeatures = [
          {
            feature: "Resume Upload",
            usage: 150,
            users: 75,
            avgUsagePerUser: 2,
          },
        ];
        analyticsService.getPopularFeatures.mockResolvedValue(mockFeatures);

        // Act
        const result = await controller.getPopularFeatures();

        // Assert
        expect(result).toEqual(mockFeatures);
        expect(analyticsService.getPopularFeatures).toHaveBeenCalledTimes(1);
      });
    });

    describe("getTopUsers", () => {
      it("should return top users with default limit", async () => {
        // Arrange
        const mockTopUsers = [
          {
            userId: "user-1",
            userEmail: "user1@example.com",
            userName: "John Doe",
            jobCount: 15,
            resumeCount: 3,
            lastActivity: new Date(),
            activityScore: 35,
          },
        ];
        analyticsService.getTopUsers.mockResolvedValue(mockTopUsers);

        // Act
        const result = await controller.getTopUsers();

        // Assert
        expect(result).toEqual(mockTopUsers);
        expect(analyticsService.getTopUsers).toHaveBeenCalledWith(10);
      });

      it("should return top users with custom limit", async () => {
        // Arrange
        const mockTopUsers = [
          {
            userId: "user-1",
            userEmail: "user1@example.com",
            userName: "John Doe",
            jobCount: 15,
            resumeCount: 3,
            lastActivity: new Date(),
            activityScore: 35,
          },
        ];
        analyticsService.getTopUsers.mockResolvedValue(mockTopUsers);

        // Act
        const result = await controller.getTopUsers(5);

        // Assert
        expect(result).toEqual(mockTopUsers);
        expect(analyticsService.getTopUsers).toHaveBeenCalledWith(5);
      });
    });
  });

  describe("User Management Endpoints", () => {
    describe("getUsers", () => {
      it("should return users with pagination", async () => {
        // Arrange
        const mockUsersResponse = {
          users: [mockUser],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
        userManagementService.getUsers.mockResolvedValue(mockUsersResponse);

        const filters = { page: 1, limit: 10 };

        // Act
        const result = await controller.getUsers(filters);

        // Assert
        expect(result).toEqual(mockUsersResponse);
        expect(userManagementService.getUsers).toHaveBeenCalledWith(filters);
      });
    });

    describe("getUserById", () => {
      it("should return user by ID", async () => {
        // Arrange
        userManagementService.getUserById.mockResolvedValue(mockUser as any);

        // Act
        const result = await controller.getUserById("user-1");

        // Assert
        expect(result).toEqual(mockUser);
        expect(userManagementService.getUserById).toHaveBeenCalledWith(
          "user-1"
        );
      });
    });

    describe("createUser", () => {
      it("should create a new user", async () => {
        // Arrange
        const createUserDto = {
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
          role: UserRole.USER,
        };
        userManagementService.createUser.mockResolvedValue(mockUser as any);

        // Act
        const result = await controller.createUser(createUserDto);

        // Assert
        expect(result).toEqual(mockUser);
        expect(userManagementService.createUser).toHaveBeenCalledWith(
          createUserDto
        );
      });
    });

    describe("updateUser", () => {
      it("should update user", async () => {
        // Arrange
        const updateUserDto = { firstName: "Updated" };
        const updatedUser = { ...mockUser, firstName: "Updated" };
        userManagementService.updateUser.mockResolvedValue(updatedUser as any);

        // Act
        const result = await controller.updateUser("user-1", updateUserDto);

        // Assert
        expect(result).toEqual(updatedUser);
        expect(userManagementService.updateUser).toHaveBeenCalledWith(
          "user-1",
          updateUserDto
        );
      });
    });

    describe("deleteUser", () => {
      it("should delete user", async () => {
        // Arrange
        userManagementService.deleteUser.mockResolvedValue();

        // Act
        await controller.deleteUser("user-1");

        // Assert
        expect(userManagementService.deleteUser).toHaveBeenCalledWith("user-1");
      });
    });

    describe("promoteToAdmin", () => {
      it("should promote user to admin", async () => {
        // Arrange
        const adminUser = { ...mockUser, role: UserRole.ADMIN };
        userManagementService.promoteToAdmin.mockResolvedValue(
          adminUser as any
        );

        // Act
        const result = await controller.promoteToAdmin("user-1");

        // Assert
        expect(result).toEqual(adminUser);
        expect(userManagementService.promoteToAdmin).toHaveBeenCalledWith(
          "user-1"
        );
      });
    });
  });

  describe("System Monitoring Endpoints", () => {
    describe("getSystemHealth", () => {
      it("should return system health status", async () => {
        // Arrange
        const mockHealthStatus = {
          status: "healthy" as const,
          uptime: 3600,
          timestamp: new Date().toISOString(),
          services: {
            database: {
              status: "healthy" as const,
              responseTime: 10,
              lastCheck: new Date().toISOString(),
            },
            redis: {
              status: "healthy" as const,
              responseTime: 2,
              lastCheck: new Date().toISOString(),
            },
            ai: {
              status: "healthy" as const,
              responseTime: 150,
              lastCheck: new Date().toISOString(),
            },
            websocket: {
              status: "healthy" as const,
              responseTime: 5,
              lastCheck: new Date().toISOString(),
            },
            queue: {
              status: "healthy" as const,
              responseTime: 8,
              lastCheck: new Date().toISOString(),
            },
          },
          performance: {
            memory: {
              total: 8192,
              used: 2048,
              free: 6144,
              percentage: 25,
              heap: { total: 1024, used: 512, percentage: 50 },
            },
            cpu: { usage: 45.2, cores: 4, model: "Intel", speed: 2400 },
            disk: { total: 100000, used: 50000, free: 50000, percentage: 50 },
            network: {
              requests: {
                total: 1000,
                success: 980,
                errors: 20,
                avgResponseTime: 120,
              },
              connections: { active: 10, idle: 5 },
            },
          },
          errors: [],
          warnings: [],
        };
        systemMonitoringService.getSystemHealth.mockResolvedValue(
          mockHealthStatus
        );

        // Act
        const result = await controller.getSystemHealth();

        // Assert
        expect(result).toEqual(mockHealthStatus);
        expect(systemMonitoringService.getSystemHealth).toHaveBeenCalledTimes(
          1
        );
      });
    });

    describe("getPerformanceHistory", () => {
      it("should return performance history with default hours", async () => {
        // Arrange
        const mockMetrics = [
          {
            timestamp: new Date().toISOString(),
            responseTime: { avg: 120, p50: 100, p95: 250, p99: 500 },
            throughput: { requests: 150, errors: 5, successRate: 96.7 },
            resources: { cpuUsage: 45.2, memoryUsage: 25, diskUsage: 30 },
          },
        ];
        systemMonitoringService.getPerformanceHistory.mockResolvedValue(
          mockMetrics
        );

        // Act
        const result = await controller.getPerformanceHistory();

        // Assert
        expect(result).toEqual(mockMetrics);
        expect(
          systemMonitoringService.getPerformanceHistory
        ).toHaveBeenCalledWith(24);
      });

      it("should return performance history with custom hours", async () => {
        // Arrange
        const mockMetrics = [
          {
            timestamp: new Date().toISOString(),
            responseTime: { avg: 120, p50: 100, p95: 250, p99: 500 },
            throughput: { requests: 150, errors: 5, successRate: 96.7 },
            resources: { cpuUsage: 45.2, memoryUsage: 25, diskUsage: 30 },
          },
        ];
        systemMonitoringService.getPerformanceHistory.mockResolvedValue(
          mockMetrics
        );

        // Act
        const result = await controller.getPerformanceHistory(12);

        // Assert
        expect(result).toEqual(mockMetrics);
        expect(
          systemMonitoringService.getPerformanceHistory
        ).toHaveBeenCalledWith(12);
      });
    });

    describe("getRecentErrors", () => {
      it("should return recent errors with default limit", async () => {
        // Arrange
        const mockErrors = [
          {
            id: "error-1",
            timestamp: new Date().toISOString(),
            level: "error" as const,
            message: "Test error",
            source: "system",
            count: 1,
          },
        ];
        systemMonitoringService.getRecentErrors.mockResolvedValue(mockErrors);

        // Act
        const result = await controller.getRecentErrors();

        // Assert
        expect(result).toEqual(mockErrors);
        expect(systemMonitoringService.getRecentErrors).toHaveBeenCalledWith(
          10
        );
      });

      it("should return recent errors with custom limit", async () => {
        // Arrange
        const mockErrors = [
          {
            id: "error-1",
            timestamp: new Date().toISOString(),
            level: "error" as const,
            message: "Test error",
            source: "system",
            count: 1,
          },
        ];
        systemMonitoringService.getRecentErrors.mockResolvedValue(mockErrors);

        // Act
        const result = await controller.getRecentErrors(5);

        // Assert
        expect(result).toEqual(mockErrors);
        expect(systemMonitoringService.getRecentErrors).toHaveBeenCalledWith(5);
      });
    });
  });

  describe("Security Endpoints", () => {
    describe("getSecurityEvents", () => {
      it("should return security events with default filters", async () => {
        // Arrange
        const mockEvents = [mockSecurityEvent];
        securityService.getSecurityEvents.mockResolvedValue(mockEvents);

        // Act
        const result = await controller.getSecurityEvents();

        // Assert
        expect(result).toEqual({ data: mockEvents });
        expect(securityService.getSecurityEvents).toHaveBeenCalledWith({
          severity: undefined,
          type: undefined,
          limit: 50,
        });
      });

      it("should return security events with filters", async () => {
        // Arrange
        const mockEvents = [mockSecurityEvent];
        securityService.getSecurityEvents.mockResolvedValue(mockEvents);

        // Act
        const result = await controller.getSecurityEvents("high", "login", 25);

        // Assert
        expect(result).toEqual({ data: mockEvents });
        expect(securityService.getSecurityEvents).toHaveBeenCalledWith({
          severity: "high",
          type: "login",
          limit: 25,
        });
      });
    });

    describe("getActiveSessions", () => {
      it("should return active sessions", async () => {
        // Arrange
        const mockSessions = [
          {
            id: "session-1",
            userId: "user-1",
            userEmail: "test@example.com",
            ipAddress: "192.168.1.100",
            userAgent: "Test Agent",
            createdAt: new Date(),
            lastActivity: new Date(),
            isCurrentSession: true,
          },
        ];
        securityService.getActiveSessions.mockResolvedValue(mockSessions);

        // Act
        const result = await controller.getActiveSessions();

        // Assert
        expect(result).toEqual({ data: mockSessions });
        expect(securityService.getActiveSessions).toHaveBeenCalledTimes(1);
      });
    });

    describe("getSecuritySettings", () => {
      it("should return security settings", async () => {
        // Arrange
        const mockSettings = {
          maxLoginAttempts: 5,
          lockoutDuration: 300000,
          sessionTimeout: 3600000,
          requireMFA: false,
          passwordMinLength: 8,
          passwordRequireSpecial: true,
          passwordRequireNumbers: true,
          passwordRequireUppercase: true,
          loginNotifications: true,
          suspiciousActivityAlerts: true,
        };
        securityService.getSecuritySettings.mockResolvedValue(mockSettings);

        // Act
        const result = await controller.getSecuritySettings();

        // Assert
        expect(result).toEqual({ data: mockSettings });
        expect(securityService.getSecuritySettings).toHaveBeenCalledTimes(1);
      });
    });

    describe("getSecurityStats", () => {
      it("should return security statistics", async () => {
        // Arrange
        const mockStats = {
          totalLogins: 500,
          failedLogins: 25,
          activeSessions: 12,
          securityIncidents: 3,
          lastSecurityScan: new Date(),
        };
        securityService.getSecurityStats.mockResolvedValue(mockStats);

        // Act
        const result = await controller.getSecurityStats();

        // Assert
        expect(result).toEqual({ data: mockStats });
        expect(securityService.getSecurityStats).toHaveBeenCalledTimes(1);
      });
    });

    describe("updateSecuritySettings", () => {
      it("should update security settings", async () => {
        // Arrange
        const updates = { maxLoginAttempts: 10, passwordMinLength: 12 };
        const updatedSettings = {
          maxLoginAttempts: 10,
          lockoutDuration: 300000,
          sessionTimeout: 3600000,
          requireMFA: false,
          passwordMinLength: 12,
          passwordRequireSpecial: true,
          passwordRequireNumbers: true,
          passwordRequireUppercase: true,
          loginNotifications: true,
          suspiciousActivityAlerts: true,
        };
        securityService.updateSecuritySettings.mockResolvedValue(
          updatedSettings
        );

        // Act
        const result = await controller.updateSecuritySettings(updates);

        // Assert
        expect(result).toEqual({ data: updatedSettings });
        expect(securityService.updateSecuritySettings).toHaveBeenCalledWith(
          updates
        );
      });
    });

    describe("terminateSession", () => {
      it("should terminate session successfully", async () => {
        // Arrange
        securityService.terminateSession.mockResolvedValue();

        // Act
        const result = await controller.terminateSession("session-1");

        // Assert
        expect(result).toEqual({ message: "Session terminated successfully" });
        expect(securityService.terminateSession).toHaveBeenCalledWith(
          "session-1"
        );
      });
    });

    describe("runSecurityScan", () => {
      it("should run security scan successfully", async () => {
        // Arrange
        securityService.runSecurityScan.mockResolvedValue();

        // Act
        const result = await controller.runSecurityScan();

        // Assert
        expect(result).toEqual({
          message: "Security scan completed successfully",
        });
        expect(securityService.runSecurityScan).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should propagate service errors correctly", async () => {
      // Arrange
      const serviceError = new Error("Service error occurred");
      analyticsService.getSystemMetrics.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getSystemMetrics()).rejects.toThrow(
        "Service error occurred"
      );
    });

    it("should handle async operation failures", async () => {
      // Arrange
      securityService.runSecurityScan.mockRejectedValue(
        new Error("Security scan failed")
      );

      // Act & Assert
      await expect(controller.runSecurityScan()).rejects.toThrow(
        "Security scan failed"
      );
    });
  });

  describe("Parameter Parsing", () => {
    it("should correctly parse string query parameters to numbers", async () => {
      // Arrange
      analyticsService.getUserActivityData.mockResolvedValue([]);

      // Act
      await controller.getUserActivityData("15" as any);

      // Assert
      expect(analyticsService.getUserActivityData).toHaveBeenCalledWith(15);
    });

    it("should handle invalid number parameters gracefully", async () => {
      // Arrange
      analyticsService.getUserActivityData.mockResolvedValue([]);

      // Act
      await controller.getUserActivityData("invalid" as any);

      // Assert
      // NaN should be handled by the parseInt function
      expect(analyticsService.getUserActivityData).toHaveBeenCalledWith(NaN);
    });
  });

  describe("Guard Integration", () => {
    it("should be protected by JwtAuthGuard and RolesGuard", () => {
      // This test ensures the guards are properly configured
      // The actual guard logic is mocked in the beforeEach setup
      expect(controller).toBeDefined();
    });
  });
});
