# Database selection and justification

## Implemented choice

CivicResolve AI uses PostgreSQL, a relational database management system. Prisma declares `provider = "postgresql"` in `server/prisma/schema.prisma`; the migration history creates PostgreSQL enums, tables, indexes, and foreign keys. Prisma 7 runtime connectivity uses `@prisma/adapter-pg` in `server/src/db.js`. The CLI datasource URL comes from `DIRECT_URL` or `DATABASE_URL` in `server/prisma.config.js`. This analysis does not disclose or inspect credentials.

## Data and relationships

The stored domain is structured and strongly connected: users may belong to departments and wards; departments own categories; complaints refer optionally to a citizen, assigned officer, category, department, ward, and issue; complaints have status history, transfers, messages, notifications, and optional one-to-one feedback. Issues aggregate related complaints. Settings store configuration values, including serialized JSON where used. Ward boundary geometry is JSONB and category keywords are PostgreSQL text arrays, so PostgreSQL also stores some semi-structured or collection values while keeping entity relationships relational.

## Access patterns found in code

Backend routes and services perform authentication lookups by email, phone, Google subject, and identifier; create complaints; retrieve complaint detail, citizen history, officer queues and public tracking; update status, assignment, transfer and feedback; and query counts for public and officer dashboards. Relevant code includes `server/src/routes/auth.routes.js`, `complaints.routes.js`, `officer.routes.js`, `meta.routes.js`, and `server/src/services/complaintService.js`. Notifications and conversation messages are also written and read.

## Why PostgreSQL fits

Foreign keys and unique constraints protect connected entities and identifiers. Enum types constrain roles and workflow states. Transactions support related work such as complaint submission and the per-citizen daily quota. SQL joins, grouping, filtering, and aggregates are natural for the dashboard and reporting queries. PostgreSQL supports JSONB and arrays needed by existing fields without giving up relational consistency.

## Consistency and transactions

A complaint must not reference a nonexistent user, category, ward, issue, or department. A feedback row is unique per complaint. Complaint submission uses a transaction and a transaction-scoped advisory lock for the daily quota in `submissionService.js`. Some status and transfer workflows update a complaint and then write history/transfer records as separate operations; these are identified as atomicity gaps in `08-data-integrity-and-performance/transactions-and-concurrency.md`.

## Alternative considered

MongoDB could store a complaint and nested event-like data in a document and offers flexible fields. However, the actual model has shared users, departments, categories, wards, issues, and many complaint-linked records with foreign-key-like consistency requirements. PostgreSQL's relational constraints and transactions map directly to these relations; using MongoDB would require additional application-level reference integrity or a substantial model redesign.

## Growth estimate

No production counts or load measurements were accessed. As a planning estimate only, a municipal pilot with 10,000 registered users and an average of 2–5 reports per user annually would create roughly 20,000–50,000 complaints per year before follow-up histories, transfers, messages, and notifications. This is an illustrative estimate, not a measured statistic or forecast.
