import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IPermissionContext } from "../../../shared/interfaces/permission.interfaces";
import {
  PermissionAction,
  PermissionResource,
} from "../../database/entities/permission.entity";
import { PermissionService } from "../../modules/admin/services/permission.service";
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
} from "../decorators/permissions.decorator";

interface PermissionMetadata {
  permissions: PermissionRequirement[];
  operator: "AND" | "OR";
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    roleId?: string;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from decorator
    const permissionMetadata =
      this.reflector.getAllAndOverride<PermissionMetadata>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no permissions required, allow access
    if (!permissionMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      this.logger.warn("Permission check failed: No authenticated user");
      throw new UnauthorizedException("Authentication required");
    }

    try {
      // Build permission context
      const permissionContext: IPermissionContext = {
        user: {
          id: user.id,
          role: user.role,
          permissions: [],
        },
        request: {
          ip: request.ip || "unknown",
          userAgent: request.get("User-Agent") || "unknown",
          method: request.method,
          path: request.path,
        },
      };

      // Check each permission requirement
      const permissionChecks = await Promise.all(
        permissionMetadata.permissions.map(async (requirement) => {
          const result = await this.permissionService.checkUserPermission(
            user.id,
            {
              action: requirement.action,
              resource: requirement.resource,
            },
            permissionContext
          );

          this.logger.debug(
            `Permission check for user ${user.id}: ${requirement.action}:${requirement.resource} = ${result.granted}`
          );

          return result.granted;
        })
      );

      // Apply operator logic
      let hasAccess = false;
      if (permissionMetadata.operator === "OR") {
        hasAccess = permissionChecks.some((check: boolean) => check === true);
      } else {
        // Default to AND
        hasAccess = permissionChecks.every((check: boolean) => check === true);
      }

      if (!hasAccess) {
        const requiredPermissions = permissionMetadata.permissions
          .map((p) => `${p.action}:${p.resource}`)
          .join(` ${permissionMetadata.operator} `);

        this.logger.warn(
          `Permission denied for user ${user.id} (${user.email}): Required ${requiredPermissions}`
        );

        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions}`
        );
      }

      this.logger.debug(
        `Permission granted for user ${user.id} (${user.email})`
      );
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error("Permission check failed with error:", error);
      throw new ForbiddenException("Permission validation failed");
    }
  }
}

// Specialized guard for admin-only access
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  private readonly logger = new Logger(AdminOnlyGuard.name);

  constructor(private readonly permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    // Check if user has admin panel access
    const result = await this.permissionService.checkUserPermission(user.id, {
      action: PermissionAction.READ,
      resource: PermissionResource.ADMIN_PANEL,
    });

    if (!result.granted) {
      this.logger.warn(
        `Admin access denied for user ${user.id} (${user.email})`
      );
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}

// Guard for resource ownership checks
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);

  constructor(private readonly permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    // Get resource ID from request parameters
    const resourceId = request.params.id;
    const resourceType = this.getResourceTypeFromPath(request.path);

    if (!resourceId || !resourceType) {
      // If we can't determine ownership, fall back to regular permission check
      return true;
    }

    try {
      // Check if user owns the resource or has manage permissions
      const hasManagePermission =
        await this.permissionService.checkUserPermission(user.id, {
          action: PermissionAction.MANAGE,
          resource: resourceType as PermissionResource,
        });

      if (hasManagePermission.granted) {
        // User has manage permissions, allow access
        return true;
      }

      // TODO: Implement actual ownership check based on resource type
      // This would require querying the specific resource to check if user.id matches the owner field

      this.logger.debug(
        `Resource ownership check for user ${user.id}, resource ${resourceType}:${resourceId}`
      );
      return true; // Placeholder - implement actual ownership logic
    } catch (error) {
      this.logger.error("Resource ownership check failed:", error);
      throw new ForbiddenException("Resource access validation failed");
    }
  }

  private getResourceTypeFromPath(path: string): PermissionResource | null {
    // Extract resource type from API path
    const pathSegments = path
      .split("/")
      .filter((segment) => segment.length > 0);

    if (pathSegments.includes("resumes")) return PermissionResource.RESUME;
    if (pathSegments.includes("job-applications"))
      return PermissionResource.JOB_APPLICATION;
    if (pathSegments.includes("users")) return PermissionResource.USER;

    return null;
  }
}

// Guard for rate-limited actions
@Injectable()
export class RateLimitedPermissionGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitedPermissionGuard.name);
  private readonly actionCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    // Get rate limit configuration from decorator metadata
    const rateLimit = this.reflector.get<{ limit: number; windowMs: number }>(
      "rateLimit",
      context.getHandler()
    );

    if (rateLimit) {
      const key = `${user.id}:${request.path}`;
      const now = Date.now();
      const userLimit = this.actionCounts.get(key);

      if (userLimit) {
        if (now < userLimit.resetTime) {
          if (userLimit.count >= rateLimit.limit) {
            this.logger.warn(
              `Rate limit exceeded for user ${user.id} on ${request.path}`
            );
            throw new ForbiddenException("Rate limit exceeded");
          }
          userLimit.count++;
        } else {
          // Reset window
          this.actionCounts.set(key, {
            count: 1,
            resetTime: now + rateLimit.windowMs,
          });
        }
      } else {
        // First request
        this.actionCounts.set(key, {
          count: 1,
          resetTime: now + rateLimit.windowMs,
        });
      }
    }

    return true;
  }
}
