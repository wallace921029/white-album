# syntax=docker/dockerfile:1

# ---- build stage: compile TypeScript -> dist/ ----
# node:lts-slim is Debian (glibc), so better-sqlite3's prebuilt binaries
# install without a build toolchain.
FROM node:lts-slim AS builder
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage ----
FROM node:lts-slim AS runner
ENV NODE_ENV=production
# Persist the SQLite DB + uploaded photos under a single volume-mounted dir.
ENV DATA_DIR=/data
WORKDIR /app

# Production deps only (reinstalls better-sqlite3's prebuilt binary).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled app + the migration files the migrator applies on boot.
COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle

# Data dir owned by the unprivileged node user shipped in the base image.
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Bind to 0.0.0.0 so the port is reachable from outside the container.
CMD ["./node_modules/.bin/fastify", "start", "-l", "info", "-a", "0.0.0.0", "dist/src/app.js"]
