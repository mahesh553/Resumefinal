import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { JobApplication } from "../database/entities/job-application.entity";
import { User, UserRole } from "../database/entities/user.entity";
import { AdminAnalyticsService } from "../modules/admin/services/admin-analytics.service";

describe("AdminAnalyticsService", () => {
  let service: AdminAnalyticsService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jobRepository: jest.Mocked<Repository<JobApplication>>;

  const mockUsers: User[] = [
    {
      id: "user-1",
      email: "user1@example.com",
      firstName: "John",
      lastName: "Doe",
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
    },
    {
      id: "user-2",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      emailVerifiedAt: new Date("2024-01-01"),
      lastLoginAt: new Date("2024-01-12"),
      passwordHash: "hashedPassword",
      stripeCustomerId: null,
      resumes: [],
      jobApplications: [],
      subscriptions: [],
    },
    {
      id: "user-3",
      email: "inactive@example.com",
      firstName: "Inactive",
      lastName: "User",
      role: UserRole.USER,
      isActive: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      emailVerifiedAt: null,
      lastLoginAt: null,
      passwordHash: "hashedPassword",
      stripeCustomerId: null,
      resumes: [],
      jobApplications: [],
      subscriptions: [],
    },
  ];

  const mockJobs: Partial<JobApplication>[] = [
    {
      id: "job-1",
      userId: "user-1",
      jobTitle: "Software Engineer",
      vendorName: "Tech Corp",
      status: "applied",
      appliedDate: new Date("2024-01-05"),
      createdAt: new Date("2024-01-05"),
    },
    {
      id: "job-2",
      userId: "user-1",
      jobTitle: "Frontend Developer",
      vendorName: "StartupXYZ",
      status: "interviewing",
      appliedDate: new Date("2024-01-08"),
      createdAt: new Date("2024-01-08"),
    },
  ];

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    const mockJobRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: mockJobRepository,
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
    userRepository = module.get(getRepositoryToken(User));
    jobRepository = module.get(getRepositoryToken(JobApplication));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSystemMetrics", () => {
    it("should return comprehensive system metrics", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getCount: jest.fn(),
      };

      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(85) // activeUsers
        .mockResolvedValueOnce(5); // adminUsers

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ date: "2024-01-10", count: "15" }]) // newUsersThisWeek
        .mockResolvedValueOnce([{ date: "2024-01-10", count: "25" }]); // activeUsersThisWeek

      jobRepository.count
        .mockResolvedValueOnce(250) // totalJobs
        .mockResolvedValueOnce(45); // jobsThisWeek

      // Act
      const result = await service.getSystemMetrics();

      // Assert
      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 85,
        adminUsers: 5,
        totalJobs: 250,
        newUsersThisWeek: 15,
        activeUsersThisWeek: 25,
        jobsThisWeek: 45,
        userGrowthRate: expect.any(Number),
        jobApplicationRate: expect.any(Number),
      });

      expect(userRepository.count).toHaveBeenCalledTimes(3);
      expect(jobRepository.count).toHaveBeenCalledTimes(2);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      userRepository.count.mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act & Assert
      await expect(service.getSystemMetrics()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should calculate growth rates correctly", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getCount: jest.fn(),
      };

      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(85) // activeUsers
        .mockResolvedValueOnce(5); // adminUsers

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ date: "2024-01-10", count: "20" }]) // newUsersThisWeek
        .mockResolvedValueOnce([{ date: "2024-01-03", count: "10" }]); // newUsersLastWeek

      jobRepository.count
        .mockResolvedValueOnce(250) // totalJobs
        .mockResolvedValueOnce(45); // jobsThisWeek

      // Act
      const result = await service.getSystemMetrics();

      // Assert
      expect(result.userGrowthRate).toBeCloseTo(100); // (20-10)/10 * 100 = 100%
    });
  });

  describe("getUserActivityData", () => {
    it("should return user activity data for specified days", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockActivityData = [
        {
          date: "2024-01-10",
          activeUsers: "25",
          newUsers: "5",
          totalLogins: "150",
        },
        {
          date: "2024-01-09",
          activeUsers: "22",
          newUsers: "3",
          totalLogins: "134",
        },
        {
          date: "2024-01-08",
          activeUsers: "28",
          newUsers: "7",
          totalLogins: "168",
        },
      ];

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockActivityData);

      // Act
      const result = await service.getUserActivityData(3);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: "2024-01-10",
        activeUsers: 25,
        newUsers: 5,
        totalLogins: 150,
      });

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "user.lastLoginAt >= :startDate",
        expect.any(Object)
      );
    });

    it("should use default 30 days when no parameter provided", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      await service.getUserActivityData();

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "user.lastLoginAt >= :startDate",
        expect.objectContaining({
          startDate: expect.any(Date),
        })
      );
    });

    it("should handle empty results", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.getUserActivityData(7);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getPopularFeatures", () => {
    it("should return popular features usage statistics", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockFeaturesData = [
        { feature: "Resume Upload", usage: "150", users: "75" },
        { feature: "Job Tracking", usage: "125", users: "60" },
        { feature: "ATS Analysis", usage: "100", users: "45" },
      ];

      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockFeaturesData);

      // Act
      const result = await service.getPopularFeatures();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        feature: "Resume Upload",
        usage: 150,
        users: 75,
        avgUsagePerUser: 2,
      });

      expect(jobRepository.createQueryBuilder).toHaveBeenCalledWith("job");
    });

    it("should calculate average usage per user correctly", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockFeaturesData = [
        { feature: "Feature A", usage: "200", users: "50" },
      ];

      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockFeaturesData);

      // Act
      const result = await service.getPopularFeatures();

      // Assert
      expect(result[0].avgUsagePerUser).toEqual(4); // 200/50 = 4
    });

    it("should handle division by zero in usage calculations", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockFeaturesData = [
        { feature: "Feature A", usage: "100", users: "0" },
      ];

      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockFeaturesData);

      // Act
      const result = await service.getPopularFeatures();

      // Assert
      expect(result[0].avgUsagePerUser).toEqual(0);
    });
  });

  describe("getTopUsers", () => {
    it("should return top users by activity", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockTopUsersData = [
        {
          userId: "user-1",
          userEmail: "user1@example.com",
          userName: "John Doe",
          jobCount: "15",
          resumeCount: "3",
          lastActivity: new Date("2024-01-10"),
        },
        {
          userId: "user-2",
          userEmail: "user2@example.com",
          userName: "Jane Smith",
          jobCount: "12",
          resumeCount: "2",
          lastActivity: new Date("2024-01-09"),
        },
      ];

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockTopUsersData);

      // Act
      const result = await service.getTopUsers(2);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: "user-1",
        userEmail: "user1@example.com",
        userName: "John Doe",
        jobCount: 15,
        resumeCount: 3,
        lastActivity: expect.any(Date),
        activityScore: expect.any(Number),
      });

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(2);
    });

    it("should use default limit of 10 when no parameter provided", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      await service.getTopUsers();

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it("should calculate activity score correctly", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mkReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      const mockTopUsersData = [
        {
          userId: "user-1",
          userEmail: "user1@example.com",
          userName: "John Doe",
          jobCount: "10",
          resumeCount: "2",
          lastActivity: new Date("2024-01-10"),
        },
      ];

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockTopUsersData);

      // Act
      const result = await service.getTopUsers(1);

      // Assert
      expect(result[0].activityScore).toEqual(30); // (10 * 2) + (2 * 5) = 30
    });

    it("should handle database errors in getTopUsers", async () => {
      // Arrange
      userRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error("Database query failed");
      });

      // Act & Assert
      await expect(service.getTopUsers()).rejects.toThrow(
        "Database query failed"
      );
    });
  });

  describe("error handling", () => {
    it("should propagate database errors with context", async () => {
      // Arrange
      const dbError = new Error("Connection timeout");
      userRepository.count.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getSystemMetrics()).rejects.toThrow(
        "Connection timeout"
      );
    });

    it("should handle null/undefined query results", async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue(null);

      // Act
      const result = await service.getUserActivityData();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
