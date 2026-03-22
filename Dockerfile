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
# Runtime dependencies for migration runner (NOT traced by Next.js standalone):
#   pg (PostgreSQL client) + @aws-sdk/client-secrets-manager
#   Install fresh instead of cherry-picking — npm resolves all transitive deps automatically
RUN npm install --no-save pg @aws-sdk/client-secrets-manager

# ── Entrypoint script ─────────────────────────────────────────────
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
