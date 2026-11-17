-- Contract phase: remove the legacy multi-valued column after confirming that
-- every category with legacy keywords has at least one normalized row.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Category" c
        WHERE cardinality(c."keywords") > 0
          AND NOT EXISTS (
              SELECT 1 FROM "CategoryKeyword" k WHERE k."categoryId" = c."id"
          )
    ) THEN
        RAISE EXCEPTION 'CategoryKeyword backfill is incomplete; refusing to drop Category.keywords';
    END IF;
END $$;

ALTER TABLE "Category" DROP COLUMN "keywords";
