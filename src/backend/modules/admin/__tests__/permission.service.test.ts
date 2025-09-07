import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../../database/entities/permission.entity";
import {
  Role,
  RoleScope,
  RoleType,
} from "../../../database/entities/role.entity";
import { User } from "../../../database/entities/user.entity";
import {
  AssignRoleDto,
  BulkPermissionOperationDto,
  CheckPermissionDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdatePermissionDto,
  UpdateRolePermissionsDto,
} from "../dto/permission.dto";
import { PermissionService } from "../services/permission.service";

describe("PermissionService", () => {
  let service: PermissionService;
  let permissionRepository: Repository<Permission>;
  let roleRepository: Repository<Role>;
  let userRepository: Repository<User>;

  const mockPermissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockRoleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission)
    );
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Permission Management", () => {
    describe("getPermissions", () => {
      it("should return paginated permissions", async () => {
        const mockPermissions = [
          {
            id: "1",
            action: PermissionAction.CREATE,
            resource: PermissionResource.USER,
            name: "Create User",
          },
        ];

        mockPermissionRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([mockPermissions, 1]);

        const result = await service.getPermissions({});

        expect(result).toEqual({
          data: mockPermissions,
          total: 1,
          page: 1,
          limit: 20,
        });
      });

      it("should apply filters correctly", async () => {
        const filters = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        mockPermissionRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([[], 0]);

        await service.getPermissions(filters);

        expect(
          mockPermissionRepository.createQueryBuilder().andWhere
        ).toHaveBeenCalledWith("permission.action = :action", {
          action: PermissionAction.CREATE,
        });
        expect(
          mockPermissionRepository.createQueryBuilder().andWhere
        ).toHaveBeenCalledWith("permission.resource = :resource", {
          resource: PermissionResource.USER,
        });
        expect(
          mockPermissionRepository.createQueryBuilder().andWhere
        ).toHaveBeenCalledWith("permission.isActive = :isActive", {
          isActive: true,
        });
      });
    });

    describe("createPermission", () => {
      it("should create a new permission", async () => {
        const createDto: CreatePermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
          name: "Create User",
          description: "Allows creating users",
        };

        const mockPermission = {
          id: "1",
          ...createDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPermissionRepository.findOne.mockResolvedValue(null); // No existing permission
        mockPermissionRepository.create.mockReturnValue(mockPermission);
        mockPermissionRepository.save.mockResolvedValue(mockPermission);

        const result = await service.createPermission(createDto);

        expect(result).toEqual(mockPermission);
        expect(mockPermissionRepository.create).toHaveBeenCalledWith(createDto);
        expect(mockPermissionRepository.save).toHaveBeenCalledWith(
          mockPermission
        );
      });

      it("should throw ConflictException for duplicate permission", async () => {
        const createDto: CreatePermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
          name: "Create User",
        };

        const existingPermission = {
          id: "1",
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        mockPermissionRepository.findOne.mockResolvedValue(existingPermission);

        await expect(service.createPermission(createDto)).rejects.toThrow(
          ConflictException
        );
      });
    });

    describe("updatePermission", () => {
      it("should update an existing permission", async () => {
        const permissionId = "1";
        const updateDto: UpdatePermissionDto = {
          name: "Updated Name",
          description: "Updated description",
          isActive: false,
        };

        const existingPermission = {
          id: permissionId,
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
          name: "Old Name",
        };

        const updatedPermission = {
          ...existingPermission,
          ...updateDto,
        };

        mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
        mockPermissionRepository.save.mockResolvedValue(updatedPermission);

        const result = await service.updatePermission(permissionId, updateDto);

        expect(result).toEqual(updatedPermission);
        expect(mockPermissionRepository.save).toHaveBeenCalledWith(
          updatedPermission
        );
      });

      it("should throw NotFoundException for non-existent permission", async () => {
        mockPermissionRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updatePermission("non-existent", {})
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe("deletePermission", () => {
      it("should delete an existing permission", async () => {
        const permissionId = "1";
        const existingPermission = {
          id: permissionId,
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
        mockPermissionRepository.delete.mockResolvedValue({ affected: 1 });

        await service.deletePermission(permissionId);

        expect(mockPermissionRepository.delete).toHaveBeenCalledWith(
          permissionId
        );
      });

      it("should throw NotFoundException for non-existent permission", async () => {
        mockPermissionRepository.findOne.mockResolvedValue(null);

        await expect(service.deletePermission("non-existent")).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  describe("Role Management", () => {
    describe("getRoles", () => {
      it("should return paginated roles", async () => {
        const mockRoles = [
          {
            id: "1",
            name: "admin",
            displayName: "Administrator",
            type: RoleType.ADMIN,
            scope: RoleScope.GLOBAL,

            permissions: [],
          },
        ];

        mockRoleRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([mockRoles, 1]);

        const result = await service.getRoles({});

        expect(result).toEqual({
          data: mockRoles,
          total: 1,
          page: 1,
          limit: 20,
        });
      });
    });

    describe("createRole", () => {
      it("should create a new role", async () => {
        const createDto: CreateRoleDto = {
          name: "moderator",
          displayName: "Content Moderator",
          description: "Moderates content",
          type: RoleType.MODERATOR,
          scope: RoleScope.ORGANIZATION,

          isDefault: false,
          priority: 50,
        };

        const mockRole = {
          id: "1",
          ...createDto,
          isSystemRole: false,
          permissions: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRoleRepository.findOne.mockResolvedValue(null); // No existing role
        mockRoleRepository.create.mockReturnValue(mockRole);
        mockRoleRepository.save.mockResolvedValue(mockRole);

        const result = await service.createRole(createDto);

        expect(result).toEqual(mockRole);
        expect(mockRoleRepository.create).toHaveBeenCalledWith({
          ...createDto,
          isSystemRole: false,
          permissions: [],
          metadata: {},
        });
      });

      it("should throw ConflictException for duplicate role name", async () => {
        const createDto: CreateRoleDto = {
          name: "admin",
          displayName: "Administrator",
          type: RoleType.ADMIN,
          scope: RoleScope.GLOBAL,

          isDefault: false,
          priority: 100,
        };

        const existingRole = {
          id: "1",
          name: "admin",
        };

        mockRoleRepository.findOne.mockResolvedValue(existingRole);

        await expect(service.createRole(createDto)).rejects.toThrow(
          ConflictException
        );
      });
    });

    describe("updateRolePermissions", () => {
      it("should update role permissions", async () => {
        const roleId = "1";
        const updateDto: UpdateRolePermissionsDto = {
          permissionIds: ["perm1", "perm2"],
        };

        const mockRole = {
          id: roleId,
          name: "test_role",
          permissions: [],
        };

        const mockPermissions = [
          { id: "perm1", name: "Permission 1" },
          { id: "perm2", name: "Permission 2" },
        ];

        mockRoleRepository.findOne.mockResolvedValue(mockRole);
        mockPermissionRepository.findOne
          .mockResolvedValueOnce(mockPermissions[0])
          .mockResolvedValueOnce(mockPermissions[1]);
        mockRoleRepository.save.mockResolvedValue({
          ...mockRole,
          permissions: mockPermissions,
        });

        const result = await service.updateRolePermissions(roleId, updateDto);

        expect(result.permissions).toHaveLength(2);
        expect(mockRoleRepository.save).toHaveBeenCalled();
      });

      it("should throw NotFoundException for non-existent role", async () => {
        mockRoleRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateRolePermissions("non-existent", { permissionIds: [] })
        ).rejects.toThrow(NotFoundException);
      });

      it("should throw NotFoundException for non-existent permission", async () => {
        const mockRole = { id: "1", permissions: [] };
        mockRoleRepository.findOne.mockResolvedValue(mockRole);
        mockPermissionRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateRolePermissions("1", {
            permissionIds: ["non-existent"],
          })
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe("User Role Assignment", () => {
    describe("assignRoleToUser", () => {
      it("should assign role to user", async () => {
        const userId = "1";
        const assignDto: AssignRoleDto = {
          userId: userId,
          roleId: "role1",
        };

        const mockUser = {
          id: userId,
          email: "test@example.com",
          roleId: null,
        };

        const mockRole = {
          id: "role1",
          name: "test_role",
          displayName: "Test Role",
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRoleRepository.findOne.mockResolvedValue(mockRole);
        mockUserRepository.save.mockResolvedValue({
          ...mockUser,
          roleId: "role1",
          roleEntity: mockRole,
        });

        const result = await service.assignRoleToUser(assignDto);

        expect(result.roleId).toBe("role1");
        expect(mockUserRepository.save).toHaveBeenCalled();
      });

      it("should throw NotFoundException for non-existent user", async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(
          service.assignRoleToUser({ userId: "non-existent", roleId: "role1" })
        ).rejects.toThrow(NotFoundException);
      });

      it("should throw NotFoundException for non-existent role", async () => {
        const mockUser = { id: "1", email: "test@example.com" };
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRoleRepository.findOne.mockResolvedValue(null);

        await expect(
          service.assignRoleToUser({ userId: "1", roleId: "non-existent" })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe("removeRoleFromUser", () => {
      it("should remove role from user", async () => {
        const userId = "1";
        const mockUser = {
          id: userId,
          email: "test@example.com",
          roleId: "role1",
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockUserRepository.save.mockResolvedValue({
          ...mockUser,
          roleId: null,
          roleEntity: null,
        });

        const result = await service.removeRoleFromUser(userId);

        expect(result.roleId).toBeNull();
        expect(mockUserRepository.save).toHaveBeenCalled();
      });
    });
  });

  describe("Permission Checking", () => {
    describe("checkUserPermission", () => {
      it("should return true for user with required permission", async () => {
        const userId = "1";
        const checkDto: CheckPermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        const mockUser = {
          id: "1",
          email: "test@example.com",

          roleEntity: {
            id: "role1",
            hasPermission: jest.fn().mockReturnValue(true),
          },
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.checkUserPermission(userId, checkDto);

        expect(result.granted).toBe(true);
      });

      it("should return false for user without required permission", async () => {
        const userId = "1";
        const checkDto: CheckPermissionDto = {
          action: PermissionAction.DELETE,
          resource: PermissionResource.USER,
        };

        const mockUser = {
          id: "1",
          email: "test@example.com",

          roleEntity: {
            id: "role1",
            hasPermission: jest.fn().mockReturnValue(false),
          },
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.checkUserPermission(userId, checkDto);

        expect(result.granted).toBe(false);
      });

      it("should return false for user with inactive permission", async () => {
        const userId = "1";
        const checkDto: CheckPermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        const mockUser = {
          id: "1",
          email: "test@example.com",
          isActive: false, // Inactive user
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.checkUserPermission(userId, checkDto);

        expect(result.granted).toBe(false);
      });

      it("should return false for non-existent user", async () => {
        const userId = "non-existent";
        const checkDto: CheckPermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        const result = await service.checkUserPermission(userId, checkDto);

        expect(result.granted).toBe(false);
        expect(result.reason).toContain("User not found");
      });
    });
  });

  describe("Bulk Operations", () => {
    describe("bulkPermissionOperation", () => {
      it("should process bulk operation for users", async () => {
        const bulkDto: BulkPermissionOperationDto = {
          operation: "grant",
          userIds: ["user1", "user2"],
          permissions: ["create:user", "read:user"],
        };

        const mockUsers = [
          { id: "user1", email: "user1@example.com", roleEntity: null },
          { id: "user2", email: "user2@example.com", roleEntity: null },
        ];

        mockUserRepository.findOne
          .mockResolvedValueOnce(mockUsers[0])
          .mockResolvedValueOnce(mockUsers[1]);

        const result = await service.bulkPermissionOperation(bulkDto);

        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
      });

      it("should handle failed bulk operations", async () => {
        const bulkDto: BulkPermissionOperationDto = {
          operation: "revoke",
          userIds: ["user1", "non-existent"],
          permissions: ["create:user"],
        };

        const mockUser = {
          id: "user1",
          email: "user1@example.com",
          roleEntity: null,
        };

        mockUserRepository.findOne
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null); // Non-existent user

        const result = await service.bulkPermissionOperation(bulkDto);

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
      });
    });
  });

  describe("System Initialization", () => {
    describe("initializeSystemRoles", () => {
      it("should create default roles", async () => {
        mockRoleRepository.findOne.mockResolvedValue(null); // No existing roles

        // Mock role creation
        mockRoleRepository.create.mockImplementation((data) => data);
        mockRoleRepository.save.mockImplementation((data) =>
          Promise.resolve(data)
        );

        await service.initializeSystemRoles();

        expect(mockRoleRepository.save).toHaveBeenCalled();
      });

      it("should skip initialization if roles already exist", async () => {
        mockRoleRepository.findOne.mockResolvedValue({ id: "existing-role" }); // Existing role

        await service.initializeSystemRoles();

        expect(mockRoleRepository.create).not.toHaveBeenCalled();
      });
    });
  });
});
