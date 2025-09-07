import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage', // All permissions
}

export enum PermissionResource {
  USER = 'user',
  RESUME = 'resume',
  JOB_APPLICATION = 'job_application',
  ADMIN_PANEL = 'admin_panel',
  ANALYTICS = 'analytics',
  SYSTEM_SETTINGS = 'system_settings',
  SECURITY_LOGS = 'security_logs',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_MONITORING = 'system_monitoring',
  REPORTS = 'reports',
  AI_SERVICES = 'ai_services',
  FILE_UPLOAD = 'file_upload',
  WEBHOOKS = 'webhooks',
  API_KEYS = 'api_keys',
  BILLING = 'billing',
}

@Entity('permissions')
@Index(['action', 'resource'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  conditions?: Record<string, any>; // For advanced permission conditions

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get permission string representation
  getPermissionString(): string {
    return `${this.action}:${this.resource}`;
  }

  // Helper method to check if permission matches action and resource
  matches(action: PermissionAction, resource: PermissionResource): boolean {
    return this.action === action && this.resource === resource;
  }

  // Helper method to check if this permission includes another permission
  includes(permission: Permission): boolean {
    if (this.action === PermissionAction.MANAGE) {
      return this.resource === permission.resource;
    }
    return this.matches(permission.action, permission.resource);
  }
}