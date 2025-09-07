import {
  PermissionAction,
  PermissionResource,
} from "../../backend/database/entities/permission.entity";
import {
  RoleScope,
  RoleType,
} from "../../backend/database/entities/role.entity";

// Base permission interface
export interface IPermission {
  id: string;
  action: PermissionAction;
  resource: PermissionResource;
  name: string;
  description?: string;
  isActive: boolean;
  conditions?: Record<string, any>;
}

// Base role interface
export interface IRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: RoleType;
  scope: RoleScope;
  isActive: boolean;
  isDefault: boolean;
  isSystemRole: boolean;
  priority: number;
  permissions: IPermission[];
  metadata?: Record<string, any>;
}

// Permission check interface
export interface IPermissionCheck {
  action: PermissionAction;
  resource: PermissionResource;
  conditions?: Record<string, any>;
}

// Role assignment interface
export interface IRoleAssignment {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// Permission context for evaluating dynamic permissions
export interface IPermissionContext {
  user: {
    id: string;
    role: string;
    permissions: string[];
  };
  resource?: {
    id?: string;
    ownerId?: string;
    organizationId?: string;
    metadata?: Record<string, any>;
  };
  request?: {
    ip: string;
    userAgent: string;
    method: string;
    path: string;
  };
}

// Permission evaluation result
export interface IPermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  expiresAt?: Date;
}

// Bulk permission operations
export interface IBulkPermissionOperation {
  operation: "grant" | "revoke" | "update";
  roleId: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

// Permission audit log
export interface IPermissionAuditLog {
  id: string;
  userId: string;
  action: "granted" | "revoked" | "checked" | "denied";
  permission: string;
  resource?: string;
  resourceId?: string;
  context: IPermissionContext;
  result: IPermissionResult;
  timestamp: Date;
  metadata?: Record<string, any>;
}
