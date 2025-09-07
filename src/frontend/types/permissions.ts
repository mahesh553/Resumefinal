// Permission and Role types for frontend
export interface Permission {
  id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage';
  resource: 'user' | 'resume' | 'job_application' | 'admin_panel' | 'analytics' | 'system_settings' | 'security_logs' | 'user_management' | 'system_monitoring' | 'reports' | 'ai_services' | 'file_upload' | 'webhooks' | 'api_keys' | 'billing';
  name: string;
  description?: string;
  isActive: boolean;
  conditions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'super_admin' | 'admin' | 'moderator' | 'user' | 'guest' | 'custom';
  scope: 'global' | 'organization' | 'department' | 'project';
  isActive: boolean;
  isDefault: boolean;
  isSystemRole: boolean;
  priority: number;
  permissions: Permission[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Legacy role
  roleEntity?: Role; // New role system
  roleId?: string;
  isActive: boolean;
  createdAt: string;
  permissions?: string[];
}

// Form interfaces
export interface CreatePermissionForm {
  action: string;
  resource: string;
  name: string;
  description?: string;
  isActive?: boolean;
  conditions?: Record<string, any>;
}

export interface UpdatePermissionForm {
  name?: string;
  description?: string;
  isActive?: boolean;
  conditions?: Record<string, any>;
}

export interface CreateRoleForm {
  name: string;
  displayName: string;
  description?: string;
  type: string;
  scope: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  permissionIds?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateRoleForm {
  displayName?: string;
  description?: string;
  scope?: string;
  isActive?: boolean;
  isDefault?: boolean;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface UpdateRolePermissionsForm {
  permissionIds: string[];
}

export interface AssignRoleForm {
  roleId: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// API response types
export interface PermissionResponse {
  data: Permission[];
}

export interface RoleResponse {
  data: Role[];
}

export interface SinglePermissionResponse {
  data: Permission;
}

export interface SingleRoleResponse {
  data: Role;
}

export interface UserResponse {
  data: UserWithRole;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  expiresAt?: Date;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
}

// Filter interfaces
export interface PermissionFilters {
  action?: string;
  resource?: string;
  isActive?: boolean;
}

export interface RoleFilters {
  type?: string;
  scope?: string;
  isActive?: boolean;
  isSystemRole?: boolean;
}

// Constants
export const PERMISSION_ACTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'execute', label: 'Execute' },
  { value: 'manage', label: 'Manage' },
] as const;

export const PERMISSION_RESOURCES = [
  { value: 'user', label: 'Users' },
  { value: 'resume', label: 'Resumes' },
  { value: 'job_application', label: 'Job Applications' },
  { value: 'admin_panel', label: 'Admin Panel' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'system_settings', label: 'System Settings' },
  { value: 'security_logs', label: 'Security Logs' },
  { value: 'user_management', label: 'User Management' },
  { value: 'system_monitoring', label: 'System Monitoring' },
  { value: 'reports', label: 'Reports' },
  { value: 'ai_services', label: 'AI Services' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'api_keys', label: 'API Keys' },
  { value: 'billing', label: 'Billing' },
] as const;

export const ROLE_TYPES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'user', label: 'User' },
  { value: 'guest', label: 'Guest' },
  { value: 'custom', label: 'Custom' },
] as const;

export const ROLE_SCOPES = [
  { value: 'global', label: 'Global' },
  { value: 'organization', label: 'Organization' },
  { value: 'department', label: 'Department' },
  { value: 'project', label: 'Project' },
] as const;