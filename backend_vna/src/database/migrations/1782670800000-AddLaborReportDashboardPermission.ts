import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLaborReportDashboardPermission1782670800000
  implements MigrationInterface
{
  name = 'AddLaborReportDashboardPermission1782670800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions"
        ("code", "name", "type", "parent_id", "sort_order")
      SELECT
        'LABOR_C_REPORT_DASHBOARD',
        'Xem dashboard điều hành báo cáo TNLĐ',
        'COMPONENT',
        parent."id",
        74
      FROM "permissions" AS parent
      WHERE parent."code" = 'LABOR_G_REPORT'
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT role."id", permission."id"
      FROM "roles" AS role
      CROSS JOIN "permissions" AS permission
      WHERE role."code" = 'ADMIN'
        AND permission."code" = 'LABOR_C_REPORT_DASHBOARD'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id"
        FROM "permissions"
        WHERE "code" = 'LABOR_C_REPORT_DASHBOARD'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" = 'LABOR_C_REPORT_DASHBOARD'
    `);
  }
}
