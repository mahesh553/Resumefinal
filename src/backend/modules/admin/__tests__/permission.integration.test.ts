import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import request from "supertest";
import { Repository } from "typeorm";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
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
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AdminController } from "../controllers/admin.controller";
import {
  AssignRoleDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdatePermissionDto,
  UpdateRolePermissionsDto,
} from "../dto/permission.dto";
import { PermissionService } from "../services/permission.service";

// Mock guards
const mockJwtAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockPermissionsGuard = {
  canActivate: jest.fn(() => true),
};

describe("Permission System Integration Tests", () => {
  let app: INestApplication;
  let permissionRepository: Repository<Permission>;
  let roleRepository: Repository<Role>;
  let userRepository: Repository<User>;
  let permissionService: PermissionService;

  const mockPermissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
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
    findAndCount: jest.fn(),
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
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Permission, Role, User],
          synchronize: true,
        }),
      ],
      controllers: [AdminController],
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission)
    );
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    permissionService = module.get<PermissionService>(PermissionService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("Permission Management", () => {
    describe("GET /admin/permissions", () => {
      it("should return list of permissions", async () => {
        const mockPermissions = [
          {
            id: "1",
            action: PermissionAction.CREATE,
            resource: PermissionResource.USER,
            name: "Create User",
            description: "Allows creating new users",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockPermissionRepository
          .createQueryBuilder()
          .getMany.mockResolvedValue(mockPermissions);
        mockPermissionRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([mockPermissions, 1]);

        const response = await request(app.getHttpServer())
          .get("/admin/permissions")
          .expect(200);

        expect(response.body).toEqual({
          data: mockPermissions,
          total: 1,
          page: 1,
          limit: 20,
        });
      });

      it("should filter permissions by action", async () => {
        const mockPermissions = [
          {
            id: "1",
            action: "create",
            resource: "user",
            name: "Create User",
            isActive: true,
          },
        ];

        mockPermissionRepository
          .createQueryBuilder()
          .getMany.mockResolvedValue(mockPermissions);
        mockPermissionRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([mockPermissions, 1]);

        await request(app.getHttpServer())
          .get("/admin/permissions?action=create")
          .expect(200);

        expect(
          mockPermissionRepository.createQueryBuilder().andWhere
        ).toHaveBeenCalledWith("permission.action = :action", {
          action: "create",
        });
      });

      it("should filter permissions by resource", async () => {
        mockPermissionRepository
          .createQueryBuilder()
          .getMany.mockResolvedValue([]);
        mockPermissionRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([[], 0]);

        await request(app.getHttpServer())
          .get("/admin/permissions?resource=user")
          .expect(200);

        expect(
          mockPermissionRepository.createQueryBuilder().andWhere
        ).toHaveBeenCalledWith("permission.resource = :resource", {
          resource: "user",
        });
      });
    });

    describe("POST /admin/permissions", () => {
      it("should create a new permission", async () => {
        const createPermissionDto: CreatePermissionDto = {
          action: PermissionAction.CREATE,
          resource: PermissionResource.USER,
          name: "Create User",
          description: "Allows creating new users",
          isActive: true,
        };

        const mockPermission = {
          id: "1",
          ...createPermissionDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPermissionRepository.create.mockReturnValue(mockPermission);
        mockPermissionRepository.save.mockResolvedValue(mockPermission);

        const response = await request(app.getHttpServer())
          .post("/admin/permissions")
          .send(createPermissionDto)
          .expect(201);

        expect(response.body).toEqual(mockPermission);
        expect(mockPermissionRepository.create).toHaveBeenCalledWith(
          createPermissionDto
        );
        expect(mockPermissionRepository.save).toHaveBeenCalledWith(
          mockPermission
        );
      });

      it("should return 400 for invalid permission data", async () => {
        const invalidDto = {
          action: "invalid_action",
          resource: "user",
          name: "",
        };

        await request(app.getHttpServer())
          .post("/admin/permissions")
          .send(invalidDto)
          .expect(400);
      });
    });

    describe("PUT /admin/permissions/:id", () => {
      it("should update a permission", async () => {
        const permissionId = "1";
        const updatePermissionDto: UpdatePermissionDto = {
          name: "Updated Permission Name",
          description: "Updated description",
          isActive: false,
        };

        const existingPermission = {
          id: permissionId,
          action: "create",
          resource: "user",
          name: "Old Name",
          description: "Old description",
          isActive: true,
        };

        const updatedPermission = {
          ...existingPermission,
          ...updatePermissionDto,
        };

        mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
        mockPermissionRepository.save.mockResolvedValue(updatedPermission);

        const response = await request(app.getHttpServer())
          .put(`/admin/permissions/${permissionId}`)
          .send(updatePermissionDto)
          .expect(200);

        expect(response.body).toEqual(updatedPermission);
      });

      it("should return 404 for non-existent permission", async () => {
        mockPermissionRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
          .put("/admin/permissions/non-existent")
          .send({})
          .expect(404);
      });
    });

    describe("DELETE /admin/permissions/:id", () => {
      it("should delete a permission", async () => {
        const permissionId = "1";
        const existingPermission = {
          id: permissionId,
          action: "create",
          resource: "user",
          name: "Test Permission",
        };

        mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
        mockPermissionRepository.delete.mockResolvedValue({ affected: 1 });

        await request(app.getHttpServer())
          .delete(`/admin/permissions/${permissionId}`)
          .expect(204);

        expect(mockPermissionRepository.delete).toHaveBeenCalledWith(
          permissionId
        );
      });

      it("should return 404 for non-existent permission", async () => {
        mockPermissionRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
          .delete("/admin/permissions/non-existent")
          .expect(404);
      });
    });
  });

  describe("Role Management", () => {
    describe("GET /admin/roles", () => {
      it("should return list of roles", async () => {
        const mockRoles = [
          {
            id: "1",
            name: "admin",
            displayName: "Administrator",
            type: "admin",
            scope: "global",
            isActive: true,
            permissions: [],
          },
        ];

        mockRoleRepository
          .createQueryBuilder()
          .getMany.mockResolvedValue(mockRoles);
        mockRoleRepository
          .createQueryBuilder()
          .getManyAndCount.mockResolvedValue([mockRoles, 1]);

        const response = await request(app.getHttpServer())
          .get("/admin/roles")
          .expect(200);

        expect(response.body).toEqual({
          data: mockRoles,
          total: 1,
          page: 1,
          limit: 20,
        });
      });
    });

    describe("POST /admin/roles", () => {
      it("should create a new role", async () => {
        const createRoleDto: CreateRoleDto = {
          name: "moderator",
          displayName: "Content Moderator",
          description: "Can moderate content",
          type: RoleType.MODERATOR,
          scope: RoleScope.ORGANIZATION,
        };

        const mockRole = {
          id: "1",
          ...createRoleDto,
          isSystemRole: false,
          permissions: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRoleRepository.create.mockReturnValue(mockRole);
        mockRoleRepository.save.mockResolvedValue(mockRole);

        const response = await request(app.getHttpServer())
          .post("/admin/roles")
          .send(createRoleDto)
          .expect(201);

        expect(response.body).toEqual(mockRole);
      });
    });

    describe("PUT /admin/roles/:id/permissions", () => {
      it("should update role permissions", async () => {
        const roleId = "1";
        const updatePermissionsDto: UpdateRolePermissionsDto = {
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

        const response = await request(app.getHttpServer())
          .put(`/admin/roles/${roleId}/permissions`)
          .send(updatePermissionsDto)
          .expect(200);

        expect(response.body.permissions).toHaveLength(2);
      });
    });
  });

  describe("User Role Assignment", () => {
    describe("POST /admin/users/:id/assign-role", () => {
      it("should assign role to user", async () => {
        const userId = "1";
        const assignRoleDto: AssignRoleDto = {
          userId: "user1",
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

        const response = await request(app.getHttpServer())
          .post(`/admin/users/${userId}/assign-role`)
          .send(assignRoleDto)
          .expect(200);

        expect(response.body.roleId).toBe("role1");
      });

      it("should return 404 for non-existent user", async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
          .post("/admin/users/non-existent/assign-role")
          .send({ roleId: "role1" })
          .expect(404);
      });

      it("should return 404 for non-existent role", async () => {
        const mockUser = { id: "1", email: "test@example.com" };
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockRoleRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
          .post("/admin/users/1/assign-role")
          .send({ roleId: "non-existent" })
          .expect(404);
      });
    });

    describe("DELETE /admin/users/:id/role", () => {
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

        const response = await request(app.getHttpServer())
          .delete(`/admin/users/${userId}/role`)
          .expect(200);

        expect(response.body.roleId).toBeNull();
      });
    });
  });

  describe("Permission Checking", () => {
    describe("POST /admin/check-permission", () => {
      it("should check user permission", async () => {
        const checkPermissionDto = {
          userId: "1",
          action: "create",
          resource: "user",
        };

        const mockUser = {
          id: "1",
          email: "test@example.com",
          roleEntity: {
            id: "role1",
            permissions: [
              {
                id: "perm1",
                action: "create",
                resource: "user",
                isActive: true,
              },
            ],
          },
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const response = await request(app.getHttpServer())
          .post("/admin/check-permission")
          .send(checkPermissionDto)
          .expect(200);

        expect(response.body.hasPermission).toBe(true);
      });

      it("should return false for missing permission", async () => {
        const checkPermissionDto = {
          userId: "1",
          action: "delete",
          resource: "user",
        };

        const mockUser = {
          id: "1",
          email: "test@example.com",
          roleEntity: {
            id: "role1",
            permissions: [
              {
                id: "perm1",
                action: "create",
                resource: "user",
                isActive: true,
              },
            ],
          },
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        const response = await request(app.getHttpServer())
          .post("/admin/check-permission")
          .send(checkPermissionDto)
          .expect(200);

        expect(response.body.hasPermission).toBe(false);
      });
    });
  });

  describe("Bulk Operations", () => {
    describe("POST /admin/permissions/bulk", () => {
      it("should perform bulk permission operations", async () => {
        const bulkOperationDto = {
          operation: "grant",
          roleId: "role1",
          permissionIds: ["perm1", "perm2"],
        };

        const mockRole = {
          id: "role1",
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

        const response = await request(app.getHttpServer())
          .post("/admin/permissions/bulk")
          .send(bulkOperationDto)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.affectedPermissions).toBe(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockPermissionRepository
        .createQueryBuilder()
        .getMany.mockRejectedValue(new Error("Database connection failed"));

      await request(app.getHttpServer()).get("/admin/permissions").expect(500);
    });

    it("should validate request DTOs", async () => {
      const invalidDto = {
        action: "", // Invalid empty action
        resource: "user",
        name: "", // Invalid empty name
      };

      await request(app.getHttpServer())
        .post("/admin/permissions")
        .send(invalidDto)
        .expect(400);
    });
  });
});
