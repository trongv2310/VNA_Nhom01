import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLaborReportAuditLogs1782670900000
  implements MigrationInterface
{
  name = 'AddLaborReportAuditLogs1782670900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "labor_accident_report_audit_logs" (
        "id" SERIAL NOT NULL,
        "report_id" integer NOT NULL,
        "action" character varying(40) NOT NULL,
        "old_status" character varying(20),
        "new_status" character varying(20),
        "actor_user_id" integer,
        "actor_name_snapshot" character varying(150),
        "actor_role_snapshot" character varying(150),
        "message" text,
        "reason" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_labor_accident_report_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lar_audit_report"
          FOREIGN KEY ("report_id")
          REFERENCES "labor_accident_reports"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_lar_audit_actor_user"
          FOREIGN KEY ("actor_user_id")
          REFERENCES "users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lar_audit_report_created_at"
      ON "labor_accident_report_audit_logs" ("report_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lar_audit_actor_user_id"
      ON "labor_accident_report_audit_logs" ("actor_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lar_audit_action"
      ON "labor_accident_report_audit_logs" ("action")
    `);

    await queryRunner.query(`
      INSERT INTO "permissions"
        ("code", "name", "type", "parent_id", "sort_order")
      SELECT
        'LABOR_C_REPORT_AUDIT_VIEW',
        'Xem lịch sử xử lý báo cáo TNLĐ',
        'COMPONENT',
        parent."id",
        75
      FROM "permissions" AS parent
      WHERE parent."code" = 'LABOR_G_REPORT'
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT DISTINCT role."id", audit_permission."id"
      FROM "roles" AS role
      CROSS JOIN "permissions" AS audit_permission
      LEFT JOIN "role_permissions" AS view_role_permission
        ON view_role_permission."role_id" = role."id"
      LEFT JOIN "permissions" AS view_permission
        ON view_permission."id" = view_role_permission."permission_id"
      WHERE audit_permission."code" = 'LABOR_C_REPORT_AUDIT_VIEW'
        AND (
          role."code" = 'ADMIN'
          OR view_permission."code" = 'LABOR_C_REPORT_VIEW'
        )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "labor_accident_report_audit_logs"
        (
          "report_id",
          "action",
          "old_status",
          "new_status",
          "actor_user_id",
          "actor_name_snapshot",
          "actor_role_snapshot",
          "message",
          "metadata",
          "created_at"
        )
      SELECT
        report."id",
        'CREATE_DRAFT',
        NULL,
        'DRAFT',
        report."created_by_user_id",
        COALESCE(
          created_user."full_name",
          created_user."username",
          business."business_name",
          'Doanh nghiệp'
        ),
        CASE
          WHEN created_user."account_type" = 'BUSINESS' THEN 'Doanh nghiệp'
          WHEN created_user."account_type" = 'DEPARTMENT' THEN 'Sở'
          ELSE 'Không xác định'
        END,
        COALESCE(
          created_user."full_name",
          created_user."username",
          business."business_name",
          'Doanh nghiệp'
        ) || ' đã tạo nháp báo cáo',
        jsonb_build_object('isBackfilled', true),
        report."created_at"
      FROM "labor_accident_reports" AS report
      LEFT JOIN "users" AS created_user
        ON created_user."id" = report."created_by_user_id"
      LEFT JOIN "businesses" AS business
        ON business."id" = report."business_id"
    `);

    await queryRunner.query(`
      INSERT INTO "labor_accident_report_audit_logs"
        (
          "report_id",
          "action",
          "old_status",
          "new_status",
          "actor_user_id",
          "actor_name_snapshot",
          "actor_role_snapshot",
          "message",
          "metadata",
          "created_at"
        )
      SELECT
        report."id",
        'SUBMIT',
        'DRAFT',
        'SUBMITTED',
        report."submitted_by_user_id",
        COALESCE(
          submitted_user."full_name",
          submitted_user."username",
          business."business_name",
          'Doanh nghiệp'
        ),
        CASE
          WHEN submitted_user."account_type" = 'BUSINESS' THEN 'Doanh nghiệp'
          WHEN submitted_user."account_type" = 'DEPARTMENT' THEN 'Sở'
          ELSE 'Không xác định'
        END,
        COALESCE(
          submitted_user."full_name",
          submitted_user."username",
          business."business_name",
          'Doanh nghiệp'
        ) || ' đã gửi báo cáo',
        jsonb_build_object('isBackfilled', true),
        report."submitted_at"
      FROM "labor_accident_reports" AS report
      LEFT JOIN "users" AS submitted_user
        ON submitted_user."id" = report."submitted_by_user_id"
      LEFT JOIN "businesses" AS business
        ON business."id" = report."business_id"
      WHERE report."submitted_at" IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "labor_accident_report_audit_logs"
        (
          "report_id",
          "action",
          "old_status",
          "new_status",
          "actor_user_id",
          "actor_name_snapshot",
          "actor_role_snapshot",
          "message",
          "metadata",
          "created_at"
        )
      SELECT
        report."id",
        'RECEIVE',
        'SUBMITTED',
        'RECEIVED',
        report."received_by_user_id",
        COALESCE(
          received_user."full_name",
          received_user."username",
          'Sở'
        ),
        CASE
          WHEN received_user."account_type" = 'BUSINESS' THEN 'Doanh nghiệp'
          WHEN received_user."account_type" = 'DEPARTMENT' THEN 'Sở'
          ELSE 'Sở'
        END,
        COALESCE(
          received_user."full_name",
          received_user."username",
          'Sở'
        ) || ' đã tiếp nhận báo cáo',
        jsonb_build_object('isBackfilled', true),
        report."received_at"
      FROM "labor_accident_reports" AS report
      LEFT JOIN "users" AS received_user
        ON received_user."id" = report."received_by_user_id"
      WHERE report."status" = 'RECEIVED'
        AND report."received_at" IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "labor_accident_report_audit_logs"
        (
          "report_id",
          "action",
          "old_status",
          "new_status",
          "actor_user_id",
          "actor_name_snapshot",
          "actor_role_snapshot",
          "message",
          "reason",
          "metadata",
          "created_at"
        )
      SELECT
        report."id",
        'REJECT',
        'SUBMITTED',
        'REJECTED',
        NULL,
        'Không xác định',
        'Sở',
        'Không xác định đã từ chối báo cáo',
        report."reject_reason",
        jsonb_build_object('isBackfilled', true),
        report."updated_at"
      FROM "labor_accident_reports" AS report
      WHERE report."status" = 'REJECTED'
        AND report."reject_reason" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id"
        FROM "permissions"
        WHERE "code" = 'LABOR_C_REPORT_AUDIT_VIEW'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" = 'LABOR_C_REPORT_AUDIT_VIEW'
    `);

    await queryRunner.query(`DROP INDEX "IDX_lar_audit_action"`);
    await queryRunner.query(`DROP INDEX "IDX_lar_audit_actor_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_lar_audit_report_created_at"`);
    await queryRunner.query(`DROP TABLE "labor_accident_report_audit_logs"`);
  }
}
