# ─────────────────────────────────────────────────────────────────
# Dockerfile — Frontend Nuxt.js 3
# Multi-stage : base → development → builder → production
# ─────────────────────────────────────────────────────────────────

# ── Stage 1 : base Node ──────────────────────────────────────────
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# ── Stage 2 : développement (hot-reload HMR) ─────────────────────
FROM base AS development

COPY package.json package-lock.json* ./
# npm ci exige un lockfile ; pour un premier scaffold on retombe sur npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Le code est monté via volume en dev
EXPOSE 3000 24678
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Stage 3 : builder (build Nuxt production) ────────────────────
FROM base AS builder

ARG NUXT_PUBLIC_API_BASE=http://backend:8000
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Build Nuxt (SSR ou static selon nuxt.config.ts)
RUN npm run build

# ── Stage 4 : production (image Node minimale) ───────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

RUN apk add --no-cache curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nuxtjs -u 1001

WORKDIR /app

# Copier uniquement le .output (build Nuxt)
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./

USER nuxtjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "server/index.mjs"]
