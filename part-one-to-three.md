Docker Learning Notes

A practical Docker learning guide based on my hands-on practice.

1. What is Docker?

Docker is a platform for packaging and running applications in isolated environments called containers.

A container contains the application and the dependencies it needs to run.

Basic flow

Dockerfile
    ↓ docker build
Docker Image
    ↓ docker run
Docker Container
    ↓
Running Application

Why Docker?

Without Docker, an application may depend on:

Specific Node.js version

Specific package versions

OS-level dependencies

Environment variables

Database/services

Configuration

Docker helps make the environment more consistent.

2. Docker Image

An image is a read-only template used to create containers.

Example:

docker images

Example output:

IMAGE
my-app:latest
nginx:latest
node:20-alpine
ubuntu:latest

An image can be used to create multiple containers.

              Image
             /     \
            ↓       ↓
      Container A  Container B

Pull an image

docker pull nginx:latest

If no tag is specified, Docker normally uses latest.

3. Docker Container

A container is a running or stopped instance created from an image.

Example:

docker run nginx:latest

List running containers:

docker ps

List all containers:

docker ps -a

Container states can include:

Created
Running / Up
Exited

Important relationship

Image = Template
Container = Instance created from that template

4. Dockerfile

A Dockerfile contains instructions for building a Docker image.

Example Node.js Dockerfile:

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]

5. Dockerfile Instructions

FROM

FROM node:20-alpine

Defines the base image.

Here:

node → Node.js image
20 → Node.js version
alpine → lightweight Linux distribution

WORKDIR

WORKDIR /app

Sets the working directory inside the image/container.

After this, commands operate from:

/app

COPY

COPY package*.json ./

Copies matching package files from the build context into the current working directory.

Another example:

COPY . .

Copies the project files into the image, subject to .dockerignore.

RUN

RUN npm ci --omit=dev

Executes a command while building the image.

Important:

RUN = build time

It installs dependencies into the image.

npm ci

npm ci expects a package-lock.json (or npm shrinkwrap file).

If there is no lock file, npm ci fails.

A previous build failed for this reason. Running:

npm i

created the lock file, after which the Docker build succeeded.

EXPOSE

EXPOSE 5000

Documents that the application listens on container port 5000.

It does not publish the port by itself.

To publish it:

docker run -p 5000:5000 my-app

CMD

CMD ["node", "index.js"]

Defines the default command executed when the container starts.

Important:

RUN = build time
CMD = container startup

6. .dockerignore

A .dockerignore prevents unnecessary files from being sent in the Docker build context.

Example:

node_modules
.git
.env
npm-debug.log

Do not copy unnecessary or sensitive files into an image.

7. Docker Build

Build an image:

docker build -t my-image .

Meaning:

docker build → build an image
-t my-image  → give it the name/tag my-image
.            → use the current directory as build context

Result:

my-image:latest

Build with a different tag

docker build -t my-app:v1 .

8. Build Cache

Docker caches build layers.

For example:

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

If only index.js changes, Docker can reuse the earlier dependency-installation layers.

This makes rebuilds faster.

A good Dockerfile order is therefore:

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

instead of copying the whole project before installing dependencies.

9. Rebuild After Code Changes

When application code changes:

docker build -t my-app .

Then create a new container:

docker run --name my-container -p 5000:5000 my-app

An existing container does not automatically switch to a newly built image.

Conceptually:

Code change
    ↓
docker build
    ↓
New image
    ↓
New container

10. Running Containers

Basic run

docker run nginx:latest

Detached mode

docker run -d nginx:latest

-d means detached mode.

The container runs in the background.

Incorrect:

docker -d nginx:latest

Correct:

docker run -d nginx:latest

Interactive mode

docker run -it alpine sh

Meaning:

-i → interactive
-t → terminal

This opens a shell inside the Alpine container.

11. Container Lifecycle

Stop

docker stop <container>

Example:

docker stop 69c

Start a stopped container

docker start <container>

Restart

docker restart <container>

Remove

docker rm <container>

A running container normally must be stopped before removing it.

Or force remove:

docker rm -f <container>

Remove all stopped containers

docker container prune

Be careful: this removes all stopped containers.

12. --rm

Example:

docker run --rm -it alpine sh

--rm automatically removes the container after it exits.

Useful for temporary containers.

13. Container Names

You can give a container a name:

docker run --name my-container nginx

The name must be unique.

If the name is already being used:

Conflict. The container name is already in use.

You can either:

docker rm my-container

or choose another name.

14. Logs

View container logs:

docker logs <container>

Example:

docker logs 2d637

Follow logs continuously:

docker logs -f <container>

Logs are useful for debugging application startup and runtime errors.

15. Execute Commands Inside a Running Container

Important distinction:

Image ≠ Container

This is wrong:

docker exec my-image:latest sh

docker exec requires a container, not an image.

Correct:

docker exec -it <container> sh

Example:

docker exec -it 9734 sh

Then you can run:

ls
cd /app
cat file.txt

16. Port Mapping

Suppose the application listens inside the container on:

5000

Use:

docker run -p 5000:5000 my-app

Format:

-p HOST_PORT:CONTAINER_PORT

Example:

Windows localhost:5000
        ↓
Container:5000
        ↓
Node/Express

Port conflict

If you see:

Bind for 0.0.0.0:5000 failed:
port is already allocated

another process/container is already using host port 5000.

Check:

docker ps

Stop the container using the port:

docker stop <container>

Or use another host port:

docker run -p 5001:5000 my-app

17. Restart Policies

Docker supports restart policies.

always

docker run -d \
  --name always-test \
  --restart always \
  alpine sleep 1d

Docker attempts to restart the container when it stops.

unless-stopped

docker run -d \
  --name unless-test \
  --restart unless-stopped \
  alpine sleep 1d

This behaves similarly to always, but if you manually stop the container, Docker does not automatically restart it after the Docker daemon restarts.

Common policies

no
always
unless-stopped
on-failure

18. Restart Count

Check restart count:

docker inspect restart-always \
  --format '{{.RestartCount}}'

Example:

0
1

A manually stopped container does not increase the restart count simply because of the manual stop.

19. Docker Inspect

docker inspect provides detailed low-level information about Docker objects.

Example:

docker inspect <container>

You can also format specific information:

docker inspect restart-always \
  --format '{{.RestartCount}}'

Useful for debugging:

Container configuration

Network information

Mounts

Restart policy

Environment

Runtime details

20. Docker Tags

Tags give an image another name/version.

Example:

docker tag nginx:latest nginx:new

Now both can refer to the same underlying image content:

nginx:latest
nginx:new

Tagging does not create an entirely separate copy of the image.

21. Docker Hub

Docker images can be pushed to Docker Hub.

Example:

docker push rasel754/node-app:latest

The image name follows:

USERNAME/REPOSITORY:TAG

Example:

rasel754/node-app:latest

Pull an image

docker pull rasel754/node-app:latest

Then run it:

docker run \
  --name node-new \
  -p 5000:5000 \
  rasel754/node-app:latest

Basic Docker Hub workflow:

Local Image
    ↓
docker push
    ↓
Docker Hub
    ↓
docker pull
    ↓
Other Machine
    ↓
docker run

22. Docker Volumes

Containers are disposable, so data stored only inside a container can disappear when the container is removed.

A volume provides persistent Docker-managed storage.

List volumes:

docker volume ls

Create a volume:

docker volume create my-vol

Inspect:

docker volume inspect my-vol

Remove:

docker volume rm my-vol

Remove unused volumes:

docker volume prune

23. Named Volume

Create:

docker volume create my-vol

Mount it:

docker run -it \
  --name vol-demo \
  -v my-vol:/data \
  ubuntu bash

Here:

my-vol → Docker volume
/data  → path inside container

Inside the container:

cd /data
echo "this is my docker data" > secretMessage.txt
cat secretMessage.txt

Exit and remove the container:

docker rm vol-demo

Create another container using the same volume:

docker run -it \
  --name vol-demo \
  -v my-vol:/data \
  ubuntu bash

The file is still there:

cd /data
ls
cat secretMessage.txt

This demonstrates:

Container 1
    ↓
writes data
    ↓
Named Volume
    ↓
Container 1 removed
    ↓
Container 2
    ↓
same data available

24. Named Volume vs Container

Important:

Container = application environment
Volume    = persistent data

Removing the container does not automatically remove a separately managed named volume.

25. Volume Syntax

Correct:

-v my-vol:/data

General format:

-v SOURCE:DESTINATION

For example:

my-vol:/data

means:

Docker volume "my-vol"
        ↓
container "/data"

A malformed command such as:

-v my:vol:/data

can be interpreted incorrectly and result in an invalid mount mode error.

26. Bind Mounts

A bind mount maps a real directory/file from the host machine directly into the container.

Example from my practice:

docker run -it \
  --name bind-demo \
  -v "${PWD}:/app" \
  -w /app \
  -p 5000:5000 \
  node:20-alpine sh

Here:

Windows project folder
        ↓
       /app
inside container

Named volume

-v my-vol:/data

Docker manages the storage.

Bind mount

-v "${PWD}:/app"

You directly mount a host directory.

27. Bind Mount + Nodemon

For development, a bind mount is very useful.

Example:

docker run -it \
  --name bind-demo \
  -v "${PWD}:/app" \
  -w /app \
  -p 5000:5000 \
  node:20-alpine \
  sh -c "npm install -g nodemon && npm install && nodemon --watch /app --legacy-watch index.js"

This gives a development workflow:

Edit code on Windows
        ↓
Host folder changes
        ↓
Bind mount
        ↓
/app changes inside container
        ↓
Nodemon detects change
        ↓
Node server restarts

--legacy-watch can help with file watching across Windows/Docker/WSL environments.

28. Environment Variables

Environment variables can configure an application without hardcoding values.

Runtime -e

Example:

docker run \
  -it \
  --rm \
  -p 5000:5000 \
  -e NODE_ENV=production \
  my-app:latest

Here:

NODE_ENV=production

is provided when the container starts.

29. .env File

Instead of writing many variables manually:

docker run \
  -it \
  --rm \
  --env-file .env \
  -p 5000:5000 \
  my-app:latest

Docker reads environment variables from .env and passes them into the container.

Example .env:

NODE_ENV=production
PORT=5000
API_URL=https://example.com

Do not commit secrets such as passwords/API keys to GitHub.

Usually:

.env

should be in .gitignore.

30. ARG — Build-Time Variable

Build arguments can be passed during image creation.

Example:

docker build \
  --build-arg APP_ENV=testing \
  -t my-app .

Dockerfile:

ARG APP_ENV

ARG is primarily a build-time value.

Important:

ARG → build time

It is different from runtime environment variables.

31. ARG vs ENV vs -e

ARG

ARG APP_ENV

Used during image build.

docker build --build-arg APP_ENV=testing -t my-app .

ENV

ENV NODE_ENV=production

Defines an environment variable in the image/container environment.

-e

docker run -e NODE_ENV=production my-app

Provides/overrides an environment variable at runtime.

--env-file

docker run --env-file .env my-app

Loads multiple runtime environment variables from a file.

Easy way to remember:

ARG          → Build
ENV          → Environment
-e           → Runtime
--env-file   → Runtime from file

32. Common Docker Command Mistakes

Mistake 1

docker -d nginx

Wrong.

Correct:

docker run -d nginx

Mistake 2

docker remove <container>

Docker uses:

docker rm <container>

Mistake 3

docker imeges

Correct:

docker images

Mistake 4

docker exec my-image:latest sh

Wrong because exec needs a container.

Correct:

docker exec -it <container> sh

Mistake 5

docker run my-nginx

If my-nginx is a container name rather than an image name, Docker tries to find/pull an image called my-nginx.

Remember:

docker run → IMAGE
docker exec → CONTAINER
docker stop → CONTAINER
docker rm → CONTAINER

Mistake 6

docker pull

docker pull requires an image:

docker pull nginx:latest

33. Useful Command Cheat Sheet

Images

docker images
docker pull <image>
docker build -t <name> .
docker tag <image> <new-name>
docker push <username>/<repo>:<tag>
docker rmi <image>

Containers

docker ps
docker ps -a
docker run <image>
docker run -d <image>
docker start <container>
docker stop <container>
docker restart <container>
docker rm <container>
docker rm -f <container>
docker container prune

Debugging

docker logs <container>
docker logs -f <container>
docker exec -it <container> sh
docker inspect <container>

Volumes

docker volume ls
docker volume create <volume>
docker volume inspect <volume>
docker volume rm <volume>
docker volume prune

Environment

docker run -e KEY=value <image>

docker run --env-file .env <image>

Ports

docker run -p 5000:5000 <image>

Restart policy

docker run --restart always <image>

docker run --restart unless-stopped <image>

34. Docker Mental Model

The most important concepts:

                Dockerfile
                    │
              docker build
                    ↓
              Docker Image
                    │
               docker run
                    ↓
             Docker Container
                │       │
                │       └── Environment Variables
                │
                ├── Port Mapping
                │
                ├── Volumes
                │
                └── Logs

And for development:

Host Project
     │
     │ Bind Mount
     ↓
Container /app
     │
     ↓
Nodemon
     │
     ↓
Application

35. Important Differences to Memorize

Concept

Meaning

Image

Template used to create containers

Container

Running/stopped instance of an image

Dockerfile

Instructions for building an image

docker build

Creates an image

docker run

Creates and starts a container

RUN

Executes during image build

CMD

Default command when container starts

EXPOSE

Documents container port

-p

Publishes/maps host port to container port

Volume

Persistent Docker-managed storage

Bind mount

Maps host path directly into container

ARG

Build-time variable

ENV

Environment variable

-e

Runtime environment variable

--env-file

Loads runtime variables from a file

docker logs

Shows container logs

docker exec

Runs a command inside a running container

--rm

Removes container after it exits

--restart always

Automatically restarts according to the policy

Docker Hub

Registry for storing/sharing images

36. Recommended Learning Order

I have learned these topics in roughly this order:

1. Docker basics
2. Images
3. Containers
4. Dockerfile
5. docker build
6. docker run
7. Port mapping
8. Container lifecycle
9. Logs
10. exec
11. Restart policies
12. Docker Hub
13. Volumes
14. Bind mounts
15. Nodemon/live development
16. Environment variables
17. ARG / ENV / -e
18. .env / --env-file
19. Build cache and rebuilds

Next useful topics after these would be:

Docker Compose
Docker networking
Multi-container applications
MongoDB + Node.js with Docker
Dockerfile optimization
Multi-stage builds
Docker security basics
Docker image cleanup
Production Docker practices

Quick Memory Rules

IMAGE      = Template
CONTAINER  = Instance
VOLUME     = Persistent data
BIND MOUNT = Host folder ↔ Container folder

BUILD      = Image creation
RUN        = Build-time command
CMD        = Startup command

ARG        = Build-time variable
ENV        = Environment variable
-e         = Runtime variable
.env       = Runtime variables from file

-p         = Port mapping
-v         = Volume / bind mount
-d         = Detached
-it        = Interactive terminal
--rm       = Remove after exit

docker run     → IMAGE
docker exec    → CONTAINER
docker stop    → CONTAINER
docker rm      → CONTAINER
docker rmi     → IMAGE