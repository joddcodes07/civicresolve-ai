# Project-specific SQL query guide

All queries are adapted to the actual PostgreSQL table/column names in Prisma. Results and row counts depend on test data. No query was executed; output is pending, not inferred. Queries 12–14 are transactional write demonstrations that roll back.

| # | Business question and SQL concepts | Expected output | Why useful |
|---|---|---|
| 1 | Latest submitted complaints: SELECT, WHERE, ORDER BY, LIMIT | Up to 20 codes, statuses and dates, newest first. | Reproduces a recent intake view. |
| 2 | Complaint counts by status: COUNT, GROUP BY, sorting | One row per stored status with a count. | Summarizes workflow load. |
| 3 | Categories with most complaints: LEFT JOIN, COUNT, GROUP BY | Category names and counts, including zero-count categories. | Supports category staffing and taxonomy review. |
| 4 | Departments with at least five complaints: LEFT JOIN, GROUP BY, HAVING | Departments with count >= 5, sorted by count. | Filters aggregate workload. |
| 5 | Average, shortest and longest resolution duration: AVG, MIN, MAX, date arithmetic | One aggregate row; values are null if no complaint is resolved. | Helps evaluate service time; null resolution dates are excluded. |
| 6 | Unresolved cases due soonest: JOIN, status filter, ORDER BY | Up to 50 complaint/department rows, earliest due first. | Supports a department queue. |
| 7 | Citizens submitting multiple complaints: JOIN, GROUP BY, HAVING | Users with more than one linked complaint and their count. | Finds repeat reporting accounts; use carefully due to privacy. |
| 8 | Complaints never transferred: LEFT JOIN, IS NULL | Up to 50 complaint codes with no Transfer child row. | Reviews routing history. |
| 9 | Most recent status changes: JOIN, sorting | Up to 50 complaint codes with status transition and date. | Reads the audit trail. |
| 10 | Wards containing reports: LEFT JOIN, COUNT, GROUP BY, HAVING | Wards with at least one linked complaint and counts. | Summarizes geographic workload. |
| 11 | Issues with no open complaint: correlated NOT EXISTS subquery | Issue code and status where no open child complaint exists. | Finds issues whose linked work appears complete. |
| 12 | Update a fictional department SLA: scoped UPDATE, transaction, rollback | One row with the demo ID and SLA 48 inside the transaction. | Demonstrates safe DML syntax. |
| 13 | Insert a department row: INSERT, transaction, rollback | The inserted demo department row before rollback. | Demonstrates record creation under defaults. |
| 14 | Delete a fictional message: scoped DELETE, transaction, rollback | Remaining-message count is zero inside the transaction. | Demonstrates deletion and verification. |

## Execution status

Queries 1–14: pending execution. No PostgreSQL output is included. Use a separately verified disposable database with project migrations and fictional sample rows. Save genuine terminal output under execution-outputs/. Query 5 returns NULL aggregates when there are no resolved complaints. Queries 3 and 4 may show zero-count records; query 4 filters counts below five.
