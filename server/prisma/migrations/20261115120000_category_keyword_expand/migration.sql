-- Expand phase: add the atomic keyword relation without removing the legacy array.
-- The legacy "Category"."keywords" column stays in place until the backfill has
-- been verified, so this migration is additive and reversible.

CREATE TABLE "CategoryKeyword" (
    "categoryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,

    CONSTRAINT "CategoryKeyword_pkey" PRIMARY KEY ("categoryId", "keyword")
);

CREATE INDEX "CategoryKeyword_keyword_idx" ON "CategoryKeyword"("keyword");

ALTER TABLE "CategoryKeyword"
    ADD CONSTRAINT "CategoryKeyword_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy every atomic value out of the PostgreSQL array. Trim surrounding
-- whitespace, ignore empty values, and let the composite key remove duplicates.
INSERT INTO "CategoryKeyword" ("categoryId", "keyword")
SELECT c."id", btrim(k."keyword")
FROM "Category" c
CROSS JOIN LATERAL unnest(c."keywords") AS k("keyword")
WHERE k."keyword" IS NOT NULL
  AND btrim(k."keyword") <> ''
ON CONFLICT ("categoryId", "keyword") DO NOTHING;
