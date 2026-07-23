import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillRejectAuditActor1782671000000
  implements MigrationInterface
{
  name = 'BackfillRejectAuditActor1782671000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH admin_user AS (
        SELECT
          "users"."id",
          COALESCE("users"."full_name", "users"."username", 'Quản trị viên') AS "actor_name"
        FROM "users"
        INNER JOIN "user_roles"
          ON "user_roles"."user_id" = "users"."id"
        INNER JOIN "roles"
          ON "roles"."id" = "user_roles"."role_id"
        WHERE "roles"."code" = 'ADMIN'
        ORDER BY "users"."id" ASC
        LIMIT 1
      )
      UPDATE "labor_accident_report_audit_logs" AS "audit"
      SET
        "actor_user_id" = "admin_user"."id",
        "actor_name_snapshot" = "admin_user"."actor_name",
        "actor_role_snapshot" = 'Sở',
        "message" = "admin_user"."actor_name" || ' đã từ chối báo cáo',
        "metadata" = COALESCE("audit"."metadata", '{}'::jsonb)
          || jsonb_build_object('isBackfilled', true, 'actorBackfilledFromAdmin', true)
      FROM "admin_user"
      WHERE "audit"."action" = 'REJECT'
        AND (
          "audit"."actor_user_id" IS NULL
          OR "audit"."actor_name_snapshot" IS NULL
          OR "audit"."actor_name_snapshot" = 'Không xác định'
        )
        AND COALESCE(("audit"."metadata"->>'actorBackfilledFromAdmin')::boolean, false) = false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "labor_accident_report_audit_logs"
      SET
        "actor_user_id" = NULL,
        "actor_name_snapshot" = 'Không xác định',
        "actor_role_snapshot" = 'Sở',
        "message" = 'Không xác định đã từ chối báo cáo',
        "metadata" = COALESCE("metadata", '{}'::jsonb) - 'actorBackfilledFromAdmin'
      WHERE "action" = 'REJECT'
        AND "metadata"->>'actorBackfilledFromAdmin' = 'true'
    `);
  }
}
