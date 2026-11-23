# CivicResolve AI database architecture

CivicResolve AI stores its operational records in PostgreSQL, a relational database. The choice fits the connected workflow: citizens and officers create complaints; departments and categories route them; wards and issues add location/grouping context; event tables record status history, transfers, messages, feedback, and notifications.

The 15 current Prisma models are represented in `02-er-diagrams/final-physical-erd.svg` and its editable Mermaid/DBML/Draw.io sources. Primary keys identify rows; foreign keys connect related records; unique constraints protect identifiers and one-feedback-per-complaint. There is no many-to-many junction table in the current model.

The design separates shared facts and event records into related tables. Its key structure meets the 2NF criterion because declared primary keys are single-column. It is 3NF-oriented, with caveats documented for collection-valued fields: category keywords are a PostgreSQL array and ward boundary is JSONB. The design did not need an assignment-only schema change.

PostgreSQL migrations create the tables, enums, constraints, and indexes. The backend loads a singleton Prisma Client with the PostgreSQL adapter in `server/src/db.js`. Express route handlers validate input and call Prisma services; the React/Vite client communicates with Express over HTTP and Socket.IO. The backend inserts complaint and related event records, retrieves complaint details with relations, updates status/assignment/feedback, and creates notifications.

Database constraints enforce keys, unique identifiers, foreign-key references, required columns, enum values, and defaults. Application validation handles rules such as text lengths and city boundary checks. Complaint submission and password reset use transactions. Several status, transfer, and feedback sequences still contain multiple independent writes; those atomicity gaps are documented rather than described as transaction-protected.

Existing indexes support exact lookup, status/department filtering, citizen history, category/ward filters, and complaint-child retrieval. The performance review recommends measuring queue orderings and event timeline sorts before adding indexes. At larger scale, connection pooling, careful pagination, query plans, and moving dashboard aggregation out of application memory are future areas to assess. No load-test or production metric was measured for this submission.

The database configuration is environment-driven. This package documents schema and code only; no credentials, live database contents, or fabricated query outputs are included. SQL execution and local screenshots remain pending until a disposable database and local demonstration are available.
