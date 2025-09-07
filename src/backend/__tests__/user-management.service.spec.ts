import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import * as bcrypt from "bcryptjs";

import { User, UserRole } from "../database/entities/user.entity";
import {
  UserManagementService,
  UserSearchFilters,
  CreateUserDto,
  UpdateUserDto,
} from "../modules/admin/services/user-management.service";

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockBcrypt = jest.mocked(bcrypt);

describe("UserManagementService", () => {
  let service: UserManagementService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: "user-1",
    email: "test@example.com",
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
  };

  const mockAdmin: User = {
    id: "admin-1",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    emailVerifiedAt: new Date("2024-01-01"),
    lastLoginAt: new Date("2024-01-10"),
    passwordHash: "hashedAdminPassword",
    stripeCustomerId: null,
    resumes: [],
    jobApplications: [],
    subscriptions: [],
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    } as any as SelectQueryBuilder<User>;

    const mockUserRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUsers", () => {
    it("should return users with pagination", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      // Act
      const result = await service.getUsers(filters);

      // Assert
      expect(result).toEqual({
        users: [mockUser],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it("should apply search filters", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        search: "john",
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      // Act
      await service.getUsers(filters);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search))",
        { search: "%john%" }
      );
    });

    it("should apply role filter", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        role: UserRole.ADMIN,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAdmin], 1]);

      // Act
      await service.getUsers(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("user.role = :role", {
        role: UserRole.ADMIN,
      });
    });

    it("should apply active status filter", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        isActive: true,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      // Act
      await service.getUsers(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("user.isActive = :isActive", {
        isActive: true,
      });
    });

    it("should apply email verification filter", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        verified: true,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      // Act
      await service.getUsers(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("user.emailVerifiedAt IS NOT NULL");
    });

    it("should apply sorting", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        page: 1,
        limit: 10,
        sortBy: "email",
        sortOrder: "ASC",
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      // Act
      await service.getUsers(filters);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("user.email", "ASC");
    });

    it("should calculate pagination correctly", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        page: 2,
        limit: 5,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 12]);

      // Act
      const result = await service.getUsers(filters);

      // Assert
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (page - 1) * limit
    });

    it("should handle database errors", async () => {
      // Arrange
      const filters: UserSearchFilters = {
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = userRepository.createQueryBuilder() as jest.Mocked<SelectQueryBuilder<User>>;
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.getUsers(filters)).rejects.toThrow("Database error");
    });
  });

  describe("getUserById", () => {
    it("should return user by ID", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById("user-1");

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: "user-1" },
        relations: ["resumes", "jobApplications"],
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createUser", () => {
    it("should create a new user successfully", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        password: "password123",
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(null); // Email not taken
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);

      // Act
      const result = await service.createUser(createUserDto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        passwordHash: "hashedPassword123",
        role: UserRole.USER,
      });
    });

    it("should throw BadRequestException if email already exists", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: "existing@example.com",
        firstName: "Existing",
        lastName: "User",
        password: "password123",
      };

      userRepository.findOne.mockResolvedValue(mockUser); // Email exists

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should use default role USER when not specified", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        password: "password123",
        // role not specified
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);

      // Act
      await service.createUser(createUserDto);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        passwordHash: "hashedPassword123",
        role: UserRole.USER, // Default role
      });
    });

    it("should handle password hashing errors", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        password: "password123",
      };

      userRepository.findOne.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(new Error("Hashing failed") as never);

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow("Hashing failed");
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        firstName: "Updated",
        lastName: "Name",
      };

      const updatedUser = { ...mockUser, firstName: "Updated", lastName: "Name" };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser("user-1", updateUserDto);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        firstName: "Updated",
        lastName: "Name",
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        firstName: "Updated",
      };

      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUser("nonexistent", updateUserDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should handle email uniqueness check when updating email", async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        email: "newemail@example.com",
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call - find user to update
        .mockResolvedValueOnce(null); // Second call - check email uniqueness

      const updatedUser = { ...mockUser, email: "newemail@example.com" };
      userRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser("user-1", updateUserDto);

      // Assert
      expect(result.email).toBe("newemail@example.com");
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it("should throw BadRequestException if new email already exists", async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        email: "existing@example.com",
      };

      const anotherUser = { ...mockUser, id: "user-2", email: "existing@example.com" };
      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call - find user to update
        .mockResolvedValueOnce(anotherUser); // Second call - email exists for another user

      // Act & Assert
      await expect(service.updateUser("user-1", updateUserDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("deactivateUser", () => {
    it("should deactivate user successfully", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      const deactivatedUser = { ...mockUser, isActive: false };
      userRepository.save.mockResolvedValue(deactivatedUser);

      // Act
      const result = await service.deactivateUser("user-1");

      // Assert
      expect(result.isActive).toBe(false);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        isActive: false,
      });
    });

    it("should throw BadRequestException for admin users", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockAdmin);

      // Act & Assert
      await expect(service.deactivateUser("admin-1")).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deactivateUser("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("activateUser", () => {
    it("should activate user successfully", async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findOne.mockResolvedValue(inactiveUser);
      const activatedUser = { ...inactiveUser, isActive: true };
      userRepository.save.mockResolvedValue(activatedUser);

      // Act
      const result = await service.activateUser("user-1");

      // Assert
      expect(result.isActive).toBe(true);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...inactiveUser,
        isActive: true,
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete regular user successfully", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.remove.mockResolvedValue(mockUser);

      // Act
      await service.deleteUser("user-1");

      // Assert
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it("should throw BadRequestException for admin users", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockAdmin);

      // Act & Assert
      await expect(service.deleteUser("admin-1")).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteUser("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("promoteToAdmin", () => {
    it("should promote user to admin successfully", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      const promotedUser = { ...mockUser, role: UserRole.ADMIN };
      userRepository.save.mockResolvedValue(promotedUser);

      // Act
      const result = await service.promoteToAdmin("user-1");

      // Assert
      expect(result.role).toBe(UserRole.ADMIN);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        role: UserRole.ADMIN,
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.promoteToAdmin("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("demoteFromAdmin", () => {
    it("should demote admin to user successfully", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockAdmin);
      userRepository.count.mockResolvedValue(2); // More than 1 admin exists
      const demotedUser = { ...mockAdmin, role: UserRole.USER };
      userRepository.save.mockResolvedValue(demotedUser);

      // Act
      const result = await service.demoteFromAdmin("admin-1");

      // Assert
      expect(result.role).toBe(UserRole.USER);
      expect(userRepository.count).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN, isActive: true },
      });
    });

    it("should throw BadRequestException when trying to demote last admin", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockAdmin);
      userRepository.count.mockResolvedValue(1); // Only 1 admin exists

      // Act & Assert
      await expect(service.demoteFromAdmin("admin-1")).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("verifyUserEmail", () => {
    it("should verify user email successfully", async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, emailVerifiedAt: null };
      userRepository.findOne.mockResolvedValue(unverifiedUser);
      const verifiedUser = { ...unverifiedUser, emailVerifiedAt: expect.any(Date) };
      userRepository.save.mockResolvedValue(verifiedUser);

      // Act
      const result = await service.verifyUserEmail("user-1");

      // Assert
      expect(result.emailVerifiedAt).toBeInstanceOf(Date);
    });
  });

  describe("resetUserPassword", () => {
    it("should reset user password successfully", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue("newHashedPassword" as never);
      const updatedUser = { ...mockUser, passwordHash: "newHashedPassword" };
      userRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.resetUserPassword("user-1", "newPassword123");

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith("newPassword123", 12);
      expect(result.passwordHash).toBe("newHashedPassword");
    });

    it("should throw NotFoundException when user not found", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.resetUserPassword("nonexistent", "newPassword123")
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserStats and getUserActivity", () => {
    it("should get user statistics", async () => {
      // Arrange
      const userWithRelations = {
        ...mockUser,
        resumes: [{ id: "resume-1" }, { id: "resume-2" }],
        jobApplications: [
          { id: "job-1", status: "applied" },
          { id: "job-2", status: "interviewing" },
          { id: "job-3", status: "rejected" },
        ],
      };

      userRepository.findOne.mockResolvedValue(userWithRelations as any);

      // Act
      const result = await service.getUserStats("user-1");

      // Assert
      expect(result).toEqual({
        totalResumes: 2,
        totalJobApplications: 3,
        applicationsByStatus: {
          applied: 1,
          interviewing: 1,
          rejected: 1,
        },
        lastActivity: mockUser.lastLoginAt,
        accountAge: expect.any(Number),
      });
    });

    it("should get user activity", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserActivity("user-1", 7);

      // Assert
      expect(result).toEqual({
        loginHistory: [],
        recentActions: [],
        activitySummary: {
          totalActions: 0,
          averageActionsPerDay: 0,
          mostActiveDay: null,
        },
      });
    });
  });

  describe("error handling", () => {
    it("should handle and propagate database connection errors", async () => {
      // Arrange
      const dbError = new Error("Database connection lost");
      userRepository.createQueryBuilder.mockImplementation(() => {
        throw dbError;
      });

      // Act & Assert
      await expect(
        service.getUsers({ page: 1, limit: 10 })
      ).rejects.toThrow("Database connection lost");
    });

    it("should handle transaction rollback scenarios", async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockRejectedValue(new Error("Transaction failed"));

      // Act & Assert
      await expect(
        service.updateUser("user-1", { firstName: "Updated" })
      ).rejects.toThrow("Transaction failed");
    });
  });
});