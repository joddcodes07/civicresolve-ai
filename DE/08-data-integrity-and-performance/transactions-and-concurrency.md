# Transactions and concurrency

## Confirmed transaction use

- Complaint submission is wrapped by `withDailyQuota` in `server/src/services/submissionService.js`. A transaction-scoped `pg_advisory_xact_lock(hashtext(citizenId))` serializes quota checks for the same account. The complaint insert, issue update, and initial history row use the transaction client, so a thrown failure rolls those database writes back. External notification happens after that transaction.
- Password reset issuance and completion use callback `$transaction` in `server/src/routes/auth.routes.js`. Reset completion claims a still-valid unused token and updates the user's password/token version in the same transaction.
- Google sign-in ticket creation/consumption also uses transactions in `server/src/routes/google.routes.js`.

## Multi-record gaps

`updateStatus`, `transferComplaint`, and `submitFeedback` in `server/src/services/complaintService.js` perform multiple writes in separate calls: complaint state, history, transfer/feedback, possible issue aggregate, and notification. A failure between writes can leave an incomplete audit/event sequence. A safe future improvement is a transaction for related PostgreSQL changes, then send email/socket notifications after commit. This would be a behavior change and is not applied here.

## Concurrent work

No explicit Prisma isolation level is configured in the inspected transaction calls. If PostgreSQL uses its default transaction isolation, that is READ COMMITTED; the application has not verified a server-level override. Quota checks use a per-citizen transaction advisory lock, but its `hashtext` key can theoretically collide. Unique constraints protect identifiers and one feedback per complaint. No general optimistic version column, explicit row-locking policy, or global lock strategy was found.

The transaction boundary improves atomicity for the quota and its writes. The lock prevents two requests for the same account from both passing the quota check concurrently across workers. Other simultaneous status transitions can still race because the code reads state, validates transition, then updates without a conditional version check/row lock. This is an area for future concurrency testing and hardening.

No concurrency experiment was run during this review. The transactional query examples were executed in the pre-existing Q1–Q14 capture, but their output file does not include a database identity preflight; see `../06-project-specific-queries/execution-outputs/STATUS.md`.
