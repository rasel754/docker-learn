# Docker Part 4 — Networking & Architecture

> Based on topics **56-1** through **56-10**. This guide focuses on Docker container communication, networking modes, host-to-container and container-to-container communication, user-defined networks, DNS resolution, and Docker architecture.

---

## 📑 Table of Contents

- [56-1 — Container Communication and Types of Communication](#56-1--container-communication-and-types-of-communication)
- [56-2 — Container to WWW Communication](#56-2--container-to-www-communication)
- [56-3 — Container to Local Host Machine Communication](#56-3--container-to-local-host-machine-communication)
- [56-4 — Container-to-Container Communication](#56-4--container-to-container-communication)
- [56-5 — How Docker Networking Simulates a Real-World Network Internally](#56-5--how-docker-networking-simulates-a-real-world-network-internally)
- [56-6 — Creating a Container and Communicating to Web (WWW)](#56-6--creating-a-container-and-communicating-to-web-www)
- [56-7 — Implementing Container to Host Communication](#56-7--implementing-container-to-host-communication)
- [56-8 — Container-to-Container Communication: IP vs Hostname](#56-8--container-to-container-communication-in-docker-ip-vs-hostname)
- [56-9 — Docker Architecture Overview](#56-9--docker-architecture-overview)
- [56-10 — Module Recap and Capstone Project Idea](#56-10--module-recap-and-capstone-project-idea)
- [💡 Viva & Interview Short Answers](#-viva--interview-short-answers)
- [📌 Final Summary Tree](#-final-part-4-summary)

---

## 56-1 — Container Communication and Types of Communication

Containers are isolated environments by default, but real-world applications require them to communicate with external resources, the host system, or other containers.

### Three Types of Communication Flow

```text
Container
 ├───> 1. WWW / Internet
 ├───> 2. Host Machine
 └───> 3. Other Containers
```

### Breakdown of Communication Types

1. **Container → WWW (Internet)**
   - Outbound requests to external websites, APIs, or registries.
   - *Example flow:* `Container → Docker Network → Host → Internet → WWW`
   - *Typical uses:* Calling REST APIs, downloading npm/python packages, connecting to 3rd-party SaaS (e.g., Stripe, SendGrid).

2. **Container → Host Machine**
   - Accessing local databases, services, or APIs running directly on the host OS.
   - *Example flow:* Container accessing a database running natively on Windows/Linux host.

3. **Container → Container**
   - Microservices architecture where containers communicate internally.
   - *Example flow:* `Frontend Container → Backend API Container → Database Container`
   - *Typical uses:* Standard full-stack web applications.

---

## 56-2 — Container to WWW Communication

A Docker container can seamlessly access the internet out of the box through Docker's virtual bridge networking system.

### How Outbound Traffic Flows

```text
Container
   │
   ▼
Docker Network (Virtual Bridge)
   │
   ▼
Host Network Interface
   │
   ▼
Internet / Router
   │
   ▼
WWW (External Web / API)
```

### Testing Outbound Internet Access

You can verify internet connectivity from inside an isolated container using shell tools:

```bash
docker run -it --rm alpine sh
# Inside container:
ping -c 3 google.com
```

> [!NOTE]
> **Outbound vs Inbound:** Container → WWW is *outbound* traffic and works automatically. Incoming requests (WWW → Container) require port publishing using `-p <host-port>:<container-port>`.

**Example Code (Node.js container fetching an API):**
```js
// Running inside Node container:
const res = await fetch("https://api.github.com");
const data = await res.json();
```

---

## 56-3 — Container to Local Host Machine Communication

A common beginner mistake is assuming that `localhost` inside a container refers to the host machine (e.g., Windows or macOS).

> [!WARNING]
> **Inside a Container:** `localhost` ALWAYS refers to the **current container itself**, NOT the host operating system.

### How to Access Host Machine from a Container

If your host machine is running a service (e.g., Node.js API on port `5000`), the container **cannot** reach it via `http://localhost:5000`.

Instead, Docker Desktop provides a special DNS hostname:

```text
host.docker.internal
```

### Architecture Diagram

```text
Windows Host Machine
 └── Node.js API (Port 5000)
         ▲
         │  http://host.docker.internal:5000
         │
 Docker Container
```

**Example:**
```bash
# Inside container:
curl http://host.docker.internal:5000
```

---

## 56-4 — Container-to-Container Communication

In production architectures, containers need to communicate with one another (e.g., Frontend → Backend → Database).

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend      │ ──> │     Backend      │ ──> │     MongoDB      │
│   (Next.js)      │     │  (Express API)   │     │    (Database)    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Step-by-Step Implementation with User-Defined Networks

The recommended way to enable container-to-container communication is by creating a **User-Defined Docker Network**.

#### 1. Create a custom network
```bash
docker network create app-network
```

#### 2. List and Inspect Networks
```bash
# List all Docker networks
docker network ls

# Inspect details of app-network
docker network inspect app-network
```

#### 3. Run Containers on the Custom Network
```bash
# Run backend container attached to app-network
docker run -d --name backend --network app-network my-backend

# Run frontend container attached to app-network
docker run -d --name frontend --network app-network my-frontend
```

#### 4. Automatic DNS Resolution
When containers are on the same user-defined network, Docker's built-in DNS server allows containers to reach each other using **Container Name as Hostname**:

```http
http://backend:5000
```

---

## 56-5 — How Docker Networking Simulates a Real-World Network Internally

Docker creates a virtual switch/bridge network on the host system to simulate a physical local area network (LAN).

### Conceptual Comparison

| Real-World Physical Network | Docker Virtual Network |
| :--- | :--- |
| Physical Router / Switch | Docker Network Bridge (`bridge`) |
| Physical Ethernet Cable | Virtual Ethernet Pair (`veth`) |
| Computer IP (`192.168.x.x`) | Container IP (`172.x.x.x`) |
| Hostname / DNS Server | Container Name / Built-in Docker DNS |

### Internal Docker Network Diagram

```text
                 Docker User-Defined Network
          ┌───────────────────────────────────────┐
          │                                       │
          │  ┌─────────────┐     ┌─────────────┐  │
          │  │ Container A │     │ Container B │  │
          │  └─────────────┘     └─────────────┘  │
          │         ▲                   ▲         │
          └─────────┼───────────────────┼─────────┘
                    └─────────┬─────────┘
                              ▼
                        Host Machine
```

### Key Networking Concepts

- **Network:** Virtual isolated environment where containers communicate.
- **IP Address:** Dynamic internal IP assigned to a container (e.g., `172.18.0.2`).
- **Port:** Identifies a specific service running inside the container (e.g., `5000`, `27017`).
- **Hostname:** Container name used for DNS lookup (e.g., `backend`, `mongodb`).

---

## 56-6 — Creating a Container and Communicating to Web (WWW)

Let's test an application container making outbound HTTP calls to an external REST API.

### Outbound Network Architecture

```text
Node.js Container ──> Docker Network ──> Host ──> Internet ──> External API
```

### Live Test Command

```bash
# Run an interactive Node.js container and clean it up on exit
docker run -it --rm node:20-alpine sh
```

Inside the Node shell, you can make external HTTP calls:

```javascript
// Node.js script inside container
const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
const data = await res.json();
console.log(data);
```

### Directional Traffic Summary

```text
Outbound Traffic (Automatic):
Container ───────> Internet (e.g. fetch third-party APIs)

Inbound Traffic (Requires Port Publishing):
Internet / Host ───> Container (via `-p <host-port>:<container-port>`)
```

---

## 56-7 — Implementing Container to Host Communication

Let's review the exact configuration to communicate between Host and Container in both directions.

### Summary Comparison Table

| Direction | Source | Destination | Address / Command to Use |
| :--- | :--- | :--- | :--- |
| **Host → Container** | Host Machine | Container Service | `docker run -p 5000:5000 app`<br>Access via `http://localhost:5000` |
| **Container → Host** | Container | Host Service | Access via `http://host.docker.internal:5000` |
| **Container → Self** | Container | Container Self | Access via `http://localhost:<port>` |

> [!IMPORTANT]
> - `localhost` inside container = **Container itself**
> - `host.docker.internal` inside container = **Host OS (Docker Desktop)**

---

## 56-8 — Container-to-Container Communication: IP vs Hostname

### Why IP Addresses Should NOT Be Hardcoded

When containers start up on a Docker network, Docker assigns them internal IP addresses sequentially (e.g., `172.18.0.2`, `172.18.0.3`).

```text
backend   ──> 172.18.0.2
mongodb   ──> 172.18.0.3
```

> [!CAUTION]
> If a container restarts or is recreated, its IP address can change! Hardcoding `172.18.0.3` in your code will break connections whenever container IPs shift.

### Recommended Pattern: Use Container Names (DNS)

Docker provides automatic DNS resolution on user-defined networks.

#### Example Setup:
```bash
# 1. Create a custom user network
docker network create app-network

# 2. Start MongoDB container
docker run -d --name mongodb --network app-network mongo

# 3. Start Backend container
docker run -d --name backend --network app-network my-backend
```

#### Environment Variables Configuration:
```env
# Clean, maintainable service URLs using Container Names as hostnames:
BACKEND_URL=http://backend:5000
MONGO_URL=mongodb://mongodb:27017/appdb
```

---

## 56-9 — Docker Architecture Overview

Docker operates on a **Client-Server Architecture**.

```text
  Docker Client (CLI)
          │
          ▼  (REST API / Unix Socket)
  Docker Daemon (dockerd)
          │
  ┌───────┼───────────────┬───────────────┐
  ▼       ▼               ▼               ▼
Images  Containers     Networks        Volumes
  │
  ▼
Docker Registry (Docker Hub)
```

### The 5 Core Components

1. **Docker Client (`docker` CLI)**
   - The primary user interface for issuing commands (e.g., `docker run`, `docker build`, `docker ps`).
   - Translates CLI inputs into API calls sent to the Docker Daemon.

2. **Docker Daemon (`dockerd`)**
   - The background service managing all Docker objects: building images, starting/stopping containers, managing networks and volumes.

3. **Docker Image**
   - A read-only, layered template containing application code, runtimes, dependencies, and environment settings.
   - *Relationship:* `Image → Container` (1 Image can instantiate N Containers).

4. **Docker Container**
   - A runnable, isolated instance of a Docker image with an writable layer on top.

5. **Docker Registry**
   - Storage and distribution system for Docker images (e.g., Docker Hub, AWS ECR, GitHub Container Registry).
   - `docker pull`: Downloads image from registry to local daemon.
   - `docker push`: Uploads local image to remote registry.

---

## 56-10 — Module Recap and Capstone Project Idea

### Section Summary

Containers communicate in 3 main directions:
1. **Container → WWW:** Outbound network access works automatically.
2. **Container → Host:** Reached using `host.docker.internal`.
3. **Container → Container:** Reached via **User-Defined Networks** using **Container Name** as the hostname.

### Essential Commands Reference

```bash
# Network Management
docker network ls                        # List all networks
docker network create <network-name>     # Create user-defined network
docker network inspect <network-name>    # View network details and attached containers
docker network rm <network-name>         # Remove a network

# Container Inspection
docker ps                                # List running containers
docker inspect <container-id/name>       # Detailed container IP & network config
```

### Full-Stack Capstone Project Architecture

```text
                           Internet / User Browser
                                      │
                                      ▼
                             Host Machine (OS)
                                      │
               ┌──────────────────────┴──────────────────────┐
               │    User-Defined Network (app-network)       │
               │                                             │
               │   ┌─────────────────────────────────────┐   │
               │   │ Frontend Container (React/Next.js)  │   │
               │   └──────────────────┬──────────────────┘   │
               │                      │ http://backend:5000  │
               │                      ▼                      │
               │   ┌─────────────────────────────────────┐   │
               │   │ Backend Container (Express API)     │   │
               │   └──────────────────┬──────────────────┘   │
               │                      │ mongodb://mongodb:27017
               │                      ▼                      │
               │   ┌─────────────────────────────────────┐   │
               │   │ Database Container (MongoDB)        │   │
               │   └─────────────────────────────────────┘   │
               └─────────────────────────────────────────────┘
```

### 6 Golden Rules to Memorize

1. **`localhost` inside container** = The current container itself.
2. **`host.docker.internal`** = Reaches the host machine OS from Docker Desktop.
3. **`-p 5000:5000`** = Maps host port `5000` to container port `5000` (Inbound access).
4. **`--network app-network`** = Attaches container to a custom Docker network.
5. **Container Name as Hostname** = Provides stable DNS resolution between containers.
6. **Prefer Names over IPs** = Container IPs are dynamic; container names are persistent.

---

## 💡 Viva & Interview Short Answers

<details>
<summary><b>1. What is Docker networking?</b></summary>
<br>

> **Answer:** Docker networking is a virtual communication subsystem that enables containers to communicate with each other, with the host machine, and with external networks (like the internet).
</details>

<details>
<summary><b>2. Can a Docker container access the internet by default?</b></summary>
<br>

> **Answer:** Yes. Docker containers have outbound network access enabled by default via the default bridge network and host interface.
</details>

<details>
<summary><b>3. Does `localhost` inside a container refer to the host machine?</b></summary>
<br>

> **Answer:** No. Inside a container, `localhost` refers to the container's own loopback interface.
</details>

<details>
<summary><b>4. How does a container communicate with a service running on the host machine in Docker Desktop?</b></summary>
<br>

> **Answer:** By using the special DNS hostname `host.docker.internal` (e.g., `http://host.docker.internal:5000`).
</details>

<details>
<summary><b>5. How do two containers communicate with each other?</b></summary>
<br>

> **Answer:** Attach both containers to the same user-defined network (`docker network create`) and communicate using the target container's name as the hostname (e.g., `http://backend:5000`).
</details>

<details>
<summary><b>6. Why should you avoid hardcoding container IP addresses?</b></summary>
<br>

> **Answer:** Container IP addresses are dynamically assigned upon startup and can change whenever containers are restarted or recreated.
</details>

<details>
<summary><b>7. What does the `-p 5000:5000` flag mean in `docker run`?</b></summary>
<br>

> **Answer:** It publishes container port `5000` to host port `5000`, mapping host traffic to the containerized service.
</details>

<details>
<summary><b>8. What is the Docker Daemon (`dockerd`)?</b></summary>
<br>

> **Answer:** The Docker daemon is the background server process responsible for managing Docker images, containers, networks, and volumes.
</details>

<details>
<summary><b>9. What is the Docker Client?</b></summary>
<br>

> **Answer:** The Docker CLI tool that accepts commands from users and sends API requests to the Docker daemon.
</details>

<details>
<summary><b>10. What is a Docker Registry?</b></summary>
<br>

> **Answer:** A centralized repository service used to store, version, and distribute Docker images (e.g., Docker Hub).
</details>

---

## 📌 Final Part 4 Summary

```text
Docker Part 4: Networking & Architecture
 ├── Container Communication Directions
 │    ├── Container → WWW (Automatic outbound via bridge network)
 │    ├── Container → Host (host.docker.internal on Docker Desktop)
 │    └── Container → Container (User-defined network + Container name DNS)
 │
 ├── Key Networking Building Blocks
 │    ├── Network (Virtual switch / bridge)
 │    ├── IP (Dynamic container IP address, e.g., 172.x.x.x)
 │    ├── Port (Service port binding, e.g., 5000)
 │    └── Hostname (Container name lookup)
 │
 └── Docker Architecture (Client-Server Model)
      ├── Docker Client (CLI tool)
      ├── Docker Daemon (Background manager process)
      ├── Docker Images (Read-only templates)
      ├── Docker Containers (Running instances)
      ├── Networks & Volumes (Resources)
      └── Docker Registry (Docker Hub)
```