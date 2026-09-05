# HealthCare System — Dockerizing Step-by-Step Documentation

> Project: HealthCare System  
> Stack: Next.js Client + Node.js/Express Server + Prisma + PostgreSQL  
> Docker setup: Docker Compose + custom bridge network + named volumes  
> Purpose: Local development containerization with hot reload, persistent PostgreSQL data, Prisma migration, and multi-container communication.

---

## 0. Project Structure

```text
HealthCare/
├── HealthCare-Server/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── prisma/
│   ├── src/
│   └── .env
│
├── HealthCare-Client/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── .env.local
│
└── docker-compose.yaml
```

---

# Part 1 — PostgreSQL Container

## কোথা থেকে command চালাব?

Project root থেকে চালানো সবচেয়ে পরিষ্কার:

```text
D:\prisma\HealthCare
```

Docker command technically অন্য directory থেকেও চালানো যায়, কিন্তু relative path-এর জন্য project root ব্যবহার করাই ভালো।

## Network তৈরি

```powershell
docker network create healthcare-net
```

Check:

```powershell
docker network ls
```

## PostgreSQL container

```powershell
docker run --name healthcare-db `
  --network healthcare-net `
  -e POSTGRES_USER=admin `
  -e POSTGRES_PASSWORD=secret `
  -e POSTGRES_DB=healthcare `
  -p 5433:5432 `
  -v healthcare-pg-data:/var/lib/postgresql/data `
  -d postgres:16-alpine
```

### Port বোঝা

```text
Host port       Container port
5433            5432
```

Windows host থেকে:

```text
localhost:5433
```

Docker network-এর অন্য container থেকে:

```text
healthcare-db:5432
```

## Volume তৈরি করা

Optional manual creation:

```powershell
docker volume create healthcare-pg-data
docker volume ls
docker volume inspect healthcare-pg-data
```

## PostgreSQL check

```powershell
docker ps
docker logs healthcare-db
```

---

# Part 2 — Backend Dockerfile

## Location

```text
HealthCare-Server/Dockerfile
```

```dockerfile
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5000

CMD ["sh", "-lc", "CI=true pnpm install && pnpm generate && pnpm dev"]
```

---

# Part 3 — Backend `.dockerignore`

Location:

```text
HealthCare-Server/.dockerignore
```

```text
node_modules
dist
.env
.env.*
.git
.gitignore
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

> Note: `pnpm-lock.yaml` ignore করা উচিত নয়, কারণ Dockerfile সেটি COPY করছে এবং `--frozen-lockfile` ব্যবহার করছে।

---

# Part 4 — Database URL

## Backend Windows host-এ চললে

```env
DATABASE_URL="postgresql://admin:secret@localhost:5433/healthcare?schema=public"
```

## Backend Docker container-এর ভিতরে চললে

```env
DATABASE_URL="postgresql://admin:secret@healthcare-db:5432/healthcare?schema=public"
```

### মূল নিয়ম

```text
Host machine → localhost:5433
Docker container → healthcare-db:5432
```

Container-এর ভিতরে অন্য container-এর জন্য `localhost` ব্যবহার করা যাবে না।

---

# Part 5 — Backend Image Build

Project root থেকে:

```powershell
docker build -t healthcare-server-dev ./HealthCare-Server
```

Check:

```powershell
docker images
```

---

# Part 6 — Backend Container Run

Project root থেকে:

```powershell
MSYS_NO_PATHCONV=1 docker run -d `
  --name healthcare-server `
  --network healthcare-net `
  --env-file ./HealthCare-Server/.env `
  -e CHOKIDAR_USEPOLLING=1 `
  -e CHOKIDAR_INTERVAL=300 `
  -p 5000:5000 `
  -v "$PWD/HealthCare-Server:/app" `
  -v server-node-modules:/app/node_modules `
  -v server-logs:/app/logs `
  -w /app `
  healthcare-server-dev `
  sh -lc "CI=true pnpm install && pnpm generate && pnpm dev"
```

Native PowerShell-এ `MSYS_NO_PATHCONV=1` সমস্যা করলে prefix বাদ দিয়ে command চালানো যায়।

---

# Part 7 — Prisma Migration

Backend container চালু হওয়ার পরে:

```powershell
docker exec -it healthcare-server sh -lc "pnpm exec prisma migrate deploy"
```

Development environment-এ project script থাকলে:

```powershell
pnpm run migrate dev
```

---

# Part 8 — Backend Volumes

```powershell
docker volume create server-node-modules
docker volume create server-logs
```

Check:

```powershell
docker volume ls
```

### কেন `server-node-modules`?

Source code bind mount হচ্ছে:

```text
./HealthCare-Server:/app
```

কিন্তু container-এর Linux dependencies যেন Windows host-এর `node_modules` দ্বারা conflict না করে, তাই:

```text
server-node-modules:/app/node_modules
```

ব্যবহার করা হয়েছে।

---

# Part 9 — Frontend Dockerfile

Location:

```text
HealthCare-Client/Dockerfile
```

```dockerfile
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

COPY . .

EXPOSE 3000

CMD ["sh", "-lc", "CI=true pnpm install && pnpm exec next dev -H 0.0.0.0 -p 3000"]
```

---

# Part 10 — Frontend `.dockerignore`

Location:

```text
HealthCare-Client/.dockerignore
```

```text
node_modules
.next
.env
.env.*
.git
.gitignore
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

Again, `pnpm-lock.yaml` ignore করা উচিত নয় যদি Dockerfile-এ সেটি COPY করা হয়।

---

# Part 11 — Frontend Build

Project root থেকে:

```powershell
docker build -t healthcare-client-dev ./HealthCare-Client
```

Check:

```powershell
docker images
```

---

# Part 12 — Frontend Run

Project root থেকে:

```powershell
MSYS_NO_PATHCONV=1 docker run -d `
  --name healthcare-client `
  --network healthcare-net `
  --env-file ./HealthCare-Client/.env.local `
  -e CHOKIDAR_USEPOLLING=1 `
  -e CHOKIDAR_INTERVAL=300 `
  -e WATCHPACK_POLL=true `
  -p 3000:3000 `
  -v "$PWD/HealthCare-Client:/app" `
  -v client-node-modules:/app/node_modules `
  -w /app `
  healthcare-client-dev `
  sh -lc "CI=true pnpm install && pnpm exec next dev --webpack -H 0.0.0.0 -p 3000"
```

---

# Part 13 — Docker Compose

Manual `docker run` শেখার পরে পুরো stack একসাথে manage করার জন্য Compose ব্যবহার করা হয়েছে।

## `docker-compose.yaml`

Project root:

```text
D:\prisma\HealthCare\docker-compose.yaml
```

```yaml
services:

  healthcare-db:
    image: postgres:16-alpine
    container_name: healthcare-db

    networks:
      - healthcare-net

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret123
      POSTGRES_DB: healthCare

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
```

> Compose file-এর PostgreSQL credentials এবং backend `DATABASE_URL` অবশ্যই একই credentials/database-এর সাথে match করতে হবে। Project-এর `.env`-এর conflicting `DATABASE_URL` থাকলে Compose-এর `environment` value container-এর জন্য override করতে পারে।

---

# Part 14 — Start Entire Stack

Project root থেকে:

```powershell
docker compose up -d
```

Live logs:

```powershell
docker compose logs -f
```

Status:

```powershell
docker compose ps
```

Stop:

```powershell
docker compose down
```

> `docker compose down -v` সাবধানে ব্যবহার করতে হবে; এতে Compose-managed volumes মুছে যেতে পারে এবং database data হারাতে পারে।

---

# Part 15 — Final Access Points

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:5000

PostgreSQL from Windows:
localhost:5433
```

Internal Docker communication:

```text
healthcare-client
      ↓
healthcare-server:5000
      ↓
healthcare-db:5432
```

---

# Part 16 — Architecture

```text
                         Windows Host
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          :3000             :5000            :5433
             │                │                │
             ▼                ▼                ▼
      ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
      │   Client    │  │   Server    │  │ PostgreSQL  │
      │  Next.js    │  │ Node/Express│  │    DB       │
      │   :3000     │  │    :5000    │  │    :5432    │
      └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
             │                │                │
             └────────────────┴────────────────┘
                       healthcare-net
```

---

# Part 17 — Troubleshooting

## `services must be a mapping`

YAML indentation ঠিক করতে হবে:

```yaml
services:
  healthcare-db:
    image: postgres:16-alpine
```

## Container name already in use

```powershell
docker ps -a
docker stop healthcare-db
docker rm healthcare-db
```

Force:

```powershell
docker rm -f healthcare-db
```

## Prisma P1000

Credentials match করো:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

Docker-to-Docker:

```text
postgresql://USER:PASSWORD@healthcare-db:5432/DB?schema=public
```

Host-to-Docker:

```text
postgresql://USER:PASSWORD@localhost:5433/DB?schema=public
```

## `EAI_AGAIN`

সাধারণত wrong hostname বা DNS resolution issue।

Docker network-এ PostgreSQL-এর জন্য:

```text
healthcare-db
```

ব্যবহার করো।

## Port already allocated

```powershell
docker ps
```

Conflict করা container stop করো অথবা host port পরিবর্তন করো।

---

# Part 18 — Final Checklist

```text
✓ Docker Desktop running
✓ docker-compose.yaml exists
✓ Server Dockerfile exists
✓ Client Dockerfile exists
✓ package.json exists
✓ pnpm-lock.yaml exists
✓ PostgreSQL volume exists
✓ Docker network exists
✓ Database credentials match
✓ Server DATABASE_URL matches DB
✓ Prisma migration succeeds
✓ Frontend runs on 3000
✓ Backend runs on 5000
✓ PostgreSQL exposed on 5433
```

---

# Part 19 — Development vs Production

এই setup মূলত development-oriented কারণ এতে:

- bind mount আছে
- startup-এ `pnpm install` হচ্ছে
- Next.js dev server চলছে
- Windows file watching-এর জন্য polling আছে
- migration startup-এর সাথে চালানো হচ্ছে

Production-এর জন্য আলাদা setup করা উচিত:

```text
Multi-stage build
Production dependencies
Compiled application
Non-root user
Secrets management
Healthchecks
Controlled migrations
No source bind mount
No development polling
Next.js production build
```
