# লোড ব্যালেন্সার (Load Balancer) — বাংলায় নোট

## ১. লোড ব্যালেন্সার কী?

লোড ব্যালেন্সার হলো এমন একটি সিস্টেম, যা একাধিক সার্ভারের মধ্যে incoming traffic সমানভাবে ভাগ করে দেয়।

যখন অনেক ব্যবহারকারী একই সময়ে একটি ওয়েবসাইট বা API-তে আসেন, তখন একক সার্ভার তা সামলাতে পারে না। সেই সময় লোড ব্যালেন্সার কাজ করে:

- নতুন request গ্রহণ করে
- সেগুলো বিভিন্ন backend server-এ ভাগ করে দেয়
- সার্ভারগুলোর চাপ কমায়
- সিস্টেমের uptime বাড়ায়

## ২. কেন লোড ব্যালেন্সার দরকার?

একটি ওয়েবসাইটের ট্রাফিক বাড়লে এই সমস্যাগুলো হয়:

- CPU ও memory usage বাড়ে
- latency বেড়ে যায়
- response time ধীর হয়
- সার্ভার ডাউন হলে সেবা বন্ধ হতে পারে

লোড ব্যালেন্সার এই সমস্যাগুলো কমিয়ে দেয়।

## ৩. লোড ব্যালেন্সারের মূল কাজ

লোড ব্যালেন্সার মূলত তিনটি কাজ করে:

1. Request গ্রহণ করা
2. সার্ভার নির্বাচন করা
3. request সঠিক সার্ভারে পাঠানো

এটি বিভিন্ন অ্যালগরিদম অনুযায়ী কাজ করতে পারে, যেমন:

- Round Robin
- Least Connections
- IP Hash
- Weighted Load Balancing

## ৪. Round Robin কী?

Round Robin-এ requestগুলো সার্ভারগুলোর মধ্যে ঘুরে ঘুরে ভাগ হয়।

উদাহরণ:

- Server A
- Server B
- Server C

প্রথম request → Server A
দ্বিতীয় request → Server B
তৃতীয় request → Server C
চতুর্থ request → Server A

এটি সহজ এবং জনপ্রিয় পদ্ধতি।

## ৫. Least Connections কী?

এখানে সবচেয়ে কম active connection আছে এমন সার্ভারটি বেছে নেয়া হয়।

এটি তখন উপকারী যখন বিভিন্ন সার্ভারের ক্ষমতা সমান না থাকে বা কিছু সার্ভার বেশি ব্যস্ত থাকে।

## ৬. লোড ব্যালেন্সারের সুবিধা

- সার্ভারের লোড কমে
- performance বাড়ে
- availability বাড়ে
- fault tolerance নিশ্চিত হয়
- traffic burst সামলাতে পারে
- maintenance সময়েও সেবা চলতে পারে

## ৭. লোড ব্যালেন্সারের ধরন

### ১. Hardware Load Balancer

-專用 machinery-তে চলে
- অনেক বড় enterprise environment-এ ব্যবহার হয়
- খরচ বেশি

### ২. Software Load Balancer

- Nginx, HAProxy, Apache, Traefik-এ ব্যবহার হয়
- তুলনামূলক কম খরচ
- VPS, Docker, cloud environment-এ খুব জনপ্রিয়

### ৩. Cloud Load Balancer

- AWS ELB, GCP Load Balancer, Azure Load Balancer
- cloud architecture-এ খুব উপযোগী

## ৮. Nginx-এ Load Balancer উদাহরণ

```nginx
http {
    upstream app_backend {
        server 127.0.0.1:3000;
        server 127.0.0.1:3001;
        server 127.0.0.1:3002;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://app_backend;
        }
    }
}
```

এই কনফিগারেশনটি বলছে:

- তৃতীয় party request গুলো 3000, 3001, 3002 পোর্টের সার্ভারগুলোর মধ্যে ভাগ হবে
- একসাথে অনেক ব্যবহারকারীর চাহিদা সামলানো সহজ হবে

## ৯. Health Check

লোড ব্যালেন্সার সাধারণত health check করে।

এর মানে হলো:

- কোন সার্ভার ডাউন আছে কি না দেখা
- ডাউন সার্ভারে request পাঠানো বন্ধ করা
- আবার সার্ভার ফিরে এলে স্বাভাবিকভাবে traffic চালু করা

## ১০. লোড ব্যালেন্সার ও রিভার্স প্রক্সির পার্থক্য

### রিভার্স প্রক্সি

- request routing করে
- caching, SSL, security, URL rewriting-এ কাজ করে

### লোড ব্যালেন্সার

- multiple server-এ traffic ভাগ করে
- availability ও scalability বাড়ায়

অনেক সময় রিভার্স প্রক্সি ও লোড ব্যালেন্সার একসাথে কাজ করে।

## ১১. বাস্তব জীবনের উদাহরণ

উদাহরণস্বরূপ:

- একটি ecommerce সাইটে ৫০,০০০ মানুষ একসাথে ঢুকছে
- একটাই সার্ভার তা সামলাতে পারবে না
- Nginx বা cloud load balancer requestগুলো ৩/৪টি app server-এ ভাগ করে দেয়
- ফলে website দ্রুত চলতে থাকে

## ১২. উপসংহার

লোড ব্যালেন্সার হলো scalable ও high-availability সিস্টেমের একটি গুরুত্বপূর্ণ অংশ। এটি একাধিক সার্ভারে traffic ভাগ করে দিয়ে সিস্টেমের স্থিতিশীলতা, পারফর্ম্যান্স, এবং downtime কমিয়ে দেয়।

এক কথায়, লোড ব্যালেন্সার হলো "একাধিক সার্ভারের চাপ কমানোর জন্য তৈরি ডিস্ট্রিবিউশন সিস্টেম"।
