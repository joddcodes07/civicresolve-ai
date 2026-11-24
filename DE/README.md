# CivicResolve AI — Data Engineering Submission

This folder documents the repository's implemented PostgreSQL database and Prisma integration for the university Data Engineering submission. It was prepared from `server/prisma/schema.prisma`, the checked-in Prisma migrations, and backend source under `server/src/`. Existing psql evidence captures for Q1–Q14, the FK rejection, and the queue plan are present. The database identity was manually verified by the user as `civicresolve_de_test` at `127.0.0.1:5432`; the original SQL evidence transcripts do not include that identity preflight. This review did not rerun SQL.

## Navigation

- [Database selection](01-database-selection-and-justification.md)
- [ER diagrams and editable sources](02-er-diagrams/README.md)
- [Normalization analysis](03-normalization/normalization-summary.md)
- [Implemented schema and SQL reference](04-final-database-schema/final-schema.md)
- [Fictional sample records](05-sample-records/sample-data-explanation.md) and [local query fixtures](05-sample-records/demo-fixtures.sql)
- [Project SQL queries and explanations](06-project-specific-queries/query-explanations.md)
- [Backend integration](07-backend-integration/integration-documentation.md)
- [Integrity, transactions, and performance](08-data-integrity-and-performance/constraints-and-validation.md)
- [Architecture overview](09-database-architecture.md)
- [Individual viva preparation](10-viva-preparation/complete-viva-script.md)

## Safe use

SQL in this submission is for the disposable PostgreSQL test database `civicresolve_de_test` at `127.0.0.1:5432`, whose identity the user verified manually. The repository uses `DIRECT_URL` or `DATABASE_URL` via `server/prisma.config.js`; a variable name is not proof that the target is safe. Do not point these scripts at the deployed database. The existing captured outputs do not contain the identity preflight; retain a separate sanitized record if submission provenance requires it.

The DML examples in `06-project-specific-queries/queries.sql` are enclosed in transactions and roll back. `05-sample-records/sample-records.sql` also rolls back. `demo-fixtures.sql` is a fictional fixture script that commits rows and must be used only on the verified disposable test database.

## Deliverable status

- Diagram sources: Mermaid and DBML files in `02-er-diagrams/`; SVG and PNG exports are included.
- Query execution outputs: `06-project-specific-queries/execution-outputs/query-results.txt` and status note. Existing capture is not identity-verified in its transcript.
- Constraint and plan outputs: `08-data-integrity-and-performance/invalid-constraint-output.txt` and `explain-queue-output.txt`; both are existing captures without identity preflight.
- Integration screenshots: `07-backend-integration/evidence/STATUS.md` (manual local application demonstration still required).
- Viva material: five individual answers and a combined script in `10-viva-preparation/`.
- Manual work before submission: capture local application/database screenshots and record the individual viva demonstration. The user has manually verified the database identity; the evidence transcripts themselves omit the identity preflight.
