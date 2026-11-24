-- A keyword row must contain an actual atomic value. The backfill trims and
-- filters blanks, and this constraint keeps future writes honest.
ALTER TABLE "CategoryKeyword"
    ADD CONSTRAINT "CategoryKeyword_keyword_not_blank"
    CHECK (btrim(keyword) <> '');
