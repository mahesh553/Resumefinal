import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreatePermissionTables1672531200000 implements MigrationInterface {
  name = "CreatePermissionTables1672531200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.createTable(
      new Table({
        name: "permissions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "action",
            type: "enum",
            enum: ["create", "read", "update", "delete", "execute", "manage"],
          },
          {
            name: "resource",
            type: "enum",
            enum: [
              "user",
              "resume",
              "job_application",
              "admin_panel",
              "analytics",
              "system_settings",
              "security_logs",
              "user_management",
              "system_monitoring",
              "reports",
              "ai_services",
              "file_upload",
              "webhooks",
              "api_keys",
              "billing",
            ],
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "conditions",
            type: "json",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Create unique index on action + resource combination
    await queryRunner.createIndex(
      "permissions",
      new TableIndex({
        name: "IDX_permission_action_resource",
        columnNames: ["action", "resource"],
        isUnique: true,
      })
    );

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: "roles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
            isUnique: true,
          },
          {
            name: "displayName",
            type: "varchar",
            length: "255",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "type",
            type: "enum",
            enum: [
              "super_admin",
              "admin",
              "moderator",
              "user",
              "guest",
              "custom",
            ],
            default: "'custom'",
          },
          {
            name: "scope",
            type: "enum",
            enum: ["global", "organization", "department", "project"],
            default: "'global'",
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "isDefault",
            type: "boolean",
            default: false,
          },
          {
            name: "isSystemRole",
            type: "boolean",
            default: false,
          },
          {
            name: "priority",
            type: "int",
            default: 0,
          },
          {
            name: "metadata",
            type: "json",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Create role_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: "role_permissions",
        columns: [
          {
            name: "role_id",
            type: "uuid",
          },
          {
            name: "permission_id",
            type: "uuid",
          },
        ],
      }),
      true
    );

    // Create primary key on junction table
    await queryRunner.createPrimaryKey("role_permissions", [
      "role_id",
      "permission_id",
    ]);

    // Create foreign keys for junction table
    await queryRunner.createForeignKey(
      "role_permissions",
      new TableForeignKey({
        name: "FK_role_permissions_role",
        columnNames: ["role_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "roles",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "role_permissions",
      new TableForeignKey({
        name: "FK_role_permissions_permission",
        columnNames: ["permission_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "permissions",
        onDelete: "CASCADE",
      })
    );

    // Add role_id column to users table
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "role_id",
        type: "uuid",
        isNullable: true,
      })
    );

    // Create foreign key from users to roles
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        name: "FK_users_role",
        columnNames: ["role_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "roles",
        onDelete: "SET NULL",
      })
    );

    // Create index on users.role_id
    await queryRunner.createIndex(
      "users",
      new TableIndex({
        name: "IDX_user_role_id",
        columnNames: ["role_id"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key and column from users table
    const userTable = await queryRunner.getTable("users");
    if (userTable) {
      const roleForeignKey = userTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("role_id") !== -1
      );
      if (roleForeignKey) {
        await queryRunner.dropForeignKey("users", roleForeignKey);
      }
      await queryRunner.dropColumn("users", "role_id");
    }

    // Drop role_permissions junction table
    await queryRunner.dropTable("role_permissions");

    // Drop roles table
    await queryRunner.dropTable("roles");

    // Drop permissions table
    await queryRunner.dropTable("permissions");
  }
}
