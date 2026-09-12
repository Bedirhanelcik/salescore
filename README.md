# SalesCore

**Business Sales & Customer Relationship Management Platform**

SalesCore is a full-stack CRM + Management Information System (YBS) + Business
Intelligence platform. It is built to look and behave like a real SaaS product a
sales organization would run internally — not a CRUD scaffold — combining:

- **CRM**: companies, contacts, leads, deals, activities, tasks, a drag-and-drop
  sales pipeline, and a Customer 360 view.
- **YBS (Management Information System)**: departments, employees, role-based
  access control enforced on the server, sales targets, and a full audit log.
- **BI / Analytics**: KPIs, sales funnel, revenue trend & forecast, win/loss,
  customer segmentation, pipeline velocity, team performance — all computed
  live from the relational data, plus a rule-based "Business Insights" engine
  and an optional AI Business Assistant.
- **Knowledge**: a searchable, four-language CRM/Sales/Finance/BI glossary
  wired directly into the product — metric labels on the dashboard link to
  their definition, so the app teaches the domain it operates in.

New to the product rather than the code? [`SALESCORE.md`](./SALESCORE.md) explains
what SalesCore does and why, in plain English, through a worked example — no
technical background required. This document is the technical reference.

---

## Table of contents

1. [Screenshots](#screenshots)
2. [Architecture](#architecture)
3. [Tech stack](#tech-stack)
4. [Features](#features)
5. [Database](#database)
6. [Security](#security)
7. [Authentication & RBAC](#authentication--rbac)
8. [Internationalization](#internationalization)
9. [Running locally](#running-locally)
10. [Environment variables](#environment-variables)
11. [Testing](#testing)
12. [CI/CD](#cicd)
13. [API overview](#api-overview)
14. [Project structure](#project-structure)
15. [Production considerations](#production-considerations)
16. [Known limitations & future improvements](#known-limitations--future-improvements)

---

## Screenshots

| Dashboard | Sales pipeline |
|---|---|
| ![Dashboard - KPIs, revenue trend, and Business Insights](./docs/screenshots/dashboard.jpg) | ![Drag-and-drop kanban pipeline](./docs/screenshots/pipeline.jpg) |

| Customer 360 | Analytics / BI |
|---|---|
| ![Company detail with deal history and lifetime value](./docs/screenshots/customer-360.jpg) | ![Sales funnel, revenue trend and win/loss analytics](./docs/screenshots/analytics.jpg) |

All four are the live application, not mockups — captured from a seeded demo
workspace (see [Running locally](#running-locally)).

---

## Architecture

```mermaid
flowchart TD
    subgraph Client["Browser"]
        UI["Next.js App Router UI\nTypeScript + Tailwind CSS"]
    end

    subgraph Frontend["Frontend (Next.js, port 3000)"]
        UI --> RQ["TanStack Query cache"]
        UI --> I18N["i18n context (en / tr / de / ar, RTL)"]
        UI --> Theme["Theme context (light / dark)"]
    end

    RQ -- "REST / JSON, JWT Bearer" --> MW

    subgraph Backend["FastAPI backend (port 8000)"]
        MW["Security middleware\nsecurity headers, per-IP rate limit"]
        API["API layer\napp/api/v1/endpoints"]
        SVC["Service layer\nbusiness rules, RBAC, stage-transition\nvalidation, audit logging"]
        REPO["Repository / query layer\nSQLAlchemy 2.0"]
        MW --> API --> SVC --> REPO
        SVC --> CACHE[("Redis cache\nanalytics, rate limiting")]
    end

    REPO --> DB[("PostgreSQL\ncompanies, contacts, leads, deals,\nactivities, tasks, users, audit_logs...")]

    subgraph Workers["Optional"]
        AI["AI Business Assistant\nMockAIProvider (default) or OpenAIProvider"]
    end
    SVC -. reads analytics .-> AI
```

**Layering (backend):** `api` (FastAPI routers, request/response schemas) →
`services` (business logic: ownership checks, deal-stage transition rules, audit
logging, cache invalidation) → SQLAlchemy models/session. Pydantic schemas keep
the wire format decoupled from the ORM models. Every request to `/api/v1/*`
passes through `SecurityHeadersMiddleware` and `RateLimitMiddleware` first (see
[Security](#security)).

**Layering (frontend):** route segments under `app/(app)/*` are guarded by an
`AuthProvider` and share a collapsible left `Sidebar` (Dashboard/CRM/Sales/
Analytics/Reports/Operations/Knowledge/Settings) plus a slim top `Navbar`
(search, language, theme, notifications, user menu) — the sidebar collapses to
an icon rail on desktop and an off-canvas drawer on mobile, both states
persisted per browser. Each domain has a `lib/hooks/use-*.ts` TanStack Query
hook file and, where forms are needed, a `components/<domain>/*FormModal.tsx`
built with React Hook Form + Zod.

### How a request becomes a decision

The BI layer exists to turn raw transactional rows into something a manager can
act on. That's a **Data → Information → Insight → Decision** pipeline, not a
single query:

```mermaid
flowchart LR
    D["Data\nRaw rows: deals, deal_stage_history,\nactivities, sales_targets"]
    I["Information\nAggregated metrics: win rate,\nrevenue trend, pipeline velocity"]
    N["Insight\nBusiness Insights engine turns metrics\ninto sentences: 'Proposal → Negotiation\nconversion decreased 9% this month'"]
    C["Decision\nA manager reviews lost-deal reasons,\ncoaches a rep, or reallocates pipeline"]
    D --> I --> N --> C
```

`analytics_service.get_business_insights` is the "Insight" step: it's a small
rule-based engine, not an LLM call, so it's deterministic and free to run on
every dashboard load. See [`SALESCORE.md`](./SALESCORE.md#from-data-to-a-decision)
for a concrete walked-through example of this chain.

### The sales lifecycle is a server-enforced state machine

The kanban board's drag-and-drop is a UI convenience; the actual guarantee is
this state machine, enforced identically on the frontend (`lib/deal-stages.ts`,
to grey out invalid drop targets before the request is even sent) and the
backend (`DEAL_STAGE_TRANSITIONS` in `app/models/enums.py`, the source of
truth — a request that skips a stage gets a `422` with a structured error code
regardless of what the UI allowed):

```mermaid
stateDiagram-v2
    [*] --> Lead
    Lead --> Qualified
    Qualified --> Lead
    Qualified --> Opportunity
    Opportunity --> Qualified
    Opportunity --> Proposal
    Proposal --> Opportunity
    Proposal --> Negotiation
    Negotiation --> Proposal
    Negotiation --> Won
    Lead --> Lost
    Qualified --> Lost
    Opportunity --> Lost
    Proposal --> Lost
    Negotiation --> Lost
    Won --> [*]
    Lost --> [*]
```

Every transition is also appended to `deal_stage_history`, which is what makes
the sales funnel a genuine cohort analysis ("N deals reached Proposal") instead
of a current-snapshot count, and what renders as the timeline on the deal
detail page.

---

## Tech stack

**Backend** — Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic,
PostgreSQL, Redis, JWT (python-jose), bcrypt (passlib), Pytest.

**Frontend** — Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS v4,
TanStack Query, React Hook Form + Zod, Recharts, dnd-kit, Lucide icons, Sonner
toasts.

**Infrastructure** — Docker Compose (PostgreSQL, Redis, backend, frontend).
Everything runs fully locally with no paid service required.

---

## Features

### CRM
- Companies, contacts, leads with search, filtering, sorting and pagination.
- Lead → Deal conversion (creates/reuses the company and starts a qualified deal).
- Customer 360 view: lifetime value, deal history, contacts, activities.
- Activities (call, email, meeting, note, follow-up, demo, proposal) and a
  personal/team task list with priorities and due dates.

### Sales
- Drag-and-drop Kanban pipeline (Lead → Qualified → Opportunity → Proposal →
  Negotiation → Won/Lost), backed by the server-enforced stage-transition
  state machine diagrammed above.
- Every stage change is recorded in `deal_stage_history` and rendered as a
  timeline on the deal detail page.
- Sales targets (monthly, per rep or per department) with live achievement %.

### Analytics / BI
- KPI cards (revenue, pipeline value, won deals, conversion rate, win rate,
  average deal size, active customers, target achievement), each with a
  period-over-period change indicator.
- Sales funnel computed from `deal_stage_history` (cohort "reached this stage"
  counts, not just current snapshot), revenue trend with target/forecast/
  previous-period lines, win/loss trend, customer segmentation, customer
  growth, pipeline velocity, and a team performance leaderboard.
- **Business Insights**: a small rule-based engine (`analytics_service.get_business_insights`)
  that turns the raw metrics into sentences like *"Proposal → Negotiation
  conversion decreased 9% this month"* — the Data → Information → Insight →
  Decision chain diagrammed above, without requiring an LLM.
- **AI Business Assistant** (optional): `AIProvider` abstraction with a
  `MockAIProvider` (default, rule-based, answers from the same live analytics —
  no API key needed) and an `OpenAIProvider` you can enable by setting
  `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

### YBS / Operations
- Employees, departments, and role-based access control **enforced server-side**
  (see [Security](#security) and [RBAC](#authentication--rbac)) — not just hidden buttons.
- Full audit log (`audit_logs`): who did what, to which entity, when.
- Reports module: 8 report types, date-range filters, sorting, pagination, and
  CSV export.

### Knowledge
- A searchable glossary of **39 terms** across **9 categories** (CRM, Sales,
  Marketing, Finance, Management, Business Intelligence, YBS, Software,
  Analytics — CAC, LTV, MRR/ARR, EBITDA, OKR, ROAS, ROI, Pipeline Velocity,
  Sales Cycle, Quota and more) with full translations in English, Turkish,
  German and Arabic for every term.
- Dashboard/analytics metric labels carry a small **"?"** affordance
  (`MetricHelp`) that shows the term's short definition on hover and links to
  the full glossary entry on click.

### Platform
- Global search (`Cmd/Ctrl+K` or `/`) across customers, contacts, leads, deals,
  tasks, employees and knowledge terms.
- Notifications (task due, deal won/lost, new lead, target reached) with an
  unread badge and click-through to the related deal/lead.
- Self-service registration (`/register`) alongside the demo-account login —
  the first account in a fresh workspace bootstraps as Admin, every account
  after that starts as Viewer until promoted, mirroring how most B2B SaaS
  products (Slack, Notion, etc.) bootstrap a new workspace.
- A Settings page for profile info, password changes, and language/theme
  preferences, in addition to the navbar's quick switchers.
- Dark/light theme and 4-language i18n (see below), both persisted per browser.
- Empty states, loading skeletons, and a consistent `{success, error: {code,
  message}}` error envelope surfaced as toasts on the frontend.
- Responsive down to phone widths: the sidebar becomes an off-canvas drawer,
  data tables and the pipeline board scroll horizontally inside their own
  container instead of the page itself scrolling sideways, and multi-column
  forms collapse to a single column below the `sm` breakpoint.
- A branded app icon/manifest and a ~2.2s animated startup splash (`AppIntro`)
  shown once per real page load — never on client-side navigation between
  pages — that stays up until session restore has actually resolved, so
  there's no blank-page or wrong-route flash (e.g. the login form for an
  already-signed-in session) before the correct screen is shown.

---

## Database

Relational schema (PostgreSQL via SQLAlchemy 2.0 models, one file per entity
under `backend/app/models/`):

`users` · `departments` · `companies` · `contacts` · `leads` · `deals` ·
`deal_stage_history` · `activities` · `tasks` · `sales_targets` ·
`notifications` · `audit_logs` · `knowledge_categories` · `knowledge_terms`

Key relationships: a `User` belongs to a `Department` and may own many
`Company`/`Contact`/`Lead`/`Deal` records; a `Deal` belongs to a `Company` and
has many `DealStageHistory` rows; `Task`/`Activity` optionally reference a
`Deal` and/or `Company`. Foreign keys, indexes (e.g. `deals.stage`,
`companies.name`, `audit_logs.entity_type`) and unique constraints (e.g.
`users.email`, `departments.name`) are defined on the models and captured in
the Alembic migration at `backend/alembic/versions/`.

---

## Security

- **Passwords**: hashed with bcrypt (`passlib`), never stored or logged in
  plaintext.
- **Sessions**: stateless JWT bearer tokens (`python-jose`, HS256), 12-hour
  expiry by default (`ACCESS_TOKEN_EXPIRE_MINUTES`). The frontend stores the
  token client-side and sends it as `Authorization: Bearer <token>`.
- **Authorization is enforced server-side, per record**, not just at the
  router level — see [RBAC](#authentication--rbac). A Sales Rep who guesses
  another rep's deal ID in the URL gets a `403`, not the record.
- **Security headers** (`SecurityHeadersMiddleware`): `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-XSS-Protection` on every response.
- **Per-IP rate limiting** (`RateLimitMiddleware`): a fixed-window limiter
  backed by the shared cache (Redis, or an in-process fallback — see
  [Environment variables](#environment-variables)) rejects requests over
  `RATE_LIMIT_PER_MINUTE` (120/minute by default) with a `429` and a
  structured error body, scoped to `/api/v1/*`.
- **CORS** is an explicit allow-list (`CORS_ORIGINS`), not a wildcard.
- **Production-safety guard**: `core/config.py` refuses to start the app at
  all when `ENV=production` and `JWT_SECRET_KEY` or `DATABASE_URL` are still
  their insecure development defaults — a deployment mistake a README
  warning can't actually prevent, so it's enforced in code
  (`backend/tests/test_config.py` covers this).
- **Audit trail**: every write to a tracked entity is recorded in
  `audit_logs` (actor, action, entity type/id, timestamp), independently
  viewable by Admin/Manager/Analyst.

---

## Authentication & RBAC

JWT bearer tokens (`python-jose`), bcrypt password hashing. Five roles:

| Role | Can see | Can write |
|---|---|---|
| **Admin** | Everything | Everything, incl. employees/departments |
| **Manager** | Everything | All CRM records, sales targets, employee updates |
| **Sales Rep** | Only records they own | Only records they own |
| **Analyst** | Everything | Nothing (read-only) |
| **Viewer** | Everything | Nothing (read-only) |

This is enforced in `backend/app/core/rbac.py` and applied inside every
service function (not just at the router level), so a Sales Rep who guesses
another rep's deal ID in the URL gets a `403 FORBIDDEN`, not the record — this
is covered by `backend/tests/test_rbac.py`.

### Permission matrix by resource

A finer-grained view of the same enforcement, by resource type — "own" means
a Sales Rep sees/writes only records where they are the assigned owner:

| Resource | Admin | Manager | Sales Rep | Analyst | Viewer |
|---|---|---|---|---|---|
| Companies / Contacts / Leads / Deals | Read & write all | Read & write all | Read & write **own only** | Read all | Read all |
| Tasks / Activities | Read & write all | Read & write all | Read & write **own only** | Read all | Read all |
| Sales targets | Read & write | Read & write | Read only | Read only | Read only |
| Employees | Read & write (create/update/delete) | Read & update | Read only | Read only | Read only |
| Departments | Read & write | Read only | Read only | Read only | Read only |
| Reports / Analytics | Full | Full | Full (scoped to own data where applicable) | Full | Full |
| Audit log | Yes | Yes | No | Yes | No |

New accounts are provisioned two ways: an Admin creates one directly
(`POST /employees`, Admin-only), or a person self-registers at `/register`
(`POST /auth/register`) — the first account in an empty workspace bootstraps
as Admin so there's always someone able to manage employees, and every
account after that starts as Viewer until an Admin or Manager promotes it.

---

## Internationalization

Real i18n architecture, not hard-coded strings: JSON dictionaries per locale
under `frontend/locales/{en,tr,de,ar}/common.json` (319 keys each, kept at 1:1
parity by construction), loaded through a React context
(`frontend/lib/contexts/i18n-context.tsx`) with a `t(key)` helper. Locale and
theme are persisted to `localStorage` and restored on load.

Arabic is a full RTL experience, not just translated strings: selecting it
flips `document.dir`, and the navbar, dropdowns, tables, kanban board, mobile
drawer and charts use Tailwind's `rtl:` variants (and, where the underlying
layout is normal block flow, direction-aware CSS by default) to mirror
correctly — icons, paddings, progress-bar fill direction, dropdown anchoring,
and the mobile navigation drawer sliding in from the correct edge.

Knowledge base terms carry all four languages as columns on `knowledge_terms`
so the same term detail page renders correctly regardless of UI language.

---

## Running locally

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, Redis, the FastAPI backend (`:8000`) and the Next.js
frontend (`:3000`). On first run, apply migrations and seed demo data:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed.seed_data
```

Open **http://localhost:3000** and sign in with any demo account below.

### Option B — Run natively (no Docker)

Backend:

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
# Point DATABASE_URL at your own Postgres, or use SQLite for local dev:
echo DATABASE_URL=sqlite:///./dev.db > .env
python -m app.seed.seed_data       # creates schema + demo data
uvicorn app.main:app --reload
```

Frontend (separate terminal):

```bash
cd frontend
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 > .env.local
npm run dev
```

> Redis is optional in native mode — `app/core/cache.py` falls back to an
> in-process cache automatically if it can't connect, so the app still runs
> without it (rate limiting and analytics caching just become per-process).

### Demo accounts

Seeded by `python -m app.seed.seed_data`. All development-only — rotate before
any real deployment.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@salescore.io` | `Admin123!` |
| Manager | `manager@salescore.io` | `Manager123!` |
| Sales Rep | `sales@salescore.io` | `Sales123!` |
| Analyst | `analyst@salescore.io` | `Analyst123!` |
| Viewer | `viewer@salescore.io` | `Viewer123!` |

The login page also has one-click buttons that autofill these.

---

## Environment variables

See [`.env.example`](.env.example) for the full list with defaults. Highlights:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (Postgres in Docker, SQLite ok for native dev) |
| `REDIS_URL` | Cache / rate-limit backend (optional — falls back gracefully) |
| `JWT_SECRET_KEY` | Sign JWTs — **change this in any real deployment** |
| `ENV` | `development` (default) or `production` — when `production`, the app refuses to start if `JWT_SECRET_KEY` or `DATABASE_URL` are still their insecure development defaults |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |
| `RATE_LIMIT_PER_MINUTE` | Per-IP request cap on `/api/v1/*` (default 120) |
| `AI_PROVIDER` | `mock` (default, no key needed) or `openai` |
| `OPENAI_API_KEY` | Only read when `AI_PROVIDER=openai` |
| `NEXT_PUBLIC_API_URL` | Frontend → backend base URL |

`.env` is git-ignored; never commit real secrets.

---

## Testing

```bash
cd backend
.venv\Scripts\activate
pytest -q
```

107 tests covering authentication, self-registration (first-user-becomes-admin
bootstrap, subsequent users, duplicate-email rejection), password change,
company/contact/lead/deal/task/activity/department/sales-target CRUD,
pagination & search/status/source/stage/value/type filters, deal
stage-transition rules (including the terminal-state and invalid-skip
cases), lead conversion, sales target achievement calculation, audit log
recording (including stage-change metadata) and its own RBAC (Sales Rep
blocked, Analyst allowed), RBAC/IDOR protection on companies, contacts,
leads, deals and tasks (a Sales Rep cannot read or
write another rep's records of any type; Analyst/Viewer cannot write at all;
only Admin can create employees), analytics correctness on both an empty
database and after creating/won-ing a deal, and the `ENV=production`
insecure-defaults guard described in [Security](#security).

The suite has directly caught real bugs during development, most notably:
- `Deal.created_at <= end` (and similar) on a DateTime column, compared
  against a bare `date` upper bound, silently drops same-day rows (SQLAlchemy
  coerces the date to midnight) — hit the Reports module and the Conversion
  Rate KPI; fixed with an exclusive `< end + 1 day` bound everywhere it occurred.
- Listing tasks crashed (`TypeError: can't compare offset-naive and
  offset-aware datetimes`) whenever an overdue task existed, because SQLite
  doesn't round-trip timezone info on DateTime columns - `test_tasks.py`'s
  `test_list_tasks_with_due_date_does_not_crash` now guards this permanently.

Tests run against an in-memory SQLite database via dependency-injected
sessions (`backend/tests/conftest.py`), so they don't touch your dev database.

The frontend has no automated test suite yet — see
[Known limitations](#known-limitations--future-improvements) — but every page
is exercised by `tsc --noEmit`, ESLint, and a full `next build`, and this
session's mobile/RTL/dark-light/auth-flash work was additionally verified
against the running app in a real browser rather than by code review alone.

---

## CI/CD

- **Backend**: [Ruff](https://docs.astral.sh/ruff/) for both linting and
  formatting (`backend/pyproject.toml`) — `ruff check .` and
  `ruff format --check .`.
- **Frontend**: ESLint (`npm run lint`, including the React Compiler's
  `react-hooks` rules) and Prettier (`npm run format:check`).
- **CI** (`.github/workflows/ci.yml`, GitHub Actions, on every push/PR to
  `main`/`master`): two parallel jobs —
  - `backend`: install deps → `ruff check` → `ruff format --check` → `pytest`
    (against an ephemeral SQLite DB, isolated from any real database).
  - `frontend`: `npm ci` → `npm run lint` → `npm run format:check` →
    `npm run build` (a real production build must succeed, not just typecheck).
- There is no deployment step configured yet — CI currently gates merges on
  quality, it does not ship anywhere. See
  [Production considerations](#production-considerations).

---

## API overview

Versioned REST API under `/api/v1`, interactive docs at `/api/docs` (Swagger)
and `/api/redoc`. Every error response follows:

```json
{ "success": false, "error": { "code": "DEAL_NOT_FOUND", "message": "The requested deal was not found." } }
```

Representative endpoints:

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/companies?search=&status=&page=&page_size=
GET    /api/v1/companies/{id}/360
POST   /api/v1/leads/{id}/convert
GET    /api/v1/deals/pipeline
PATCH  /api/v1/deals/{id}/stage
GET    /api/v1/analytics/kpis?days=30
GET    /api/v1/analytics/customer-growth?months=12
GET    /api/v1/analytics/insights
GET    /api/v1/reports/{type}?format=csv
GET    /api/v1/audit-logs
GET    /api/v1/knowledge/terms?search=
POST   /api/v1/ai/ask
```

---

## Project structure

```
salescore/
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml        # lint + test + build, on every push/PR
├── docs/screenshots/                # images used in this README
├── SALESCORE.md                     # plain-English product walkthrough
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # FastAPI routers (one file per domain)
│   │   ├── core/                 # config, security, rbac, cache, middleware
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── services/               # business logic, one file per domain
│   │   └── seed/                   # demo data + knowledge base content
│   ├── alembic/versions/           # database migrations
│   ├── pyproject.toml               # Ruff lint + format config
│   └── tests/
└── frontend/
    ├── app/
    │   ├── icon.tsx, apple-icon.tsx, manifest.ts  # generated brand icons + PWA manifest
    │   ├── login/, register/
    │   └── (app)/                  # authenticated routes (dashboard, crm, sales, settings, ...)
    ├── components/
    │   ├── layout/                  # Sidebar, Navbar, Logo, Splash, AppIntro
    │   ├── ui/, charts/               # design-system primitives, chart components
    │   └── <domain>/                  # per-domain form modals
    ├── lib/
    │   ├── contexts/                # auth, theme, i18n
    │   ├── hooks/                    # TanStack Query hooks, one file per domain
    │   └── types.ts                   # frontend mirror of backend schemas
    ├── locales/{en,tr,de,ar}/common.json
    └── .prettierrc.json
```

---

## Production considerations

This project is built to demo-quality-that-doesn't-cut-corners, not to be
deployed as-is. Before running it for real traffic:

- **Database**: point `DATABASE_URL` at a real, backed-up PostgreSQL instance
  and run `alembic upgrade head` — the SQLite path used in native dev mode is
  for convenience only and isn't exercised by the Alembic migration history.
- **Secrets**: generate a long, random `JWT_SECRET_KEY` and a real
  `DATABASE_URL`; the app will refuse to boot with `ENV=production` and the
  development defaults still in place (see [Security](#security)), but you
  still need to actually set them via your deployment's secret manager, not
  a committed `.env`.
- **TLS/reverse proxy**: neither service terminates TLS itself; put both
  behind a reverse proxy (nginx, Caddy, a cloud load balancer) that does.
- **Rate limiting is per-process**: the fixed-window limiter uses the shared
  Redis cache when configured, but if you run multiple backend replicas
  without Redis it degrades to per-replica limits, not a global one.
- **Background work runs synchronously**: there is no task queue (see
  [Known limitations](#known-limitations--future-improvements)) — analytics
  queries are cheap enough at demo data scale to run inline, but that's a
  scale assumption worth revisiting before heavy report generation or
  scheduled digest emails.
- **Observability**: structured request logging exists via FastAPI/Uvicorn's
  defaults; there's no APM/error-tracking integration (Sentry, etc.) wired up.
- **CORS**: `CORS_ORIGINS` must be set to your real frontend origin(s) — the
  default only allows `localhost:3000`.

---

## Known limitations & future improvements

Documented honestly rather than left silently unfinished:

- **No frontend automated test suite.** Correctness on the frontend currently
  rests on TypeScript, ESLint, a production build, and manual/browser-driven
  verification — there's no Playwright/Vitest suite yet (see below).
- **Single-tenant.** There is no organization/workspace isolation — every
  user in the database shares one CRM instance, scoped only by role and
  record ownership, not by tenant.
- **Background jobs**: analytics are cached in Redis (short TTL) and the
  queries are cheap enough at this data scale to run synchronously; a real
  task queue (Celery/RQ) would be the next step for heavier report generation
  or scheduled notification digests at larger scale.
- **Business Insights / AI Assistant localization**: the rule-based insight
  sentences and the AI assistant's answers are generated in English regardless
  of UI language; localizing generated text is a larger effort than
  translating static UI strings and was left for a follow-up.
- **WebSocket/live notifications**: notifications currently poll; a
  websocket or SSE channel would make them push-based.
- **File attachments** on deals/companies (e.g. proposal documents) are not
  supported.
- **E2E tests** (Playwright) covering the drag-and-drop pipeline and full
  login → create → convert → close user journeys, complementing the backend's
  Pytest suite, would close the frontend test-coverage gap above.

---

## License

Built as a portfolio/demo project. No license file included — add one before
any public redistribution.
