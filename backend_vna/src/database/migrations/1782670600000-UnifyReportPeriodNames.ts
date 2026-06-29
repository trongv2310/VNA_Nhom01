import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyReportPeriodNames1782670600000 implements MigrationInterface {
  name = 'UnifyReportPeriodNames1782670600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "labor_accident_report_periods"
      SET "report_name" = 'Báo cáo TNLĐ'
      WHERE "report_name" = 'Báo cáo định kỳ tai nạn lao động' OR "report_name" = 'Báo cáo định kỳ Tai nạn lao động'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Empty
  }
}
