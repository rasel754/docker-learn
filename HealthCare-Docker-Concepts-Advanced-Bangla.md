# HealthCare Docker — Concepts, Why We Use Them, Advanced Practices & Senior-Level Improvements

এই document-এ শুধু command নয়; প্রতিটি Docker concept-এর কাজ, কেন ব্যবহার করছি, real-world example, architecture-level চিন্তা এবং কীভাবে setup আরও professional করা যায় তা দেওয়া হয়েছে।

---

# 1. Docker Image

## কী?

Docker Image হলো application চালানোর জন্য একটি packaged, immutable template।

উদাহরণ:

```text
postgres:16-alpine
node:22-alpine
healthcare-server-dev
healthcare-client-dev
```

## কেন?

একই environment reproducibly তৈরি করা যায়।

Real-world analogy:

```text
Recipe       = Dockerfile
Prepared box = Image
Running box  = Container
```

## Senior improvement

Image ছোট, deterministic এবং reproducible রাখা উচিত। Production-এ multi-stage build ব্যবহার করা যায়।

---

# 2. Docker Container

Image-এর running instance হলো container।

```text
Image
  ↓
Container
```

HealthCare:

```text
postgres:16-alpine → healthcare-db
server image       → healthcare-server
client image       → healthcare-client
```

## Benefit

প্রতিটি service আলাদা isolated process/environment হিসেবে চলতে পারে।

---

# 3. Dockerfile

Dockerfile image build করার instruction।

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
```

## কেন?

Runtime, dependencies এবং application setup declarative করা যায়।

## Layer এবং caching

Dependency file আগে copy করলে:

```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
```

code change হলেও dependency layer reuse হওয়ার সুযোগ থাকে।

## Advanced

Production-এর জন্য:

```text
Builder stage
     ↓
Build artifact
     ↓
Small runtime image
```

---

# 4. `.dockerignore`

Build context থেকে অপ্রয়োজনীয় files বাদ দেয়।

```text
node_modules
.next
dist
.env
.git
```

## Benefit

```text
✓ Smaller build context
✓ Faster build
✓ Fewer unnecessary files
✓ Reduced accidental secret exposure
```

তবে Dockerfile যদি `pnpm-lock.yaml` copy করে, সেটি ignore করা উচিত নয়।

---

# 5. Docker Network

Docker network containers-এর communication layer।

আমাদের:

```text
healthcare-net
```

এর মধ্যে:

```text
healthcare-db
healthcare-server
healthcare-client
```

## কেন?

Backend database-এ:

```text
healthcare-db:5432
```

দিয়ে পৌঁছাতে পারে।

## কেন localhost নয়?

Container-এর ভিতরের:

```text
localhost
```

মানে সেই container নিজেই।

অন্য container নয়।

তাই:

```text
healthcare-server → localhost:5432
```

ভুল হবে যদি DB অন্য container-এ থাকে।

সঠিক:

```text
healthcare-server → healthcare-db:5432
```

---

# 6. Host Port বনাম Container Port

Compose:

```yaml
ports:
  - "5433:5432"
```

এর অর্থ:

```text
5433 = Windows host port
5432 = PostgreSQL container port
```

Host থেকে:

```text
localhost:5433
```

Docker network থেকে:

```text
healthcare-db:5432
```

এটি Docker শেখার অন্যতম গুরুত্বপূর্ণ mental model।

---

# 7. Named Volume

আমাদের PostgreSQL:

```text
healthcare-pg-data
```

mounted:

```text
/var/lib/postgresql/data
```

## কেন?

Container delete হলেও data volume-এ থাকতে পারে।

```text
Container ❌
Volume    ✅
Data      ✅
```

## Real-world

Container = দোকানের building  
Volume = warehouse

Building বদলালেও warehouse-এর inventory থাকতে পারে।

## Senior improvement

Production-এ volume-এর পাশাপাশি:

```text
Backup
Snapshot
Restore testing
Disaster recovery
```

দরকার।

---

# 8. Bind Mount

Development:

```yaml
- ./HealthCare-Server:/app
```

Host source code container-এ mount হয়।

## Benefit

Code পরিবর্তন হলে container application change detect করতে পারে।

## Windows issue

Windows host + Linux container-এর file event সবসময় reliable নয়।

তাই:

```text
CHOKIDAR_USEPOLLING=1
WATCHPACK_POLL=true
```

ব্যবহার করা হয়েছে।

## Trade-off

Polling:

```text
Reliable file detection
```

কিন্তু:

```text
More filesystem activity
Potential performance cost
```

Production-এ সাধারণত source bind mount ও polling দরকার হয় না।

---

# 9. `node_modules` Volume

```yaml
- server-node-modules:/app/node_modules
```

এবং:

```yaml
- client-node-modules:/app/node_modules
```

## কেন?

Windows host-এর dependencies এবং Linux container-এর dependencies আলাদা রাখা যায়।

বিশেষ করে native dependencies-এর ক্ষেত্রে এটি useful।

---

# 10. Environment Variables

উদাহরণ:

```env
DATABASE_URL=...
POSTGRES_PASSWORD=...
```

## কেন?

Code এবং environment-specific configuration আলাদা রাখা।

একই application:

```text
Development
Staging
Production
```

ভিন্ন database/config ব্যবহার করতে পারে।

## Senior improvement

Production secret-এর জন্য dedicated secret management ব্যবহার করা ভালো।

---

# 11. Docker Compose

Compose হলো multi-container application orchestration-এর declarative configuration।

HealthCare:

```text
PostgreSQL
    +
Backend
    +
Frontend
```

একসাথে manage হয়।

Manual:

```text
docker network create
docker volume create
docker run db
docker build server
docker run server
docker build client
docker run client
```

Compose:

```powershell
docker compose up -d
```

## Learning strategy

প্রথমে `docker run` দিয়ে internals বোঝা, পরে Compose দিয়ে orchestration করা খুব ভালো approach।

---

# 12. `depends_on`

```yaml
depends_on:
  healthcare-db:
    condition: service_healthy
```

## কেন?

Backend যেন database ready হওয়ার আগে startup না করে।

শুধু `depends_on` এবং health-based dependency এক জিনিস নয়।

Health condition readiness-এর ওপর আরও meaningful dependency তৈরি করে।

---

# 13. Healthcheck

PostgreSQL:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d healthCare"]
```

Docker-কে জানায় database usable/readiness-এর অবস্থায় আছে কি না।

Possible state:

```text
starting
healthy
unhealthy
```

Process running মানেই service ready—এমন assumption এড়ানো যায়।

---

# 14. Restart Policy

Database:

```yaml
restart: always
```

Backend:

```yaml
restart: unless-stopped
```

## কেন?

Unexpected process exit হলে Docker container restart করতে পারে।

## Senior view

Restart policy একা reliability নয়। এর সাথে:

```text
Healthcheck
Logging
Monitoring
Alerting
Graceful shutdown
```

দরকার।

---

# 15. Prisma Migration

Development:

```text
prisma migrate dev
```

Deployment:

```text
prisma migrate deploy
```

## কেন?

Application schema এবং database schema synchronized রাখা।

Migration files:

```text
prisma/migrations/
```

Production-এ migration strategy controlled হওয়া উচিত।

---

# 16. Prisma Generate

```text
pnpm generate
```

Prisma Client/generated artifacts তৈরির জন্য ব্যবহৃত হয়।

Application Prisma Client ব্যবহার করলে generation step গুরুত্বপূর্ণ।

---

# 17. Hot Reload

Backend:

```text
CHOKIDAR_USEPOLLING=1
CHOKIDAR_INTERVAL=300
```

Frontend:

```text
CHOKIDAR_USEPOLLING=1
WATCHPACK_POLL=true
```

## কেন?

Windows bind mount-এর file changes Linux container-এর watcher সবসময় event হিসেবে ধরতে পারে না।

Polling নির্দিষ্ট interval-এ file change check করে।

## Improvement

Development-এ useful, production-এ সাধারণত unnecessary।

---

# 18. Startup-এ `pnpm install`

Current setup:

```text
CI=true pnpm install
```

Development convenience-এর জন্য dependency নিশ্চিত করে।

কারণ source bind mount হওয়ার পরে `/app` host source দিয়ে populated হয় এবং আলাদা `node_modules` volume ব্যবহার করা হচ্ছে।

## Production improvement

Production container startup-এ বারবার install করা উচিত নয়।

Image build time-এ dependencies install করে immutable runtime image তৈরি করা ভালো।

---

# 19. `--frozen-lockfile`

```text
pnpm install --frozen-lockfile
```

Lockfile এবং package manifest consistency enforce করে।

Benefit:

```text
Reproducible dependency installation
```

CI/CD-তে খুব useful।

---

# 20. Corepack এবং pnpm Version Pinning

```dockerfile
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
```

এর মাধ্যমে container-এ নির্দিষ্ট pnpm version ব্যবহার করা হচ্ছে।

Benefit:

```text
Local pnpm version
        ≈
Container pnpm version
```

Version mismatch কমে।

---

# 21. Multi-container Architecture

```text
Browser
   ↓
Next.js Client :3000
   ↓
Node/Express Server :5000
   ↓
PostgreSQL :5432
```

Docker network:

```text
healthcare-net
```

Internal service discovery:

```text
healthcare-db
healthcare-server
healthcare-client
```

---

# 22. কেন Database Docker-এ?

Benefits:

```text
✓ Reproducible environment
✓ Easy setup
✓ Isolation
✓ Persistent volume
✓ Team consistency
✓ Compose integration
```

Team member-এর machine-এ PostgreSQL manually install না করেও stack চালানো যায়।

---

# 23. কেন Backend Docker-এ?

Backend-এর:

```text
Node
pnpm
dependencies
runtime
environment
```

একটি reproducible environment-এ চলে।

এতে:

> “আমার machine-এ কাজ করছে”

ধরনের environment mismatch কমে।

---

# 24. কেন Frontend Docker-এ?

Frontend-এর:

```text
Node
pnpm
Next.js
dependencies
```

একই environment-এ চালানো যায়।

Team onboarding সহজ হয়।

---

# 25. Docker Compose বনাম Manual `docker run`

## Manual

Learning-এর জন্য excellent:

```text
docker network
docker volume
docker run
docker build
```

এতে Docker-এর internal concepts বোঝা যায়।

## Compose

Project orchestration-এর জন্য:

```powershell
docker compose up -d
```

একটি configuration থেকেই পুরো stack চালানো যায়।

---

# 26. Production Improvement — Multi-stage Build

বর্তমান development image-এর বদলে:

```text
Builder
   ↓
Build
   ↓
Runtime
```

ব্যবহার করা যায়।

Benefits:

```text
Smaller final image
Less attack surface
Faster deployment
```

---

# 27. Production Improvement — Non-root User

Default/root execution-এর বদলে application-এর জন্য dedicated non-root user ব্যবহার করা security improve করে।

Principle:

> Application process-কে যতটুকু permission দরকার, ততটুকুই দেওয়া।

---

# 28. Production Improvement — Secrets

Development:

```env
POSTGRES_PASSWORD=secret123
```

convenient।

Production-এ:

```text
Secret Manager
CI/CD secrets
Cloud secret storage
Docker/Kubernetes secret mechanisms
```

ব্যবহার করা উচিত।

Secrets Git repository-তে commit করা যাবে না।

---

# 29. Database Backup

Named volume persistent হলেও:

```text
Persistence ≠ Backup
```

Production database-এর জন্য:

```text
Scheduled backup
Off-site backup
Point-in-time recovery
Restore testing
```

দরকার।

---

# 30. Logging

বর্তমান:

```text
server-logs:/app/logs
```

Development-এ useful।

Production-এ centralized logging ভালো:

```text
Application
    ↓
Container logs
    ↓
Log collector
    ↓
Central logging platform
```

---

# 31. Observability

Senior-level production system শুধু container running কিনা দেখে না।

Monitor করতে হয়:

```text
Logs
Metrics
Traces
Latency
Error rate
CPU
Memory
DB connections
```

তিনটি major pillar:

```text
Logs + Metrics + Traces
```

---

# 32. Backend Health Endpoint

Backend-এ:

```text
GET /health
```

রাখা যায়।

এরপর Docker healthcheck দিয়ে application-level health check করা যায়।

কারণ:

```text
Database healthy
```

মানে এই নয় যে:

```text
Backend healthy
```

Backend migration failure, missing environment বা application crash হতে পারে।

---

# 33. CI/CD

Dockerization-এর natural next step:

```text
Git push
   ↓
CI
   ↓
Test
   ↓
Docker build
   ↓
Security scan
   ↓
Push image
   ↓
Deploy
```

Example:

```text
GitHub
   ↓
GitHub Actions
   ↓
Docker Registry
   ↓
Server/Cloud
```

---

# 34. Image Registry

Local:

```text
healthcare-server-dev
```

Team/deployment:

```text
Build
  ↓
Registry
  ↓
Deployment server pulls image
```

Registry হলো image distribution layer।

---

# 35. Image Tagging

শুধু:

```text
latest
```

এর ওপর production deployment নির্ভর না করাই ভালো।

Better:

```text
healthcare-server:1.0.0
healthcare-server:2026-09-05
healthcare-server:<git-sha>
```

Benefit:

```text
Traceability
Rollback
Reproducibility
```

---

# 36. Network Segmentation

Current:

```text
healthcare-net
```

Advanced setup-এ:

```text
frontend-net
backend-net
database-net
```

ব্যবহার করা যায়।

Principle:

> A service should communicate only with the services it actually needs.

Client-এর database-এ direct access সাধারণত প্রয়োজন নেই।

---

# 37. Least Privilege Database User

Development-এ:

```text
postgres
```

ব্যবহার convenient।

Production-এ:

```text
postgres
      ↓
Administration

healthcare_app
      ↓
Application queries
```

আলাদা user ব্যবহার করা ভালো।

Application-কে database administrator privilege না দেওয়াই safer।

---

# 38. Resource Limits

Production-এ container-এর:

```text
CPU
Memory
```

limits দেওয়া যায়।

এতে একটি runaway process পুরো host-এর resources consume করার ঝুঁকি কমে।

---

# 39. Graceful Shutdown

Node application stop হলে ideal flow:

```text
SIGTERM
   ↓
Stop accepting new requests
   ↓
Finish active requests
   ↓
Close DB connections
   ↓
Exit
```

Deployment ও restart-এর সময় এটি গুরুত্বপূর্ণ।

---

# 40. Current Setup-এর Strong Points

তোমার বর্তমান HealthCare setup-এ ইতোমধ্যে আছে:

```text
✓ PostgreSQL container
✓ Persistent named volume
✓ Dedicated Docker network
✓ Healthcheck
✓ depends_on
✓ Backend container
✓ Frontend container
✓ Separate node_modules volumes
✓ Hot reload support
✓ Prisma migration automation
✓ Compose orchestration
✓ Pinned pnpm version
✓ Frozen lockfile
```

এটি basic Docker-এর চেয়ে এক ধাপ এগিয়ে **multi-container application architecture**।

---

# 41. Improvement Roadmap

## Level 1 — Current

```text
Docker
+
Compose
+
PostgreSQL
+
Node
+
Next.js
```

## Level 2 — Improve

```text
Healthchecks
Environment separation
Logging
Non-root user
Image optimization
```

## Level 3 — Production

```text
Multi-stage builds
Production images
Secrets
CI/CD
Registry
Reverse proxy
HTTPS
Monitoring
Backups
```

## Level 4 — Advanced

```text
Cloud deployment
Container orchestration
Horizontal scaling
Load balancing
Observability
Automated rollback
Infrastructure as Code
```

---

# 42. Senior Mental Model

Junior প্রশ্ন:

> Container কীভাবে চালাব?

Mid-level প্রশ্ন:

> এই service-এর কোন network, volume এবং dependency দরকার?

Senior প্রশ্ন:

> এই architecture failure, security, scalability, deployment, observability এবং recovery-এর ক্ষেত্রে কী করবে?

এই mindset shift-টাই Docker learning-এর সবচেয়ে গুরুত্বপূর্ণ progression।

---

# 43. Final Mental Model

```text
Dockerfile
   ↓
Image
   ↓
Container
   ↓
Network + Volume
   ↓
Compose
   ↓
Multi-container application
   ↓
CI/CD
   ↓
Production
```

Communication:

```text
Browser
   ↓
localhost:3000
   ↓
Next.js container
   ↓
Backend API :5000
   ↓
PostgreSQL container :5432
```

Data:

```text
PostgreSQL container
        ↓
healthcare-pg-data
        ↓
Persistent database
```

সবচেয়ে গুরুত্বপূর্ণ rule:

```text
Host → localhost + published port
Container → service/container name + container port
```
