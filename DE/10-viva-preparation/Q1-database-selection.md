# Q1 — Why PostgreSQL?

## What to say

“CivicResolve AI uses PostgreSQL, a relational database. Our main records are connected: a complaint may reference its citizen, assigned officer, category, department, ward and issue, and it can have a history, messages and notifications. Foreign keys and transactions fit those relationships. We also use PostgreSQL enums, indexes, JSONB for a ward boundary and an array for category keywords.

“The backend frequently authenticates users, creates complaints, loads complaint details and queues, updates status or assignment, and counts dashboard records. A planning estimate for a pilot of 10,000 users reporting two to five times each year is 20,000 to 50,000 complaints annually; this is an estimate, not a measured count. I considered MongoDB, but its document model would make the shared entity references and relational integrity less direct for this schema.”

## What to show

- `DE/01-database-selection-and-justification.md` for the rationale and clearly labelled estimate.
- `server/prisma/schema.prisma` for the PostgreSQL provider and connected models.
- `server/src/routes/complaints.routes.js` for complaint creation and retrieval, plus `server/src/routes/auth.routes.js` for authentication queries.
- If a verified local demo database is available, show fictional rows and run query 2 (counts by status). SQL execution is pending in this package.

## Follow-up questions

- **Is all data relational?** The core entities are relational; JSONB boundary data and keyword arrays are collection-valued fields.
- **Why not MongoDB?** The current shared users, departments, categories, issues and complaint events need referential integrity; PostgreSQL directly supports it.
- **Is the annual volume measured?** No. It is an explicitly labelled planning estimate.
