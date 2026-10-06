# ==============================================================================
# FindMedi Frontend Dockerfile — Production hardened SPA
# ==============================================================================
# Security features:
# - Multi-stage build (build tools dropped in final layer)
# - Runs as unprivileged nginx user (UID 101)
# - Hardened headers and SPA fallback routing
# ==============================================================================

# Production hardened, but toolchain pinned to the host's (see Dockerfile.dev
# for the full rationale): node:24 because app deps require Node >= 22, npm@12
# because the lockfile is authored by npm 12 and npm 10/11 `npm ci` rejects it.

FROM node:24-alpine AS builder

# Host ke npm se match karte rakho (lockfile validation npm major par depend karta hai)
RUN npm i -g npm@12

WORKDIR /app

# .npmrc = lockfile authoring parity (legacy-peer-deps) ke liye COPY karo.
COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# Production static web server (unprivileged non-root nginx)
FROM nginxinc/nginx-unprivileged:alpine-slim AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with secure SPA config
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    server_name _;
    server_tokens off;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=(self)" always;

    # Static assets cache
    location ~* \.(?:css|js|woff2?|svg|png|jpg|jpeg|gif|ico|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # SPA history fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Health check
    location /healthz {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
