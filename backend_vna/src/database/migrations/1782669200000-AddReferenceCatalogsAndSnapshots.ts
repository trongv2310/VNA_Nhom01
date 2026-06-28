import { MigrationInterface, QueryRunner } from 'typeorm';

import {
  BUSINESS_INDUSTRY_SEEDS,
  BUSINESS_TYPE_SEEDS,
} from '../seeds/business-reference-catalog.data';

export class AddReferenceCatalogsAndSnapshots1782669200000 implements MigrationInterface {
  name = 'AddReferenceCatalogsAndSnapshots1782669200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureLaborAccidentCatalogBaseline(queryRunner);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_types" (
        "id" SERIAL NOT NULL,
        "code" character varying(20) NOT NULL,
        "name" character varying(150) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_types" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_business_types_code"
      ON "business_types" ("code")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_business_types_name"
      ON "business_types" ("name")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_industries" (
        "id" SERIAL NOT NULL,
        "code" character varying(20) NOT NULL,
        "name" character varying(255) NOT NULL,
        "level" integer NOT NULL,
        "parent_id" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_industries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_business_industries_level"
          CHECK ("level" BETWEEN 1 AND 4)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_business_industries_code"
      ON "business_industries" ("code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_business_industries_parent_id"
      ON "business_industries" ("parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_business_industries_level_active"
      ON "business_industries" ("level", "is_active")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_business_industries_parent'
            AND conrelid = 'business_industries'::regclass
        ) THEN
          ALTER TABLE "business_industries"
          ADD CONSTRAINT "FK_business_industries_parent"
          FOREIGN KEY ("parent_id")
          REFERENCES "business_industries"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD COLUMN IF NOT EXISTS "business_type_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD COLUMN IF NOT EXISTS "industry_id" integer
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_businesses_business_type_id"
      ON "businesses" ("business_type_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_businesses_industry_id"
      ON "businesses" ("industry_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_businesses_business_type_catalog'
            AND conrelid = 'businesses'::regclass
        ) THEN
          ALTER TABLE "businesses"
          ADD CONSTRAINT "FK_businesses_business_type_catalog"
          FOREIGN KEY ("business_type_id")
          REFERENCES "business_types"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_businesses_industry_catalog'
            AND conrelid = 'businesses'::regclass
        ) THEN
          ALTER TABLE "businesses"
          ADD CONSTRAINT "FK_businesses_industry_catalog"
          FOREIGN KEY ("industry_id")
          REFERENCES "business_industries"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "labor_accident_report_details"
      ADD COLUMN IF NOT EXISTS "accident_cause_code_snapshot"
        character varying(50),
      ADD COLUMN IF NOT EXISTS "accident_cause_name_snapshot"
        character varying(500),
      ADD COLUMN IF NOT EXISTS "injury_factor_code_snapshot"
        character varying(50),
      ADD COLUMN IF NOT EXISTS "injury_factor_name_snapshot"
        character varying(500),
      ADD COLUMN IF NOT EXISTS "occupation_code_snapshot"
        character varying(50),
      ADD COLUMN IF NOT EXISTS "occupation_name_snapshot"
        character varying(500)
    `);

    for (const seed of BUSINESS_TYPE_SEEDS) {
      await queryRunner.query(
        `
          INSERT INTO "business_types"
            ("code", "name", "is_active", "sort_order")
          VALUES ($1, $2, true, $3)
          ON CONFLICT ("code") DO UPDATE
          SET
            "name" = EXCLUDED."name",
            "sort_order" = EXCLUDED."sort_order",
            "updated_at" = now()
        `,
        [seed.code, seed.name, seed.sortOrder],
      );
    }

    for (const seed of BUSINESS_INDUSTRY_SEEDS) {
      await queryRunner.query(
        `
          INSERT INTO "business_industries"
            ("code", "name", "level", "is_active", "sort_order")
          VALUES ($1, $2, $3, true, $4)
          ON CONFLICT ("code") DO UPDATE
          SET
            "name" = EXCLUDED."name",
            "level" = EXCLUDED."level",
            "sort_order" = EXCLUDED."sort_order",
            "updated_at" = now()
        `,
        [seed.code, seed.name, seed.level, seed.sortOrder],
      );
    }

    await queryRunner.query(`
      UPDATE "businesses" AS business
      SET "business_type_id" = business_type."id"
      FROM "business_types" AS business_type
      WHERE business."business_type_id" IS NULL
        AND business."business_type" IS NOT NULL
        AND LOWER(TRIM(business."business_type")) =
            LOWER(TRIM(business_type."name"))
    `);

    await queryRunner.query(`
      UPDATE "businesses" AS business
      SET "industry_id" = industry."id"
      FROM "business_industries" AS industry
      WHERE business."industry_id" IS NULL
        AND business."industry_code" = industry."code"
        AND LOWER(TRIM(business."industry_name")) =
            LOWER(TRIM(industry."name"))
    `);

    await queryRunner.query(`
      UPDATE "labor_accident_report_details" AS detail
      SET
        "accident_cause_code_snapshot" =
          COALESCE(detail."accident_cause_code_snapshot", catalog."code"),
        "accident_cause_name_snapshot" =
          COALESCE(detail."accident_cause_name_snapshot", catalog."name")
      FROM "labor_accident_catalogs" AS catalog
      WHERE detail."accident_cause_catalog_id" = catalog."id"
    `);

    await queryRunner.query(`
      UPDATE "labor_accident_report_details" AS detail
      SET
        "injury_factor_code_snapshot" =
          COALESCE(detail."injury_factor_code_snapshot", catalog."code"),
        "injury_factor_name_snapshot" =
          COALESCE(detail."injury_factor_name_snapshot", catalog."name")
      FROM "labor_accident_catalogs" AS catalog
      WHERE detail."injury_factor_catalog_id" = catalog."id"
    `);

    await queryRunner.query(`
      UPDATE "labor_accident_report_details" AS detail
      SET
        "occupation_code_snapshot" =
          COALESCE(detail."occupation_code_snapshot", catalog."code"),
        "occupation_name_snapshot" =
          COALESCE(detail."occupation_name_snapshot", catalog."name")
      FROM "labor_accident_catalogs" AS catalog
      WHERE detail."occupation_catalog_id" = catalog."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labor_accident_report_details"
      DROP COLUMN IF EXISTS "occupation_name_snapshot",
      DROP COLUMN IF EXISTS "occupation_code_snapshot",
      DROP COLUMN IF EXISTS "injury_factor_name_snapshot",
      DROP COLUMN IF EXISTS "injury_factor_code_snapshot",
      DROP COLUMN IF EXISTS "accident_cause_name_snapshot",
      DROP COLUMN IF EXISTS "accident_cause_code_snapshot"
    `);

    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP CONSTRAINT IF EXISTS "FK_businesses_industry_catalog"
    `);
    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP CONSTRAINT IF EXISTS "FK_businesses_business_type_catalog"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_businesses_industry_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_businesses_business_type_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP COLUMN IF EXISTS "industry_id",
      DROP COLUMN IF EXISTS "business_type_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "business_industries"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "business_types"
    `);

    // The labor-accident catalog is an adopted baseline table that predates the
    // migration history and is referenced by existing reports. It is
    // deliberately retained during rollback to avoid destructive data loss.
  }

  private async ensureLaborAccidentCatalogBaseline(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'labor_accident_catalog_type'
        ) THEN
          CREATE TYPE "labor_accident_catalog_type" AS ENUM (
            'ACCIDENT_CAUSE',
            'INJURY_FACTOR',
            'INJURY_TYPE',
            'OCCUPATION'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "labor_accident_catalogs" (
        "id" SERIAL NOT NULL,
        "type" "labor_accident_catalog_type" NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(500) NOT NULL,
        "level" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "parent_id" integer,
        CONSTRAINT "PK_labor_accident_catalogs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "IDX_labor_accident_catalog_unique_code"
      ON "labor_accident_catalogs" ("type", "code")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint AS constraint_info
          INNER JOIN pg_attribute AS column_info
            ON column_info.attrelid = constraint_info.conrelid
           AND column_info.attnum = ANY(constraint_info.conkey)
          WHERE constraint_info.conrelid =
                'labor_accident_catalogs'::regclass
            AND constraint_info.contype = 'f'
            AND column_info.attname = 'parent_id'
        ) THEN
          ALTER TABLE "labor_accident_catalogs"
          ADD CONSTRAINT "FK_labor_accident_catalogs_parent"
          FOREIGN KEY ("parent_id")
          REFERENCES "labor_accident_catalogs"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }
}
