import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { PermissionUtils } from "../../../../shared/constants/permissions.constants";
import {
  IPermissionContext,
  IPermissionResult,
} from "../../../../shared/interfaces/permission.interfaces";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../../database/entities/permission.entity";
import { Role, RoleType } from "../../../database/entities/role.entity";
import { User } from "../../../database/entities/user.entity";
import {
  AssignRoleDto,
  BulkPermissionOperationDto,
  CheckPermissionDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from "../dto/permission.dto";

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // Permission CRUD Operations
  async createPermission(
    createPermissionDto: CreatePermissionDto
  ): Promise<Permission> {
    try {
      // Check if permission already exists
      const existing = await this.permissionRepository.findOne({
        where: {
          action: createPermissionDto.action,
          resource: createPermissionDto.resource,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Permission ${createPermissionDto.action}:${createPermissionDto.resource} already exists`
        );
      }

      const permission = this.permissionRepository.create({
        ...createPermissionDto,
        isActive: createPermissionDto.isActive ?? true,
      });

      const savedPermission = await this.permissionRepository.save(permission);
      this.logger.log(
        `Created permission: ${savedPermission.getPermissionString()}`
      );

      return savedPermission;
    } catch (error) {
      this.logger.error("Failed to create permission:", error);
      throw error;
    }
  }

  async getPermissions(filters?: {
    action?: PermissionAction;
    resource?: PermissionResource;
    isActive?: boolean;
  }): Promise<Permission[]> {
    try {
      const queryBuilder =
        this.permissionRepository.createQueryBuilder("permission");

      if (filters?.action) {
        queryBuilder.andWhere("permission.action = :action", {
          action: filters.action,
        });
      }

      if (filters?.resource) {
        queryBuilder.andWhere("permission.resource = :resource", {
          resource: filters.resource,
        });
      }

      if (filters?.isActive !== undefined) {
        queryBuilder.andWhere("permission.isActive = :isActive", {
          isActive: filters.isActive,
        });
      }

      return await queryBuilder
        .orderBy("permission.resource", "ASC")
        .addOrderBy("permission.action", "ASC")
        .getMany();
    } catch (error) {
      this.logger.error("Failed to get permissions:", error);
      throw error;
    }
  }

  async getPermissionById(id: string): Promise<Permission> {
    try {
      const permission = await this.permissionRepository.findOne({
        where: { id },
        relations: ["roles"],
      });

      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }

      return permission;
    } catch (error) {
      this.logger.error(`Failed to get permission ${id}:`, error);
      throw error;
    }
  }

  async updatePermission(
    id: string,
    updatePermissionDto: UpdatePermissionDto
  ): Promise<Permission> {
    try {
      const permission = await this.getPermissionById(id);

      Object.assign(permission, updatePermissionDto);
      const updatedPermission =
        await this.permissionRepository.save(permission);

      this.logger.log(
        `Updated permission: ${updatedPermission.getPermissionString()}`
      );
      return updatedPermission;
    } catch (error) {
      this.logger.error(`Failed to update permission ${id}:`, error);
      throw error;
    }
  }

  async deletePermission(id: string): Promise<void> {
    try {
      const permission = await this.getPermissionById(id);

      await this.permissionRepository.remove(permission);
      this.logger.log(
        `Deleted permission: ${permission.getPermissionString()}`
      );
    } catch (error) {
      this.logger.error(`Failed to delete permission ${id}:`, error);
      throw error;
    }
  }

  // Role CRUD Operations
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      // Check if role name already exists
      const existing = await this.roleRepository.findOne({
        where: { name: createRoleDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Role with name '${createRoleDto.name}' already exists`
        );
      }

      const role = this.roleRepository.create({
        ...createRoleDto,
        isSystemRole: false,
      });

      // Handle permissions if provided
      if (
        createRoleDto.permissionIds &&
        createRoleDto.permissionIds.length > 0
      ) {
        const permissions = await this.permissionRepository.findBy({
          id: In(createRoleDto.permissionIds),
        });
        role.permissions = permissions;
      }

      const savedRole = await this.roleRepository.save(role);
      this.logger.log(`Created role: ${savedRole.name}`);

      return await this.getRoleById(savedRole.id);
    } catch (error) {
      this.logger.error("Failed to create role:", error);
      throw error;
    }
  }

  async getRoles(filters?: {
    type?: RoleType;
    isActive?: boolean;
    isSystemRole?: boolean;
  }): Promise<Role[]> {
    try {
      const queryBuilder = this.roleRepository
        .createQueryBuilder("role")
        .leftJoinAndSelect("role.permissions", "permissions");

      if (filters?.type) {
        queryBuilder.andWhere("role.type = :type", { type: filters.type });
      }

      if (filters?.isActive !== undefined) {
        queryBuilder.andWhere("role.isActive = :isActive", {
          isActive: filters.isActive,
        });
      }

      if (filters?.isSystemRole !== undefined) {
        queryBuilder.andWhere("role.isSystemRole = :isSystemRole", {
          isSystemRole: filters.isSystemRole,
        });
      }

      return await queryBuilder
        .orderBy("role.priority", "DESC")
        .addOrderBy("role.name", "ASC")
        .getMany();
    } catch (error) {
      this.logger.error("Failed to get roles:", error);
      throw error;
    }
  }

  async getRoleById(id: string): Promise<Role> {
    try {
      const role = await this.roleRepository.findOne({
        where: { id },
        relations: ["permissions", "users"],
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      return role;
    } catch (error) {
      this.logger.error(`Failed to get role ${id}:`, error);
      throw error;
    }
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    try {
      const role = await this.getRoleById(id);

      if (role.isSystemRole && updateRoleDto.isActive === false) {
        throw new BadRequestException("Cannot deactivate system role");
      }

      Object.assign(role, updateRoleDto);
      const updatedRole = await this.roleRepository.save(role);

      this.logger.log(`Updated role: ${updatedRole.name}`);
      return await this.getRoleById(updatedRole.id);
    } catch (error) {
      this.logger.error(`Failed to update role ${id}:`, error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    try {
      const role = await this.getRoleById(id);

      if (role.isSystemRole) {
        throw new BadRequestException("Cannot delete system role");
      }

      if (role.users && role.users.length > 0) {
        throw new BadRequestException("Cannot delete role with assigned users");
      }

      await this.roleRepository.remove(role);
      this.logger.log(`Deleted role: ${role.name}`);
    } catch (error) {
      this.logger.error(`Failed to delete role ${id}:`, error);
      throw error;
    }
  }

  // Role Permission Management
  async updateRolePermissions(
    roleId: string,
    updateDto: UpdateRolePermissionsDto
  ): Promise<Role> {
    try {
      const role = await this.getRoleById(roleId);
      const permissions = await this.permissionRepository.findBy({
        id: In(updateDto.permissionIds),
      });

      switch (updateDto.operation || "set") {
        case "set":
          role.permissions = permissions;
          break;
        case "add": {
          const existingIds = role.permissions.map((p) => p.id);
          const newPermissions = permissions.filter(
            (p) => !existingIds.includes(p.id)
          );
          role.permissions = [...role.permissions, ...newPermissions];
          break;
        }
        case "remove": {
          const removeIds = new Set(updateDto.permissionIds);
          role.permissions = role.permissions.filter(
            (p) => !removeIds.has(p.id)
          );
          break;
        }
      }

      const updatedRole = await this.roleRepository.save(role);
      this.logger.log(`Updated permissions for role: ${updatedRole.name}`);

      return await this.getRoleById(updatedRole.id);
    } catch (error) {
      this.logger.error(
        `Failed to update role permissions for ${roleId}:`,
        error
      );
      throw error;
    }
  }

  // User Role Assignment
  async assignRoleToUser(assignRoleDto: AssignRoleDto): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: assignRoleDto.userId },
        relations: ["roleEntity"],
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${assignRoleDto.userId} not found`
        );
      }

      const role = await this.getRoleById(assignRoleDto.roleId);

      user.roleId = role.id;
      user.roleEntity = role;

      const updatedUser = await this.userRepository.save(user);
      this.logger.log(`Assigned role ${role.name} to user ${user.email}`);

      return updatedUser;
    } catch (error) {
      this.logger.error("Failed to assign role to user:", error);
      throw error;
    }
  }

  async removeRoleFromUser(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      user.roleId = undefined;
      user.roleEntity = undefined;

      const updatedUser = await this.userRepository.save(user);
      this.logger.log(`Removed role from user ${user.email}`);

      return updatedUser;
    } catch (error) {
      this.logger.error("Failed to remove role from user:", error);
      throw error;
    }
  }

  // Permission Checking
  async checkUserPermission(
    userId: string,
    checkPermissionDto: CheckPermissionDto,
    context?: IPermissionContext
  ): Promise<IPermissionResult> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["roleEntity", "roleEntity.permissions"],
      });

      if (!user || !user.isActive) {
        return { granted: false, reason: "User not found or inactive" };
      }

      // Check using new role system
      if (user.roleEntity) {
        const hasPermission = user.roleEntity.hasPermission(
          checkPermissionDto.action,
          checkPermissionDto.resource
        );

        if (hasPermission) {
          return { granted: true };
        }
      }

      // Fallback to legacy role system for backward compatibility
      if (user.role === "admin") {
        return { granted: true, reason: "Legacy admin access" };
      }

      return {
        granted: false,
        reason: `Missing permission: ${checkPermissionDto.action}:${checkPermissionDto.resource}`,
      };
    } catch (error) {
      this.logger.error("Failed to check user permission:", error);
      return { granted: false, reason: "Permission check failed" };
    }
  }

  // Bulk Operations
  async bulkPermissionOperation(
    bulkOperationDto: BulkPermissionOperationDto
  ): Promise<{ success: number; failed: number }> {
    try {
      let success = 0;
      let failed = 0;

      for (const userId of bulkOperationDto.userIds) {
        try {
          const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ["roleEntity"],
          });

          if (!user) {
            failed++;
            continue;
          }

          // For now, bulk operations work through role assignments
          // In a more advanced system, this could handle individual permission grants
          this.logger.log(
            `Bulk operation ${bulkOperationDto.operation} for user ${user.email}`
          );
          success++;
        } catch (error) {
          this.logger.error(`Bulk operation failed for user ${userId}:`, error);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error("Bulk permission operation failed:", error);
      throw error;
    }
  }

  // Utility Methods
  async initializeSystemRoles(): Promise<void> {
    try {
      this.logger.log("Initializing system roles...");

      // Create system roles if they don't exist
      const systemRoles = [
        {
          name: "super_admin",
          displayName: "Super Administrator",
          description: "Full system access with all permissions",
          type: RoleType.SUPER_ADMIN,
          priority: 1000,
          isSystemRole: true,
        },
        {
          name: "admin",
          displayName: "Administrator",
          description: "Administrative access to most features",
          type: RoleType.ADMIN,
          priority: 800,
          isSystemRole: true,
        },
        {
          name: "moderator",
          displayName: "Moderator",
          description: "Limited administrative access",
          type: RoleType.MODERATOR,
          priority: 600,
          isSystemRole: true,
        },
        {
          name: "user",
          displayName: "Regular User",
          description: "Standard user access",
          type: RoleType.USER,
          priority: 400,
          isSystemRole: true,
          isDefault: true,
        },
        {
          name: "guest",
          displayName: "Guest",
          description: "Limited read-only access",
          type: RoleType.GUEST,
          priority: 200,
          isSystemRole: true,
        },
      ];

      for (const roleData of systemRoles) {
        const existing = await this.roleRepository.findOne({
          where: { name: roleData.name },
        });

        if (!existing) {
          const role = this.roleRepository.create(roleData);
          await this.roleRepository.save(role);
          this.logger.log(`Created system role: ${role.name}`);
        }
      }

      this.logger.log("System roles initialization completed");
    } catch (error) {
      this.logger.error("Failed to initialize system roles:", error);
      throw error;
    }
  }

  async seedPermissions(): Promise<void> {
    try {
      this.logger.log("Seeding system permissions...");

      // Create all possible permission combinations
      const actions = Object.values(PermissionAction);
      const resources = Object.values(PermissionResource);

      for (const resource of resources) {
        for (const action of actions) {
          const existing = await this.permissionRepository.findOne({
            where: { action, resource },
          });

          if (!existing) {
            const permission = this.permissionRepository.create({
              action,
              resource,
              name: PermissionUtils.getPermissionDisplayName(action, resource),
              description: `${action} access to ${resource}`,
              isActive: true,
            });

            await this.permissionRepository.save(permission);
          }
        }
      }

      this.logger.log("Permission seeding completed");
    } catch (error) {
      this.logger.error("Failed to seed permissions:", error);
      throw error;
    }
  }
}
