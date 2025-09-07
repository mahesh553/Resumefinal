import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '../../database/entities/permission.entity';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  action: PermissionAction;
  resource: PermissionResource;
  operator?: 'AND' | 'OR'; // For multiple permissions
}

/**
 * Decorator to require specific permissions for a route or method
 * @param permissions Array of permission requirements
 * @param operator Global operator for all permissions (default: 'AND')
 */
export const RequirePermissions = (
  permissions: PermissionRequirement | PermissionRequirement[],
  operator: 'AND' | 'OR' = 'AND'
) => {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  return SetMetadata(PERMISSIONS_KEY, { permissions: permissionArray, operator });
};

/**
 * Decorator for common permission patterns
 */
export class Permissions {
  // User management permissions
  static ManageUsers() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.USER_MANAGEMENT,
    });
  }

  static ViewUsers() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.USER_MANAGEMENT,
    });
  }

  static CreateUser() {
    return RequirePermissions({
      action: PermissionAction.CREATE,
      resource: PermissionResource.USER,
    });
  }

  static UpdateUser() {
    return RequirePermissions({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.USER,
    });
  }

  static DeleteUser() {
    return RequirePermissions({
      action: PermissionAction.DELETE,
      resource: PermissionResource.USER,
    });
  }

  // Admin panel permissions
  static AccessAdminPanel() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.ADMIN_PANEL,
    });
  }

  static ManageAdminPanel() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.ADMIN_PANEL,
    });
  }

  // Analytics permissions
  static ViewAnalytics() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.ANALYTICS,
    });
  }

  static ManageAnalytics() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.ANALYTICS,
    });
  }

  // System settings permissions
  static ViewSystemSettings() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.SYSTEM_SETTINGS,
    });
  }

  static UpdateSystemSettings() {
    return RequirePermissions({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.SYSTEM_SETTINGS,
    });
  }

  static ManageSystemSettings() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.SYSTEM_SETTINGS,
    });
  }

  // Security logs permissions
  static ViewSecurityLogs() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.SECURITY_LOGS,
    });
  }

  static ManageSecurityLogs() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.SECURITY_LOGS,
    });
  }

  // System monitoring permissions
  static ViewSystemMonitoring() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.SYSTEM_MONITORING,
    });
  }

  static ManageSystemMonitoring() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.SYSTEM_MONITORING,
    });
  }

  // Reports permissions
  static ViewReports() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.REPORTS,
    });
  }

  static CreateReports() {
    return RequirePermissions({
      action: PermissionAction.CREATE,
      resource: PermissionResource.REPORTS,
    });
  }

  static ManageReports() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.REPORTS,
    });
  }

  // AI services permissions
  static UseAIServices() {
    return RequirePermissions({
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.AI_SERVICES,
    });
  }

  static ManageAIServices() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.AI_SERVICES,
    });
  }

  // File upload permissions
  static UploadFiles() {
    return RequirePermissions({
      action: PermissionAction.CREATE,
      resource: PermissionResource.FILE_UPLOAD,
    });
  }

  static ManageFileUploads() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.FILE_UPLOAD,
    });
  }

  // Resume permissions
  static CreateResume() {
    return RequirePermissions({
      action: PermissionAction.CREATE,
      resource: PermissionResource.RESUME,
    });
  }

  static ViewResume() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.RESUME,
    });
  }

  static UpdateResume() {
    return RequirePermissions({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.RESUME,
    });
  }

  static DeleteResume() {
    return RequirePermissions({
      action: PermissionAction.DELETE,
      resource: PermissionResource.RESUME,
    });
  }

  static ManageResumes() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.RESUME,
    });
  }

  // Job application permissions
  static CreateJobApplication() {
    return RequirePermissions({
      action: PermissionAction.CREATE,
      resource: PermissionResource.JOB_APPLICATION,
    });
  }

  static ViewJobApplication() {
    return RequirePermissions({
      action: PermissionAction.READ,
      resource: PermissionResource.JOB_APPLICATION,
    });
  }

  static UpdateJobApplication() {
    return RequirePermissions({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.JOB_APPLICATION,
    });
  }

  static DeleteJobApplication() {
    return RequirePermissions({
      action: PermissionAction.DELETE,
      resource: PermissionResource.JOB_APPLICATION,
    });
  }

  static ManageJobApplications() {
    return RequirePermissions({
      action: PermissionAction.MANAGE,
      resource: PermissionResource.JOB_APPLICATION,
    });
  }

  // Combined permissions for complex operations
  static UserAndResumeAccess() {
    return RequirePermissions([
      { action: PermissionAction.READ, resource: PermissionResource.USER },
      { action: PermissionAction.READ, resource: PermissionResource.RESUME },
    ], 'AND');
  }

  static AdminOrModerator() {
    return RequirePermissions([
      { action: PermissionAction.MANAGE, resource: PermissionResource.ADMIN_PANEL },
      { action: PermissionAction.READ, resource: PermissionResource.ADMIN_PANEL },
    ], 'OR');
  }

  static SuperAdminOnly() {
    return RequirePermissions([
      { action: PermissionAction.MANAGE, resource: PermissionResource.SYSTEM_SETTINGS },
      { action: PermissionAction.MANAGE, resource: PermissionResource.USER_MANAGEMENT },
    ], 'AND');
  }
}