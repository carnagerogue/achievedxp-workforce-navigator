# AchieveDXP Workforce Navigator

A production-grade job aggregation and matching platform built specifically for justice-impacted individuals. Real postings from federal, private-sector, and remote job boards are scored against each candidate's profile **and** their conviction history using two deterministic, fully auditable engines — never a black box.

The platform is live at **[web-production-059d02.up.railway.app](https://web-production-059d02.up.railway.app)**, serving postings from configured job sources plus Department of Labor lookups when CareerOneStop credentials are present. Live-data routes return an explicit official-finder fallback instead of invented records when credentials are absent.

> **Architecture status (read this first):** the deployed product is the **Next.js web app alone**. Its `/api/v1/*` route handlers are the production backend: jobs are fetched from providers with a bundled fallback, and all match scoring goes through `apps/web/lib/job-scoring.ts`. Profiles and assessments can use Postgres when accounts are enabled; guest-mode personal data is intentionally memory-only by default and resets with the server. The earlier NestJS API has been removed and is not in the request path.

---

## What problem this solves

People with criminal records routinely encounter two failure modes in mainstream job search:

1. **Black-box rankings.** They apply to dozens of jobs only to be rejected after the background check. No one tells them *why* in advance.
2. **Stigmatizing UX.** Onboarding flows force them to disclose conviction details using language ("sex offender," "violent felon") that strips dignity before they've even built a profile.

This platform inverts both:

- **Every score is explainable.** Each component contributes a known number of points; each rule that fires is recorded in an audit trail; a caseworker can reproduce any ranking by hand.
- **Dignity-centered terminology throughout.** Internal enums and user-facing labels both use neutral phrasing (`registry_related`, "Registry-related conviction") with no exceptions.
- **Conviction-to-duty matching, not blanket exclusion.** Selecting "violent offense" doesn't hide all jobs — it scores each job against the *specific duties* of that conviction class, and shows the chance band (Strong / Possible / Challenging) with full reasons.

---

## Live deployment

| Surface | URL |
|---|---|
| Web app | https://web-production-059d02.up.railway.app |
| API (retired NestJS service — its source is now in git history only) | https://api-production-6ccf.up.railway.app/api/v1 |
| GitHub | https://github.com/carnagerogue/achievedxp-workforce-navigator |

---

## Repository layout

```
workforce-navigator/
├── apps/
│   └── web/                         Next.js 14 App Router — THE deployed product
│       ├── app/                     Page routes (start, dashboard, jobs, caseworker, …)
│       ├── app/api/v1/              The production backend (route handlers)
│       ├── components/              Shared UI (JobCard, PlanWorkspace, CompatibilityDrawer, …)
│       └── lib/                     server-data.ts (data layer), providers/ (11 job sources),
│                                    job-scoring.ts (unified scorer), stores, journey engine
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── compatibility/       Conviction-aware compatibility engine
│       │   │   ├── types.ts         ConvictionType, CompatibilityRating, ScoreComponent
│       │   │   ├── risk-matrix.ts   10 conviction × duty matrices
│       │   │   ├── signals.ts       Hard-barrier + fair-chance phrase detection
│       │   │   ├── industry-sensitivity.ts
│       │   │   ├── scoring.ts       Main weighted scorer (7 components, 100 pts)
│       │   │   ├── explanations.ts  Summary / risk factors / chance improvers
│       │   │   └── __tests__/       21 acceptance tests
│       │   └── index.ts             Shared DTOs (JobDto, ConvictionDto, etc.)
├── docs/                            Backend / auth / connected-platform roadmaps
└── package.json                     pnpm workspace root
```

---

## Tech stack

| Layer | Tech | In the deployed request path? |
|---|---|---|
| Web (app + its `/api/v1/*` backend) | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons | ✅ — this is the whole live product |
| Shared | `@dxp/shared` workspace package — DTOs + the compatibility engine (pure TS, runs server-side and in the browser) | ✅ |
| Tests | Jest (`packages/shared` engine suite + `apps/web` score-agreement suite) | ✅ |
| Hosting | Railway | Web service only is user-facing |

*(The NestJS 10 + Prisma + PostgreSQL + Redis stack was removed from the repo in the consolidation — git history, commit `6553630` and earlier. The server-backed phase adds persistence to the web app's own backend instead.)*

---

## The scoring pipeline

Everything the user sees goes through **one scorer**: `scoreJobUnified` in `apps/web/lib/job-scoring.ts`. It runs identically in the `/api/v1/matches` route (dashboard buckets) and in the browser (`/jobs`, job detail, compare, Caseworker Mode), so a job can never show one score in one place and a different one elsewhere — `apps/web/lib/__tests__/score-agreement.test.ts` locks this in.

`scoreJobUnified` blends two deterministic components:

1. **Conviction compatibility** (`packages/shared/src/compatibility/` — see below): legal/duty barriers, worst-case across every conviction the person carries.
2. **Realistic fit** (`apps/web/lib/realistic-fit.ts`): seniority gap, domain/skill overlap, location.

Weights: with a conviction on file, compatibility dominates (**0.65 / 0.35**); without one, fit dominates (0.4 / 0.6). Categorical barriers — explicit clearance/security-sensitive duties, "clean record required" postings, and offense × industry legal bars — cap the score and force the job into the **Avoid** bucket with a specific reason attached. Federal employment alone is not treated as a barrier.

*(The earlier server-side six-component `RuleScorer` belonged to the removed NestJS path — `apps/api/src/scoring/` in git history.)*

### The conviction-aware compatibility engine

**Question:** "Given this specific conviction, what's the realistic chance for this specific role?"

Lives in `packages/shared/src/compatibility/` (pure TS — runs server-side and in the browser). When a user picks a conviction in the `/jobs` filter, the complete filtered pool is ranked server-side before pagination; the browser computes only the visible explanations. Seven components × weights summing to 100:

| Component | Max | What it measures |
|---|---:|---|
| Conviction-to-duty relevance | **30** | Does this conviction conflict with the role's specific duties? (e.g. drug-distribution + pharmacy access = high; drug-distribution + warehousing = low) |
| Hard-barrier signals | **25** | "clean background required," "CJIS," "fingerprinting required," etc. |
| Employer fair-chance posture | 15 | Positive (fair-chance language) → neutral → strict → very_strict |
| Industry sensitivity | 10 | 0-4 table per industry (childcare = 4, construction = 0) |
| Time since conviction/release | 10 | <1y, 1-3y, 3-7y, 7+y bands; +bonus if expunged; -penalty if pending charges |
| Candidate strength offset | 5 | Recognized certs (OSHA, CDL, NCCER…) + relevant industry experience |
| Location protections | 5 | State fair-chance laws (CA/NY/IL/MA/WA strong; 12 states some) |

**Score floors** prevent strong components from drowning out hard duty conflicts:
- Critical hard barrier → cap at 44
- High duty conflict in sensitive industry (≥3) → cap at 44
- Any high duty conflict → cap at 60

**Output:** `0–100` score → chance band (`high ≥ 75`, `medium 45–74`, `low < 45`) → label (Strong / Possible / Challenging Match) — plus risk factors, positive factors, possible barriers, chance improvers, recommended next step, caseworker notes, and a full audit trail of every rule that fired.

#### Conviction types

The engine supports 10 conviction classes, each with its own risk matrix:

| Internal | User-facing label |
|---|---|
| `drug_possession` | Drug possession-related conviction |
| `drug_distribution` | Drug distribution-related conviction |
| `violent_offense` | Violence-related conviction |
| `registry_related` | Registry-related conviction |
| `property_theft` | Property or theft-related conviction |
| `burglary` | Burglary-related conviction |
| `financial_fraud` | Financial fraud-related conviction |
| `weapons_related` | Weapons-related conviction |
| `dui_dwi` | DUI/DWI-related conviction |
| `other` | Other conviction |

The engine is unit-tested with 21 acceptance cases covering every conviction × duty combination called out in the spec, plus determinism and terminology checks.

---

## Job sources (the live provider layer)

The deployed job pool comes from `apps/web/lib/providers/` — fetched live server-side with a 10-minute in-process cache (`JOBS_CACHE_TTL_SECONDS`), merged and deduped across providers, falling back to 40 bundled sample postings only if every provider returns empty.

| Provider | Auth | On by default |
|---|---|---|
| **Remotive, RemoteOK, Jobicy, Himalayas, The Muse, ATS boards (Greenhouse/Lever)** | None | ✅ (disable with `<NAME>_ENABLED=false`) |
| **USAJobs** | API key + email user-agent | needs keys |
| **Adzuna** | App ID + App Key | needs keys |
| **Jooble** | API key | needs keys |
| **CareerOneStop jobs** | User ID + token | needs keys |
| **Workday boards** | None | opt-in (`WORKDAY_ENABLED=true`) |

Adding a new source = one module in `apps/web/lib/providers/` + registration in `providers/index.ts`. *(The NestJS ingestion pipeline — `apps/api/src/ingestion/` in git history — was the older Postgres-backed version of this layer with only 5 of these sources; it never fed the live site and was removed with the rest of `apps/api`.)*

### Classification + dedup

Every fetched job is classified before it enters the pool (`packages/shared` `classifyJob`):

- **Industry** detected from title + description keywords
- **Risk tier** (LOW / MEDIUM / HIGH) from industry × keyword rules
- **Background check likely** from posting language
- **Excludes records** only from explicit clean-record, clearance, or security-sensitive evidence
- **Apprenticeship** flag from title/description markers

Federal employer names are not blanket exclusions. Civilian federal roles remain eligible for ordinary classification; only explicit clearance/public-trust language or security-sensitive duties raise the role to a categorical barrier.

Deduplication uses a `(title, company, locationCity, locationRegion)` hash so the same role from multiple aggregators only lands once.

---

## CareerOneStop integration (27 endpoints)

The U.S. Department of Labor's **CareerOneStop** API gives us authoritative reentry, wage, training, and licensing data. The full 27-endpoint wrapper below shipped with the removed NestJS path (git history); the live site wraps the subset it uses in `apps/web/lib/careeronestop.ts`, exposed as thin routes under `apps/web/app/api/v1/careeronestop/` (centers, reentry, apprenticeships, wages, licenses, certifications). The catalog is kept as the reference for what the DOL API offers (https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx):

**Local help**
- `GET /careeronestop/centers` — American Job Centers near a ZIP
- `GET /careeronestop/reentry` — reentry programs (filtered + all)
- `GET /careeronestop/apprenticeships` — state apprenticeship offices
- `GET /careeronestop/boards` — Workforce Development Boards
- `GET /careeronestop/youth-programs` — WIOA youth programs
- `GET /careeronestop/state-resources` — state agency contacts

**Occupations**
- `GET /careeronestop/occupation` — full O*NET profile (tasks, skills, knowledge, abilities, wages, projections)
- `GET /careeronestop/occupations/search` — keyword search
- `GET /careeronestop/occupations/report` — Fastest Growing / Most Openings / etc.

**Wages / LMI**
- `GET /careeronestop/wages` — BLS percentiles
- `GET /careeronestop/wages/by-location` — multi-state comparison
- `GET /careeronestop/lmi/occupation` — detailed labor-market data
- `GET /careeronestop/employment-patterns` — industries that hire this occupation
- `GET /careeronestop/unemployment` — BLS LAUS rates
- `GET /careeronestop/ui-website` — state UI site

**Licenses + certifications**
- `GET /careeronestop/licenses` — state licensing requirements
- `GET /careeronestop/certifications` — industry-recognized certs
- `GET /careeronestop/licenses/:id`, `/certifications/:id`

**Training**
- `GET /careeronestop/training` — local training programs (ETPL + IPEDS)
- `GET /careeronestop/training/institutions` — community colleges, technical schools

**Skills**
- `GET /careeronestop/skills-matcher/questions` — 40 standard skills
- `POST /careeronestop/skills-matcher/submit` — score a candidate's ratings → ranked occupations
- `GET /careeronestop/skills-gaps` — between two O*NET codes
- `GET /careeronestop/tools/by-occupation`, `/tools/by-keyword`

**Other**
- `GET /careeronestop/jobs` — National Labor Exchange postings
- `GET /careeronestop/job-description` — DOL Job Description Writer templates
- `GET /careeronestop/associations` — professional associations
- `GET /careeronestop/location/validate` — canonical city/state resolution

All cached server-side with endpoint-specific TTLs (6 hours for AJCs/reentry, 24h for LMI, 60s for failures). Credentials never reach the browser.

---

## Database schema

8 core tables (Postgres + Prisma) — this schema shipped with the removed NestJS path (git history, commit `6553630`) and remains the reference design for the server-backed phase. Highlights:

| Table | Purpose |
|---|---|
| `users` | Email + display name |
| `user_profiles` | First/last name, location, RIASEC scores, transportation, restricted industries |
| `convictions` | Structured conviction history per profile (category, offenseType, year, supervision state, registry status) |
| `jobs` | Canonical job rows with classifier output + dedup hash |
| `job_sources` | Provider registry (`usajobs`, `adzuna`, `remotive`, `jooble`) |
| `job_raw_ingestion` | Raw provider payloads — kept verbatim so we can re-normalize after rule changes |
| `job_scores` | Cached personalization scores (per-user, per-job) |
| `skills`, `certifications` | Lookup tables for the canonical skill/cert codes used in matching |

The `OffenseType` enum uses **`REGISTRY_RELATED`** — never the older stigmatizing value. A non-destructive migration `ALTER TYPE` renames any historic rows in place.

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/carnagerogue/achievedxp-workforce-navigator.git
cd achievedxp-workforce-navigator
pnpm install

# 2. Configure environment
cp apps/web/.env.local.example apps/web/.env.local
# Add provider API keys (USAJOBS, ADZUNA, JOOBLE, COS_*) — optional; the
# six no-auth providers work with no keys at all

# 3. Run the web app
pnpm dev          # Web at http://localhost:3000
```

### Useful scripts

```bash
pnpm dev                          # Next.js dev server (http://localhost:3000)
pnpm build                        # Production build (web)
pnpm test                         # Shared engine suite + web score-agreement suite
pnpm lint                         # Web lint
pnpm --filter @dxp/shared test    # Run compatibility-engine tests (21 cases)
pnpm --filter web test            # Run just the web suite
pnpm --filter web build           # Build just the web app
```

---

## Environment variables

See `.env.example` for the full list. Critical ones:

```bash
# Site gate — REQUIRED on the deployment (the gate fails closed with 503 without it)
SITE_PASSWORD=...

# USAJobs — register at developer.usajobs.gov
USAJOBS_ENABLED=true
USAJOBS_API_KEY=...
USAJOBS_USER_AGENT=your@email.com

# Adzuna — developer.adzuna.com
ADZUNA_ENABLED=true
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...

# Remotive — no auth
REMOTIVE_ENABLED=true

# Jooble — jooble.org/api/about (default 500 req/month)
JOOBLE_ENABLED=true
JOOBLE_API_KEY=...

# CareerOneStop — register at careeronestop.org/Developers/WebAPI/registration.aspx
COS_USER_ID=...
COS_TOKEN=...
```

---

## API reference

A few representative endpoints, all served by the web app's own route handlers under `apps/web/app/api/v1/`. (The retired NestJS service's Swagger UI documented the removed backend, not these routes.)

```
GET  /api/v1/jobs?postalCode=43215&radiusMiles=50    → paginated jobs
GET  /api/v1/jobs/stats                              → totals + breakdowns by source/industry/region
GET  /api/v1/jobs/:id                                → single job
GET  /api/v1/jobs/:id/similar                        → similar jobs

POST /api/v1/users                                   → create user
POST /api/v1/profile                                 → create/update profile (incl. convictions)
POST /api/v1/assessment/:userId                      → submit RIASEC answers, get Holland code + occupations
GET  /api/v1/matches/:userId                         → personalized top/medium/avoid buckets
GET  /api/v1/matches/:userId/insights                → which certs/skills unlock the most new matches

GET  /api/v1/careeronestop/centers?location=43215    → 16 OhioMeansJobs centers
GET  /api/v1/careeronestop/wages?onet=53-3032.00     → BLS percentiles for Heavy Truck Drivers
```

The list-jobs endpoint accepts `offenseType=DRUG_POSSESSION|...|REGISTRY_RELATED|...` to apply server-side hard filters. The legacy value `SEX_OFFENSE` is mapped to `registry_related` internally and never surfaced.

---

## Testing

```bash
pnpm --filter @dxp/shared test   # compatibility-engine acceptance suite
pnpm --filter web test           # server/client score-agreement suite
```

The web suite (`apps/web/lib/__tests__/score-agreement.test.ts`) asserts the dashboard match buckets and the browse-page scores come from the same math — the regression that guards against a second score blend ever creeping back in.

The shared suite runs the 21-case acceptance spec for the compatibility engine. Each case maps to a line item in the engine spec:

- DUI + CDL driver → Low Chance
- Property/theft + bank teller → Low Chance
- Property/theft + construction laborer → High Chance
- Violence + childcare → Low Chance
- Registry-related + school → Low Chance
- Drug distribution + pharmacy tech → Low Chance
- Weapons + security guard → Low Chance
- Clean-record phrase significantly lowers score
- Fair-chance language improves but doesn't override hard barriers
- Expunged/sealed improves but doesn't erase hard legal barriers
- 7+ year-old conviction improves score
- Pending charges reduce score
- ...plus terminology and determinism checks

A full-site QA harness lives at `qa-full-site.py` (in the parent AchieveDXP folder). It exercises every Web page, every API endpoint, every CareerOneStop wrapper, runs an end-to-end persona walkthrough, and re-runs the unit tests — 63 checks total. Run with:

```bash
PYTHONIOENCODING=utf-8 python qa-full-site.py
```

---

## Deployment (Railway)

The **Web** service is the entire user-facing product: Dockerfile build from `apps/web/` with Next.js standalone output. It is self-sufficient — its `NEXT_PUBLIC_API_URL` defaults to its own `/api/v1` route handlers (baked in at build time via the Dockerfile ARG).

Required env on the Web service:

- `SITE_PASSWORD` — the gate **fails closed (503) without it**; there is no committed fallback. Rotate any value that was ever committed to this repo.
- Optional provider keys (`ADZUNA_*`, `JOOBLE_API_KEY`, `USAJOBS_*`, `COS_*`) — without them the site still serves jobs from the six no-auth providers.

The other services in the Railway project (**API**, **Postgres**, **Redis**) ran the NestJS path that has since been removed from the repo (git history, commit `6553630` and earlier); they can be paused or deleted without affecting the site.

To redeploy:

```bash
# From workforce-navigator/
railway up --service web --detach --ci
```

Future deploys can be wired through the Railway GitHub App for push-to-deploy. Today we use direct upload via the CLI because the GitHub App authorization step is manual.

---

## Extension points

Designed for incremental growth without breaking changes:

| Want to | Edit |
|---|---|
| Add a job source (live site) | new module in `apps/web/lib/providers/<name>.ts` + register in `apps/web/lib/providers/index.ts` |
| Add an offense × industry bar (live site) | `packages/shared/src/compatibility/offense-hard-filters.ts` |
| Change the score blend / barrier caps | `scoreJobUnified` in `apps/web/lib/job-scoring.ts` — `apps/web/lib/__tests__/score-agreement.test.ts` guards server/client agreement |
| Add a hard-barrier phrase | add a `PatternRule` to `HARD_BARRIER_PATTERNS` in `packages/shared/src/compatibility/signals.ts` |
| Add a fair-chance phrase | same file, `FAIR_CHANCE_PATTERNS` array |
| Tune a score weight | `SCORE_WEIGHTS` in `packages/shared/src/compatibility/types.ts`. Tests will catch drift. |
| Add a conviction × duty rule | `CONVICTION_MATRIX[<type>].rules` in `packages/shared/src/compatibility/risk-matrix.ts` |
| Tune industry sensitivity | `INDUSTRY_SENSITIVITY` map in the same folder |
| Add state fair-chance protections | `scoreLocationProtections` in `packages/shared/src/compatibility/scoring.ts` (currently a hand-curated state list — TODO: expand with full state-by-state law tables) |
| Add a CareerOneStop lookup (live site) | `apps/web/lib/careeronestop.ts` + a thin route under `apps/web/app/api/v1/careeronestop/` |

Every rule fires through the audit trail — flip on / off without changing the engine.

---

## Limitations and TODOs

| Area | Status | Notes |
|---|---|---|
| Server-side persistence | **None in the deployed app** | Profiles + assessment results live in in-process Maps and reset on redeploy; everything else is browser localStorage. The planned fix is the server-backed phase in `docs/connected-backend-scope.md`. |
| Site gate | Shared password, fail-closed | `SITE_PASSWORD` must be set on the deployment (no committed fallback). Rotate any previously-committed value — old values live on in git history. |
| Two backends in the repo | **Resolved — `apps/api` deleted** | The NestJS backend was removed in the consolidation (git history, commit `6553630` and earlier). The web app's `/api/v1` route handlers + the new storage layer are the single backend going forward. |
| State fair-chance law table | Static (5 states "strong", 12 "some") | Expand with codified Fair Chance Acts, licensing-board disqualification lists, expungement timing by state |
| Employer outcome feedback | Not yet wired | Future: feed application outcomes back to refine `employerFairChancePosture` per employer |
| CareerOneStop NLX `/jobs` | Returns 404 from upstream for some queries | URL template uncertain; supplementary to the live providers |
| Real-time search | Filter changes are in-memory client-side | Works fine at 50 jobs/page; >500 would push to API |
| Federal-suitability nuance | VA classified the same as DoD | VA Title 5 roles are often more accessible than military; could add a separate "federal civilian non-military" tier |
| Authentication | Not implemented | The site gate is a demo lock, not user auth. Real accounts are Phase 2 of `docs/connected-backend-scope.md`. |

---

## License + credits

Built for **Achieve DXP**. Job postings sourced from public APIs (USAJobs, Adzuna, Remotive, Jooble, CareerOneStop). Logos and trademarks of third-party employers belong to their respective owners. The platform is informational and does not predict any specific employer's hiring decision.

Compatibility engine wording rules deliberately avoid stigmatizing terminology in every user-facing surface. If you find a word that doesn't meet that bar, open an issue.
