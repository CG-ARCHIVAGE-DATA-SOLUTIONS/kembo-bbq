# ─────────────────────────────────────────────────────────────────────────────
#  Kembo BBQ — image de production
#
#  Build  : docker compose -f docker-compose.prod.yml build
#  Update : docker compose -f docker-compose.prod.yml build --no-cache \
#           && docker compose -f docker-compose.prod.yml up -d
# ─────────────────────────────────────────────────────────────────────────────

# ── 1 : Dépendances ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ── 2 : Build Next.js ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma ne se connecte pas pendant le build — chemin bidon suffisant
ENV DATABASE_URL=file:/tmp/build.db
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── 3 : Runner ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat wget
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Utilisateur non-root + répertoire SQLite persistant
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /data && chown nextjs:nodejs /data

# Application compilée + dépendances complètes (prisma CLI + tsx inclus)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Script d'initialisation (schéma + seed au premier démarrage)
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/entrypoint.sh"]
