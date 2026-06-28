import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessReferenceCatalogPermissions1782670500000 implements MigrationInterface {
  name = 'AddBusinessReferenceCatalogPermissions1782670500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "type", "sort_order")
      VALUES
        (
          'SYSTEM_G_BUSINESS_TYPE',
          'Quản lý loại hình kinh doanh',
          'GROUP',
          26
        ),
        (
          'SYSTEM_G_INDUSTRY',
          'Quản lý ngành nghề kinh doanh',
          'GROUP',
          28
        )
      ON CONFLICT ("code") DO NOTHING
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
          (
            'SYSTEM_C_BUSINESS_TYPE_VIEW',
            'Xem loại hình kinh doanh',
            'SYSTEM_G_BUSINESS_TYPE',
            261
          ),
          (
            'SYSTEM_C_BUSINESS_TYPE_MANAGE',
            'Quản lý loại hình kinh doanh',
            'SYSTEM_G_BUSINESS_TYPE',
            262
          ),
          (
            'SYSTEM_C_INDUSTRY_VIEW',
            'Xem ngành nghề kinh doanh',
            'SYSTEM_G_INDUSTRY',
            281
          ),
          (
            'SYSTEM_C_INDUSTRY_MANAGE',
            'Quản lý ngành nghề kinh doanh',
            'SYSTEM_G_INDUSTRY',
            282
          )
      ) AS seed("code", "name", "parent_code", "sort_order")
      INNER JOIN "permissions" AS parent
        ON parent."code" = seed."parent_code"
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT role."id", permission."id"
      FROM "roles" AS role
      CROSS JOIN "permissions" AS permission
      WHERE role."code" = 'ADMIN'
        AND permission."code" IN (
          'SYSTEM_G_BUSINESS_TYPE',
          'SYSTEM_C_BUSINESS_TYPE_VIEW',
          'SYSTEM_C_BUSINESS_TYPE_MANAGE',
          'SYSTEM_G_INDUSTRY',
          'SYSTEM_C_INDUSTRY_VIEW',
          'SYSTEM_C_INDUSTRY_MANAGE'
        )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id"
        FROM "permissions"
        WHERE "code" IN (
          'SYSTEM_C_BUSINESS_TYPE_VIEW',
          'SYSTEM_C_BUSINESS_TYPE_MANAGE',
          'SYSTEM_C_INDUSTRY_VIEW',
          'SYSTEM_C_INDUSTRY_MANAGE',
          'SYSTEM_G_BUSINESS_TYPE',
          'SYSTEM_G_INDUSTRY'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN (
        'SYSTEM_C_BUSINESS_TYPE_VIEW',
        'SYSTEM_C_BUSINESS_TYPE_MANAGE',
        'SYSTEM_C_INDUSTRY_VIEW',
        'SYSTEM_C_INDUSTRY_MANAGE'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN (
        'SYSTEM_G_BUSINESS_TYPE',
        'SYSTEM_G_INDUSTRY'
      )
    `);
  }
}
