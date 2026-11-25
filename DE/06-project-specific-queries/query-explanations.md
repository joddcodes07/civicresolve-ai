# Project-specific SQL query guide

All queries are adapted to the actual PostgreSQL table/column names in Prisma. A pre-existing psql capture is in `execution-outputs/query-results.txt`. It contains Q1–Q14 results, including rollback output for Q12–Q14. The user manually verified the target as `civicresolve_de_test` at `127.0.0.1:5432`; this review did not rerun SQL, and the capture itself does not include the identity preflight. Queries 12–14 are transactional write demonstrations and the captured output ends with ROLLBACK for each.

| # | Business question and SQL concepts | Expected output | Why useful |
|---|---|---|
| 1 | Latest submitted complaints: SELECT, WHERE, ORDER BY, LIMIT | 1 row: DEMO-C-001, SUBMITTED. | Reproduces a recent intake view. |
| 2 | Complaint counts by status: COUNT, GROUP BY, sorting | 6 statuses, 1 complaint in each. | Summarizes workflow load. |
| 3 | Categories with most complaints: LEFT JOIN, COUNT, GROUP BY | Demo Road Repair 5; Demo Waste Management 1. | Supports category staffing and taxonomy review. |
| 4 | Departments with at least five complaints: LEFT JOIN, GROUP BY, HAVING | Demo Public Works, 5 complaints. | Filters aggregate workload. |
| 5 | Average, shortest and longest resolution duration: AVG, MIN, MAX, date arithmetic | Average 120 hours; fastest 4 days; slowest 6 days. | Helps evaluate service time; null resolution dates are excluded. |
| 6 | Unresolved cases due soonest: JOIN, status filter, ORDER BY | 4 rows, earliest due first. | Supports a department queue. |
| 7 | Citizens submitting multiple complaints: JOIN, GROUP BY, HAVING | Asha Example 4; Rahul Example 2. | Finds repeat reporting accounts; use carefully due to privacy. |
| 8 | Complaints never transferred: LEFT JOIN, IS NULL | 5 complaint codes returned. | Reviews routing history. |
| 9 | Most recent status changes: JOIN, sorting | 5 history rows returned. | Reads the audit trail. |
| 10 | Wards containing reports: LEFT JOIN, COUNT, GROUP BY, HAVING | Demo North Ward 3; Demo Central Ward 3. | Summarizes geographic workload. |
| 11 | Issues with no open complaint: correlated NOT EXISTS subquery | DEMO-I-002, status OPEN. | Finds issues whose linked work appears complete. |
| 12 | Update a fictional department SLA: scoped UPDATE, transaction, rollback | UPDATE 1; selected SLA 48; transaction rolled back. | Demonstrates safe DML syntax. |
| 13 | Insert a department row: INSERT, transaction, rollback | INSERT 0 1; selected SQL-DEMO row; transaction rolled back. | Demonstrates record creation under defaults. |
| 14 | Delete a fictional message: scoped DELETE, transaction, rollback | DELETE 1; remaining count 0; transaction rolled back. | Demonstrates deletion and verification. |

## Execution status

Captured outputs are present for Q1–Q14 in `execution-outputs/query-results.txt`. They match the fictional rows defined in `DE/05-sample-records/demo-fixtures.sql`. Q12–Q14 show rollback. The user reports manually verifying `civicresolve_de_test` at `127.0.0.1:5432`; the original capture does not include the preflight. Query 5 returns NULL aggregates if there are no resolved complaints; Q3 includes zero-count categories, while Q4 filters counts below five.
