import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReportPeriodUniqueIndex1782670700000 implements MigrationInterface {
  name = 'UpdateReportPeriodUniqueIndex1782670700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_labor_accident_report_period_unique";
    `);

    // Create the new partial unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_labor_accident_report_period_active_unique"
      ON "labor_accident_report_periods" ("report_name", "year", "period_type")
      WHERE "is_active" = true;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_labor_accident_report_period_active_unique";
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_labor_accident_report_period_unique"
      ON "labor_accident_report_periods" ("report_name", "year", "period_type");
    `);
  }
}
