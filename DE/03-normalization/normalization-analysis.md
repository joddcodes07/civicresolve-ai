# Normalization analysis

This is an analysis of the implemented model in `server/prisma/schema.prisma`, using its declared keys and relationships. Since no live rows were inspected, conclusions concern the schema structure and its intended semantics.

## First Normal Form

The tables identify rows with primary keys and use scalar columns for ordinary attributes. PostgreSQL arrays (`Category.keywords`) and JSON/JSONB (`Ward.boundary`, plus serialized values in `Setting`) are deliberate collection/structured values, not atomic scalar values in the strict relational sense. Therefore, a strict textbook claim that every attribute is atomic would be inaccurate. For a normalized relational projection, keyword terms or individual boundary coordinates could be moved to child tables, but the current application stores them as collections because it reads them as one taxonomy/boundary value. The entity tables themselves do not encode repeating complaint history columns; each history event is a separate `StatusHistory` row.

Before: hypothetical `Complaint.status1`, `status2`, `status3` repeating columns would prevent arbitrary history length and complicate querying. Implemented: one `StatusHistory` row per event, keyed by `id` and linked to a complaint. No such repeating group exists in the current Prisma model.

## Second Normal Form

All declared primary keys are single-column, so there is no partial dependency on a part of a composite primary key. The multi-column indexes are not keys. The schema satisfies the 2NF key condition for these tables, subject to the strict 1NF caveat for collection-valued fields.

## Third Normal Form

The entity relations separate department, category, ward, user and complaint facts. Non-key attributes are declared on their owning entity; for example, department name/code/SLA belong to `Department`, not repeated on each complaint. For the declared functional dependencies, no concrete non-key-to-non-key transitive dependency inside a table was demonstrated from the Prisma declarations. The `Category.keywords` array and JSON fields remain intentional schema choices, so describe the relational entity design as 3NF-oriented rather than claim every value representation is strict 3NF.

## Verified examples

- `Feedback.complaintId` is unique, making feedback at most one row per complaint; feedback attributes depend on that key.
- Each history event has its own key and points to a complaint. Event note/status/time are event facts, not repeated columns on `Complaint`.
- Complaint references user, department, category, ward and issue through IDs rather than duplicating those entities' descriptive data.

No normalization migration is proposed: the existing relational decomposition is appropriate for these facts. See `functional-dependencies.md` for candidate keys and the domain consistency caveat around category and complaint department.
