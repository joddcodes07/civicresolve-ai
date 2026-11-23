# Q4 — How is data correctness protected?

## What to say

“PostgreSQL enforces primary keys, unique identifiers, required columns, foreign keys and enums. For example, complaint codes are unique, and a Feedback row cannot refer to a nonexistent complaint; a unique complaintId prevents two feedback rows for the same complaint. Request validation uses Zod and service checks, but there are no database CHECK constraints for values such as rating ranges.”

“Complaint submission uses a transaction and a transaction-scoped advisory lock for the citizen's daily quota. Complaint state changes and event history are separate writes in some workflows, so those can become inconsistent if a later write fails. That is a documented improvement area. We did not run an invalid insert because no test database was verified.”

## What to show

- `DE/08-data-integrity-and-performance/constraints-and-validation.md`.
- `server/prisma/schema.prisma` unique/FK/enum declarations.
- `server/src/services/submissionService.js` for the transaction and advisory lock.
- `server/src/services/complaintService.js` for status updates and history writes.
- The invalid-FK demonstration is pending safe test DB execution.

## Follow-up questions

- **Which CHECK constraints exist?** None were found in Prisma schema or migrations.
- **What isolation level is used?** No Prisma override was found. PostgreSQL's default is READ COMMITTED unless server configuration overrides it; this environment was not checked.
- **What happens if the status-history insert fails?** Because the update and history write are separate, the complaint update may already have committed.
