import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JobApplication } from "../../database/entities/job-application.entity";
import { User } from "../../database/entities/user.entity";
import { Permission } from "../../database/entities/permission.entity";
import { Role } from "../../database/entities/role.entity";
import { AdminController } from "./controllers/admin.controller";
import { AdminAnalyticsService } from "./services/admin-analytics.service";
import { AdminSecurityService } from "./services/admin-security.service";
import { SystemMonitoringService } from "./services/system-monitoring.service";
import { UserManagementService } from "./services/user-management.service";
import { PermissionService } from "./services/permission.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      JobApplication,
      Permission,
      Role,
      // Add other entities as needed
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminAnalyticsService,
    UserManagementService,
    SystemMonitoringService,
    AdminSecurityService,
    PermissionService,
  ],
  exports: [
    AdminAnalyticsService,
    UserManagementService,
    SystemMonitoringService,
    AdminSecurityService,
    PermissionService,
  ],
})
export class AdminModule {}
