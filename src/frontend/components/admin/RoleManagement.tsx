"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, KeyIcon, UsersIcon } from '@heroicons/react/24/outline';
import { permissionApi } from '@/lib/permissionApi';
import { toast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormErrors';
import type { 
  Role, 
  Permission, 
  CreateRoleForm, 
  UpdateRoleForm, 
  RoleFilters, 
  UserWithRole,
  UpdateRolePermissionsForm 
} from '@/types/permissions';
import { ROLE_TYPES, ROLE_SCOPES } from '@/types/permissions';

export function RoleManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<RoleFilters>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [managingPermissions, setManagingPermissions] = useState<Role | null>(null);
  const [viewingUsers, setViewingUsers] = useState<Role | null>(null);
  const [createForm, setCreateForm] = useState<CreateRoleForm>({
    name: '',
    displayName: '',
    description: '',
    type: 'custom',
    scope: 'global',
    isActive: true,
    isDefault: false,
    priority: 0,
  });
  const [updateForm, setUpdateForm] = useState<UpdateRoleForm>({});
  const [permissionForm, setPermissionForm] = useState<UpdateRolePermissionsForm>({
    permissionIds: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles', filters],
    queryFn: () => permissionApi.getRoles(filters),
  });

  // Fetch all permissions
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionApi.getPermissions({}),
  });

  // Fetch users for the selected role
  const { data: roleUsers = [] } = useQuery({
    queryKey: ['role-users', viewingUsers?.id],
    queryFn: () => viewingUsers ? permissionApi.getRoleUsers(viewingUsers.id) : Promise.resolve([]),
    enabled: !!viewingUsers,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: permissionApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowCreateModal(false);
      resetCreateForm();
      toast.success('Role created successfully');
    },
    onError: (error: Error) => toast.error(`Failed to create role: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleForm }) =>
      permissionApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      resetUpdateForm();
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => toast.error(`Failed to update role: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: permissionApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => toast.error(`Failed to delete role: ${error.message}`),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRolePermissionsForm }) =>
      permissionApi.updateRolePermissions(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setManagingPermissions(null);
      setPermissionForm({ permissionIds: [] });
      toast.success('Role permissions updated successfully');
    },
    onError: (error: Error) => toast.error(`Failed to update role permissions: ${error.message}`),
  });

  // Filter roles based on search term
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      displayName: '',
      description: '',
      type: 'custom',
      scope: 'global',
      isActive: true,
      isDefault: false,
      priority: 0,
    });
    setFormErrors({});
  };

  const resetUpdateForm = () => {
    setUpdateForm({});
    setFormErrors({});
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.name.trim()) errors.name = 'Name is required';
    if (!createForm.displayName.trim()) errors.displayName = 'Display name is required';
    if (createForm.name && !/^[a-zA-Z0-9_-]+$/.test(createForm.name)) {
      errors.name = 'Name must contain only letters, numbers, underscores, and hyphens';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRole = async () => {
    if (!validateCreateForm()) return;
    try {
      await createMutation.mutateAsync(createForm);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      await updateMutation.mutateAsync({ id: editingRole.id, data: updateForm });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      await deleteMutation.mutateAsync(deletingRole.id);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleUpdatePermissions = async () => {
    if (!managingPermissions) return;
    try {
      await updatePermissionsMutation.mutateAsync({
        roleId: managingPermissions.id,
        data: permissionForm,
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setUpdateForm({
      displayName: role.displayName,
      description: role.description || '',
      isActive: role.isActive,
      isDefault: role.isDefault,
      priority: role.priority,
    });
  };

  const openPermissionsModal = (role: Role) => {
    setManagingPermissions(role);
    setPermissionForm({
      permissionIds: role.permissions.map(p => p.id),
    });
  };

  const togglePermission = (permissionId: string) => {
    const currentIds = permissionForm.permissionIds;
    const newIds = currentIds.includes(permissionId)
      ? currentIds.filter(id => id !== permissionId)
      : [...currentIds, permissionId];
    setPermissionForm({ permissionIds: newIds });
  };

  const getRoleTypeBadgeColor = (type: string) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      moderator: 'bg-blue-100 text-blue-800',
      user: 'bg-green-100 text-green-800',
      guest: 'bg-gray-100 text-gray-800',
      custom: 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getScopeBadgeColor = (scope: string) => {
    const colors = {
      global: 'bg-indigo-100 text-indigo-800',
      organization: 'bg-teal-100 text-teal-800',
      department: 'bg-yellow-100 text-yellow-800',
      project: 'bg-pink-100 text-pink-800',
    };
    return colors[scope as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">Failed to load roles</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600">Manage user roles and their permissions</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Add Role</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {ROLE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filters.scope || ''}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Scopes</option>
              {ROLE_SCOPES.map(scope => (
                <option key={scope.value} value={scope.value}>{scope.label}</option>
              ))}
            </select>

            <select
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => setFilters({ 
                ...filters, 
                isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading roles...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.displayName}</div>
                      <div className="text-sm text-gray-500">{role.name}</div>
                      {role.description && (
                        <div className="text-xs text-gray-400 max-w-xs truncate">{role.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleTypeBadgeColor(role.type)}`}>
                        {role.type}
                      </span>
                      {role.isSystemRole && (
                        <div className="text-xs text-gray-500 mt-1">System Role</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScopeBadgeColor(role.scope)}`}>
                        {role.scope}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {role.isDefault && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.permissions.length} permissions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setViewingUsers(role)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="View users"
                        >
                          <UsersIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openPermissionsModal(role)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Manage permissions"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(role)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit role"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {!role.isSystemRole && (
                          <button
                            onClick={() => setDeletingRole(role)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete role"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRoles.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No roles found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <ModalHeader>
            <ModalTitle>Create New Role</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., content_moderator"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used for internal identification.</p>
                {formErrors.name && <FormError error={formErrors.name} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g., Content Moderator"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formErrors.displayName && <FormError error={formErrors.displayName} />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ROLE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={createForm.scope}
                    onChange={(e) => setCreateForm({ ...createForm, scope: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ROLE_SCOPES.map(scope => (
                      <option key={scope.value} value={scope.value}>{scope.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe the role's purpose..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="createActive"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="createActive" className="ml-2 block text-sm text-gray-700">Active</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="createDefault"
                    checked={createForm.isDefault}
                    onChange={(e) => setCreateForm({ ...createForm, isDefault: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="createDefault" className="ml-2 block text-sm text-gray-700">Default role</label>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={createMutation.isPending} className="ml-2">
              {createMutation.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Permission Management Modal */}
      {managingPermissions && (
        <Modal isOpen={!!managingPermissions} onClose={() => setManagingPermissions(null)}>
          <ModalHeader>
            <ModalTitle>Manage Permissions - {managingPermissions.displayName}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Select permissions for this role. Currently has {managingPermissions.permissions.length} permissions.
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                <div className="divide-y divide-gray-200">
                  {allPermissions.map((permission) => {
                    const isSelected = permissionForm.permissionIds.includes(permission.id);
                    return (
                      <div key={permission.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePermission(permission.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                            <div className="text-xs text-gray-500">
                              {permission.action} • {permission.resource}
                            </div>
                            {permission.description && (
                              <div className="text-xs text-gray-400 mt-1">{permission.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setManagingPermissions(null)} disabled={updatePermissionsMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={updatePermissionsMutation.isPending} className="ml-2">
              {updatePermissionsMutation.isPending ? 'Updating...' : 'Update Permissions'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Other modals would continue here... */}
    </div>
  );
}