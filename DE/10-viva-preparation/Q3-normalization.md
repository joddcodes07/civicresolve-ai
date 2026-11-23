# Q3 — Normal forms and denormalization

## What to say

“The model separates users, departments, categories, wards, issues and complaints, and stores each complaint status event as a separate StatusHistory row. All declared primary keys are single-column, so there is no partial dependency on part of a composite key and the key-based 2NF condition is met. The relational entity design is 3NF-oriented because descriptive facts stay with their entities; I do not claim every value is strict 3NF, because category keywords use an array and ward boundaries use JSONB. Those collection fields are deliberate.”

“For example, complaint status events are not stored in repeated status1/status2 columns. A separate row per event supports an open-ended history. We did not change the schema for the assignment.”

## What to show

- `DE/03-normalization/functional-dependencies.md` for keys and dependencies.
- `DE/03-normalization/normalization-analysis.md` for the qualified 1NF/2NF/3NF analysis.
- `server/prisma/schema.prisma` models Complaint and StatusHistory.
- `server/src/services/complaintService.js` creates status history rows.

## Follow-up questions

- **Any partial dependency?** No composite primary keys are declared, so none was demonstrated.
- **Is every table definitely 3NF?** The documentation qualifies strict 1NF for collection-valued fields and avoids an unsupported blanket claim.
- **Why use an array?** Category keywords are consumed as a set-like value; a child table could be considered if independent keyword management becomes necessary.
