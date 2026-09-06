Production-ready, multi-stage Dockerfiles and .dockerignore files have been configured for both HealthCare-Server and HealthCare-Client.

1. Server-Side Dockerfile (

HealthCare-Server/Dockerfile
)
dockerfile
# ==========================================
# HealthCare-Server - Multi-Stage Production Dockerfile
# ==========================================
# 1. Base Stage: Setup Node.js runtime and package manager
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@latest --activate
# 2. Dependencies Stage: Install dependencies and generate Prisma Client
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts* prisma.config.js* ./
RUN pnpm install --frozen-lockfile
RUN pnpm generate
# 3. Builder Stage: Compile TypeScript
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
# 4. Production Runner Stage: Minimal runtime
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl dumb-init
ENV NODE_ENV=production
ENV PORT=5000
# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs nodejs
# Copy runtime files with proper ownership
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
# Copy dynamic EJS templates (invoices, OTP, prescriptions, emails)
COPY --from=builder --chown=nodejs:nodejs /app/src/app/templates ./src/app/templates
USER nodejs
EXPOSE 5000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
Key Highlights for Server:
Layer Caching: Dependencies and Prisma generation are separated from source compilation to leverage Docker cache layers.
Dynamic Template Preservation: Explicitly copies src/app/templates so runtime EJS email/invoice renderers work seamlessly.
Security & Reliability: Runs under non-root nodejs user and uses dumb-init to forward SIGTERM/SIGINT signals properly.
2. Client-Side Dockerfile (

HealthCare-Client/Dockerfile
)
dockerfile
# ==========================================
# HealthCare-Client (Next.js) - Multi-Stage Production Dockerfile
# ==========================================
# 1. Base Stage: Node.js runtime & pnpm setup
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
# 2. Dependencies Stage: Install node dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
# 3. Builder Stage: Build Next.js standalone application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build
# 4. Production Runner Stage: Lean standalone runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs nextjs
# Copy static public assets
COPY --from=builder /app/public ./public
# Set proper permissions for Next.js cache directory
RUN mkdir .next && chown nextjs:nodejs .next
# Copy standalone bundle and static assets from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
Key Highlights for Client:
Standalone Next.js Output: Next.js output: "standalone" trims production image sizes down from ~1GB+ to ~150-200MB.
Build Argument (ARG): Allows baking NEXT_PUBLIC_API_BASE_URL into static assets during docker build.
Non-Root User: Runs securely with nextjs user with proper permissions on .next/cache.
3. Step-by-Step Build & Run Commands
Option A: Building & Running with Docker Compose (Recommended)
A production compose file has been created at 

docker-compose.prod.yaml
.

Build and start all production services:

bash
docker compose -f docker-compose.prod.yaml up --build -d
Run Prisma database migrations in production:

bash
docker compose -f docker-compose.prod.yaml exec healthcare-server pnpm exec prisma migrate deploy
Check logs:

bash
docker compose -f docker-compose.prod.yaml logs -f
Stop containers:

bash
docker compose -f docker-compose.prod.yaml down
Option B: Building & Running Individually with Docker CLI
1. Server Side:
bash
# Navigate to Server directory
cd HealthCare-Server
# Build the production image
docker build -t healthcare-server:latest -f Dockerfile .
# Run the container
docker run -d \
  --name healthcare-server \
  -p 5000:5000 \
  --env-file .env \
  -e DATABASE_URL="postgresql://postgres:secret123@your-db-host:5432/healthCare?schema=public" \
  healthcare-server:latest
2. Client Side:
bash
# Navigate to Client directory
cd HealthCare-Client
# Build the production image with public API URL arg
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL="http://localhost:5000/api/v1" \
  -t healthcare-client:latest \
  -f Dockerfile .
# Run the container
docker run -d \
  --name healthcare-client \
  -p 3000:3000 \
  healthcare-client:latest
4:40 PM



docker-compose.yaml: 
services:
  healthcare-db:
    image: postgres:16-alpine
    container_name: healthcare-db
    networks:
      - healthcare-net
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret123
      - POSTGRES_DB=healthCare
    ports:
      - "5433:5432"
    volumes:
      - healthcare-pg-data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d healthCare"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  healthcare-server:
    container_name: healthcare-server
    build:
      context: ./HealthCare-Server
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      healthcare-db:
        condition: service_healthy
    networks:
      - healthcare-net
    env_file:
      - ./HealthCare-Server/.env
    environment:
      CHOKIDAR_USEPOLLING: "1"
      CHOKIDAR_INTERVAL: "300"
      DATABASE_URL: "postgresql://postgres:secret123@healthcare-db:5432/healthCare?schema=public"
    ports:
      - "5000:5000"
    working_dir: /app
    volumes:
      - ./HealthCare-Server:/app
      - server-node-modules:/app/node_modules
      - server-logs:/app/logs
    command: sh -lc "CI=true pnpm install && pnpm generate && pnpm exec prisma migrate deploy && pnpm dev"

  healthcare-client:
    container_name: healthcare-client
    build:
      context: ./HealthCare-Client
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      healthcare-server:
        condition: service_started
    networks:
      - healthcare-net
    env_file:
      - ./HealthCare-Client/.env.local
    environment:
      CHOKIDAR_USEPOLLING: "1"
      CHOKIDAR_INTERVAL: "300"
      WATCHPACK_POLL: "true"
    ports:
      - "3000:3000"
    working_dir: /app
    volumes:
      - ./HealthCare-Client:/app
      - client-node-modules:/app/node_modules
    command: sh -lc "CI=true pnpm install && pnpm exec next dev --webpack -H 0.0.0.0 -p 3000"

networks:
  healthcare-net:
    driver: bridge

volumes:
  healthcare-pg-data:
  server-node-modules:
  server-logs:
  client-node-modules:










  docker-compose.prod.yaml:
  services:
  healthcare-db:
    image: postgres:16-alpine
    container_name: healthcare-db
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret123}
      POSTGRES_DB: ${POSTGRES_DB:-healthCare}
    ports:
      - "5432:5432"
    volumes:
      - healthcare-pg-prod-data:/var/lib/postgresql/data
    networks:
      - healthcare-prod-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-healthCare}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  healthcare-server:
    container_name: healthcare-server
    build:
      context: ./HealthCare-Server
      dockerfile: Dockerfile
    restart: always
    depends_on:
      healthcare-db:
        condition: service_healthy
    networks:
      - healthcare-prod-net
    env_file:
      - ./HealthCare-Server/.env
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-secret123}@healthcare-db:5432/${POSTGRES_DB:-healthCare}?schema=public"
    ports:
      - "5000:5000"

  healthcare-client:
    container_name: healthcare-client
    build:
      context: ./HealthCare-Client
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-http://localhost:5000/api/v1}
    restart: always
    depends_on:
      - healthcare-server
    networks:
      - healthcare-prod-net
    ports:
      - "3000:3000"

networks:
  healthcare-prod-net:
    driver: bridge

volumes:
  healthcare-pg-prod-data:
