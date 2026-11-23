# Backend and database integration

## Connection and client

The backend creates one shared Prisma Client in `server/src/db.js` using Prisma 7's PrismaPg adapter. It receives the connection string from validated `server/src/env.js`; migration configuration in `server/prisma.config.js` uses `DIRECT_URL` or `DATABASE_URL`. The URL value is intentionally omitted. Production requires `DATABASE_URL`; this documentation never connected to it.

    const adapter = new PrismaPg({ connectionString: env.databaseUrl })
    export const prisma = new PrismaClient({ adapter, log: ... })

The readiness endpoint in `server/src/index.js` runs read-only `SELECT 1`. The React/Vite frontend calls the Express API; Prisma runs on the Node backend, not in the browser.

## Request and persistence examples

- Registration validates fields with Zod in `server/src/routes/auth.routes.js`, hashes the password, then creates a User with Prisma.
- Complaint submission in `server/src/routes/complaints.routes.js` validates description/location and calls `createComplaint`. `server/src/services/complaintService.js` classifies and routes the complaint, then creates Complaint, updates Issue priority, and creates StatusHistory through the transaction client.
- Complaint detail and public tracking load Complaint with related Category, Department, Ward, User summaries, Issue, Feedback, Messages, and status history.
- Officer queue and dashboard routes filter, sort, paginate, and count Complaint records in `server/src/routes/officer.routes.js`.
- Status and transfer operations update Complaint and create event rows in `server/src/services/complaintService.js`; these sequences are separate Prisma calls and not guaranteed atomic as a group.
- Feedback uses Prisma upsert with unique `complaintId`.
- Notifications are created in `server/src/services/notifyService.js` and optionally emailed/pushed. Password reset transactions are in `server/src/routes/auth.routes.js`.
- No general complaint deletion endpoint was found in reviewed routes. Foreign keys cascade some child records if a complaint is deleted through another authorized mechanism. Password reset flow deletes token records within its transaction.

Prisma failures flow into Express async error handling in `server/src/middleware/error.js`; validation errors are returned by `server/src/middleware/validate.js`. Do not assume every Prisma error receives a custom message.

## Frontend-to-database path

    React + Vite client -> HTTP / Socket.IO -> Express routes and middleware
    -> Prisma Client + PrismaPg -> PostgreSQL

The frontend API base is configured in `client/src/lib/api.js`. Endpoints are defined in `server/src/index.js` and `server/src/routes/*.routes.js`. Screenshots are pending manual demonstration; no running app or test database was available for trustworthy evidence.
