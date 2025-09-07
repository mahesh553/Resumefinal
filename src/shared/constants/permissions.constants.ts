import {
  PermissionAction,
  PermissionResource,
} from "../../backend/database/entities/permission.entity";
import { RoleType } from "../../backend/database/entities/role.entity";

// Predefined system permissions
export const SYSTEM_PERMISSIONS = {
  // User Management
  USER_CREATE: {
    action: PermissionAction.CREATE,
    resource: PermissionResource.USER,
  },
  USER_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.USER,
  },
  USER_UPDATE: {
    action: PermissionAction.UPDATE,
    resource: PermissionResource.USER,
  },
  USER_DELETE: {
    action: PermissionAction.DELETE,
    resource: PermissionResource.USER,
  },
  USER_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.USER,
  },

  // Resume Management
  RESUME_CREATE: {
    action: PermissionAction.CREATE,
    resource: PermissionResource.RESUME,
  },
  RESUME_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.RESUME,
  },
  RESUME_UPDATE: {
    action: PermissionAction.UPDATE,
    resource: PermissionResource.RESUME,
  },
  RESUME_DELETE: {
    action: PermissionAction.DELETE,
    resource: PermissionResource.RESUME,
  },
  RESUME_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.RESUME,
  },

  // Job Applications
  JOB_CREATE: {
    action: PermissionAction.CREATE,
    resource: PermissionResource.JOB_APPLICATION,
  },
  JOB_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.JOB_APPLICATION,
  },
  JOB_UPDATE: {
    action: PermissionAction.UPDATE,
    resource: PermissionResource.JOB_APPLICATION,
  },
  JOB_DELETE: {
    action: PermissionAction.DELETE,
    resource: PermissionResource.JOB_APPLICATION,
  },
  JOB_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.JOB_APPLICATION,
  },

  // Admin Panel
  ADMIN_PANEL_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.ADMIN_PANEL,
  },
  ADMIN_PANEL_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.ADMIN_PANEL,
  },

  // Analytics
  ANALYTICS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.ANALYTICS,
  },
  ANALYTICS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.ANALYTICS,
  },

  // System Settings
  SYSTEM_SETTINGS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.SYSTEM_SETTINGS,
  },
  SYSTEM_SETTINGS_UPDATE: {
    action: PermissionAction.UPDATE,
    resource: PermissionResource.SYSTEM_SETTINGS,
  },
  SYSTEM_SETTINGS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.SYSTEM_SETTINGS,
  },

  // Security Logs
  SECURITY_LOGS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.SECURITY_LOGS,
  },
  SECURITY_LOGS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.SECURITY_LOGS,
  },

  // User Management (Admin)
  USER_MANAGEMENT_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.USER_MANAGEMENT,
  },
  USER_MANAGEMENT_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.USER_MANAGEMENT,
  },

  // System Monitoring
  SYSTEM_MONITORING_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.SYSTEM_MONITORING,
  },
  SYSTEM_MONITORING_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.SYSTEM_MONITORING,
  },

  // Reports
  REPORTS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.REPORTS,
  },
  REPORTS_CREATE: {
    action: PermissionAction.CREATE,
    resource: PermissionResource.REPORTS,
  },
  REPORTS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.REPORTS,
  },

  // AI Services
  AI_SERVICES_EXECUTE: {
    action: PermissionAction.EXECUTE,
    resource: PermissionResource.AI_SERVICES,
  },
  AI_SERVICES_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.AI_SERVICES,
  },

  // File Upload
  FILE_UPLOAD_CREATE: {
    action: PermissionAction.CREATE,
    resource: PermissionResource.FILE_UPLOAD,
  },
  FILE_UPLOAD_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.FILE_UPLOAD,
  },

  // Webhooks
  WEBHOOKS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.WEBHOOKS,
  },
  WEBHOOKS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.WEBHOOKS,
  },

  // API Keys
  API_KEYS_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.API_KEYS,
  },
  API_KEYS_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.API_KEYS,
  },

  // Billing
  BILLING_READ: {
    action: PermissionAction.READ,
    resource: PermissionResource.BILLING,
  },
  BILLING_MANAGE: {
    action: PermissionAction.MANAGE,
    resource: PermissionResource.BILLING,
  },
} as const;

// Default role configurations
export const DEFAULT_ROLE_PERMISSIONS = {
  [RoleType.SUPER_ADMIN]: [
    "manage:user",
    "manage:resume",
    "manage:job_application",
    "manage:admin_panel",
    "manage:analytics",
    "manage:system_settings",
    "manage:security_logs",
    "manage:user_management",
    "manage:system_monitoring",
    "manage:reports",
    "manage:ai_services",
    "manage:file_upload",
    "manage:webhooks",
    "manage:api_keys",
    "manage:billing",
  ],
  [RoleType.ADMIN]: [
    "manage:user_management",
    "read:analytics",
    "read:system_monitoring",
    "read:security_logs",
    "update:system_settings",
    "manage:reports",
    "read:admin_panel",
    "create:user",
    "read:user",
    "update:user",
    "delete:user",
  ],
  [RoleType.MODERATOR]: [
    "read:user_management",
    "read:analytics",
    "read:system_monitoring",
    "read:security_logs",
    "read:admin_panel",
    "read:user",
    "update:user",
    "read:reports",
  ],
  [RoleType.USER]: [
    "create:resume",
    "read:resume",
    "update:resume",
    "delete:resume",
    "create:job_application",
    "read:job_application",
    "update:job_application",
    "delete:job_application",
    "execute:ai_services",
    "create:file_upload",
  ],
  [RoleType.GUEST]: ["read:resume", "read:job_application"],
  [RoleType.CUSTOM]: [
    // Custom roles have no default permissions
  ],
} as const;

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  USER_OPERATIONS: [
    SYSTEM_PERMISSIONS.USER_CREATE,
    SYSTEM_PERMISSIONS.USER_READ,
    SYSTEM_PERMISSIONS.USER_UPDATE,
    SYSTEM_PERMISSIONS.USER_DELETE,
  ],
  CONTENT_MANAGEMENT: [
    SYSTEM_PERMISSIONS.RESUME_CREATE,
    SYSTEM_PERMISSIONS.RESUME_READ,
    SYSTEM_PERMISSIONS.RESUME_UPDATE,
    SYSTEM_PERMISSIONS.RESUME_DELETE,
    SYSTEM_PERMISSIONS.JOB_CREATE,
    SYSTEM_PERMISSIONS.JOB_READ,
    SYSTEM_PERMISSIONS.JOB_UPDATE,
    SYSTEM_PERMISSIONS.JOB_DELETE,
  ],
  ADMIN_ACCESS: [
    SYSTEM_PERMISSIONS.ADMIN_PANEL_READ,
    SYSTEM_PERMISSIONS.ANALYTICS_READ,
    SYSTEM_PERMISSIONS.USER_MANAGEMENT_READ,
    SYSTEM_PERMISSIONS.SYSTEM_MONITORING_READ,
  ],
  SYSTEM_ADMINISTRATION: [
    SYSTEM_PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
    SYSTEM_PERMISSIONS.SECURITY_LOGS_MANAGE,
    SYSTEM_PERMISSIONS.USER_MANAGEMENT_MANAGE,
    SYSTEM_PERMISSIONS.SYSTEM_MONITORING_MANAGE,
  ],
} as const;

// Utility functions
export class PermissionUtils {
  /**
   * Convert permission object to string format
   */
  static permissionToString(
    action: PermissionAction,
    resource: PermissionResource
  ): string {
    return `${action}:${resource}`;
  }

  /**
   * Parse permission string to action and resource
   */
  static parsePermissionString(
    permissionString: string
  ): { action: PermissionAction; resource: PermissionResource } | null {
    const [action, resource] = permissionString.split(":");

    if (
      !action ||
      !resource ||
      !Object.values(PermissionAction).includes(action as PermissionAction) ||
      !Object.values(PermissionResource).includes(
        resource as PermissionResource
      )
    ) {
      return null;
    }

    return {
      action: action as PermissionAction,
      resource: resource as PermissionResource,
    };
  }

  /**
   * Check if one permission includes another (e.g., manage:user includes create:user)
   */
  static permissionIncludes(
    parentPermission: string,
    childPermission: string
  ): boolean {
    const parent = this.parsePermissionString(parentPermission);
    const child = this.parsePermissionString(childPermission);

    if (!parent || !child) return false;

    // Same permission
    if (parentPermission === childPermission) return true;

    // Manage action includes all other actions for the same resource
    if (
      parent.action === PermissionAction.MANAGE &&
      parent.resource === child.resource
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get all permissions for a role type
   */
  static getRolePermissions(roleType: RoleType): readonly string[] {
    return DEFAULT_ROLE_PERMISSIONS[roleType] || [];
  }

  /**
   * Check if a permission list includes a specific permission
   */
  static hasPermission(
    permissions: string[],
    requiredPermission: string
  ): boolean {
    return permissions.some(
      (permission) =>
        permission === requiredPermission ||
        this.permissionIncludes(permission, requiredPermission)
    );
  }

  /**
   * Get human-readable permission name
   */
  static getPermissionDisplayName(
    action: PermissionAction,
    resource: PermissionResource
  ): string {
    const actionNames = {
      [PermissionAction.CREATE]: "Create",
      [PermissionAction.READ]: "View",
      [PermissionAction.UPDATE]: "Edit",
      [PermissionAction.DELETE]: "Delete",
      [PermissionAction.EXECUTE]: "Execute",
      [PermissionAction.MANAGE]: "Manage",
    };

    const resourceNames = {
      [PermissionResource.USER]: "Users",
      [PermissionResource.RESUME]: "Resumes",
      [PermissionResource.JOB_APPLICATION]: "Job Applications",
      [PermissionResource.ADMIN_PANEL]: "Admin Panel",
      [PermissionResource.ANALYTICS]: "Analytics",
      [PermissionResource.SYSTEM_SETTINGS]: "System Settings",
      [PermissionResource.SECURITY_LOGS]: "Security Logs",
      [PermissionResource.USER_MANAGEMENT]: "User Management",
      [PermissionResource.SYSTEM_MONITORING]: "System Monitoring",
      [PermissionResource.REPORTS]: "Reports",
      [PermissionResource.AI_SERVICES]: "AI Services",
      [PermissionResource.FILE_UPLOAD]: "File Upload",
      [PermissionResource.WEBHOOKS]: "Webhooks",
      [PermissionResource.API_KEYS]: "API Keys",
      [PermissionResource.BILLING]: "Billing",
    };

    return `${actionNames[action]} ${resourceNames[resource]}`;
  }
}
