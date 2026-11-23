# Screen demonstration checklist

1. Open `DE/README.md` and explain how the package is organized.
2. Open `DE/01-database-selection-and-justification.md`; state that the yearly volume is an estimate.
3. Show `DE/02-er-diagrams/final-physical-erd.svg`; then show `server/prisma/schema.prisma` and the Complaint / StatusHistory models.
4. Show `DE/03-normalization/functional-dependencies.md` and explain the single-column keys and collection-valued fields.
5. Open `server/src/db.js` and `server/src/routes/complaints.routes.js` to trace Prisma initialization and complaint routing.
6. If available, connect only to a verified disposable local PostgreSQL database with fictional rows. Run query 3 (category join) and query 2 (status counts); capture the actual terminal output. Do not run the demonstration against any unknown or deployed URL.
7. Show `server/src/services/submissionService.js` for transaction/advisory lock; show `complaintService.js` for the non-atomic status workflow.
8. Show index declarations and `DE/08-data-integrity-and-performance/performance-analysis.md`. Run EXPLAIN only in the verified local test environment.
9. Capture screenshots of fictional application data and matching database rows. Ensure no secrets or personal data appear.
10. Record the five answers in the order in `complete-viva-script.md`; replace pending-execution phrases only after collecting genuine evidence.

Pending for the submitted package: SQL execution outputs, database/application screenshots, and EXPLAIN output. These require a local disposable database and manual recording.
