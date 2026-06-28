import type { MigrationInterface, QueryRunner } from 'typeorm';

export class VersionLaborAccidentReportAttachments1782651000000
  implements MigrationInterface
{
  name = 'VersionLaborAccidentReportAttachments1782651000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labor_accident_report_attachments"
      ADD COLUMN "version" integer NOT NULL DEFAULT 1,
      ADD COLUMN "is_current" boolean NOT NULL DEFAULT false,
      ADD COLUMN "superseded_at" TIMESTAMP
    `);

    await queryRunner.query(`
      WITH ranked_attachments AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "report_id", "type"
            ORDER BY "id" ASC
          ) AS attachment_version,
          ROW_NUMBER() OVER (
            PARTITION BY "report_id", "type"
            ORDER BY "id" DESC
          ) AS current_rank
        FROM "labor_accident_report_attachments"
      )
      UPDATE "labor_accident_report_attachments" AS attachment
      SET
        "version" = ranked.attachment_version,
        "is_current" = ranked.current_rank = 1,
        "superseded_at" = CASE
          WHEN ranked.current_rank = 1 THEN NULL
          ELSE COALESCE(attachment."created_at", CURRENT_TIMESTAMP)
        END
      FROM ranked_attachments AS ranked
      WHERE attachment."id" = ranked."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "labor_accident_report_attachments"
      ALTER COLUMN "is_current" SET DEFAULT true
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_labor_accident_report_attachment_current"
      ON "labor_accident_report_attachments" ("report_id", "type")
      WHERE "is_current" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_labor_accident_report_attachment_current"
    `);

    await queryRunner.query(`
      ALTER TABLE "labor_accident_report_attachments"
      DROP COLUMN "superseded_at",
      DROP COLUMN "is_current",
      DROP COLUMN "version"
    `);
  }
}
