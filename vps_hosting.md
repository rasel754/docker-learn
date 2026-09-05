# ভিপিএস হোস্টিং: রিভার্স প্রক্সি গাইড (Reverse Proxy Guide)

ভিপিএস (Virtual Private Server)-এ ডকারাইজড অ্যাপ্লিকেশন ডেপ্লয় করার জন্য রিভার্স প্রক্সি বোঝা, কনফিগার করা এবং ব্যবহারের একটি পূর্ণাঙ্গ ও ব্যবহারিক গাইড।

---

## ১. রিভার্স প্রক্সি (Reverse Proxy) কী?

**রিভার্স প্রক্সি** হলো এমন একটি সার্ভার, যা এক্সটার্নাল ক্লায়েন্ট (ইন্টারনেটের সাধারণ ব্যবহারকারী) এবং ইন্টারনাল ব্যাকএন্ড সার্ভিসগুলোর (Docker containers, Node.js apps, Python/Go APIs ইত্যাদি) মাঝে অবস্থান করে। 

এটি ক্লায়েন্টের কাছ থেকে আসা রিকোয়েস্টগুলো গ্রহণ করে, সেগুলোকে নির্দিষ্ট ব্যাকএন্ড সার্ভার বা কন্টেইনারে ফরোয়ার্ড করে এবং ব্যাকএন্ড থেকে আসা রেসপন্স আবার ক্লায়েন্টের কাছে ফিরিয়ে দেয়।

### ফরোয়ার্ড প্রক্সি বনাম রিভার্স প্রক্সি

- **ফরোয়ার্ড প্রক্সি (Forward Proxy)**: এটি **ক্লায়েন্টদের** (ব্যবহারকারীদের) সামনে থাকে। এটি ব্যবহারকারীদের নিরাপদে ইন্টারনেট ব্যবহার করতে, জিও-রেস্ট্রিকশন বাইপাস করতে বা আউটবাউন্ড রিকোয়েস্ট ক্যাশ করতে সাহায্য করে (যেমন: VPN, কর্পোরেট নেটওয়ার্ক প্রক্সি)।
- **রিভার্স প্রক্সি (Reverse Proxy)**: এটি **সার্ভারগুলোর** সামনে থাকে। এটি ইন্টারনাল সার্ভিসগুলোকে সুরক্ষিত রাখে, পরিচালনা করে এবং ইনকামিং ট্রাফিক সঠিক সার্ভারে পৌঁছে দেয়।

```text
[ ক্লায়েন্ট / ইন্টারনেট ]
         │
         ▼ (HTTP: 80 / HTTPS: 443)
┌──────────────────────────────────────────────────┐
│              VPS (পাবলিক আইপি)                   │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │        রিভার্স প্রক্সি (যেমন: Nginx)     │   │
│   │   - SSL টার্মিনেশন                       │   │
│   │   - ডোমেন রাউটিং                         │   │
│   └───────┬───────────────────┬──────────────┘   │
│           │                   │                  │
│           ▼                   ▼                  │
│    ┌──────────────┐    ┌──────────────┐          │
│    │ ক্লায়েন্ট অ্যাপ │    │ ব্যাকএন্ড API│          │
│    │  (Port 3000) │    │  (Port 5000) │          │
│    └──────────────┘    └──────────────┘          │
│             ইন্টারনাল ডকার নেটওয়ার্ক             │
└──────────────────────────────────────────────────┘
২. ভিপিএসে রিভার্স প্রক্সি কেন ব্যবহার করবেন?একটি মাত্র পাবলিক আইপিসহ একটি ভিপিএসে যখন একাধিক অ্যাপ্লিকেশন হোস্ট করা হয়:একটি পোর্টেই (৮০ ও ৪৪৩) একাধিক ডোমেন/অ্যাপ হোস্ট করা:একই সাথে দুটি ভিন্ন অ্যাপকে সরাসরি ৮০ বা ৪৪৩ পোর্টে চালানো সম্ভব নয়।রিভার্স প্রক্সি ৮০/৪৪৩ পোর্টে লিসেন করে এবং ডোমেন নামের ভিত্তিতে ট্রাফিক রাউট করে (যেমন: example.com, api.example.com বা admin.example.com)।SSL/TLS টার্মিনেশন:এক জায়গা থেকেই সব SSL সার্টিফিকেট (Let's Encrypt) ম্যানেজ করা যায়।ইন্টারনাল ব্যাকএন্ডগুলো সাধারণ HTTP-তে যোগাযোগ করতে পারে, যা সিপিইউ-এর কাজের চাপ কমায় এবং কন্টেইনার কনফিগারেশন সহজ করে।নিরাপত্তা ও পোর্ট আইসোলেশন:ব্যাকএন্ড কন্টেইনারগুলোর পোর্ট সরাসরি পাবলিক ইন্টারনেটে এক্সপোজ করার প্রয়োজন হয় না।সিস্টেমের অভ্যন্তরীণ আর্কিটেকচার, কন্টেইনার আইপি এবং ব্যবহৃত টেকনোলজি বাইরের ব্যবহারকারীদের থেকে গোপন থাকে।লোড ব্যালেন্সিং ও হাই অ্যাভেইলেবিলিটি (High Availability):ইনকামিং ট্রাফিককে একাধিক কন্টেইনার রেপ্লিকার মধ্যে সমানভাবে বণ্টন করে দেয়।ক্যাশিং ও কম্প্রেশন:স্ট্যাটিক ফাইলগুলো (ছবি, CSS, JS) ক্যাশ করে রাখে এবং পে-লোড কমপ্রেস (gzip, brotli) করে সার্ভারের লোড ও লেটেন্সি কমায়।ওয়েবসকেট ও স্ট্রিমিং সাপোর্ট:পারসিস্টেন্ট কানেকশন এবং আপগ্রেড হেডারগুলো খুব মসৃণভাবে পরিচালনা করতে পারে।৩. জনপ্রিয় রিভার্স প্রক্সি টুলসটুলযার জন্য সেরামূল বৈশিষ্ট্যNginxপ্রোডাকশন স্ট্যান্ডার্ডঅত্যন্ত দ্রুত, লাইটওয়েট, নির্ভরযোগ্য ও ফ্লেক্সিবল।Traefikডকার ও মাইক্রোসার্ভিসডকার কন্টেইনার লেবেলের মাধ্যমে অটোমেটিক সার্ভিস ডিসকভারি এবং অটো SSL।Caddyসহজ ব্যবহার ও অটো-HTTPSকোনো ঝামেলা ছাড়াই স্বয়ংক্রিয় HTTPS এবং আধুনিক কনফিগারেশন সিনট্যাক্স।Nginx Proxy Managerযারা GUI পছন্দ করেনহোস্ট, SSL সার্টিফিকেট এবং অ্যাক্সেস লিস্ট নিয়ন্ত্রণের জন্য চমৎকার ওয়েব UI।৪. প্র্যাকটিক্যাল বাস্তবায়ন: ভিপিএসে Nginxক. বেসিক Nginx রিভার্স প্রক্সি কনফিগারেশনUbuntu/Debian-এ ফাইল পাথ: /etc/nginx/sites-available/myapp.confNginx# ১. HTTP থেকে HTTPS-এ রিডাইরেক্ট
server {
    listen 80;
    server_name example.com [www.example.com](https://www.example.com) api.example.com;

    return 301 https://$host$request_uri;
}

# ২. ফ্রন্টএন্ড অ্যাপ্লিকেশন (পোর্ট ৩০০০-এ React / Next.js)
server {
    listen 443 ssl http2;
    server_name example.com [www.example.com](https://www.example.com);

    # SSL সার্টিফিকেট (Certbot দ্বারা নিয়ন্ত্রিত)
    ssl_certificate /etc/letsencrypt/live/[example.com/fullchain.pem](https://example.com/fullchain.pem);
    ssl_certificate_key /etc/letsencrypt/live/[example.com/privkey.pem](https://example.com/privkey.pem);

    # ফাইল আপলোডের সর্বোচ্চ সাইজ
    client_max_body_size 20M;

    location / {
        proxy_pass [http://127.0.0.1:3000](http://127.0.0.1:3000);
        
        # প্রয়োজনীয় প্রক্সি হেডারসমূহ
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ওয়েবসকেট সাপোর্ট (Next.js HMR বা রিয়েল-টাইম অ্যাপের জন্য)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# ৩. ব্যাকএন্ড API (পোর্ট ৫০০০-এ Node.js / Express)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/[example.com/fullchain.pem](https://example.com/fullchain.pem);
    ssl_certificate_key /etc/letsencrypt/live/[example.com/privkey.pem](https://example.com/privkey.pem);

    client_max_body_size 50M;

    location / {
        proxy_pass [http://127.0.0.1:5000](http://127.0.0.1:5000);

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # দীর্ঘ সময় চলা রিকোয়েস্টের জন্য টাইমআউট
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
৫. ডকারাইজড রিভার্স প্রক্সি প্যাটার্নএকটি শেয়ার্ড ডকার নেটওয়ার্ক ব্যবহার করে অ্যাপ্লিকেশন কন্টেইনারগুলোর পাশাপাশি Nginx-কেও কন্টেইনার হিসেবে চালানো যায়।docker-compose.ymlYAMLversion: "3.8"

networks:
  app-network:
    driver: bridge

services:
  # রিভার্স প্রক্সি
  nginx:
    image: nginx:alpine
    container_name: reverse-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    networks:
      - app-network
    depends_on:
      - frontend
      - backend

  # ফ্রন্টএন্ড অ্যাপ (হোস্টে সরাসরি এক্সপোজ করা হয়নি)
  frontend:
    build: ./frontend
    container_name: frontend-app
    restart: unless-stopped
    expose:
      - "3000"
    networks:
      - app-network

  # ব্যাকএন্ড অ্যাপ (হোস্টে সরাসরি এক্সপোজ করা হয়নি)
  backend:
    build: ./backend
    container_name: backend-api
    restart: unless-stopped
    expose:
      - "5000"
    networks:
      - app-network
নোট: এখানে ports-এর বদলে expose ব্যবহৃত হয়েছে। এর ফলে frontend এবং backend শুধুমাত্র app-network-এর ভেতরেই অ্যাক্সেসযোগ্য থাকে এবং বাইরে থেকে সরাসরি ৩০০০ বা ৫০০০ পোর্টে এক্সেস বন্ধ থাকে।৬. প্রয়োজনীয় প্রক্সি হেডারের ব্যাখ্যাপ্রক্সি ব্যবহারের সময় ব্যাকএন্ড সার্ভার মূলত ভিজিটরের আসল আইপির পরিবর্তে রিভার্স প্রক্সির অভ্যন্তরীণ আইপি দেখতে পায়। নিচের হেডারগুলো এই সমস্যার সমাধান করে:হেডারবিবরণHost $hostক্লায়েন্টের পাঠানো আসল Host হেডারটি ব্যাকএন্ডে পাস করে।X-Real-IP $remote_addrব্যবহারকারীর আসল ক্লায়েন্ট আইপি অ্যাড্রেস পাস করে।X-Forwarded-For $proxy_add_x_forwarded_forরিকোয়েস্টটি যে যে আইপির মধ্য দিয়ে এসেছে তার সম্পূর্ণ চেইন বহন করে।X-Forwarded-Proto $schemeআসল রিকোয়েস্টটি http নাকি https ছিল তা ব্যাকএন্ডকে নিশ্চিত করে।৭. Certbot (Let's Encrypt) দিয়ে ফ্রি SSL সেটআপUbuntu/Debian হোস্ট সার্ভারের জন্য:Bash# ১. Certbot এবং Nginx প্লাগইন ইনস্টল করুন
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# ২. ডোমেনগুলোর জন্য স্বয়ংক্রিয়ভাবে SSL কনফিগার করুন
sudo certbot --nginx -d example.com -d [www.example.com](https://www.example.com) -d api.example.com

# ৩. সার্টিফিকেট স্বয়ংক্রিয় নবায়ন (Auto-renewal) টেস্ট করুন
sudo certbot renew --dry-run
সার্টিফিকেটের মেয়াদ ৯০ দিন শেষ হওয়ার আগেই এটি স্বয়ংক্রিয়ভাবে রিনিউ করার জন্য Certbot ব্যাকগ্রাউন্ডে cron/systemd টাইমার সেট করে নেয়।৮. ভিপিএস ডেপ্লয়মেন্টের জন্য সেরা অনুশীলনী চেকলিস্ট (Best Practices)[ ] ইন্টারনাল ডেটাবেজ বা ব্যাকএন্ড পোর্টগুলো (যেমন: 5432, 27017, 5000) কখনোই সরাসরি 0.0.0.0-তে এক্সপোজ করবেন না। এগুলোকে শুধুমাত্র 127.0.0.1-এ বাইন্ড করুন অথবা অভ্যন্তরীণ ডকার নেটওয়ার্কে সীমাবদ্ধ রাখুন।[ ] client_max_body_size কনফিগার করুন: Nginx-এ ডিফল্ট সাইজ থাকে 1MB; ফলে এর চেয়ে বড় ফাইল আপলোড করতে গেলে 413 Request Entity Too Large এরর আসবে।[ ] রেসপন্স দ্রুত লোড করার জন্য টেক্সট বা JSON ডেটাতে Gzip কম্প্রেশন চালু রাখুন।[ ] অ্যাপ্লিকেশনে যদি Socket.io, Next.js HMR বা সাবস্ক্রিপশন ব্যবহার করা হয়, তবে অবশ্যই WebSocket upgrade হেডার যুক্ত করুন।[ ] UFW (ফায়ারওয়াল) সেটআপ করুন: শুধুমাত্র পোর্ট 22 (SSH), 80 (HTTP), এবং 443 (HTTPS) ওপেন রাখুন।Bashsudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable












# VPS Hosting: Reverse Proxy Guide

A comprehensive, practical guide to understanding, configuring, and using Reverse Proxies for deploying Dockerized applications on a VPS (Virtual Private Server).

---

## 1. What is a Reverse Proxy?

A **Reverse Proxy** is a server that sits between external clients (users on the internet) and your internal backend services (Docker containers, Node.js apps, Python/Go APIs, etc.). 

It intercepts incoming client requests, forwards them to the appropriate backend server or container, and returns the response back to the client.

### Forward Proxy vs. Reverse Proxy

- **Forward Proxy**: Sits in front of **clients** (users). Helps clients access the internet securely, bypass geo-restrictions, or cache outbound requests (e.g., VPNs, corporate network proxies).
- **Reverse Proxy**: Sits in front of **servers**. Protects, manages, and routes incoming traffic to the appropriate internal services.

```text
[ Clients / Internet ]
         │
         ▼ (HTTP: 80 / HTTPS: 443)
┌──────────────────────────────────────────────────┐
│              VPS (Public IP)                     │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │         Reverse Proxy (e.g., Nginx)      │   │
│   │   - SSL Termination                      │   │
│   │   - Domain Routing                       │   │
│   └───────┬───────────────────┬──────────────┘   │
│           │                   │                  │
│           ▼                   ▼                  │
│    ┌──────────────┐    ┌──────────────┐          │
│    │ Client App   │    │ Backend API  │          │
│    │ (Port 3000)  │    │ (Port 5000)  │          │
│    └──────────────┘    └──────────────┘          │
│            Internal Docker Network               │
└──────────────────────────────────────────────────┘
```

---

## 2. Why Use a Reverse Proxy on a VPS?

When hosting multiple applications on a single VPS with only one public IP address:

1. **Host Multiple Domains/Apps on Port 80 & 443**:
   - You cannot bind two different apps directly to port 80/443 simultaneously.
   - A reverse proxy listens on 80/443 and routes traffic based on domain name (`example.com` vs `api.example.com` vs `admin.example.com`).

2. **SSL/TLS Termination**:
   - Manages SSL certificates (Let's Encrypt) in one place.
   - Backends communicate over simple HTTP internally, saving CPU overhead and simplifying container configuration.

3. **Security & Port Isolation**:
   - Backend containers do **not** need their ports exposed to the public internet.
   - Hides internal architecture, container IPs, and backend technologies from public view.

4. **Load Balancing & High Availability**:
   - Distributes incoming traffic across multiple container replicas.

5. **Caching & Compression**:
   - Caches static assets (images, CSS, JS) and compresses payloads (`gzip`, `brotli`) to reduce server load and latency.

6. **WebSockets & Streaming Support**:
   - Manages persistent connections and upgrade headers seamlessly.

---

## 3. Popular Reverse Proxy Tools

| Tool | Best For | Highlights |
| :--- | :--- | :--- |
| **Nginx** | Production standard | Extremely fast, lightweight, battle-tested, flexible. |
| **Traefik** | Docker & Microservices | Automatic service discovery via Docker container labels, automatic SSL. |
| **Caddy** | Simplicity & Auto-HTTPS | Zero-config automatic HTTPS, modern configuration syntax. |
| **Nginx Proxy Manager** | GUI Lovers | Web UI for managing hosts, SSL certs, and access lists. |

---

## 4. Practical Implementation: Nginx on VPS

### A. Basic Nginx Reverse Proxy Configuration

File path on Ubuntu/Debian: `/etc/nginx/sites-available/myapp.conf`

```nginx
# 1. Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com api.example.com;

    return 301 https://$host$request_uri;
}

# 2. Frontend Application (React / Next.js on port 3000)
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Maximum upload size
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        
        # Essential Proxy Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for Next.js HMR or real-time apps)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# 3. Backend API (Node.js / Express on port 5000)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 5. Dockerized Reverse Proxy Pattern

You can also run Nginx **inside Docker** alongside your application containers using a shared Docker network.

### `docker-compose.yml`

```yaml
version: "3.8"

networks:
  app-network:
    driver: bridge

services:
  # Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: reverse-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    networks:
      - app-network
    depends_on:
      - frontend
      - backend

  # Frontend App (Not exposed to host directly!)
  frontend:
    build: ./frontend
    container_name: frontend-app
    restart: unless-stopped
    expose:
      - "3000"
    networks:
      - app-network

  # Backend App (Not exposed to host directly!)
  backend:
    build: ./backend
    container_name: backend-api
    restart: unless-stopped
    expose:
      - "5000"
    networks:
      - app-network
```

> **Note**: Notice `expose` is used instead of `ports`. This keeps `frontend` and `backend` accessible **only** within `app-network`, preventing direct public access on ports 3000 and 5000.

---

## 6. Essential Proxy Headers Explained

When proxying requests, the backend server normally sees the IP address of the reverse proxy instead of the actual visitor. The following headers fix this:

| Header | Description |
| :--- | :--- |
| `Host $host` | Passes the original `Host` header sent by the client. |
| `X-Real-IP $remote_addr` | Passes the actual client IP address. |
| `X-Forwarded-For $proxy_add_x_forwarded_for` | A list of all IP addresses the request passed through. |
| `X-Forwarded-Proto $scheme` | Tells backend whether the original request was `http` or `https`. |

---

## 7. Setting Up Free SSL with Certbot (Let's Encrypt)

On Ubuntu/Debian host:

```bash
# 1. Install Certbot and Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 2. Automatically configure SSL for your domains
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com

# 3. Test automatic certificate renewal
sudo certbot renew --dry-run
```

Certbot will automatically install cron/systemd timers for automatic renewal before 90 days expiration.

---

## 8. Best Practices Checklist for VPS Deployment

- [ ] **Never expose internal database/backend ports** (e.g., `5432`, `27017`, `5000`) directly to `0.0.0.0`. Only map them to `127.0.0.1` or keep them on internal Docker networks.
- [ ] **Configure `client_max_body_size`**: Default in Nginx is 1MB, which will return `413 Request Entity Too Large` on file uploads.
- [ ] **Enable Gzip compression** for text/JSON responses to improve loading speed.
- [ ] **Enable WebSocket upgrade headers** if your application uses Socket.io, Next.js HMR, or subscriptions.
- [ ] **Set up UFW (Firewall)**: Only allow ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
