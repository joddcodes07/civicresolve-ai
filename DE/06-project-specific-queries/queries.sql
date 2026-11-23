-- Use only on a verified disposable test database.
-- Q1: SELECT + WHERE + ORDER BY — latest submitted complaints
SELECT "code", "status", "createdAt" FROM "Complaint"
WHERE "status" = 'SUBMITTED' ORDER BY "createdAt" DESC LIMIT 20;

-- Q2: COUNT + GROUP BY — volume by status
SELECT "status", COUNT(*) AS complaint_count FROM "Complaint"
GROUP BY "status" ORDER BY complaint_count DESC;

-- Q3: JOIN + GROUP BY — complaints per category
SELECT ca."name", COUNT(c.id) AS complaint_count
FROM "Category" ca LEFT JOIN "Complaint" c ON c."categoryId" = ca.id
GROUP BY ca.id, ca."name" ORDER BY complaint_count DESC, ca."name";

-- Q4: JOIN + HAVING — departments with at least five complaints
SELECT d."name", COUNT(c.id) AS complaint_count
FROM "Department" d LEFT JOIN "Complaint" c ON c."departmentId" = d.id
GROUP BY d.id, d."name" HAVING COUNT(c.id) >= 5 ORDER BY complaint_count DESC;

-- Q5: aggregates — mean and extreme resolution duration
SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) AS avg_hours,
       MIN("resolvedAt" - "createdAt") AS fastest,
       MAX("resolvedAt" - "createdAt") AS slowest
FROM "Complaint" WHERE "resolvedAt" IS NOT NULL;

-- Q6: JOIN + filter + sort — unresolved complaint queue
SELECT d."name", c."code", c."status", c."dueAt"
FROM "Complaint" c JOIN "Department" d ON d.id = c."departmentId"
WHERE c."status" IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED','NEEDS_REVIEW')
ORDER BY c."dueAt" ASC LIMIT 50;

-- Q7: HAVING — citizens with multiple complaints
SELECT u."id", u."name", COUNT(*) AS reports
FROM "User" u JOIN "Complaint" c ON c."citizenId" = u.id
GROUP BY u.id, u.name HAVING COUNT(*) > 1 ORDER BY reports DESC;

-- Q8: LEFT JOIN / IS NULL — complaints never transferred
SELECT c."code", c."status" FROM "Complaint" c
LEFT JOIN "Transfer" t ON t."complaintId" = c.id WHERE t.id IS NULL
ORDER BY c."createdAt" DESC LIMIT 50;

-- Q9: JOIN — recent status events
SELECT c."code", h."fromStatus", h."toStatus", h."createdAt"
FROM "StatusHistory" h JOIN "Complaint" c ON c.id = h."complaintId"
ORDER BY h."createdAt" DESC LIMIT 50;

-- Q10: GROUP BY + HAVING — wards with reports
SELECT w."name", COUNT(c.id) AS reports
FROM "Ward" w LEFT JOIN "Complaint" c ON c."wardId" = w.id
GROUP BY w.id, w."name" HAVING COUNT(c.id) > 0 ORDER BY reports DESC;

-- Q11: NOT EXISTS — issues with no currently open complaint
SELECT i."code", i."status" FROM "Issue" i WHERE NOT EXISTS (
  SELECT 1 FROM "Complaint" c WHERE c."issueId" = i.id
    AND c."status" IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED','NEEDS_REVIEW')
) ORDER BY i."createdAt" DESC;

-- Q12: UPDATE demonstration, narrowly scoped to fictional sample row; rollback.
BEGIN;
UPDATE "Complaint" SET "priority" = 10
WHERE "id" = 'co_demo_pothole' AND "code" = 'DEMO-C-001';
SELECT "id", "priority" FROM "Complaint" WHERE "id" = 'co_demo_pothole';
ROLLBACK;

-- Q13: INSERT demonstration, rolled back.
BEGIN;
INSERT INTO "Department" ("id", "name", "code") VALUES ('de_sql_demo', 'SQL Demo Department', 'SQL-DEMO');
SELECT "id", "name", "code" FROM "Department" WHERE "id" = 'de_sql_demo';
ROLLBACK;

-- Q14: DELETE demonstration, narrowly scoped to fictional sample row; rollback.
BEGIN;
DELETE FROM "Message" WHERE "id" = 'me_demo_note' AND "complaintId" = 'co_demo_pothole';
SELECT COUNT(*) AS remaining_demo_messages FROM "Message" WHERE "id" = 'me_demo_note';
ROLLBACK;
