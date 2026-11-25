# Implemented schema reference

Source of truth: `server/prisma/schema.prisma` plus migrations in `server/prisma/migrations/`. This is the current code schema, not a live PostgreSQL catalog export. Prisma-generated text IDs use `cuid()` in the client. `Float` maps to `DOUBLE PRECISION`, JSON maps to `JSONB`, arrays are `TEXT[]`, and timestamps use `TIMESTAMP(3)`.

| Table | Primary key | Unique constraints | Role and principal references |
|---|---|---|---|
| User | `id` | nullable `email`, `phone`, `googleSubject` | Optional department and ward |
| Department | `id` | `name`, `code`, nullable `headUserId` | Owns categories; optional unique department head |
| Category | `id` | `name` | Required department; keywords are `TEXT[]` |
| Ward | `id` | `name` | Optional JSONB boundary and coordinates |
| Issue | `id` | `code` | Required category; optional ward; groups complaints |
| Complaint | `id` | `code` | Optional citizen, officer, category, department, ward, issue |
| StatusHistory | `id` | — | Required complaint; optional user who changed status |
| Transfer | `id` | — | Required complaint; optional source/target department and officer |
| Message | `id` | — | Required complaint; optional sender user |
| Feedback | `id` | `complaintId` | At most one feedback row per complaint |
| Notification | `id` | — | Optional user and complaint |
| Setting | `key` | PK | String key/value configuration |
| PasswordResetToken | `id` | `tokenHash` | Required user; token hash and expiry |
| SensitivePlace | `id` | — | Location, kind, source URL |
| GoogleLoginTicket | `tokenHash` | PK | Required user and expiry |

Detailed columns, nullability, PostgreSQL data types and key markers appear in the physical ERD sources. Defaults and `@updatedAt` behavior are in `schema.prisma`; not every application rule is enforced by a database CHECK constraint.

## Indexes from schema and migrations

Primary keys and unique constraints create unique indexes. Additional indexes: `User(role)`; `Issue(categoryId,status)`, `Issue(wardId)`; `Complaint(citizenId,createdAt)`, `Complaint(status,departmentId)`, `Complaint(createdAt)`, `Complaint(wardId)`, `Complaint(categoryId)`; `StatusHistory(complaintId)`; `Transfer(complaintId)`; `Message(complaintId)`; `Notification(userId,read)`; `PasswordResetToken(userId)`; `SensitivePlace(lat,lng)`; `GoogleLoginTicket(expiresAt)`.

PostgreSQL does not automatically index referencing foreign-key columns. `schema-reference.sql` is a documentation-only chronological DDL reference, not an instruction to apply it.
