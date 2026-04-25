# AchieveDXP Workforce Navigator

Production-grade job aggregation + matching platform for justice-impacted individuals.
This repo is a **pnpm monorepo** containing a NestJS API (and, in Phase 3, a Next.js frontend).

## Phase 1 — What's built

| Area | Status |
| --- | --- |
| Monorepo + Docker Compose (Postgres 16, Redis 7) | ✅ |
| NestJS API with Prisma + strict TS | ✅ |
| All 8 core tables with indexes: `users`, `user_profiles`, `jobs`, `job_sources`, `job_raw_ingestion`, `job_scores`, `skills`, `certifications` | ✅ |
| Ingestion pipeline (provider interface + mock provider + normalizer + dedup) | ✅ |
| REST endpoints: `/users`, `/profile`, `/jobs`, `/matches/:userId`, `/ingestion/run` | ✅ |
| Scheduled ingestion (cron + on-boot flag) | ✅ |
| Shared `@dxp/shared` types package | ✅ |
| Rule-based scoring, classification, frontend | ⏳ Phase 2 / 3 |

## Prerequisites

- Node.js **20+**
- pnpm **9+** (`npm i -g pnpm`)
- Docker + Docker Compose

## Local setup

```bash
# 1. Clone & install
cd workforce-navigator
pnpm install

# 2. Copy env file
cp .env.example .env

# 3. Start Postgres + Redis
pnpm docker:up

# 4. Generate Prisma client + run migrations
pnpm db:generate
pnpm db:migrate            # creates initial migration

# 5. Seed reference data (sources, skills, certs)
pnpm db:seed

# 6. Start the API (runs ingestion on boot, populates ~50 mock jobs)
pnpm dev
# → http://localhost:3001/api/v1
```

## Verifying it works

```bash
# health
curl http://localhost:3001/api/v1/health

# list jobs (should have ~50 mock rows after first boot)
curl "http://localhost:3001/api/v1/jobs?limit=5"

# create a user
curl -X POST http://localhost:3001/api/v1/users \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com","displayName":"Test User"}'

# upsert profile (use the userId returned above)
curl -X POST http://localhost:3001/api/v1/profile \
  -H 'content-type: application/json' \
  -d '{
    "userId":"<USER_ID>",
    "locationRegion":"OH",
    "yearsExperience":3,
    "hasTransportation":true,
    "hasFelonyRecord":true,
    "skills":["forklift_operation","warehouse_operations"],
    "certifications":["osha_10","forklift"],
    "desiredIndustries":["warehousing","construction"]
  }'

# matches (Phase 1: placeholder scores; real scoring arrives in Phase 2)
curl "http://localhost:3001/api/v1/matches/<USER_ID>?limit=10"

# manually trigger an ingestion run
curl -X POST http://localhost:3001/api/v1/ingestion/run
```

## Project layout

```
workforce-navigator/
├── apps/
│   └── api/                         NestJS API
│       ├── prisma/
│       │   ├── schema.prisma        8 tables, indexes, enums
│       │   └── seed.ts              reference data (sources, skills, certs)
│       └── src/
│           ├── main.ts              bootstrap, global pipes, CORS, prefix
│           ├── app.module.ts        wires all feature modules
│           ├── health.controller.ts /health (DB ping)
│           ├── prisma/              PrismaService (global)
│           ├── users/               POST/GET users
│           ├── profiles/            POST/GET profile
│           ├── jobs/                GET /jobs, GET /jobs/:id
│           ├── matches/             GET /matches/:userId  (Phase 1 stub)
│           └── ingestion/
│               ├── providers/
│               │   ├── job-provider.interface.ts   stable contract
│               │   └── mock.provider.ts            dev data source
│               ├── ingestion.service.ts            fetch → raw → normalize → dedup
│               └── ingestion.controller.ts         POST /ingestion/run
├── packages/
│   └── shared/                      JobDto, MatchDto, PaginatedJobsDto
└── docker/
    └── docker-compose.yml           Postgres 16 + Redis 7
```

## Adding a new job source (Phase 4 gets easier thanks to this shape)

1. Add a provider class implementing `JobProvider` from
   `src/ingestion/providers/job-provider.interface.ts`.
2. Register it in `IngestionModule` (`useFactory` provider array).
3. Add a row to `job_sources` (update `seed.ts`).

No core pipeline changes required.

## Scaling notes (already in place)

- Raw payloads stored verbatim in `job_raw_ingestion` (jsonb) — safe to re-normalize.
- Canonical `jobs` deduped by sha256(`company|title|region|externalId`) — stable hash, cross-source.
- Indexes on `(industry, locationRegion, postedAt desc)`, `(status, postedAt desc)`, `(riskTier)`.
- Per-user scores stored with `@@unique([userId, jobId])` + `(userId, score desc)` index — cheap top-K reads.
- `@nestjs/schedule` handles cron for now; Phase 4 swaps in Redis + BullMQ (already provisioned).
