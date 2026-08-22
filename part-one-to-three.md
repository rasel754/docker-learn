# Docker Learning Notes

A practical Docker learning guide based on my hands-on practice.

---

## 1. What is Docker?

Docker is a platform for packaging and running applications in isolated environments called **containers**.

A container contains the application and the dependencies it needs to run.

### Basic Flow

```text
Dockerfile
    ↓ (docker build)
Docker Image
    ↓ (docker run)
Docker Container
    ↓
Running Application
```

### Why Docker?

Without Docker, an application may depend on:
- Specific Node.js version
- Specific package versions
- OS-level dependencies
- Environment variables
- Database/services
- Configuration

Docker helps make the environment consistent across development, testing, and production.

---

## 2. Docker Image

An **image** is a read-only template used to create containers.

### View Images

```bash
docker images
```

**Example Output:**
```text
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
my-app       latest    a1b2c3d4e5f6   2 hours ago    150MB
nginx        latest    f5e4d3c2b1a0   1 day ago      187MB
node         20-alpine 9876543210ab   3 days ago     120MB
ubuntu       latest    1234567890cd   1 week ago     77.8MB
```

An image can be used to create multiple containers:

```text
              Image
             /     \
            ↓       ↓
      Container A  Container B
```

### Pull an Image

```bash
docker pull nginx:latest
```

> [!NOTE]
> If no tag is specified, Docker automatically defaults to `latest`.

---

## 3. Docker Container

A **container** is a running or stopped instance created from an image.

### Run a Container

```bash
docker run nginx:latest
```

### List Containers

- **List running containers:**
  ```bash
  docker ps
  ```
- **List all containers (including stopped):**
  ```bash
  docker ps -a
  ```

### Container States
- **Created**
- **Running / Up**
- **Exited**

### Important Relationship

```text
Image     = Template
Container = Instance created from that template
```

---

## 4. Dockerfile

A **Dockerfile** contains step-by-step instructions for building a Docker image.

### Example Node.js Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
```

---

## 5. Dockerfile Instructions

### `FROM`
```dockerfile
FROM node:20-alpine
```
Defines the base image.
- `node` → Node.js runtime image
- `20` → Node.js version
- `alpine` → Lightweight Linux distribution

### `WORKDIR`
```dockerfile
WORKDIR /app
```
Sets the working directory inside the container. Subsequent instructions will execute from `/app`.

### `COPY`
```dockerfile
COPY package*.json ./
```
Copies matching package files from the host build context into the working directory.

```dockerfile
COPY . .
```
Copies all project files into the image, respecting `.dockerignore`.

### `RUN`
```dockerfile
RUN npm ci --omit=dev
```
Executes commands **at build time** to build the image (e.g., installing dependencies).

> [!IMPORTANT]
> - `RUN` happens at **build time**.
> - `npm ci` requires a `package-lock.json` file. If missing, `npm ci` fails.
> - Running `npm i` creates `package-lock.json`, resolving missing lockfile build failures.

### `EXPOSE`
```dockerfile
EXPOSE 5000
```
Documents that the application listens on container port `5000`. 
> [!NOTE]
> `EXPOSE` does not publish the port to the host. Use `-p 5000:5000` with `docker run` to publish it.

### `CMD`
```dockerfile
CMD ["node", "index.js"]
```
Defines the default command executed when the container **starts**.

| Instruction | Execution Time | Purpose |
|---|---|---|
| `RUN` | **Build time** | Prepares the image (installs packages, compiles code) |
| `CMD` | **Runtime** | Starts the main container process |

---

## 6. .dockerignore

A `.dockerignore` file prevents unnecessary or sensitive files from being copied into the build context.

### Example `.dockerignore`

```text
node_modules
.git
.env
npm-debug.log
```

---

## 7. Docker Build

### Build an Image

```bash
docker build -t my-image .
```

**Breakdown:**
- `docker build`: Command to build image
- `-t my-image`: Tags/names the image `my-image:latest`
- `.`: Build context (current directory)

### Build with a Specific Version Tag

```bash
docker build -t my-app:v1 .
```

---

## 8. Build Cache

Docker caches each layer during the build process.

```dockerfile
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
```

If only `index.js` changes, Docker reuses the cached dependency installation layer (`npm ci`), drastically speeding up rebuilds.

> [!TIP]
> Always copy dependency files and install packages **before** copying the rest of the source code.

---

## 9. Rebuild After Code Changes

When source code changes:

1. **Rebuild the image:**
   ```bash
   docker build -t my-app .
   ```
2. **Run a new container:**
   ```bash
   docker run --name my-container -p 5000:5000 my-app
   ```

> [!NOTE]
> Running containers do **not** automatically update when an image is rebuilt.

```text
Code Change ──> docker build ──> New Image ──> New Container
```

---

## 10. Running Containers

### Basic Run

```bash
docker run nginx:latest
```

### Detached Mode (`-d`)

```bash
docker run -d nginx:latest
```
Runs the container in the background.

- ❌ Incorrect: `docker -d nginx:latest`
- ✅ Correct: `docker run -d nginx:latest`

### Interactive Mode (`-it`)

```bash
docker run -it alpine sh
```
- `-i`: Interactive (keeps STDIN open)
- `-t`: Allocates a pseudo-TTY terminal

---

## 11. Container Lifecycle

- **Stop container:**
  ```bash
  docker stop <container_id_or_name>
  ```
  *Example:* `docker stop 69c`

- **Start stopped container:**
  ```bash
  docker start <container_id_or_name>
  ```

- **Restart container:**
  ```bash
  docker restart <container_id_or_name>
  ```

- **Remove container:**
  ```bash
  docker rm <container_id_or_name>
  ```

- **Force remove running container:**
  ```bash
  docker rm -f <container_id_or_name>
  ```

- **Remove all stopped containers:**
  ```bash
  docker container prune
  ```

---

## 12. `--rm` Flag

```bash
docker run --rm -it alpine sh
```
Automatically removes the container when it exits. Useful for temporary or one-off tasks.

---

## 13. Container Names

Assign a custom name with `--name`:

```bash
docker run --name my-container nginx
```

If a name conflict occurs:
```bash
docker rm my-container
```
*(or choose a different container name).*

---

## 14. Container Logs

- **View logs:**
  ```bash
  docker logs <container_id_or_name>
  ```
- **Follow logs continuously:**
  ```bash
  docker logs -f <container_id_or_name>
  ```

---

## 15. Execute Commands inside a Running Container

`docker exec` runs commands inside an **active container**.

- ❌ **Incorrect (uses image name):**
  ```bash
  docker exec my-image:latest sh
  ```
- ✅ **Correct (uses container ID/name):**
  ```bash
  docker exec -it <container_id_or_name> sh
  ```

Inside the container:
```bash
ls
cd /app
cat file.txt
```

---

## 16. Port Mapping

Map container ports to host ports using `-p HOST_PORT:CONTAINER_PORT`.

```bash
docker run -p 5000:5000 my-app
```

```text
Windows (localhost:5000) ──> Container Port 5000 ──> Node/Express App
```

### Port Conflicts

If host port 5000 is occupied:
```text
Bind for 0.0.0.0:5000 failed: port is already allocated
```

**Resolution Options:**
1. Stop the process/container using port 5000:
   ```bash
   docker stop <container_id>
   ```
2. Map to a different host port:
   ```bash
   docker run -p 5001:5000 my-app
   ```

---

## 17. Restart Policies

Configure automatic container restarts on failure or system reboot.

### `always`
```bash
docker run -d --name always-test --restart always alpine sleep 1d
```
Always restarts the container if it stops.

### `unless-stopped`
```bash
docker run -d --name unless-test --restart unless-stopped alpine sleep 1d
```
Restarts the container unless it was manually stopped.

### Summary of Policies
- `no` (default)
- `always`
- `unless-stopped`
- `on-failure`

---

## 18. Restart Count

Check how many times a container has restarted:

```bash
docker inspect restart-always --format '{{.RestartCount}}'
```

> [!NOTE]
> Manually stopping a container does not increment the restart count.

---

## 19. Docker Inspect

Inspect detailed low-level JSON configuration of Docker objects:

```bash
docker inspect <container_id_or_name>
```

**Format specific properties:**
```bash
docker inspect <container_id_or_name> --format '{{.State.Status}}'
```

Useful for checking:
- Container configuration
- Network details & IP addresses
- Mounts (volumes/bind mounts)
- Environment variables
- Restart count & policies

---

## 20. Docker Tags

Tag an image with another name or version:

```bash
docker tag nginx:latest nginx:new
```

Both tags point to the same underlying image layers (no duplicate storage used).

---

## 21. Docker Hub

Push images to Docker Hub registry:

```bash
docker push rasel754/node-app:latest
```

**Image naming format:** `USERNAME/REPOSITORY:TAG`

### Pull & Run from Docker Hub

```bash
docker pull rasel754/node-app:latest
docker run --name node-new -p 5000:5000 rasel754/node-app:latest
```

```text
Local Image ──> docker push ──> Docker Hub ──> docker pull ──> Other Machine ──> docker run
```

---

## 22. Docker Volumes

Containers are ephemeral. Data stored inside a container is lost when the container is deleted.
A **Volume** provides persistent, Docker-managed storage.

```bash
docker volume ls
docker volume create my-vol
docker volume inspect my-vol
docker volume rm my-vol
docker volume prune
```

---

## 23. Named Volumes

Create and mount a named volume:

```bash
docker volume create my-vol

docker run -it --name vol-demo -v my-vol:/data ubuntu bash
```

Inside container:
```bash
cd /data
echo "this is my docker data" > secretMessage.txt
exit
```

Remove container & re-run with new container:
```bash
docker rm vol-demo
docker run -it --name vol-demo -v my-vol:/data ubuntu bash
cat /data/secretMessage.txt
```

```text
Container 1 (writes data) ──> Named Volume ──> Container 1 Removed ──> Container 2 (reads data)
```

---

## 24. Named Volume vs Container

- **Container:** Application execution environment (disposable)
- **Volume:** Persistent data storage (survives container removal)

---

## 25. Volume Syntax

Syntax: `-v VOLUME_NAME:CONTAINER_PATH`

```bash
-v my-vol:/data
```

> [!WARNING]
> Invalid formatting (e.g., `-v my:vol:/data`) results in mount mode errors.

---

## 26. Bind Mounts

Bind mounts map a specific host directory directly into the container.

```bash
docker run -it \
  --name bind-demo \
  -v "${PWD}:/app" \
  -w /app \
  -p 5000:5000 \
  node:20-alpine sh
```

| Feature | Named Volume | Bind Mount |
|---|---|---|
| **Storage Location** | Managed by Docker | Specific host directory |
| **Use Case** | Databases, persistent app data | Live development code sync |
| **Syntax** | `-v my-vol:/data` | `-v "${PWD}:/app"` |

---

## 27. Bind Mount + Nodemon (Development Workflow)

```bash
docker run -it \
  --name bind-demo \
  -v "${PWD}:/app" \
  -w /app \
  -p 5000:5000 \
  node:20-alpine \
  sh -c "npm install -g nodemon && npm install && nodemon --watch /app --legacy-watch index.js"
```

**Live Reloading Flow:**
```text
Edit Code on Host ──> Host Directory Updated ──> Bind Mount Syncs ──> Container /app Updates ──> Nodemon Restarts App
```

> [!TIP]
> Use `--legacy-watch` with Nodemon when working across Windows/Docker/WSL file systems.

---

## 28. Environment Variables (`-e`)

Pass environment variables at container startup:

```bash
docker run -it --rm -p 5000:5000 -e NODE_ENV=production my-app:latest
```

---

## 29. `.env` File (`--env-file`)

Load environment variables from a file:

```bash
docker run -it --rm --env-file .env -p 5000:5000 my-app:latest
```

**Sample `.env` file:**
```env
NODE_ENV=production
PORT=5000
API_URL=https://example.com
```

> [!CAUTION]
> Never commit `.env` files with secret keys or credentials to Git. Keep `.env` in `.gitignore`.

---

## 30. Build Arguments (`ARG`)

`ARG` defines variables passed **during image build time**.

```dockerfile
ARG APP_ENV
```

```bash
docker build --build-arg APP_ENV=testing -t my-app .
```

---

## 31. ARG vs ENV vs `-e` vs `--env-file`

| Mechanism | Type | When Used | Source |
|---|---|---|---|
| `ARG` | Build variable | Build time | `--build-arg` |
| `ENV` | Environment variable | Image / Runtime default | `Dockerfile` |
| `-e` | Environment variable | Runtime override | Command line flag |
| `--env-file` | Environment variables | Runtime bulk import | File (`.env`) |

---

## 32. Common Docker Command Mistakes

| Mistake | Reason | Correct Command |
|---|---|---|
| `docker -d nginx` | Missing `run` command | `docker run -d nginx` |
| `docker remove container` | Keyword is `rm` | `docker rm container` |
| `docker imeges` | Typo in `images` | `docker images` |
| `docker exec my-image sh` | `exec` targets container, not image | `docker exec -it <container_id> sh` |
| `docker run my-container` | `run` targets image, not container | `docker run my-image` |
| `docker pull` | Image name required | `docker pull nginx:latest` |

---

## 33. Useful Command Cheat Sheet

### Images
```bash
docker images                       # List images
docker pull <image>                 # Pull image
docker build -t <name> .            # Build image
docker tag <image> <new-name>       # Tag image
docker push <user>/<repo>:<tag>     # Push to Hub
docker rmi <image>                  # Remove image
```

### Containers
```bash
docker ps                           # List running containers
docker ps -a                        # List all containers
docker run <image>                  # Run container
docker run -d <image>               # Run detached
docker start <container>            # Start container
docker stop <container>             # Stop container
docker restart <container>          # Restart container
docker rm <container>               # Remove container
docker rm -f <container>            # Force remove container
docker container prune              # Remove all stopped containers
```

### Debugging
```bash
docker logs <container>             # View logs
docker logs -f <container>          # Follow logs
docker exec -it <container> sh      # Execute interactive shell
docker inspect <container>         # Inspect container JSON
```

### Volumes
```bash
docker volume ls                    # List volumes
docker volume create <volume>       # Create volume
docker volume inspect <volume>      # Inspect volume
docker volume rm <volume>           # Remove volume
docker volume prune                 # Remove unused volumes
```

### Environment & Network
```bash
docker run -e KEY=value <image>     # Pass env variable
docker run --env-file .env <image>  # Pass env file
docker run -p 5000:5000 <image>     # Port mapping
```

### Restart Policy
```bash
docker run --restart always <image>
docker run --restart unless-stopped <image>
```

---

## 34. Docker Mental Model

### Core Workflow

```text
               Dockerfile
                   │
             (docker build)
                   ↓
             Docker Image
                   │
              (docker run)
                   ↓
            Docker Container
               │       │
               │       └── Environment Variables
               │
               ├── Port Mapping (-p)
               │
               ├── Volumes (-v)
               │
               └── Logs
```

### Development Workflow

```text
Host Project Directory
     │
     │ (Bind Mount -v "${PWD}:/app")
     ↓
Container /app
     │
     ↓
Nodemon (Watcher)
     │
     ↓
Running Application
```

---

## 35. Important Differences to Memorize

| Concept | Meaning |
|---|---|
| **Image** | Template used to create containers |
| **Container** | Running/stopped instance of an image |
| **Dockerfile** | Instructions for building an image |
| **`docker build`** | Creates an image from Dockerfile |
| **`docker run`** | Creates and starts a container from an image |
| **`RUN`** | Executes command during image build time |
| **`CMD`** | Default command executed when container starts |
| **`EXPOSE`** | Documents container port |
| **`-p`** | Publishes/maps host port to container port |
| **Volume** | Persistent Docker-managed storage |
| **Bind mount** | Maps host path directly into container |
| **`ARG`** | Build-time variable |
| **`ENV`** | Environment variable |
| **`-e`** | Runtime environment variable |
| **`--env-file`** | Loads runtime variables from a file |
| **`docker logs`** | Shows container stdout/stderr logs |
| **`docker exec`** | Runs a command inside a running container |
| **`--rm`** | Automatically removes container after exit |
| **`--restart always`** | Automatically restarts container if stopped/crashed |
| **Docker Hub** | Cloud registry for storing/sharing images |

---

## 36. Recommended Learning Order

### Completed Topics
1. Docker basics
2. Images
3. Containers
4. Dockerfile
5. `docker build`
6. `docker run`
7. Port mapping
8. Container lifecycle
9. Logs
10. `exec`
11. Restart policies
12. Docker Hub
13. Volumes
14. Bind mounts
15. Nodemon / Live development
16. Environment variables
17. `ARG` / `ENV` / `-e`
18. `.env` / `--env-file`
19. Build cache and rebuilds

### Next Topics to Explore
- Docker Compose
- Docker Networking
- Multi-container Applications
- MongoDB + Node.js with Docker
- Dockerfile Optimization
- Multi-stage Builds
- Docker Security Basics
- Docker Image Cleanup
- Production Docker Practices

---

### Quick Memory Rules

```text
IMAGE      = Template
CONTAINER  = Instance
VOLUME     = Persistent Data
BIND MOUNT = Host Directory ↔ Container Directory

BUILD      = Image Creation
RUN        = Build-time Command
CMD        = Startup Command

ARG        = Build-time Variable
ENV        = Environment Variable
-e         = Runtime Variable
.env       = Runtime Variables from File

-p         = Port Mapping
-v         = Volume / Bind Mount
-d         = Detached Mode
-it        = Interactive Terminal
--rm       = Remove After Exit

docker run  → IMAGE
docker exec → CONTAINER
docker stop → CONTAINER
docker rm   → CONTAINER
docker rmi  → IMAGE
```