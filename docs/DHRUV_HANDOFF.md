# Dhruv backend handoff

## Scope and teammate protection

Branch: `dhruv/backend-auth-ai`; base: `main` in `joddcodes07/civicresolve-ai`.

This work integrates with the existing design. There is no redesign, branch deletion, forced update, or direct push to main. The client changes connect the existing voice hook to the backend, authenticate socket connections, and obtain sign-in counters from the API. Vaibhav must review the draft PR before merging. Yashpal retains ownership of new screen designs and email templates.

## Implemented

- Prisma 7/PostgreSQL configuration, committed migrations, separate migration connection (`DIRECT_URL`); Supabase is not required.
- Additive reference-data import; refuses to overwrite existing departments, categories, wards, and places. Demo seeding refuses nonempty databases and production.
- Citizen signup/login with email or phone and hashed passwords. Public registration always creates a citizen. Officer/admin provisioning uses a trusted CLI and an approved work-email domain.
- Password reset email endpoint, hashed 30-minute tokens, atomic single-use consumption, and revocation of existing bearer tokens after password change.
- Authenticated complaint submission with actual user identity, server validation, Pune boundary containment, 5 MB photo limit and file signature checks, five successful complaints per citizen per India calendar day enforced in a PostgreSQL transaction with a per-account lock.
- Groq JSON routing with schema validation and PII masking. Language, English translation, category, department, severity, confidence and human-review flag. Below 70% requires review. Without a provider, non-English fallback reports are explicitly untranslated and require review.
- Coordinate-based 200 m school/hospital priority boost, preserved through later status updates; same-category 50 m / 7-day possible duplicate matching; atomic complaint creation and grouping.
- Authenticated Groq Whisper transcription endpoint and connection to the existing Speak button. Recording stops at 60 seconds. Provider failure is actionable; no fabricated transcript.
- SLA senior reassignment to department head / first configured administrator; history and notifications. Configure real staff before enabling the scheduler.
- In-app notifications and SMTP calls on receipt and every implemented status change; private notification list and read API.
- Audited officer AI category/department override; department checks for complaint access and transfer; owner-only feedback and private conversations.
- Existing map API now returns heatmap data, ward/department/category/status/priority filters and validated bounding boxes. Live counters remain database driven.
- Production static frontend serving, readiness endpoint, Docker/Compose package, and GitHub Actions integration checks.

## Data actually loaded

An isolated local PostgreSQL database contains 14 application departments, 27 multilingual categories, 58 historical 2022 Pune electoral wards, and 738 named school/hospital locations clipped to those polygons. No citizen users, citizen complaints, or photos were fabricated for this reference import. Tests create and remove their own temporary records.

Ward geometry is independently digitized from PMC maps, licensed MIT: https://github.com/answerquest/pune-2022-wards . It is historical reference data, not certified current municipal geography. School/hospital locations are © OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright . The download date and per-record URLs are retained. Review attribution and share-alike obligations when redistributing the database.

Inherited department names and SLA hours are application proposals, not verified official PMC commitments. The provenance endpoint exposes this distinction. Replacing those values with a current PMC registry/charter needs a source and review. Existing teammate values are preserved on re-import.

## What Dhruv still needs to supply or configure

| Item | Where to put it | Why it is needed |
| --- | --- | --- |
| `GROQ_API_KEY` | `server/.env` only | Live translation, classification, Whisper and a live model benchmark |
| SMTP host/port/user/password, sender | `server/.env` only | Actual email delivery and password reset email |
| Approved work-email domains and staff accounts | `WORK_EMAIL_DOMAINS`, provisioning CLI | Officer/admin work logins and real escalation recipients |
| Current PMC ward/municipal geometry and department SLA source | Reviewed reference import/update | Current official geographic/service guarantees |
| Permissioned complaint export and photos | Private local import file/upload directory | 60–100 real complaints with photos; cannot be invented or passed off as authentic |
| Hosting account/target and domain | Hosting dashboard, then production environment | Public deployment; the verified deployment in this session is local PostgreSQL only |
| HTTPS reset route | `PASSWORD_RESET_URL` | Yashpal's reset screen must POST its token/password to the backend |

No map API key is required for the inherited public OpenStreetMap tile setup. Groq/SMTP/database credentials are server-only; never put them in `VITE_*`. If a paid tile provider is added later, its private key needs a separate server proxy or a restricted public browser token, depending on that provider's contract.

Phone/password signup and login work. SMS OTP verification/recovery has not been implemented because no SMS provider is configured; email reset supports accounts with an email. Do not claim phone-number ownership verification. No public endpoint grants staff roles.

Email sending uses the SMTP adapter and logs provider failure; it has no durable delivery/retry outbox. A production rollout requiring guaranteed retries should add one. Tests use a mock SMTP transport, not delivered mail. Groq adapter tests mock the remote API; there was no live key in this session.

## Run locally from a new checkout

Use Node 24 LTS and PostgreSQL. Do not reset a shared database.

```sh
npm ci
cp server/.env.example server/.env
```

Set `DATABASE_URL` and `DIRECT_URL` to your PostgreSQL connection. Generate a random JWT secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and copy it into `JWT_SECRET`. Never commit the resulting `.env`.

```sh
npm --workspace server run prisma:generate
npm --workspace server run prisma:deploy
npm --workspace server run data:import
npm run dev
```

The checked-in public data snapshot is enough to import; downloading OpenStreetMap again is optional. `data:import` can be rerun and does not replace existing records. Do not run `db:reset` against data you need.

For the isolated database prepared in this session, the private local `.env` uses PostgreSQL port **55439**, database **civicresolve_dhruv**, and API port **4001**. The standard Vite proxy targets API port 4000; change the private `.env` PORT to 4000 before `npm run dev`, or set Vite's `API_PROXY_TARGET=http://localhost:4001`. The original Desktop checkout was not edited.

## Import authentic complaints

Create/register the real citizen accounts with their authorization first. Copy permitted, validated images into the private uploads volume. A reviewed export looks like this (values below are placeholders, not data):

```json
{
  "sourceUrl": "https://your-authorized-source.example/export",
  "permission": "Describe the consent or license permitting this import",
  "complaints": [{
    "sourceId": "source-record-123",
    "text": "An authentic complaint description of at least ten characters",
    "lat": 18.5204,
    "lng": 73.8567,
    "createdAt": "2026-11-10T10:00:00Z",
    "citizenEmail": "existing-citizen@example.com",
    "photoUrl": "/uploads/validated-photo.jpg"
  }]
}
```

```sh
npm --workspace server run data:import-complaints -- /absolute/path/private-reviewed-export.json
```

The importer validates all rows before the transaction, checks city boundaries, requires existing citizens, skips already-imported source IDs, and leaves new imports in `NEEDS_REVIEW`. No historical status emails are sent. It does not bulk-create citizen identities, download photos, or overwrite existing complaints. Photographs must be verified images before being placed in uploads; the web upload API validates image signatures.

## New API contracts for Yashpal

All private endpoints require `Authorization: Bearer <token>`.

| Endpoint | Input/output |
| --- | --- |
| `POST /api/auth/register` | name, email and/or phone, password (8+); returns token and citizen |
| `POST /api/auth/login` | identifier, password; returns token and role |
| `POST /api/auth/forgot-password` | email; generic response to prevent account discovery |
| `POST /api/auth/reset-password` | token, password; consumes link and revokes old sessions |
| `GET /api/auth/notifications` | own latest 100 notifications and unread count |
| `PATCH /api/auth/notifications/:id/read` | marks only own notification read |
| `POST /api/ai/preview` | text, optional lat/lng; ai, priority, deadline, duplicate, ward |
| `POST /api/ai/transcribe` | multipart `audio`, optional language `en`/`hi`/`mr`; text/provider/model |
| `POST /api/complaints` | authenticated multipart text, lat, lng, optional categoryId/photo |
| `PATCH /api/complaints/:id/ai-override` | staff only: categoryId, reason (5+); audited update |
| `GET /api/issues/map` | bbox `minLng,minLat,maxLng,maxLat`, departmentId, categoryId, wardId, status, priority; issues + heatmap + truncated |
| `GET /api/meta/data-provenance` | source/vintage and provisional SLA disclosure |
| `GET /api/ready` | 200 when database is reachable; 503 otherwise |

Existing URLs and response fields remain available. `ai.englishText` is null when no translation is available; use `translationAvailable`. Existing priority bands include `low`; the map's `normal` filter includes scores below 40. New complaint IDs have random hexadecimal suffixes for concurrency safety; old tracking IDs still work.

## Staff provisioning

Run on a trusted terminal. Set private `WORK_USER_NAME`, `WORK_USER_EMAIL`, `WORK_USER_PASSWORD` (12+ characters), `WORK_USER_ROLE` (`OFFICER` or `ADMIN`), and for officers `WORK_USER_DEPARTMENT_CODE`. Set `WORK_USER_IS_HEAD=true` only for an approved department head. Set `WORK_EMAIL_DOMAINS` in the server environment first.

```sh
npm --workspace server run user:provision
```

This creates a new account; duplicate emails fail rather than replacing staff. Keep `DEMO_ACCOUNTS_ENABLED=false` for real deployments. Enable `SLA_CRON_ENABLED=true` on one scheduler instance after senior accounts are ready. Multiple scheduler workers have not been verified.

## Deploy on your own host, without Supabase

The included Docker Compose package runs PostgreSQL and Express, which serves the built React app. Docker Desktop was not running in this session, so the container image has not been built/tested here. Native Prisma, PostgreSQL integration, and Vite builds were tested.

1. Set `server/.env` from the example, including a strong JWT secret, production HTTPS `CLIENT_ORIGIN` and `PASSWORD_RESET_URL`, and desired provider credentials. Set `TRUST_PROXY_HOPS=1` only when deployed behind exactly one trusted reverse proxy.
2. Put a random hex `POSTGRES_PASSWORD` in a private root `.env` (64 hex characters avoids URL escaping). Never commit it.
3. Run `docker compose up --build -d`. Startup applies committed migrations only; it does not reset PostgreSQL.
4. Run `docker compose exec app npm --workspace server run data:import` and provision staff. Review historical geography/provisional SLA warnings first.
5. Place an HTTPS reverse proxy in front of port 4000. Compose binds it to loopback. Forward WebSocket upgrades for `/socket.io`.
6. Persist and back up both named volumes (`civicresolve_pg` and `civicresolve_uploads`). Do not use `docker compose down -v` on real data. Back up before upgrading schema.
7. Check `/api/ready`, sign up a citizen, lodge a report, track it, log in as staff, change status, and confirm real SMTP delivery and Groq translation.

A public deployment was not performed because no hosting account/target or production credentials were provided.

## Validation

- `npm test`: 29 passing unit/provider checks; integration suite intentionally skipped unless explicitly enabled.
- `RUN_INTEGRATION=true npm --workspace server run test:integration`: real PostgreSQL checks for ownership, role access, concurrent daily quota, duplicates, file limits, translation fallback, reset replay/revocation, notifications, override audit, SMTP adapter and senior assignment. Requires an isolated database name ending `_test` or `_dhruv`.
- `npm run build`: passes, with the inherited frontend chunk-size advisory.
- `npm --workspace server run ai:evaluate -- /absolute/path/report.json`: 30 authored English/Hindi/Marathi examples. This session's rule fallback scored 30/30 category and 30/30 language. **Zero live Groq responses; translation quality was not measured.**
- Reference importer rerun preserves existing rows; three committed migrations applied successfully to the isolated PostgreSQL database.

Provider references: https://console.groq.com/docs/speech-to-text and https://console.groq.com/docs/api-reference . Prisma configuration reference: https://www.prisma.io/docs/orm/reference/prisma-config-reference .

## Enable Google sign-in

In Google Cloud, configure Google Auth Platform and create an OAuth client with application type **Web application**. If the app is in testing, add the Google account you intend to use as a test user. Add this authorized redirect URI for local development:

```
http://localhost:5173/api/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the ignored `server/.env`. Set `CLIENT_ORIGIN=http://localhost:5173` and restart the API. In a deployment, use the public HTTPS `CLIENT_ORIGIN` and register that origin followed by `/api/auth/google/callback`. Route `/api` through the same site as the login page for the browser cookies used during sign-in.

Open `/login` and select **Continue with Google**. The first sign-in creates a citizen account. An email already registered in CivicResolve keeps its existing sign-in method. The backend verifies Google's ID token and matches returning Google accounts by their Google subject. The final browser login uses a single-use ticket that expires in one minute.
