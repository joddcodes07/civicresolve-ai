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

No additional index is created here. EXPLAIN/EXPLAIN ANALYZE was not run because there is no verified test database and no representative safe dataset. Do not invent performance timings.

## Growth considerations

At 100 times current traffic (no current production volume was measured), the first pressure points to investigate are connection limits/pooling, large Complaint and event tables, queue filters/sorts, unbounded complaint listing in citizen history, and dashboard code that fetches substantial rows to aggregate in application memory. Officer queue pagination exists with a page size of 20; other routes need case-by-case review.

Future options, not currently documented as implemented: managed connection pooling, keyset pagination for deep pages, caching stable reference data, read replicas for reporting, partitioning very large event tables after measurement, and moving expensive analytics to background jobs. Sharding would be a later architectural choice, not an immediate assumption.
