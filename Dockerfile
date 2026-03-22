# Stage 1 — Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Purge any leaked .next cache from Docker layer cache
RUN rm -rf .next/cache
# Cache-bust: changes every deploy to force fresh Next.js build (prevents stale chunk hashes)
ARG CACHEBUST=1
# NEXT_PUBLIC_* vars are read from .env.production at build time (allowed through .dockerignore)
RUN npm run build

# ── Compile the migration runner to plain JS (no tsx needed at runtime) ──
RUN npx tsc src/db/run-migration.ts \
  --outDir dist-db \
  --esModuleInterop \
  --module commonjs \
  --moduleResolution node \
  --skipLibCheck \
  --target es2020

# Stage 3 — Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy .env.production so server-side secrets (iDenfy, Clerk, Moov, etc.) are available at runtime
COPY --from=builder --chown=nextjs:nodejs /app/.env.production ./.env.production
# Do NOT copy .next/cache — force fresh route cache on each deploy

# ── Migration infrastructure ──────────────────────────────────────
# Compiled migration runner (JS)
COPY --from=builder --chown=nextjs:nodejs /app/dist-db/run-migration.js ./db/run-migration.js
# SQL migration files
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./db/migrations
# Runtime dependencies NOT traced by Next.js standalone output:
#   pg (PostgreSQL client) + its transitive deps
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/postgres-range ./node_modules/postgres-range
COPY --from=builder /app/node_modules/buffer-writer ./node_modules/buffer-writer
COPY --from=builder /app/node_modules/packet-reader ./node_modules/packet-reader
COPY --from=builder /app/node_modules/obuf ./node_modules/obuf
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
#   @aws-sdk/client-secrets-manager + core SDK deps
COPY --from=builder /app/node_modules/@aws-sdk ./node_modules/@aws-sdk
COPY --from=builder /app/node_modules/@smithy ./node_modules/@smithy
COPY --from=builder /app/node_modules/@aws-crypto ./node_modules/@aws-crypto
COPY --from=builder /app/node_modules/tslib ./node_modules/tslib
COPY --from=builder /app/node_modules/uuid ./node_modules/uuid
COPY --from=builder /app/node_modules/fast-xml-parser ./node_modules/fast-xml-parser
COPY --from=builder /app/node_modules/strnum ./node_modules/strnum
COPY --from=builder /app/node_modules/bowser ./node_modules/bowser

# ── Entrypoint script ─────────────────────────────────────────────
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
