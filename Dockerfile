# syntax=docker/dockerfile:1

# ─────────────── STAGE 1: base ───────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl

# ─────────────── STAGE 2: deps ───────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─────────────── STAGE 3: build ───────────────
# Worker is pure TS run by tsx (the `@/*` alias comes from tsconfig.json).
# No `next build` needed — only Prisma client generation.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# ─────────────── STAGE 4: runner (worker only) ───────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/workers ./workers
COPY --from=build /app/lib ./lib
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/package.json ./
COPY docker-entrypoint.sh ./

CMD ["sh", "docker-entrypoint.sh"]