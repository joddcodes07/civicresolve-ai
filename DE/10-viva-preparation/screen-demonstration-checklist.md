# Screen demonstration checklist

1. Open `DE/README.md` and explain how the package is organized.
2. Open `DE/01-database-selection-and-justification.md`; state that the yearly volume is an estimate.
3. Show `DE/02-er-diagrams/final-physical-erd.svg`; then show `server/prisma/schema.prisma` and the Complaint / StatusHistory models.
4. Show `DE/03-normalization/functional-dependencies.md` and explain the single-column keys and collection-valued fields.
5. Open `server/src/db.js` and `server/src/routes/complaints.routes.js` to trace Prisma initialization and complaint routing.
6. The user manually verified `civicresolve_de_test` at `127.0.0.1:5432`. Existing query output is in `DE/06-project-specific-queries/execution-outputs/query-results.txt`; its original transcript omits the identity preflight. If fresh output is needed for the demo, capture the identity preflight and query 3/query 2 together. Do not connect to any unknown or deployed URL.
7. Show `server/src/services/submissionService.js` for transaction/advisory lock; show `complaintService.js` for the non-atomic status workflow.
8. Show index declarations and `DE/08-data-integrity-and-performance/performance-analysis.md`. Run EXPLAIN only in the verified local test environment.
9. Capture screenshots of fictional application data and matching database rows. Ensure no secrets or personal data appear.
10. Record the five answers in the order in `complete-viva-script.md`; replace pending-execution phrases only after collecting genuine evidence.

Pending for the submitted package: application/database screenshots and video recording. The user has manually verified the database identity, but the existing query and EXPLAIN transcripts omit that preflight.
