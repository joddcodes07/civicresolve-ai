# Q5 — How is database usage efficient?

## What to say

“The schema has indexes for frequent lookups and filters, including unique complaint code, citizen complaint history by citizen and date, complaint status and department, and complaint category/ward. Officer queues are paginated to 20 rows. The status/department index helps filtering but does not cover the queue's full priority and due-date order, so I would measure an EXPLAIN plan before adding a composite index. Indexes speed reads but consume storage and add work to inserts and updates.”

“At much higher traffic, I would first measure connection pooling, large complaint/history tables, dashboard aggregation and search. Pooling, keyset pagination, caching stable reference data, read replicas and partitioning are future options, not claims about current implementation. A plan capture exists for a tiny demo dataset; its timing is not representative of production.”

## What to show

- `DE/08-data-integrity-and-performance/performance-analysis.md`.
- Index annotations in `server/prisma/schema.prisma` and migration SQL.
- `server/src/routes/officer.routes.js` for page-size-20 queue and query 6 in the SQL file.
- Show `DE/08-data-integrity-and-performance/explain-queue-output.txt`; explain that it reports a sequential scan, hash join, sort and 0.229 ms execution on six demo complaints, not a production benchmark. The user manually verified the target as `civicresolve_de_test` at `127.0.0.1:5432`; the plan capture itself omits the identity preflight and query text.

## Follow-up questions

- **Why not index every column?** Each index costs storage and slows writes; create one only for a demonstrated access pattern.
- **Do foreign keys get an index automatically?** No. PostgreSQL indexes the referenced primary/unique key, not necessarily the referencing FK column.
- **What might break first at 100x?** This is a hypothesis to measure; likely connection capacity, expensive queue/report queries and growth of complaint/event tables.
