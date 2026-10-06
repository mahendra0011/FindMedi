# ==============================================================================
# FindMedi Backend Dockerfile — Production hardened
# ==============================================================================
# Security features:
# - Minimal Debian-slim base (glibc for sharp and native bindings)
# - Runs as unprivileged 'node' user (UID 1000)
# - Compatible with read-only root filesystem (tmpfs on /tmp, volume on /app/uploads)
# - No package managers or development compilers in the final runtime layer
# ==============================================================================

# Production hardened, but toolchain pinned to the host's (see Dockerfile.dev
# for the full rationale): node:24 because app deps require Node >= 22, npm@12
# because the lockfile is authored by npm 12 and npm 10/11 `npm ci` rejects it.

FROM node:24-bookworm-slim AS builder

# Host ke npm se match karte rakho (lockfile validation npm major par depend karta hai)
RUN npm i -g npm@12

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# .npmrc = lockfile authoring parity (legacy-peer-deps) ke liye COPY karo.
COPY package*.json .npmrc ./
COPY prisma ./prisma/

# Install dependencies and generate prisma client
RUN npm ci --omit=dev && npx prisma generate

# Runner stage
FROM node:24-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5001

# Copy dependency artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy application source
COPY package*.json ./
COPY src ./src
COPY mindsupport ./mindsupport

# Create uploads directory and assign ownership to node user
RUN mkdir -p /app/uploads/avatars /tmp && chown -R node:node /app /tmp

USER node

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:5001/healthz || exit 1

CMD ["node", "src/index.js"]
