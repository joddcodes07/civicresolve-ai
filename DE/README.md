# CivicResolve AI — Data Engineering Submission

This folder documents the repository's implemented PostgreSQL database and Prisma integration for the university Data Engineering submission. It was prepared from `server/prisma/schema.prisma`, the checked-in Prisma migrations, and backend source under `server/src/`. No live database was queried, because this checkout does not establish that its configured database is a separate test instance. Files labelled **pending execution** are authored but have not been run.

## Navigation

- [Database selection](01-database-selection-and-justification.md)
- [ER diagrams and editable sources](02-er-diagrams/README.md)
- [Normalization analysis](03-normalization/normalization-summary.md)
- [Implemented schema and SQL reference](04-final-database-schema/final-schema.md)
- [Fictional sample records](05-sample-records/sample-data-explanation.md)
- [Project SQL queries and explanations](06-project-specific-queries/query-explanations.md)
- [Backend integration](07-backend-integration/integration-documentation.md)
- [Integrity, transactions, and performance](08-data-integrity-and-performance/constraints-and-validation.md)
- [Architecture overview](09-database-architecture.md)
- [Individual viva preparation](10-viva-preparation/complete-viva-script.md)

## Safe use

SQL in this submission is for a separately provisioned, disposable PostgreSQL test database whose identity has been independently verified. The repository uses `DIRECT_URL` or `DATABASE_URL` via `server/prisma.config.js`; a variable name is not proof that the target is safe. Do not point these scripts at the deployed database. Query outputs are pending because no verified test database was available for this work.

Run read-only queries in `06-project-specific-queries/queries.sql` after confirming the target and applying the project's migrations to the disposable test database. The DML examples are enclosed in transactions and roll back. `05-sample-records/sample-records.sql` also rolls back, so its records are demonstration-only unless the operator deliberately adapts it for a disposable database.

## Deliverable status

- Diagram sources: Mermaid and DBML files in `02-er-diagrams/`; SVG and PNG exports are included.
- Query execution outputs: `06-project-specific-queries/execution-outputs/STATUS.md` (pending safe execution).
- Integration screenshots: `07-backend-integration/evidence/STATUS.md` (manual local demonstration required).
- Viva material: five individual answers and a combined script in `10-viva-preparation/`.
- Manual work before submission: run the SQL only on an independently verified disposable database, capture genuine output/screenshots, and record the individual viva demonstration.
