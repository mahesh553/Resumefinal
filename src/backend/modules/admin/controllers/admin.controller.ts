import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { UserRole } from "../../auth/interfaces/auth.interfaces";
import { AdminAnalyticsService } from "../services/admin-analytics.service";
import { AdminSecurityService } from "../services/admin-security.service";
import { SystemMonitoringService } from "../services/system-monitoring.service";
import { PermissionService } from "../services/permission.service";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserSearchFilters,
} from "../services/user-management.service";
import { UserManagementService } from "../services/user-management.service";
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  UpdateRolePermissionsDto,
  CheckPermissionDto,
  BulkPermissionOperationDto,
} from "../dto/permission.dto";
import { Permissions } from "../../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions.AccessAdminPanel()
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly analyticsService: AdminAnalyticsService,
    private readonly userManagementService: UserManagementService,
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly securityService: AdminSecurityService,
    private readonly permissionService: PermissionService
  ) {}

  // ===== ANALYTICS ENDPOINTS =====

  @Get("analytics/metrics")
  @Permissions.ViewAnalytics()
  @ApiOperation({ summary: "Get system metrics and statistics" })
  @ApiResponse({
    status: 200,
    description: "System metrics retrieved successfully",
  })
  async getSystemMetrics() {
    return await this.analyticsService.getSystemMetrics();
  }

  @Get("analytics/user-activity")
  @Permissions.ViewAnalytics()
  @ApiOperation({ summary: "Get user activity data over time" })
  @ApiQuery({
    name: "days",
    required: false,
    description: "Number of days to retrieve (default: 30)",
  })
  @ApiResponse({
    status: 200,
    description: "User activity data retrieved successfully",
  })
  async getUserActivityData(@Query("days") days?: number) {
    return await this.analyticsService.getUserActivityData(
      days ? parseInt(String(days)) : 30
    );
  }

  @Get("analytics/popular-features")
  @Permissions.ViewAnalytics()
  @ApiOperation({ summary: "Get popular features usage statistics" })
  @ApiResponse({
    status: 200,
    description: "Popular features data retrieved successfully",
  })
  async getPopularFeatures() {
    return await this.analyticsService.getPopularFeatures();
  }

  @Get("analytics/top-users")
  @Permissions.ViewAnalytics()
  @ApiOperation({ summary: "Get top users by activity" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of users to retrieve (default: 10)",
  })
  @ApiResponse({ status: 200, description: "Top users retrieved successfully" })
  async getTopUsers(@Query("limit") limit?: number) {
    return await this.analyticsService.getTopUsers(
      limit ? parseInt(String(limit)) : 10
    );
  }

  // ===== USER MANAGEMENT ENDPOINTS =====

  @Get("users")
  @Permissions.ViewUsers()
  @ApiOperation({ summary: "Get users with filtering and pagination" })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term for email, firstName, or lastName",
  })
  @ApiQuery({
    name: "role",
    required: false,
    enum: UserRole,
    description: "Filter by user role",
  })
  @ApiQuery({
    name: "isActive",
    required: false,
    type: Boolean,
    description: "Filter by active status",
  })
  @ApiQuery({
    name: "verified",
    required: false,
    type: Boolean,
    description: "Filter by email verification status",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20)",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    description: "Sort field (default: createdAt)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    enum: ["ASC", "DESC"],
    description: "Sort order (default: DESC)",
  })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  async getUsers(@Query() filters: UserSearchFilters) {
    return await this.userManagementService.getUsers(filters);
  }

  @Get("users/:id")
  @Permissions.ViewUsers()
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserById(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.getUserById(id);
  }

  @Get("users/:id/stats")
  @ApiOperation({ summary: "Get user statistics" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({
    status: 200,
    description: "User statistics retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserStats(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.getUserStats(id);
  }

  @Get("users/:id/activity")
  @ApiOperation({ summary: "Get user activity history" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiQuery({
    name: "days",
    required: false,
    description: "Number of days to retrieve (default: 30)",
  })
  @ApiResponse({
    status: 200,
    description: "User activity retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserActivity(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("days") days?: number
  ) {
    return await this.userManagementService.getUserActivity(
      id,
      days ? parseInt(String(days)) : 30
    );
  }

  @Post("users")
  @Permissions.CreateUser()
  @ApiOperation({ summary: "Create new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid input or user already exists",
  })
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return await this.userManagementService.createUser(createUserDto);
  }

  @Put("users/:id")
  @Permissions.UpdateUser()
  @ApiOperation({ summary: "Update user" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async updateUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto
  ) {
    return await this.userManagementService.updateUser(id, updateUserDto);
  }

  @Post("users/:id/deactivate")
  @ApiOperation({ summary: "Deactivate user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User deactivated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Cannot deactivate admin users" })
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.deactivateUser(id);
  }

  @Post("users/:id/activate")
  @ApiOperation({ summary: "Activate user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User activated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.activateUser(id);
  }

  @Delete("users/:id")
  @Permissions.DeleteUser()
  @ApiOperation({ summary: "Delete user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 204, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Cannot delete admin users" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param("id", ParseUUIDPipe) id: string) {
    await this.userManagementService.deleteUser(id);
  }

  @Post("users/:id/promote")
  @ApiOperation({ summary: "Promote user to admin" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({
    status: 200,
    description: "User promoted to admin successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  async promoteToAdmin(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.promoteToAdmin(id);
  }

  @Post("users/:id/demote")
  @ApiOperation({ summary: "Demote admin to regular user" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Admin demoted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 400,
    description: "Cannot demote the last admin user",
  })
  @HttpCode(HttpStatus.OK)
  async demoteFromAdmin(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.demoteFromAdmin(id);
  }

  @Post("users/:id/verify-email")
  @ApiOperation({ summary: "Manually verify user email" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  async verifyUserEmail(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userManagementService.verifyUserEmail(id);
  }

  @Post("users/:id/reset-password")
  @ApiOperation({ summary: "Reset user password" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("newPassword") newPassword: string
  ) {
    return await this.userManagementService.resetUserPassword(id, newPassword);
  }

  // ===== SYSTEM MONITORING ENDPOINTS =====

  @Get("system/health")
  @ApiOperation({ summary: "Get comprehensive system health status" })
  @ApiResponse({
    status: 200,
    description: "System health retrieved successfully",
  })
  async getSystemHealth() {
    return await this.systemMonitoringService.getSystemHealth();
  }

  @Get("system/performance")
  @ApiOperation({ summary: "Get performance metrics history" })
  @ApiQuery({
    name: "hours",
    required: false,
    description: "Number of hours to retrieve (default: 24)",
  })
  @ApiResponse({
    status: 200,
    description: "Performance metrics retrieved successfully",
  })
  async getPerformanceHistory(@Query("hours") hours?: number) {
    return await this.systemMonitoringService.getPerformanceHistory(
      hours ? parseInt(String(hours)) : 24
    );
  }

  @Get("system/errors")
  @ApiOperation({ summary: "Get recent system errors" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of errors to retrieve (default: 10)",
  })
  @ApiResponse({
    status: 200,
    description: "Recent errors retrieved successfully",
  })
  async getRecentErrors(@Query("limit") limit?: number) {
    return this.systemMonitoringService.getRecentErrors(
      limit ? parseInt(String(limit)) : 10
    );
  }

  @Get("system/warnings")
  @ApiOperation({ summary: "Get recent system warnings" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of warnings to retrieve (default: 10)",
  })
  @ApiResponse({
    status: 200,
    description: "Recent warnings retrieved successfully",
  })
  async getRecentWarnings(@Query("limit") limit?: number) {
    return this.systemMonitoringService.getRecentWarnings(
      limit ? parseInt(String(limit)) : 10
    );
  }

  // ===== SECURITY ENDPOINTS =====

  @Get("security/events")
  @ApiOperation({ summary: "Get security events with filtering" })
  @ApiQuery({
    name: "severity",
    required: false,
    description: "Filter by severity level",
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter by event type",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Maximum number of events to return (default: 50)",
  })
  @ApiResponse({
    status: 200,
    description: "Security events retrieved successfully",
  })
  async getSecurityEvents(
    @Query("severity") severity?: string,
    @Query("type") type?: string,
    @Query("limit") limit?: number
  ) {
    const filters = {
      severity,
      type,
      limit: limit ? parseInt(String(limit)) : 50,
    };
    const events = await this.securityService.getSecurityEvents(filters);
    return { data: events };
  }

  @Get("security/sessions")
  @ApiOperation({ summary: "Get active user sessions" })
  @ApiResponse({
    status: 200,
    description: "Active sessions retrieved successfully",
  })
  async getActiveSessions() {
    const sessions = await this.securityService.getActiveSessions();
    return { data: sessions };
  }

  @Get("security/settings")
  @ApiOperation({ summary: "Get current security settings" })
  @ApiResponse({
    status: 200,
    description: "Security settings retrieved successfully",
  })
  async getSecuritySettings() {
    const settings = await this.securityService.getSecuritySettings();
    return { data: settings };
  }

  @Get("security/stats")
  @ApiOperation({ summary: "Get security statistics" })
  @ApiResponse({
    status: 200,
    description: "Security statistics retrieved successfully",
  })
  async getSecurityStats() {
    const stats = await this.securityService.getSecurityStats();
    return { data: stats };
  }

  @Put("security/settings")
  @ApiOperation({ summary: "Update security settings" })
  @ApiResponse({
    status: 200,
    description: "Security settings updated successfully",
  })
  @HttpCode(HttpStatus.OK)
  async updateSecuritySettings(@Body() updates: any) {
    const updatedSettings =
      await this.securityService.updateSecuritySettings(updates);
    return { data: updatedSettings };
  }

  @Post("security/sessions/:id/terminate")
  @ApiOperation({ summary: "Terminate a user session" })
  @ApiParam({ name: "id", description: "Session ID" })
  @ApiResponse({
    status: 200,
    description: "Session terminated successfully",
  })
  @HttpCode(HttpStatus.OK)
  async terminateSession(@Param("id") sessionId: string) {
    await this.securityService.terminateSession(sessionId);
    return { message: "Session terminated successfully" };
  }

  @Post("security/scan")
  @Permissions.ManageSecurityLogs()
  @ApiOperation({ summary: "Run security scan" })
  @ApiResponse({
    status: 200,
    description: "Security scan initiated successfully",
  })
  @HttpCode(HttpStatus.OK)
  async runSecurityScan() {
    await this.securityService.runSecurityScan();
    return { message: "Security scan completed successfully" };
  }

  // ===== PERMISSION MANAGEMENT ENDPOINTS =====

  @Get("permissions")
  @Permissions.ManageSystemSettings()
  @ApiOperation({ summary: "Get all permissions with optional filtering" })
  @ApiQuery({ name: "action", required: false, description: "Filter by action" })
  @ApiQuery({ name: "resource", required: false, description: "Filter by resource" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean, description: "Filter by active status" })
  @ApiResponse({ status: 200, description: "Permissions retrieved successfully" })
  async getPermissions(
    @Query("action") action?: string,
    @Query("resource") resource?: string,
    @Query("isActive") isActive?: boolean
  ) {
    const filters: any = {};
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (isActive !== undefined) filters.isActive = isActive;
    
    const permissions = await this.permissionService.getPermissions(filters);
    return { data: permissions };
  }

  @Get("permissions/:id")
  @Permissions.ManageSystemSettings()
  @ApiOperation({ summary: "Get permission by ID" })
  @ApiParam({ name: "id", description: "Permission UUID" })
  @ApiResponse({ status: 200, description: "Permission retrieved successfully" })
  @ApiResponse({ status: 404, description: "Permission not found" })
  async getPermissionById(@Param("id", ParseUUIDPipe) id: string) {
    const permission = await this.permissionService.getPermissionById(id);
    return { data: permission };
  }

  @Post("permissions")
  @Permissions.ManageSystemSettings()
  @ApiOperation({ summary: "Create new permission" })
  @ApiResponse({ status: 201, description: "Permission created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input or permission already exists" })
  async createPermission(@Body(ValidationPipe) createPermissionDto: CreatePermissionDto) {
    const permission = await this.permissionService.createPermission(createPermissionDto);
    return { data: permission };
  }

  @Put("permissions/:id")
  @Permissions.ManageSystemSettings()
  @ApiOperation({ summary: "Update permission" })
  @ApiParam({ name: "id", description: "Permission UUID" })
  @ApiResponse({ status: 200, description: "Permission updated successfully" })
  @ApiResponse({ status: 404, description: "Permission not found" })
  async updatePermission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updatePermissionDto: UpdatePermissionDto
  ) {
    const permission = await this.permissionService.updatePermission(id, updatePermissionDto);
    return { data: permission };
  }

  @Delete("permissions/:id")
  @Permissions.ManageSystemSettings()
  @ApiOperation({ summary: "Delete permission" })
  @ApiParam({ name: "id", description: "Permission UUID" })
  @ApiResponse({ status: 204, description: "Permission deleted successfully" })
  @ApiResponse({ status: 404, description: "Permission not found" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param("id", ParseUUIDPipe) id: string) {
    await this.permissionService.deletePermission(id);
  }

  // ===== ROLE MANAGEMENT ENDPOINTS =====

  @Get("roles")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Get all roles with optional filtering" })
  @ApiQuery({ name: "type", required: false, description: "Filter by role type" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean, description: "Filter by active status" })
  @ApiQuery({ name: "isSystemRole", required: false, type: Boolean, description: "Filter by system role status" })
  @ApiResponse({ status: 200, description: "Roles retrieved successfully" })
  async getRoles(
    @Query("type") type?: string,
    @Query("isActive") isActive?: boolean,
    @Query("isSystemRole") isSystemRole?: boolean
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive;
    if (isSystemRole !== undefined) filters.isSystemRole = isSystemRole;
    
    const roles = await this.permissionService.getRoles(filters);
    return { data: roles };
  }

  @Get("roles/:id")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Get role by ID" })
  @ApiParam({ name: "id", description: "Role UUID" })
  @ApiResponse({ status: 200, description: "Role retrieved successfully" })
  @ApiResponse({ status: 404, description: "Role not found" })
  async getRoleById(@Param("id", ParseUUIDPipe) id: string) {
    const role = await this.permissionService.getRoleById(id);
    return { data: role };
  }

  @Post("roles")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Create new role" })
  @ApiResponse({ status: 201, description: "Role created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input or role already exists" })
  async createRole(@Body(ValidationPipe) createRoleDto: CreateRoleDto) {
    const role = await this.permissionService.createRole(createRoleDto);
    return { data: role };
  }

  @Put("roles/:id")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Update role" })
  @ApiParam({ name: "id", description: "Role UUID" })
  @ApiResponse({ status: 200, description: "Role updated successfully" })
  @ApiResponse({ status: 404, description: "Role not found" })
  async updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRoleDto: UpdateRoleDto
  ) {
    const role = await this.permissionService.updateRole(id, updateRoleDto);
    return { data: role };
  }

  @Delete("roles/:id")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Delete role" })
  @ApiParam({ name: "id", description: "Role UUID" })
  @ApiResponse({ status: 204, description: "Role deleted successfully" })
  @ApiResponse({ status: 400, description: "Cannot delete system role or role with users" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param("id", ParseUUIDPipe) id: string) {
    await this.permissionService.deleteRole(id);
  }

  @Put("roles/:id/permissions")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Update role permissions" })
  @ApiParam({ name: "id", description: "Role UUID" })
  @ApiResponse({ status: 200, description: "Role permissions updated successfully" })
  @ApiResponse({ status: 404, description: "Role not found" })
  async updateRolePermissions(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateRolePermissionsDto
  ) {
    const role = await this.permissionService.updateRolePermissions(id, updateDto);
    return { data: role };
  }

  @Post("users/:userId/assign-role")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Assign role to user" })
  @ApiParam({ name: "userId", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Role assigned successfully" })
  @ApiResponse({ status: 404, description: "User or role not found" })
  @HttpCode(HttpStatus.OK)
  async assignRoleToUser(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) assignRoleDto: Omit<AssignRoleDto, 'userId'>
  ) {
    const fullDto = { ...assignRoleDto, userId };
    const user = await this.permissionService.assignRoleToUser(fullDto);
    return { data: user };
  }

  @Delete("users/:userId/role")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Remove role from user" })
  @ApiParam({ name: "userId", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Role removed successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  async removeRoleFromUser(@Param("userId", ParseUUIDPipe) userId: string) {
    const user = await this.permissionService.removeRoleFromUser(userId);
    return { data: user };
  }

  @Post("permissions/check/:userId")
  @Permissions.ViewUsers()
  @ApiOperation({ summary: "Check user permission" })
  @ApiParam({ name: "userId", description: "User UUID" })
  @ApiResponse({ status: 200, description: "Permission check completed" })
  @HttpCode(HttpStatus.OK)
  async checkUserPermission(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) checkPermissionDto: CheckPermissionDto
  ) {
    const result = await this.permissionService.checkUserPermission(userId, checkPermissionDto);
    return { data: result };
  }

  @Post("permissions/bulk-operation")
  @Permissions.ManageUsers()
  @ApiOperation({ summary: "Bulk permission operation" })
  @ApiResponse({ status: 200, description: "Bulk operation completed" })
  @HttpCode(HttpStatus.OK)
  async bulkPermissionOperation(@Body(ValidationPipe) bulkOperationDto: BulkPermissionOperationDto) {
    const result = await this.permissionService.bulkPermissionOperation(bulkOperationDto);
    return { data: result };
  }

  @Post("setup/initialize-roles")
  @Permissions.SuperAdminOnly()
  @ApiOperation({ summary: "Initialize system roles" })
  @ApiResponse({ status: 200, description: "System roles initialized" })
  @HttpCode(HttpStatus.OK)
  async initializeSystemRoles() {
    await this.permissionService.initializeSystemRoles();
    return { message: "System roles initialized successfully" };
  }

  @Post("setup/seed-permissions")
  @Permissions.SuperAdminOnly()
  @ApiOperation({ summary: "Seed system permissions" })
  @ApiResponse({ status: 200, description: "Permissions seeded" })
  @HttpCode(HttpStatus.OK)
  async seedPermissions() {
    await this.permissionService.seedPermissions();
    return { message: "Permissions seeded successfully" };
  }
}
