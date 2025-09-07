"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { permissionApi } from '@/lib/permissionApi';
import { toast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormErrors';
import type { Permission, CreatePermissionForm, UpdatePermissionForm, PermissionFilters } from '@/types/permissions';
import { PERMISSION_ACTIONS, PERMISSION_RESOURCES } from '@/types/permissions';

export function PermissionManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PermissionFilters>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);
  const [createForm, setCreateForm] = useState<CreatePermissionForm>({
    action: '',
    resource: '',
    name: '',
    description: '',
    isActive: true,
  });
  const [updateForm, setUpdateForm] = useState<UpdatePermissionForm>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fetch permissions
  const { data: permissions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['permissions', filters],
    queryFn: () => permissionApi.getPermissions(filters),
    refetchOnWindowFocus: false,
  });

  // Create permission mutation
  const createMutation = useMutation({
    mutationFn: permissionApi.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setShowCreateModal(false);
      resetCreateForm();
      toast.success('Permission created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create permission: ${error.message}`);
    },
  });

  // Update permission mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionForm }) =>
      permissionApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setEditingPermission(null);
      resetUpdateForm();
      toast.success('Permission updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });

  // Delete permission mutation
  const deleteMutation = useMutation({
    mutationFn: permissionApi.deletePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setDeletingPermission(null);
      toast.success('Permission deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete permission: ${error.message}`);
    },
  });

  // Filter permissions based on search term
  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetCreateForm = () => {
    setCreateForm({
      action: '',
      resource: '',
      name: '',
      description: '',
      isActive: true,
    });
    setFormErrors({});
  };

  const resetUpdateForm = () => {
    setUpdateForm({});
    setFormErrors({});
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.action) errors.action = 'Action is required';
    if (!createForm.resource) errors.resource = 'Resource is required';
    if (!createForm.name.trim()) errors.name = 'Name is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePermission = async () => {
    if (!validateCreateForm()) return;

    try {
      await createMutation.mutateAsync(createForm);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission) return;

    try {
      await updateMutation.mutateAsync({
        id: editingPermission.id,
        data: updateForm,
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeletePermission = async () => {
    if (!deletingPermission) return;

    try {
      await deleteMutation.mutateAsync(deletingPermission.id);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const openEditModal = (permission: Permission) => {
    setEditingPermission(permission);
    setUpdateForm({
      name: permission.name,
      description: permission.description || '',
      isActive: permission.isActive,
    });
  };

  const applyFilters = (newFilters: PermissionFilters) => {
    setFilters(newFilters);
  };

  const getActionBadgeColor = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      execute: 'bg-purple-100 text-purple-800',
      manage: 'bg-gray-100 text-gray-800',
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getResourceBadgeColor = (resource: string) => {
    // Simple hash-based color assignment for consistency
    const hash = resource.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-teal-100 text-teal-800',
      'bg-orange-100 text-orange-800',
      'bg-cyan-100 text-cyan-800',
    ];
    return colors[hash % colors.length];
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">Failed to load permissions</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
            <p className="text-gray-600">Manage system permissions and access controls</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Permission</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.action || ''}
              onChange={(e) => applyFilters({ ...filters, action: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              {PERMISSION_ACTIONS.map(action => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>

            <select
              value={filters.resource || ''}
              onChange={(e) => applyFilters({ ...filters, resource: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Resources</option>
              {PERMISSION_RESOURCES.map(resource => (
                <option key={resource.value} value={resource.value}>{resource.label}</option>
              ))}
            </select>

            <select
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => applyFilters({ 
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

      {/* Permissions Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading permissions...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPermissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                      <div className="text-sm text-gray-500">{permission.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(permission.action)}`}>
                        {permission.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResourceBadgeColor(permission.resource)}`}>
                        {permission.resource}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        permission.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {permission.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {permission.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(permission)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit permission"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPermission(permission)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete permission"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPermissions.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No permissions found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Permission Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <ModalHeader>
            <ModalTitle>Create New Permission</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={createForm.action}
                  onChange={(e) => setCreateForm({ ...createForm, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select action</option>
                  {PERMISSION_ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
                {formErrors.action && <FormError error={formErrors.action} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                <select
                  value={createForm.resource}
                  onChange={(e) => setCreateForm({ ...createForm, resource: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select resource</option>
                  {PERMISSION_RESOURCES.map(resource => (
                    <option key={resource.value} value={resource.value}>{resource.label}</option>
                  ))}
                </select>
                {formErrors.resource && <FormError error={formErrors.resource} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Create User"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formErrors.name && <FormError error={formErrors.name} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe what this permission allows..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="createActive"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="createActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermission}
              disabled={createMutation.isPending}
              className="ml-2"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Permission'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Permission Modal */}
      {editingPermission && (
        <Modal isOpen={!!editingPermission} onClose={() => setEditingPermission(null)}>
          <ModalHeader>
            <ModalTitle>Edit Permission</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <input
                  type="text"
                  value={editingPermission.action}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Action cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                <input
                  type="text"
                  value={editingPermission.resource}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Resource cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={updateForm.name || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={updateForm.description || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="updateActive"
                  checked={updateForm.isActive !== undefined ? updateForm.isActive : editingPermission.isActive}
                  onChange={(e) => setUpdateForm({ ...updateForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="updateActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPermission(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePermission}
              disabled={updateMutation.isPending}
              className="ml-2"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Permission'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPermission && (
        <Modal isOpen={!!deletingPermission} onClose={() => setDeletingPermission(null)}>
          <ModalHeader>
            <ModalTitle>Delete Permission</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-700">
              Are you sure you want to delete the permission "<strong>{deletingPermission.name}</strong>"?
            </p>
            <p className="text-red-600 text-sm mt-2">
              This action cannot be undone and may affect users with roles that include this permission.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingPermission(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="ml-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeletePermission}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Permission'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}