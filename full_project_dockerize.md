<-Dockerizing PostgreSQL Service ->

give this command to route of server and client file -> 

docker run --name healthCare-db `
  -e POSTGRES_USER=admin `
  -e POSTGRES_PASSWORD=secret `
  -e POSTGRES_DB=health-care `
  -p 5432:5432 `
  -d postgres


then change the url of database : DATABASE_URL='postgresql://postgres@localhost:5432/healthcare?schema=public'


and command this -> pnpm run migrate dev

command 
->docker network create healthCare-net
//create four volueme with those command 

docker volume create healthCare-pg-data
docker volume create server-node-modules
docker volume create server-logs
docker volume create client-node-modules


then run this command : 
docker run -d --name healthCare-db --network healthCare-net -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=healthcare -v healthCare-pg-data:/var/lib/postgresql/data postgres:16-alpine



# Create Networks

docker network create web
docker network create app


# Create Volumes

docker volume create postgresql-data
docker volume create node_modules
docker volume create logs
docker volume create node_modules_client


<--Dockerizing Vite UI -->
create a docker file on server root 
Dockerfile :

FROM  node:22-alpine 

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate 

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5000

CMD ["sh", "-lc", "CI=true pnpm install && pnpm generate && pnpm dev"]


create a file for .dockerignore 
node_modules
dist
.env
.env.*
.git 
.gitignore
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-lock.yaml



change the url : DATABASE_URL="postgresql://admin:secret@localhost:5433/healthcare?schema=public"
replace with localhost to healthCare-db name in db url. 
update url : DATABASE_URL="postgresql://admin:secret@healthCare-db/healthcare?schema=public"

now build the server : to create image 
docker build -t healthCare-server-dev ./HealthCare-Server

run this command : 

MSYS_NO_PATHCONV=1 docker run -d-name healthcare-server --network healthCare-net --env-file ./HealthCare-Server/.env -e CHOKIDAR_USEPOLLING=1 -e CHOKIDAR_INTERVAL=300 -p 5000:5000 -v "$PWD/HealthCare-Server:/app" -v server-node-modules:/app/node_modules -v server-logs:/app/logs -w /app healthCare-server-dev sh -lc"CI=true pnpm install && pnpm generate && prnpm dev"



then run this project client file : 

docker exec -it healthcare-server sh -lc "pnpm exec prisma migrate deploy"




# DATABASE_URL='postgres://f5b8fc3e9ecfd5d15655d8d33fc4b6ac0c417dcb68fd47cb10e0c6279fce6e52:sk_tMVi9f4kzMnSwVuHEVkG2@pooled.db.prisma.io:5432/postgres?sslmode=require'


 <!-- <--frontend Dockerfile --> -->
FROM  node:22-alpine 

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate 

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

COPY . .

EXPOSE 3000

CMD ["sh", "-lc", "CI=true pnpm install && pnpm exec next dev -H 0.0.0.0 -p 3000"]


<-in .dockerignore file->
node_modules
.next
.env
.env.*
.git 
.gitignore
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-lock.yaml



<!-- run the build and run command -->
docker build -t healthCare-client-dev ./HealthCare-Client


MSYS_NO_PATHCONV=1 docker run -d --name healthcare-client --network healthCare-net --env-file ./HealthCare-Client/.env.local -e CHOKIDAR_USEPOLLING=1 -e CHOKIDAR_INTERVAL=300 -e WATCHPACK_POLLING=true -p 3000:3000 -v "$PWD/HealthCare-Client:/app" -v client-node-modules:/app/node_modules -w /app healthCare-client-dev sh -lc "CI=true pnpm install && pnpm exec next dev --webpack -H 0.0.0.0 -p 3000"


<!-- to chekc images of file  -->
docker images



<!-- to chekc the conatiner of file  -->
docker ps

<!-- database delete and new database create  -->

docker rm -f healthcare-db

docker run -d-name healthcare-db --network healthcare-net -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=healthcare -v healthCare-pg-data:/var/lib/postgresql/data postgres: 16-alpine