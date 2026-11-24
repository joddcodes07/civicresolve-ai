# Indexing, performance and scale

## Existing indexes

The checked-in schema/migrations declare unique indexes for primary keys and the unique fields listed in `04-final-database-schema/final-schema.md`, plus these non-unique indexes:

| Index | Access pattern supported | Caveat |
|---|---|---|
| `User(role)` | Filtering officers/admins | Email/phone/Google lookups use unique indexes instead. |
| `Issue(categoryId,status)` | Category/status issue search | Supports the leftmost category prefix. |
| `Issue(wardId)` | Ward-filtered issue lookup | |
| `Complaint(citizenId,createdAt)` | Citizen complaint history by date | Supports citizen equality then creation-time order. |
| `Complaint(status,departmentId)` | Status/department queue filters | Does not cover due-date sorting or priority ordering by itself. |
| `Complaint(createdAt)` | Recent complaint ordering/date scans | |
| `Complaint(wardId)`, `Complaint(categoryId)` | Ward/category filters and FK lookups | |
| `StatusHistory(complaintId)`, `Transfer(complaintId)`, `Message(complaintId)` | Complaint timeline/child lookup | Creation-time ordering can still require sort. |
| `Notification(userId,read)` | User notification and unread filters | Channel and sentAt sort are not included. |
| `PasswordResetToken(userId)` | Cleanup/lookup by account | Token hash has its own unique index. |
| `SensitivePlace(lat,lng)` | Coordinate-related range filtering | B-tree on two floats may be less effective for spatial radius queries. |
| `GoogleLoginTicket(expiresAt)` | Expired ticket cleanup | Token hash is the primary key. |

Primary and unique indexes also support exact code/email/token lookups. PostgreSQL does not automatically create indexes on referencing FK columns; some are covered incidentally by the declared indexes and others are not.

## Query patterns and recommendations

Officer queue filters status and department, then orders by priority and dueAt; the existing `(status, departmentId)` index can help filter but cannot satisfy that complete ordering. Measure representative query plans before adding an index. A candidate `(departmentId, status, priority DESC, dueAt)` may help department queues, but broad role/admin queries differ and every index increases write work and storage.

Complaint history filters citizen and orders by createdAt; `(citizenId, createdAt)` directly matches that pattern. Public tracking by complaint code benefits from the unique code index. Status-history/message retrieval filters by complaint and sorts by creation time; candidate `(complaintId, createdAt)` indexes may reduce sorting cost but duplicate existing prefix indexes and add maintenance overhead.

Officer free-text search uses case-insensitive substring matching on code/summary/text fields. Ordinary B-tree indexes generally do not accelerate arbitrary leading-wildcard substring searches. If this becomes a measured bottleneck, evaluate PostgreSQL trigram indexes or a dedicated search service and verify operational support.

No additional index is created here. A pre-existing `EXPLAIN (ANALYZE, BUFFERS)` capture is in `explain-queue-output.txt`. On the captured six-complaint demo dataset, PostgreSQL used sequential scans of Complaint and Department, a hash join, and a sort on dueAt. The plan returned four unresolved rows; execution time was 0.229 ms and planning time 3.396 ms, with shared buffers reported in the file. These timings describe only this tiny local test dataset and are not a production performance claim. The user manually verified `civicresolve_de_test` at `127.0.0.1:5432`; the original plan transcript omits the identity preflight and query text. This review did not rerun EXPLAIN.

## Growth considerations

At 100 times current traffic (no current production volume was measured), the first pressure points to investigate are connection limits/pooling, large Complaint and event tables, queue filters/sorts, unbounded complaint listing in citizen history, and dashboard code that fetches substantial rows to aggregate in application memory. Officer queue pagination exists with a page size of 20; other routes need case-by-case review.

Future options, not currently documented as implemented: managed connection pooling, keyset pagination for deep pages, caching stable reference data, read replicas for reporting, partitioning very large event tables after measurement, and moving expensive analytics to background jobs. Sharding would be a later architectural choice, not an immediate assumption.

### EXPLAIN ANALYZE: Complaint Queue Query

**Query tested:** Unresolved complaint queue, joined with Department, ordered by `dueAt`, with a limit of 50 records.

**Observed execution plan:**
- PostgreSQL used a sequential scan on `Complaint` and filtered out 2 of the 6 records.
- It used a sequential scan on `Department`, which contained 2 records.
- A Hash Join combined the complaint and department records.
- A quicksort operation sorted the matching records by `dueAt`.
- The query returned 4 matching complaints.

**Measured results:**

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| Planning time | 2.372 ms | 3.396 ms |
| Execution time | 0.156 ms | 0.229 ms |
| Rows returned | 4 | 4 |

**Analysis:**

PostgreSQL selected sequential scans instead of index scans because the test database contains very few records. For such small tables, sequential scans can be more efficient than index lookups.

The query completed in under 1 ms in both executions. However, these measurements are from a small fictional demonstration dataset and should not be treated as representative production performance benchmarks.

For a larger dataset, the complaint queue's status filtering and `dueAt` ordering should be measured again. A composite index may be considered if actual query plans and workload measurements justify it.

**Evidence:** `explain-queue-output.txt`
