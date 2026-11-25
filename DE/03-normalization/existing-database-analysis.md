# Existing database analysis

## Evidence examined

The current Prisma model was compared with all four checked-in migrations under `server/prisma/migrations/`. The first migration creates the initial 12 domain/configuration tables; later migrations add `PasswordResetToken`, `SensitivePlace`, `GoogleLoginTicket`, and later columns/indexes. This is a source-level reconstruction, not a live catalog inspection. No database URL was connected.

## Current model inventory

The final Prisma schema defines 15 models: `User`, `Department`, `Category`, `Ward`, `Issue`, `Complaint`, `StatusHistory`, `Transfer`, `Message`, `Feedback`, `Notification`, `Setting`, `PasswordResetToken`, `SensitivePlace`, and `GoogleLoginTicket`. The named enum types are `Role`, `ComplaintStatus`, `IssueStatus`, `SenderRole`, and `Channel`.

The initial migration lacks the later `tokenVersion`, `nearSensitivePlace`, and Google sign-in fields/tables, and it defines `User.passwordHash` as required. The later Google migration makes that field nullable and adds `googleSubject`; current Prisma matches the later state. `SensitivePlace` and `PasswordResetToken` came from the second migration; the complaint citizen/date composite index came in that migration too.

## Structural observations

- Every model has a primary key; most use a text `id`, while `Setting.key` and `GoogleLoginTicket.tokenHash` are natural primary keys.
- Complaint workflow data is split into separate child tables for history, transfers, messages, notifications, and feedback.
- Shared reference entities (`Department`, `Category`, `Ward`, `User`, `Issue`) are separately represented and linked by foreign keys.
- Only `Feedback.complaintId` is explicitly unique for a child relationship; this encodes at most one feedback row per complaint.
- Optional relations are represented with nullable foreign-key columns. Not all application-level “required in practice” associations are database-required.

## Database-level gaps to keep visible

The schema has no Prisma `@@check` constraints for ranges such as rating, severity, or coordinates. `StatusHistory.fromStatus` and `toStatus` are strings rather than enum types. Several multi-row workflow operations in application code are not wrapped in one transaction. See the integrity and concurrency documents.
