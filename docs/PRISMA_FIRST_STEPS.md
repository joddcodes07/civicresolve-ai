# Prisma, explained for Dhruv

You now have a local PostgreSQL database with sourced Pune reference data loaded through Prisma. This is a real database on your Mac; it is not yet a public cloud deployment. Supabase is optional and is not used here.

## What each part does

| Part | What it does in CivicResolve |
| --- | --- |
| PostgreSQL | Stores users, complaints, departments, schools/hospitals and ward geometry |
| Prisma schema | Describes the tables, fields and relationships |
| Migration | A versioned SQL change to the database structure |
| Prisma Client | JavaScript methods your backend uses to read/write those tables |
| Express | Accepts browser requests, checks permissions and calls Prisma |
| React | Displays the returned data in Vaibhav's design |

A typical flow is: citizen submits form → Express validates it and checks the user → AI routes it → Prisma saves it in PostgreSQL → Express returns a tracking ID.

## Where your code lives

- `server/prisma/schema.prisma`: models such as User, Department, Complaint and SensitivePlace.
- `server/prisma/migrations/`: committed database changes. Commit these with the feature that needs them.
- `server/prisma.config.js`: migration connection configuration. It prefers `DIRECT_URL`.
- `server/src/db.js`: the shared Prisma Client, using `DATABASE_URL`.
- `server/scripts/import-pune.js`: adds the sourced Pune reference data without replacing existing rows.
- `server/.env`: your private local connection/passwords. It is ignored by Git.

## The database prepared in this session

The working checkout is under `work/civicresolve-ai` in this chat's folder. Your original Desktop folder remains untouched. The private `.env` points to local PostgreSQL port **55439**, database **civicresolve_dhruv**. This database currently contains 58 historical ward shapes and 738 OSM school/hospital locations, plus the project's 14 routing departments and 27 categories. Application SLA targets still need official PMC confirmation.

To restart that isolated local cluster if it is stopped:

```sh
PGBIN=/Library/PostgreSQL/15/bin PGPORT=55439 PGDATABASE=civicresolve_dhruv bash scripts/db.sh up
```

Then, from the working checkout:

```sh
API_PROXY_TARGET=http://localhost:4001 npm run dev
```

The API's private `.env` uses port 4001; Vite uses port 5173. In a fresh checkout the defaults are API 4000 and Vite 5173. Voice/translation require a private Groq key; email requires SMTP.

## Look at tables without writing SQL

From the project root:

```sh
cd server
npx prisma studio
```

Open the local address printed by Studio. Find `Department`, `Ward` and `SensitivePlace`. Studio can edit records as well as view them, so treat it like an admin database editor. Never share its URL publicly.

## Read records in backend code

Use the existing shared client:

```js
import { prisma } from '../db.js'

const departments = await prisma.department.findMany({
  orderBy: { name: 'asc' },
})

const myComplaints = await prisma.complaint.findMany({
  where: { citizenId: req.user.id },
  include: { department: true, category: true },
  orderBy: { createdAt: 'desc' },
})
```

`findMany` returns an array. `where` filters it. `include` brings related records. The authenticated user's ID comes from the server, not a citizenId supplied by the browser. That prevents someone reading another person's complaints.

## Change a table safely

Suppose a future feature needs `preferredLanguage` on User. First pull the latest main and create your own feature branch. Back up any database with data you need.

1. Add the field to `schema.prisma`, for example `preferredLanguage String @default("en")` inside User.
2. Run this against your development database:

```sh
npm --workspace server exec -- prisma migrate dev --name add_preferred_language
npm --workspace server run prisma:generate
```

3. Inspect the generated SQL migration. Confirm it does not drop data you need.
4. Update the backend feature, test it, and commit both schema and migration in your feature PR.
5. Production uses only reviewed committed migrations:

```sh
npm --workspace server run prisma:deploy
```

Do not run `migrate dev`, `db push`, or `prisma:reset` on a shared production database. `prisma:generate` regenerates JavaScript client code; it does not create tables or import data. `prisma:deploy` applies committed structural changes; it does not add example complaints.

## Import data versus migrate schema

```sh
npm --workspace server run data:import
```

This loads reference rows into existing tables. It is safe to rerun and preserves existing values. It does not fabricate real complaints or account identities.

For a permissioned real complaint export, follow `DHRUV_HANDOFF.md`. The original `db:seed` script is a synthetic demo builder and is now blocked on nonempty databases. Do not confuse demo records with actual PMC complaints.

## Commands you will use most

| Command from project root | Purpose |
| --- | --- |
| `npm --workspace server run prisma:generate` | Regenerate Prisma Client after schema changes |
| `npm --workspace server exec -- prisma migrate dev --name feature_name` | Create/apply a development migration |
| `npm --workspace server run prisma:deploy` | Apply reviewed committed migrations |
| `npm --workspace server run data:import` | Add the sourced reference snapshot |
| `npm test` | Run unit/provider checks |
| `npm run build` | Check the React production build |

## What GitHub will do

Your draft PR proposes only Dhruv's backend work and small client integrations. A PR does not change main by itself. Vaibhav can inspect each changed line, run checks, request fixes, and then merge. Do not click reset database or force-push while learning. After a PR is merged, your friends pull main and apply the committed migrations to their own databases.

The complete credential checklist, API contracts, data limitations, deployment instructions and handoff steps are in `DHRUV_HANDOFF.md`.
