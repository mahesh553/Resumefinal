import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  PermissionAction,
  PermissionResource,
} from "../../../database/entities/permission.entity";
import { RoleScope, RoleType } from "../../../database/entities/role.entity";

export class CreatePermissionDto {
  @ApiProperty({ enum: PermissionAction, description: "Permission action" })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiProperty({ enum: PermissionResource, description: "Resource type" })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({ description: "Permission name", example: "Create User" })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: "Permission description" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: "Permission conditions",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: "Is permission active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: "Permission name" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: "Permission description" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: "Permission conditions",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: "Is permission active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRoleDto {
  @ApiProperty({ description: "Role name", example: "content_moderator" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Display name", example: "Content Moderator" })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({ description: "Role description" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: RoleType,
    description: "Role type",
    default: RoleType.CUSTOM,
  })
  @IsEnum(RoleType)
  type: RoleType;

  @ApiProperty({
    enum: RoleScope,
    description: "Role scope",
    default: RoleScope.GLOBAL,
  })
  @IsEnum(RoleScope)
  scope: RoleScope;

  @ApiPropertyOptional({ description: "Role priority", default: 0 })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "Role priority", default: 0 })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: "Permission IDs to assign to role" })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: "Role metadata",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: "Display name" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: "Role description" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: RoleScope, description: "Role scope" })
  @IsOptional()
  @IsEnum(RoleScope)
  scope?: RoleScope;

  @ApiPropertyOptional({ description: "Is role active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Is default role for new users" })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "Role priority" })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: "Role metadata",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AssignRoleDto {
  @ApiProperty({ description: "User ID" })
  @IsUUID(4)
  userId: string;

  @ApiProperty({ description: "Role ID" })
  @IsUUID(4)
  roleId: string;

  @ApiPropertyOptional({ description: "Assignment expiration date" })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: "Assignment metadata",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: "Permission IDs to assign" })
  @IsArray()
  @IsUUID(4, { each: true })
  permissionIds: string[];

  @ApiPropertyOptional({
    description: "Operation type",
    enum: ["set", "add", "remove"],
    default: "set",
  })
  @IsOptional()
  @IsEnum(["set", "add", "remove"])
  operation?: "set" | "add" | "remove";
}

export class CheckPermissionDto {
  @ApiProperty({ enum: PermissionAction, description: "Action to check" })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiProperty({ enum: PermissionResource, description: "Resource to check" })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiPropertyOptional({
    description: "Resource ID for resource-specific permissions",
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: "Additional context for permission check",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class BulkPermissionOperationDto {
  @ApiProperty({ enum: ["grant", "revoke"], description: "Operation type" })
  @IsEnum(["grant", "revoke"])
  operation: "grant" | "revoke";

  @ApiProperty({ description: "User IDs" })
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiProperty({ description: "Permission strings (action:resource format)" })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({
    description: "Operation metadata",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
