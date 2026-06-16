# ── Stage 1: Install + build ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests first (better layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json        ./apps/api/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/api/        ./apps/api/

# Build shared types, then the API
RUN pnpm --filter @clockwork/shared build
RUN pnpm --filter api build

# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests for production install
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json        ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

# Use the public /health endpoint — /config now requires auth and would 401.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
