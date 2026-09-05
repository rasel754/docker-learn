services:
  healthCare-db:
    image: postgres:16-alpine
    container_name: healthCare-db
    networks:
      - healthCare-net
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret123
      - POSTGRES_DB=healthCare
    volumes:
      - healthCare-pg-data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s 
      retries: 10
      start_period: 10s


  healthCare-server:
    container_name: healthCare-server
    build: 
      context: ./HealthCare-Server
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      healthCare-db:
         condition: service-healthy
    networks:
      - healthCare-net
    env_file:
      - ./HealthCare-Server/.env
    environment:
      CHOKIDAR_USEPOLLING: "1"
      CHOKIDAR_INTERVAL: "300"
    ports:
      - "5000:5000"
    working_dir: /app
    volumes:
      - ./HealthCare-Server:/app
      - server-node-modules:/app/node_modules
      - server-logs:/app/logs
    command: sh -lc "CI-true pnpm install && pnpm generate && prisma migrate deploy && pnpm dev"


  healthCare-client:
    container_name: healthCare-client
    build: 
      context: ./HealthCare-Client
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      healthCare-server:
        condition: service_started
    networks:
      - healthCare-net
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
    command: sh -lc "CI-true pnpm install && pnpm exec next dev --webpack -H 0.0.0.0 -p 3000"



networks:
 healthCare-net:
   driver: bridge

volumes:
  healthCare-pg-data:
  server-node-modules:
  server-logs:
  client-node-modules: