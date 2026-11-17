-- Constrain the audit trail to the same domain as Complaint.status.
-- Validate first so a bad legacy value fails loudly instead of being coerced.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "StatusHistory"
        WHERE "toStatus" NOT IN (
            'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
            'CONFIRMED', 'REOPENED', 'NEEDS_REVIEW'
        )
    ) THEN
        RAISE EXCEPTION 'StatusHistory.toStatus contains a value outside ComplaintStatus';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "StatusHistory"
        WHERE "fromStatus" IS NOT NULL
          AND "fromStatus" NOT IN (
              'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
              'CONFIRMED', 'REOPENED', 'NEEDS_REVIEW'
          )
    ) THEN
        RAISE EXCEPTION 'StatusHistory.fromStatus contains a value outside ComplaintStatus';
    END IF;
END $$;

ALTER TABLE "StatusHistory"
    ALTER COLUMN "fromStatus" TYPE "ComplaintStatus" USING "fromStatus"::"ComplaintStatus",
    ALTER COLUMN "toStatus" TYPE "ComplaintStatus" USING "toStatus"::"ComplaintStatus";
