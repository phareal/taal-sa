# ─────────────────────────────────────────────────────────────────
# Dockerfile — Frontend Vite (vanilla JS SPA) → statique nginx
# Stack : Vite 5 + Tailwind 3 + ApexCharts (pas de framework UI)
# Multi-stage : base → deps → development | builder → production
# Production : nginx:alpine, image ~50 MB
# ─────────────────────────────────────────────────────────────────

# ── Stage 1 : base ───────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Stage 2 : deps ───────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── Stage 3 : développement (hot-reload Vite) ────────────────────
FROM deps AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ── Stage 4 : builder (vite build → dist/) ───────────────────────
FROM deps AS builder
ARG VITE_API_BASE=http://localhost:8000
ENV VITE_API_BASE=${VITE_API_BASE}
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production

COPY index.html postcss.config.js tailwind.config.js vite.config.js ./
COPY public ./public
COPY assets ./assets
COPY src ./src
RUN npm run build

# ── Stage 5 : production (nginx statique) ────────────────────────
FROM nginx:1.25-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
