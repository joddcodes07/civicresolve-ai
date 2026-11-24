# Q2 — Walk through the data model

## What to say

“The central record is Complaint. It may link to a User as citizen and another User as assigned officer, plus Category, Department, Ward and Issue. A department owns categories, and a category can have many complaints and issues. A complaint can have many status-history events, transfers, messages and notifications. Feedback is optional and unique by complaint, so it is one-to-one when present. The schema has no many-to-many junction table.”

“Primary keys identify each row, mostly with text IDs. Unique codes allow public complaint/issue tracking. Foreign keys connect the records and protect against missing parents. Nullable foreign keys are used for optional associations.”

## What to show

- `DE/02-er-diagrams/final-physical-erd.svg` or editable `final-physical-erd.mmd`.
- `server/prisma/schema.prisma`, especially Complaint, Department, Category and StatusHistory.
- Run query 3 in `DE/06-project-specific-queries/queries.sql` on a verified test DB to show Category joined to Complaint.

## Follow-up questions

- **How is 1:1 enforced?** `Feedback.complaintId` is unique and a required FK.
- **What is the junction table?** There is none; the implemented model has no natural M:N relation requiring one.
- **Why can Complaint.categoryId and departmentId disagree?** Both are separate optional FKs; no composite constraint guarantees they match. This is documented as an integrity consideration.
