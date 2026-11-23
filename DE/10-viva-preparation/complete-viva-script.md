# Individual DBMS viva script

Use this as a speaking guide. Keep the distinction between what the code implements and what remains pending safe execution.

## Q1 — Database selection

“CivicResolve AI uses PostgreSQL, a relational database. Complaints connect to users, departments, categories, wards and issues, with separate records for history and messages. PostgreSQL foreign keys, unique rules, transactions and SQL joins fit that structure. The application stores some collection values as JSONB and a text array. The backend authenticates users, creates and retrieves complaints, updates workflow state and reads dashboard counts. Our estimate of 20,000 to 50,000 complaints a year assumes 10,000 users reporting two to five times annually; it is not measured. MongoDB was an alternative, but the current shared relationships and integrity rules map more directly to PostgreSQL.”

Show `DE/01-database-selection-and-justification.md`, `server/prisma/schema.prisma`, and routes for authentication and complaints. Query 2 demonstrates status counts on a verified local test database.

## Q2 — Schema

“Complaint is the central record. It can point to a citizen, officer, category, department, ward and issue. Departments own categories. Complaints have many history, transfer and message records. Feedback is one-to-one when present because complaintId is unique. The model has no many-to-many junction table. Primary keys identify rows, unique codes support lookup, and foreign keys connect records.”

Show `DE/02-er-diagrams/final-physical-erd.svg` and the Prisma models. Query 3 joins Category and Complaint.

## Q3 — Normalization

“The schema separates entities and stores status history as one row per event rather than fixed repeated status columns. Primary keys are single-column, so no partial dependency on part of a composite key was found. The relational design is 3NF-oriented. I qualify strict 1NF because category keywords are stored in a PostgreSQL array and a ward boundary is JSONB. Those are intentional collection values. We made no schema changes just to claim a transformation.”

Show `DE/03-normalization/functional-dependencies.md`, `normalization-analysis.md`, and the Complaint/StatusHistory models.

## Q4 — Correctness

“PostgreSQL enforces keys, uniqueness, foreign keys, required columns and enum values. Zod and service code add request checks such as required contact fields and location validation. There are no CHECK constraints for ranges such as rating. Complaint submission uses a transaction and a per-citizen transaction advisory lock for the daily quota. Some status and transfer workflows do not wrap all related writes in a transaction, which is a known gap. No invalid-row demo has been executed yet.”

Show `constraints-and-validation.md`, `server/src/services/submissionService.js`, and the separate status/history writes in `complaintService.js`.

## Q5 — Efficiency

“Indexes support unique identifiers, citizen history, status/department filtering, category/ward lookups and complaint event lookup. The officer queue has a page size of 20. The existing status/department index may help filtering, but the priority and due-date order may still need sorting. I would check an EXPLAIN plan before recommending an index. At higher scale I would measure connection pooling, large history tables and dashboard aggregation first. Pooling, caching, read replicas and partitioning are future options, not current features.”

Show `performance-analysis.md`, the index declarations, `server/src/routes/officer.routes.js`, and query 6. The query plan is pending a verified test database.

## Closing

“This submission distinguishes implemented schema and code from recommendations. The diagrams and SQL were prepared from the checked-in Prisma schema and migrations. I did not access or change production data. SQL outputs and local screenshots still require a disposable test database and manual capture.”
