# syntax=docker/dockerfile:1.6
# Multi-stage build for the NestJS API in a pnpm workspace.
# Build context = repo root (workforce-navigator/).
#
# Why Debian, not Alpine: Prisma 5's binary query engine ships only for
# OpenSSL 1.1.x / 3.x on glibc — running it on Alpine (musl) crashes with
# "Could not parse schema engine response". Debian slim with libssl3 is
# the supported path. ~50MB heavier, fully working.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── deps ────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── build ───────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ── runtime ─────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

WORKDIR /app/apps/api
EXPOSE 3001
# Migrate (idempotent), seed JobSource/skill/cert lookup tables (idempotent
# via upserts), then start the API. Seed must run AFTER migrate.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && PATH=$(pwd)/node_modules/.bin:$PATH ./node_modules/.bin/ts-node prisma/seed.ts && node dist/main.js"]
