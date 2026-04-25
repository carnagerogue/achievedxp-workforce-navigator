# syntax=docker/dockerfile:1.6
# Multi-stage build for the NestJS API in a pnpm workspace.
# Build context = repo root (workforce-navigator/). Set this in railway.toml.

FROM node:20-alpine AS base
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
# pnpm-style: re-link workspace packages into the build stage
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ── runtime ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=production

# Copy the entire built tree — keeps pnpm's symlink topology intact so that
# the prisma CLI binary in node_modules/.bin resolves correctly at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

WORKDIR /app/apps/api
EXPOSE 3001
# Apply pending migrations on boot, then start. Use the binary directly to
# avoid pnpm-exec lookups failing in the slim image.
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
