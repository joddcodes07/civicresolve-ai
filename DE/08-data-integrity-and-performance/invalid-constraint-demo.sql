-- Expected to fail at INSERT with a Category.departmentId foreign-key violation.
-- Run only in a separately verified disposable PostgreSQL database.
BEGIN;
INSERT INTO "Category" ("id", "name", "departmentId")
VALUES ('invalid_demo_category', 'Invalid FK demonstration', 'missing_demo_department');
-- After capturing the FK error, issue ROLLBACK (the transaction is aborted).
ROLLBACK;
