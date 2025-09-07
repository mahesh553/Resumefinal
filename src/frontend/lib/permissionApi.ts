import { apiClient } from './api';
import type {
  ApiResponse,
} from './api';
import type {
  Permission,
  Role,
  UserWithRole,
  CreatePermissionForm,
  UpdatePermissionForm,
  CreateRoleForm,
  UpdateRoleForm,
  AssignRoleForm,
  PermissionResponse,
  RoleResponse,
  SinglePermissionResponse,
  SingleRoleResponse,
  UserResponse,
  PermissionCheckResult,
  BulkOperationResult,
  PermissionFilters,
  RoleFilters,
} from '../types/permissions';

const API_BASE = '/api/admin';

// Helper function to make API requests using the enhanced API client
async function makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  const session = await (await import('next-auth/react')).getSession();
  if (!session?.accessToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  if (method === 'DELETE') {
    return null as T;
  }

  return response.json();
}

// Permission API functions
export const permissionApi = {
  // Get all permissions with optional filtering
  async getPermissions(filters?: PermissionFilters): Promise<Permission[]> {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource) params.append('resource', filters.resource);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const response = await makeApiRequest<{ data: Permission[]; total: number }>(
      `${API_BASE}/permissions${params.toString() ? `?${params.toString()}` : ''}`,
      'GET'
    );

    return response.data || [];
  },

  // Get permission by ID
  async getPermissionById(id: string): Promise<Permission> {
    const response = await makeApiRequest<{ data: Permission }>(
      `${API_BASE}/permissions/${id}`,
      'GET'
    );
    return response.data;
  },

  // Create new permission
  async createPermission(data: CreatePermissionForm): Promise<Permission> {
    const response = await makeApiRequest<{ data: Permission }>(
      `${API_BASE}/permissions`,
      'POST',
      data
    );
    return response.data;
  },

  // Update permission
  async updatePermission(id: string, data: UpdatePermissionForm): Promise<Permission> {
    const response = await makeApiRequest<{ data: Permission }>(
      `${API_BASE}/permissions/${id}`,
      'PUT',
      data
    );
    return response.data;
  },

  // Delete permission
  async deletePermission(id: string): Promise<void> {
    await makeApiRequest<void>(
      `${API_BASE}/permissions/${id}`,
      'DELETE'
    );
  },

  // Get all roles with optional filtering
  async getRoles(filters?: RoleFilters): Promise<Role[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.isSystemRole !== undefined) params.append('isSystemRole', filters.isSystemRole.toString());

    const response = await makeApiRequest<{ data: Role[]; total: number }>(
      `${API_BASE}/roles${params.toString() ? `?${params.toString()}` : ''}`,
      'GET'
    );
    return response.data || [];
  },

  // Get role by ID
  async getRoleById(id: string): Promise<Role> {
    const response = await makeApiRequest<{ data: Role }>(
      `${API_BASE}/roles/${id}`,
      'GET'
    );
    return response.data;
  },

  // Create new role
  async createRole(data: CreateRoleForm): Promise<Role> {
    const response = await makeApiRequest<{ data: Role }>(
      `${API_BASE}/roles`,
      'POST',
      data
    );
    return response.data;
  },

  // Update role
  async updateRole(id: string, data: UpdateRoleForm): Promise<Role> {
    const response = await makeApiRequest<{ data: Role }>(
      `${API_BASE}/roles/${id}`,
      'PUT',
      data
    );
    return response.data;
  },

  // Delete role
  async deleteRole(id: string): Promise<void> {
    await makeApiRequest<void>(
      `${API_BASE}/roles/${id}`,
      'DELETE'
    );
  },

  // Update role permissions
  async updateRolePermissions(roleId: string, data: { permissionIds: string[] }): Promise<Role> {
    const response = await makeApiRequest<{ data: Role }>(
      `${API_BASE}/roles/${roleId}/permissions`,
      'PUT',
      data
    );
    return response.data;
  },

  // Get users with specific role
  async getRoleUsers(roleId: string): Promise<UserWithRole[]> {
    const response = await makeApiRequest<{ data: UserWithRole[] }>(
      `${API_BASE}/roles/${roleId}/users`,
      'GET'
    );
    return response.data || [];
  },

  // Assign role to user
  async assignRole(userId: string, data: AssignRoleForm): Promise<UserWithRole> {
    const response = await makeApiRequest<{ data: UserWithRole }>(
      `${API_BASE}/users/${userId}/assign-role`,
      'POST',
      data
    );
    return response.data;
  },

  // Remove role from user
  async removeRole(userId: string): Promise<UserWithRole> {
    const response = await makeApiRequest<{ data: UserWithRole }>(
      `${API_BASE}/users/${userId}/role`,
      'DELETE'
    );
    return response.data;
  },

  // Check user permission
  async checkPermission(userId: string, action: string, resource: string, context?: Record<string, any>): Promise<PermissionCheckResult> {
    const response = await makeApiRequest<{ data: PermissionCheckResult }>(
      `${API_BASE}/permissions/check/${userId}`,
      'POST',
      { action, resource, context }
    );
    return response.data;
  },

  // Initialize system roles
  async initializeRoles(): Promise<void> {
    await makeApiRequest<{ message: string }>(
      `${API_BASE}/setup/initialize-roles`,
      'POST'
    );
  },

  // Seed permissions
  async seedPermissions(): Promise<void> {
    await makeApiRequest<{ message: string }>(
      `${API_BASE}/setup/seed-permissions`,
      'POST'
    );
  },
};
