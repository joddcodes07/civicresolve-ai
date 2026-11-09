# CivicResolve-AI

**One window for every department.**
*Route it right · Track it live · Prove it's fixed.*

An AI-based single window that lets a citizen lodge and track a grievance across **any** municipal
department — in English, हिंदी or मराठी, by typing, speaking or photographing the problem. The AI
routes it to the right desk, the citizen gets **one ID and one live timeline**, and the complaint can
only be closed with **proof of the fix** (an after-photo + a real note) **and** the citizen's
confirmation.

> Response to **Problem Statement #343** — *"Suggest an AI-based solution to enable ease of grievance
> lodging and tracking for citizens across multiple departments."* (Smart Automation · Software)

---

## Why it exists

| Pain point today | What CivicResolve-AI does |
|---|---|
| The citizen doesn't know which department handles their problem | One form for all 14 departments — the AI picks the category and department. Low-confidence cases go to a human, not to a guess. |
| The same pothole is reported 50 times | Nearby, similar reports merge into one **Issue** with a report count. |
| Urgent cases get buried | Every complaint gets a transparent **0–100 priority score with reasons**, sorted first. |
| Files get closed as "forwarded" without anything being fixed | Closing requires an **after-photo + a specific note**; vague notes are blocked, and the citizen can reopen. |

---

## Feature tour

**Citizen portal**
- **Home** — editorial hero with a live "living map" (tilted city grid, pins drop in, tap one for its data card), animated counters, department ticker.
- **Lodge a complaint** — 3 steps (Describe → Photo & location → Review) with a **live AI card** that fills in as you type: category, department, confidence, priority score *with reasons*, and the SLA deadline.
- **Voice input** — browser speech-to-text (English / हिंदी / मराठी), no install.
- **Auto location + ward** — GPS or drag the pin; the ward is resolved by point-in-polygon.
- **"Already reported?"** — if a nearby open complaint matches, you can +1 it instead of duplicating.
- **Shikayat Saathi (chat)** — the same backend, as a conversation.
- **Track by ID** — no login needed. Big status, timeline, **SLA ring**, before/after slider, conversation, and **Confirm / Reopen** with a rating.
- **Public issue map** — grouped pins (the badge is how many citizens reported it), heatmap toggle.
- **My complaints**, **Departments**, **Help**, 3-language switch everywhere.

**Officer console**
- **Priority queue** sorted by score (not by date), with the *reasons* on every row, SLA tags, KPI cards, filters (urgent / safety / breached / needs-review / reopened), search and CSV export.
- **Complaint detail** — full context, timeline, conversation, location, transfer history.
- **Transfer** to the right department with a reason (counted as an AI correction).
- **Proof-of-fix resolve** — the submit button stays disabled until the note is specific and an after-photo is attached.

**Admin / commissioner**
- **City overview** — KPIs, weekly trend, category bars, DPI table, escalation counts.
- **Escalations** (Level 1 dept head / Level 2 commissioner), **Needs-review queue** with manual routing, **Department scorecard (DPI)**, **AI accuracy** per category, **Heatmap**, **Settings** (SLA hours per department, DPI weights, duplicate threshold).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite · **Tailwind CSS v4** · React Router 7 · Leaflet · Recharts · Motion · canvas-confetti · Socket.IO client |
| Backend | Node.js · **Express 5** · **Prisma 7** · PostgreSQL 18 · bcrypt + JWT · multer · Socket.IO · node-cron · nodemailer |
| AI | A local, deterministic multilingual rules classifier (**works with zero API keys**) that upgrades to an LLM (Groq / OpenAI / Gemini / Ollama) when configured — and silently falls back on any error |

Everything runs on free, open-source tooling on a laptop.

---

## Quick start

**Prerequisites:** Node ≥ 22 and PostgreSQL binaries (`initdb`, `pg_ctl`, `psql`). The scripts look for
Postgres in the common Homebrew / EDB / Postgres.app locations, or you can point at it with `PGBIN=/path/to/bin`.

```bash
# 1. install dependencies
npm install

# 2. create + start the project-local Postgres cluster (port 5433, trust auth)
#    ...then generate the client, run migrations and seed the demo city
npm run db:setup

# 3. run the API and the web app together
npm run dev
```

Open **http://localhost:5173** — the API runs on **http://localhost:4000**.

> **Note on `npm install`:** if your shell exports `NODE_ENV=production`, npm skips devDependencies.
> Use `npm install --include=dev` in that case.

### Demo accounts (password `demo1234`)

| Role | Email | What to explore |
|---|---|---|
| Citizen | `citizen@civic.test` | Lodge, track, confirm/reopen, my complaints |
| Officer | `officer@civic.test` | Roads & Footpaths (PWD) priority queue, proof-of-fix resolve, transfer |
| Admin | `admin@civic.test` | City overview, escalations, review queue, DPI, AI accuracy, heatmap, settings |

The sign-in page has **one-click demo buttons** for each role.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web app with hot reload |
| `npm run db:setup` | Start Postgres → generate client → migrate → seed |
| `npm run db:seed` | Re-seed the demo city (idempotent) |
| `npm run db:down` | Stop the project-local Postgres |
| `npm test` | Unit tests for the seven formulas + the classifier |
| `npm run build` | Production build of the web app |

---

## The AI engine (and why it never breaks)

`aiService.classifyComplaint(text)` runs one pipeline:

1. **Mask** phone numbers, Aadhaar-like numbers and emails *before* anything leaves the server.
2. **Route** — if `LLM_PROVIDER` + a key is set, one JSON-mode LLM call (`temperature: 0`) with a strict
   category list and few-shot examples. Otherwise the **local rules engine** scores the text against a
   multilingual keyword lexicon (English + Devanagari + Hinglish) with per-category weights.
3. **Validate** against the database taxonomy and clamp severity.
4. **Confidence gate** — below **60%** → `needsReview`, into the admin queue. Any LLM failure or timeout
   falls back to the rules result, so **a complaint is never lost**.

To upgrade to an LLM, just edit `server/.env` — no code changes:

```ini
LLM_PROVIDER=groq          # groq | openai | gemini | ollama
LLM_API_KEY=your_key
LLM_MODEL=openai/gpt-oss-20b
```

### The seven formulas (all pure functions, all unit-tested)

| | Formula | Where |
|---|---|---|
| **F1** | Priority `P = 10·severity + 20·safety + crowd + overdue + 15·reopened + 10·nearSchool` → capped at 100, with reasons | `priorityService.js` |
| **F2** | SLA `dueAt = filedAt + slaHours`; used% → green < 50%, amber 50–100%, red breached | `slaService.js` |
| **F3** | Escalation: overdue ≤ 0 → L0 · ≤ 24h → L1 (dept head) · > 24h → L2 (commissioner) | `slaService.js` |
| **F4** | Duplicate = same category ∧ open ∧ distance ≤ radius ∧ text similarity ≥ 0.80 | `dupService.js` |
| **F5** | Verified Resolution Rate = confirmed ÷ (confirmed + reopened) | `metricsService.js` |
| **F6** | DPI = 0.4·on-time% + 0.4·VRR% + 0.2·(rating ÷ 5 × 100) | `metricsService.js` |
| **F7** | AI routing accuracy = (total − transferred) ÷ total, also per category | `metricsService.js` |

**Worked example (F1)** — an open manhole near a school, reported by 3 citizens:
`s5→50 + safety→20 + crowd 2×(3−1)=4 + school→10 = 84 → Urgent`. The officer's screen shows exactly
those reasons.

---

## Architecture

```
ASDGrpProj/
├── scripts/db.sh              # project-local Postgres cluster (port 5433)
├── server/
│   ├── prisma/schema.prisma   # 13 models: users, departments, categories, wards, issues,
│   │                          # complaints, status history, transfers, messages, feedback…
│   ├── prisma/seed.js         # 14 depts · 27 categories · 12 wards · 20 users · 67 complaints
│   └── src/
│       ├── index.js           # express + socket.io + static uploads + error handling
│       ├── data/taxonomy.js   # the master multilingual lexicon (shared by seed + classifier)
│       ├── services/          # aiService · classifier · provider/llm · priority · sla · dup ·
│       │                      # metrics · proof · notify · complaintService
│       ├── routes/            # auth · meta · ai · complaints · officer · admin · issues
│       ├── jobs/slaCron.js    # every 15 min: escalate late cases + auto-confirm stale ones
│       └── tests/             # 24 unit tests
└── client/
    └── src/
        ├── index.css          # the "Civic Index" design system (Tailwind v4 @theme tokens)
        ├── components/ui/     # Button (fill-sweep), Pills, SectionLabel, SlaRing, Modal, Toast…
        ├── components/domain/ # LiveAiCard, LivingMap, IssueMap, LocationPicker, Timeline,
        │                      # BeforeAfter, PhotoDrop, ComplaintRow
        ├── pages/citizen|officer|admin/
        └── lib/               # api · auth · i18n (en/hi/mr) · socket · image compression · lite mode
```

**Realtime:** Socket.IO rooms `complaint:<code>`, `officers:<departmentId>`, `user:<id>`, `admins`.
A status change updates the citizen's tracking page live (and pops a toast) without a refresh.

**Scheduled job:** `jobs/slaCron.js` runs `*/15 * * * *` — it escalates overdue complaints (F3) and
auto-confirms anything resolved 7 days ago with no reply.

---

## API surface

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/register` · `/login` · GET `/me` · `/demo-accounts` | public |
| GET | `/api/meta/departments` · `/categories` · `/wards` · `/city` · `/stats` | public |
| POST | `/api/ai/preview` (live AI card, no save) | anyone |
| POST | `/api/complaints` (AI + duplicate + priority + notify) | citizen |
| GET | `/api/complaints/track/:code` (public, no PII) · `/mine` · `/duplicates` | public / citizen |
| POST | `/api/complaints/join` · `/:id/feedback` · `/:id/messages` | citizen |
| GET | `/api/complaints/:id` | officer / admin |
| PATCH | `/api/complaints/:id/status` (**proof-of-fix gate**) | officer / admin |
| POST | `/api/complaints/:id/transfer` · `/:id/photo` | officer / admin |
| GET | `/api/officer/queue` · `/stats` · `/reopened` · `/map` | officer |
| GET | `/api/admin/overview` · `/complaints` · `/escalations` · `/review` · `/departments` · `/ai-accuracy` · `/heatmap` · `/settings` | admin |
| POST/PUT | `/api/admin/review/:id/assign` · `/settings` | admin |
| GET | `/api/issues/map` · `/api/issues/:id` | public |

All queries go through Prisma (no string-built SQL). Requests are rate-limited, inputs are validated
with Zod, and role guards protect every officer/admin route.

---

## Verification

```bash
npm test        # 24 unit tests
```

The suite covers the F1 worked example (84), crowd/overdue caps, F2 colours, F3 levels, F5/F6/F7
worked examples, the proof-of-fix gate (blocks "forwarded…", requires an after-photo), duplicate
similarity, point-in-polygon, PII masking, and the classifier across English / Hindi / Marathi / Hinglish.

---

## Configuration (`server/.env`)

| Key | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres@127.0.0.1:5433/civicresolve` | the project-local cluster |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | dev value | **change in production** |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` | empty | leave blank for the local rules classifier |
| `MAIL_ENABLED` + `SMTP_*` | `false` | email is logged + recorded in-app when off |
| `SLA_CRON_ENABLED` / `SLA_CRON_SCHEDULE` | `true` / `*/15 * * * *` | escalation watchdog |

---

## Notes on the data

The demo city (wards, complaints, feedback) is **synthetic** and hand-written, spanning English, Hindi,
Marathi and Hinglish. It is seeded through the real classifier and the real formulas, so every row
carries genuine AI confidence, priority scores, SLA deadlines and duplicate groupings. It is a
demonstration dataset, not government data.

## Roadmap (V2)

WhatsApp / IVR channels · real SMS (DLT) · PWA offline mode · MapLibre 3D · field-officer live location ·
"fixed this week" public wall · a fine-tuned Indic model, and integration with eGov DIGIT PGR / CPGRAMS.

---

*Built with React, Node, Express, Prisma and PostgreSQL.*
