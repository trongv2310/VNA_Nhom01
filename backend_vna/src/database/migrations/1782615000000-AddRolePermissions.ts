import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolePermissions1782615000000 implements MigrationInterface {
  name = 'AddRolePermissions1782615000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "is_system" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "scope" character varying(20) NOT NULL DEFAULT 'DEPARTMENT'
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET
        "is_system" = true,
        "scope" = CASE
          WHEN "code" = 'USER' THEN 'LEGACY'
          ELSE 'DEPARTMENT'
        END
      WHERE "code" IN ('ADMIN', 'USER')
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD CONSTRAINT "CHK_roles_scope"
      CHECK ("scope" IN ('DEPARTMENT', 'BUSINESS', 'LEGACY'))
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" SERIAL NOT NULL,
        "code" character varying(80) NOT NULL,
        "name" character varying(150) NOT NULL,
        "type" character varying(20) NOT NULL,
        "parent_id" integer,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code"),
        CONSTRAINT "CHK_permissions_type" CHECK ("type" IN ('GROUP', 'COMPONENT')),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_permissions_parent"
          FOREIGN KEY ("parent_id") REFERENCES "permissions"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_permissions_parent_id"
      ON "permissions" ("parent_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" SERIAL NOT NULL,
        "role_id" integer NOT NULL,
        "permission_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_permissions_role_permission"
          UNIQUE ("role_id", "permission_id"),
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_role_permissions_role"
          FOREIGN KEY ("role_id") REFERENCES "roles"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_role_permissions_permission"
          FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_role_id"
      ON "role_permissions" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_permission_id"
      ON "role_permissions" ("permission_id")
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "type", "sort_order")
      VALUES
        ('SYSTEM_G_USER', 'Quản lý người dùng', 'GROUP', 10),
        ('SYSTEM_G_BUSINESS', 'Quản lý doanh nghiệp', 'GROUP', 20),
        ('SYSTEM_G_ROLE', 'Quản lý vai trò', 'GROUP', 30),
        ('SYSTEM_G_PERMISSION', 'Quản lý quyền', 'GROUP', 40),
        ('SYSTEM_G_REPORT_PERIOD', 'Quản lý kỳ báo cáo', 'GROUP', 50),
        ('LABOR_G_CATALOG', 'Danh mục tai nạn lao động', 'GROUP', 60),
        ('LABOR_G_REPORT', 'Báo cáo tai nạn lao động cấp Sở', 'GROUP', 70),
        ('BUSINESS_G_PROFILE', 'Thông tin doanh nghiệp', 'GROUP', 80),
        ('BUSINESS_G_REPORT', 'Báo cáo tai nạn lao động doanh nghiệp', 'GROUP', 90)
    `);

    await queryRunner.query(`
      INSERT INTO "permissions"
        ("code", "name", "type", "parent_id", "sort_order")
      SELECT
        seed."code",
        seed."name",
        'COMPONENT',
        parent."id",
        seed."sort_order"
      FROM (
        VALUES
          ('SYSTEM_C_USER_VIEW', 'Xem người dùng', 'SYSTEM_G_USER', 11),
          ('SYSTEM_C_USER_CREATE', 'Thêm người dùng', 'SYSTEM_G_USER', 12),
          ('SYSTEM_C_USER_UPDATE', 'Cập nhật người dùng', 'SYSTEM_G_USER', 13),
          ('SYSTEM_C_USER_DELETE', 'Xóa người dùng', 'SYSTEM_G_USER', 14),
          ('SYSTEM_C_USER_RESET_PASSWORD', 'Đặt lại mật khẩu người dùng', 'SYSTEM_G_USER', 15),

          ('SYSTEM_C_BUSINESS_VIEW', 'Xem doanh nghiệp', 'SYSTEM_G_BUSINESS', 21),
          ('SYSTEM_C_BUSINESS_CREATE', 'Thêm doanh nghiệp', 'SYSTEM_G_BUSINESS', 22),
          ('SYSTEM_C_BUSINESS_UPDATE', 'Cập nhật doanh nghiệp', 'SYSTEM_G_BUSINESS', 23),
          ('SYSTEM_C_BUSINESS_DELETE', 'Xóa doanh nghiệp', 'SYSTEM_G_BUSINESS', 24),
          ('SYSTEM_C_BUSINESS_STATUS', 'Thay đổi trạng thái doanh nghiệp', 'SYSTEM_G_BUSINESS', 25),

          ('SYSTEM_C_ROLE_VIEW', 'Xem vai trò', 'SYSTEM_G_ROLE', 31),
          ('SYSTEM_C_ROLE_CREATE', 'Thêm vai trò', 'SYSTEM_G_ROLE', 32),
          ('SYSTEM_C_ROLE_UPDATE', 'Cập nhật vai trò', 'SYSTEM_G_ROLE', 33),
          ('SYSTEM_C_ROLE_DELETE', 'Xóa vai trò', 'SYSTEM_G_ROLE', 34),

          ('SYSTEM_C_PERMISSION_VIEW', 'Xem danh sách quyền', 'SYSTEM_G_PERMISSION', 41),

          ('SYSTEM_C_REPORT_PERIOD_VIEW', 'Xem kỳ báo cáo', 'SYSTEM_G_REPORT_PERIOD', 51),
          ('SYSTEM_C_REPORT_PERIOD_CREATE', 'Thêm kỳ báo cáo', 'SYSTEM_G_REPORT_PERIOD', 52),
          ('SYSTEM_C_REPORT_PERIOD_UPDATE', 'Cập nhật kỳ báo cáo', 'SYSTEM_G_REPORT_PERIOD', 53),
          ('SYSTEM_C_REPORT_PERIOD_STATUS', 'Thay đổi trạng thái kỳ báo cáo', 'SYSTEM_G_REPORT_PERIOD', 54),

          ('LABOR_C_CATALOG_VIEW', 'Xem danh mục tai nạn lao động', 'LABOR_G_CATALOG', 61),
          ('LABOR_C_CATALOG_MANAGE', 'Quản lý danh mục tai nạn lao động', 'LABOR_G_CATALOG', 62),

          ('LABOR_C_REPORT_VIEW', 'Xem báo cáo cấp Sở', 'LABOR_G_REPORT', 71),
          ('LABOR_C_REPORT_RECEIVE', 'Tiếp nhận hoặc từ chối báo cáo', 'LABOR_G_REPORT', 72),
          ('LABOR_C_REPORT_EXPORT', 'Xuất báo cáo cấp Sở', 'LABOR_G_REPORT', 73),

          ('BUSINESS_C_PROFILE_VIEW', 'Xem thông tin doanh nghiệp', 'BUSINESS_G_PROFILE', 81),
          ('BUSINESS_C_PROFILE_UPDATE', 'Cập nhật thông tin doanh nghiệp', 'BUSINESS_G_PROFILE', 82),

          ('BUSINESS_C_REPORT_VIEW', 'Xem báo cáo doanh nghiệp', 'BUSINESS_G_REPORT', 91),
          ('BUSINESS_C_REPORT_CREATE', 'Tạo báo cáo doanh nghiệp', 'BUSINESS_G_REPORT', 92),
          ('BUSINESS_C_REPORT_UPDATE', 'Cập nhật báo cáo doanh nghiệp', 'BUSINESS_G_REPORT', 93),
          ('BUSINESS_C_REPORT_SUBMIT', 'Nộp báo cáo doanh nghiệp', 'BUSINESS_G_REPORT', 94),
          ('BUSINESS_C_REPORT_EXPORT', 'Xuất báo cáo doanh nghiệp', 'BUSINESS_G_REPORT', 95)
      ) AS seed("code", "name", "parent_code", "sort_order")
      INNER JOIN "permissions" AS parent
        ON parent."code" = seed."parent_code"
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT role."id", permission."id"
      FROM "roles" AS role
      CROSS JOIN "permissions" AS permission
      WHERE role."code" = 'ADMIN'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP CONSTRAINT "CHK_roles_scope"
    `);
    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN "scope"
    `);
    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN "is_system"
    `);
  }
}
