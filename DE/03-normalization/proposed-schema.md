# Proposed schema

No schema changes are proposed for this assignment. The existing Prisma schema already separates the principal entities and one-to-many event records. Keeping the implementation unchanged avoids unnecessary migration risk.

Recommended review items (proposals, not implemented changes):

1. Decide whether `StatusHistory` statuses should use `ComplaintStatus` instead of unrestricted strings; this would require checking historical values before migration.
2. Consider database `CHECK` constraints for domain ranges such as feedback rating and severity after confirming accepted ranges in application validation.
3. Consider whether complaint category and department must always agree; if so, enforce this in a transaction/service or with a deliberate composite-key design.
4. Review whether mutable summary fields on `Issue` and duplicated workflow state require reconciliation jobs or transactional updates.

Any proposal needs a separate migration review and a verified non-production database. None is applied here.
