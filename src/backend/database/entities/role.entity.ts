import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Permission } from "./permission.entity";
// Import User as type to avoid circular dependency
import type { User } from "./user.entity";

export enum RoleType {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  USER = "user",
  GUEST = "guest",
  CUSTOM = "custom",
}

export enum RoleScope {
  GLOBAL = "global",
  ORGANIZATION = "organization",
  DEPARTMENT = "department",
  PROJECT = "project",
}

@Entity("roles")
@Index(["name"], { unique: true })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @Column({ type: "varchar", length: 255 })
  displayName: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "enum",
    enum: RoleType,
    default: RoleType.CUSTOM,
  })
  type: RoleType;

  @Column({
    type: "enum",
    enum: RoleScope,
    default: RoleScope.GLOBAL,
  })
  scope: RoleScope;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "boolean", default: false })
  isDefault: boolean; // Default role for new users

  @Column({ type: "boolean", default: false })
  isSystemRole: boolean; // Cannot be deleted

  @Column({ type: "int", default: 0 })
  priority: number; // Higher number = higher priority

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any>; // Additional role metadata

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: true,
    eager: false,
  })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions: Permission[];

  @OneToMany("User", (user: any) => user.roleEntity)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if role has specific permission
  hasPermission(action: string, resource: string): boolean {
    if (!this.permissions) return false;

    return this.permissions.some(
      (permission) =>
        permission.getPermissionString() === `${action}:${resource}` ||
        (permission.action === "manage" && permission.resource === resource)
    );
  }

  // Helper method to get all permission strings
  getPermissionStrings(): string[] {
    if (!this.permissions) return [];
    return this.permissions.map((permission) =>
      permission.getPermissionString()
    );
  }

  // Helper method to check if role is higher priority than another role
  isHigherPriorityThan(otherRole: Role): boolean {
    return this.priority > otherRole.priority;
  }

  // Helper method to check if role can be modified by user with given role
  canBeModifiedBy(userRole: Role): boolean {
    if (this.isSystemRole) return false;
    return (
      userRole.isHigherPriorityThan(this) ||
      userRole.type === RoleType.SUPER_ADMIN
    );
  }
}
