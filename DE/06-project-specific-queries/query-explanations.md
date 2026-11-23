# Project-specific SQL query guide

All queries are adapted to the actual PostgreSQL table/column names in Prisma. Results and row counts depend on test data. No query was executed; output is pending, not inferred. Queries 12–14 are transactional write demonstrations that roll back.

| # | Business question and SQL concepts | Why useful |
|---|---|---|
| 1 | Latest submitted complaints: SELECT, WHERE, ORDER BY, LIMIT | Reproduces a recent intake view. |
| 2 | Complaint counts by status: COUNT, GROUP BY, sorting | Summarizes workflow load. |
| 3 | Categories with most complaints: LEFT JOIN, COUNT, GROUP BY | Supports category staffing and taxonomy review. |
| 4 | Departments with at least five complaints: LEFT JOIN, GROUP BY, HAVING | Filters aggregate workload. |
| 5 | Average, shortest and longest resolution duration: AVG, MIN, MAX, date arithmetic | Helps evaluate service time; null resolution dates are excluded. |
| 6 | Unresolved cases due soonest: JOIN, status filter, ORDER BY | Supports a department queue. |
| 7 | Citizens submitting multiple complaints: JOIN, GROUP BY, HAVING | Finds repeat reporting accounts; use carefully due to privacy. |
| 8 | Complaints never transferred: LEFT JOIN, IS NULL | Reviews routing history. |
| 9 | Most recent status changes: JOIN, sorting | Reads the audit trail. |
| 10 | Wards containing reports: LEFT JOIN, COUNT, GROUP BY, HAVING | Summarizes geographic workload. |
| 11 | Issues with no open complaint: correlated NOT EXISTS subquery | Finds issues whose linked work appears complete. |
| 12 | Update fictional complaint priority: scoped UPDATE, transaction, rollback | Demonstrates safe DML syntax. |
| 13 | Insert a department row: INSERT, transaction, rollback | Demonstrates record creation under defaults. |
| 14 | Delete one fictional message: scoped DELETE, transaction, rollback | Demonstrates deletion and verification. |

## Execution status

Queries 1–14: pending execution. No PostgreSQL output is included. Use a separately verified disposable database with project migrations and fictional sample rows. Save genuine terminal output under execution-outputs/. Query 5 returns NULL aggregates when there are no resolved complaints. Queries 3 and 4 may show zero-count records; query 4 filters counts below five.
