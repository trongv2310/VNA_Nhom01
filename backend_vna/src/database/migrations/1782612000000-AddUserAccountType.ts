import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAccountType1782612000000 implements MigrationInterface {
  name = 'AddUserAccountType1782612000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "account_type" character varying(20)
    `);

    await queryRunner.query(`
      UPDATE "users" AS "user"
      SET "account_type" = CASE
        WHEN EXISTS (
          SELECT 1
          FROM "businesses" AS "business"
          WHERE "business"."account_user_id" = "user"."id"
        )
          THEN 'BUSINESS'
        ELSE 'DEPARTMENT'
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "account_type" SET DEFAULT 'DEPARTMENT'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "account_type" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_account_type"
      CHECK ("account_type" IN ('DEPARTMENT', 'BUSINESS'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "CHK_users_account_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "account_type"
    `);
  }
}
