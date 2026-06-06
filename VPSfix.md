# VPS Fix Guide — srv1296399.hstgr.cloud

## Server Info
- **Provider:** Hostinger KVM 1
- **OS:** Ubuntu 22.04 LTS
- **IP:** 72.62.251.56
- **SSH:** `ssh root@72.62.251.56`
- **Sites:**
  - `bboom.cloud` → VAT Automation System (port 4000, managed by PM2)
  - `bboom88.com` → Firecrackers Next.js app (port 3000, managed by systemd)

---

## Problem 1: Login shows "Login failed" instead of real error

**Symptom:** User sees generic "Login failed" toast even when the real error is "wrong password" or "account not found".

**Root Cause:** The axios response interceptor in `client/src/services/api.ts` was catching 401 errors from the login endpoint itself, trying to refresh a token that didn't exist, then calling `window.location.href = '/login'` which caused a full page reload — wiping the real error message before the user could read it.

**Fix Applied:** Added `isAuthEndpoint` check so `/auth/login`, `/auth/register`, and `/auth/refresh` bypass the token refresh logic entirely.

**File changed:** `client/src/services/api.ts`

```js
const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
  originalRequest.url?.includes('/auth/register') ||
  originalRequest.url?.includes('/auth/refresh');

if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
```

---

## Problem 2: CPU at 100% — Hostinger CPU Limitation Activated

**Symptom:** Hostinger dashboard shows "CPU limitation activated" and CPU usage at 100%.

**Root Cause:** Two things combined:
1. The Vite build (`npm run build`) temporarily maxed the CPU during deployment — this is normal and passes.
2. `firecrackers` was being run by **both PM2 and systemd** at the same time. They fought over port 3000, causing a crash loop with 500+ restarts that burned CPU continuously.

**Fix Applied:**

### Step 1 — Remove firecrackers from PM2 (systemd already manages it)
```bash
pm2 delete firecrackers && pm2 save
```

### Step 2 — Verify only one process is on port 3000
```bash
lsof -i :3000
# Should show only: next-serv (www-data) — the systemd-managed one
```

---

## Problem 3: firecrackers Server Actions error in logs

**Symptom:** Logs show:
```
Missing `origin` header from a forwarded Server Actions request.
Error: Failed to find Server Action "x"
```

**Root Cause:** nginx was not forwarding the `Origin` header to the Next.js app, which Next.js requires for Server Actions security.

**Fix Applied:** Added `proxy_set_header Origin $http_origin;` to the nginx config.

```bash
# Edit the config
nano /etc/nginx/sites-available/firecrackers

# Add this line inside the location / block:
proxy_set_header Origin $http_origin;

# Test and reload
nginx -t && systemctl reload nginx
```

**Final nginx config for firecrackers:**
```nginx
server {
    server_name bboom88.com www.bboom88.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Origin $http_origin;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/bboom88.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bboom88.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

---

## How to Deploy VAT System Updates

Run these commands on the VPS after pushing to GitHub:

```bash
# 1. Go to the server folder and pull latest code
cd /var/www/vat/server
git pull origin main

# 2. Install deps
npm install

# 3. Sync the database schema to match the new code  ← DO NOT SKIP
#    Without this, any new tables/columns are missing and every call to the
#    affected endpoints returns 502/504. (This caused the 2026-06-06 outage.)
npx prisma db push

# 4. Build and restart the server
npm run build
pm2 restart vat-server

# 5. Go to the client folder and rebuild
cd /var/www/vat/client
npm install && npm run build
```

> **Why `prisma db push`?** This project tracks schema changes via `db push`, not committed
> migration files, so `prisma migrate deploy` will NOT create new tables. `db push` syncs the
> live database directly to `schema.prisma`. It is safe for additive changes (new tables/nullable
> columns). If Prisma warns about data loss, STOP and investigate before passing `--accept-data-loss`.

---

## Health Check Commands

Run these anytime to verify everything is working:

```bash
# Check all running processes
pm2 status

# Check CPU and memory
top -bn1 | head -5

# Check what is using port 3000
lsof -i :3000

# Check what is using port 4000
lsof -i :4000

# Check firecrackers logs
journalctl -u firecrackers.service -n 50 --no-pager

# Check VAT server logs
pm2 logs vat-server --lines 30
```

## Healthy State Reference

After a clean reboot, `pm2 status` should look like this:

```
│ id │ name        │ status │ ↺  │ cpu │ mem    │
│ 1  │ vat-server  │ online │ 0  │ 0%  │ ~90mb  │
```

- `firecrackers` should NOT appear in PM2 (it is managed by systemd)
- CPU idle should be above 80%
- vat-server restart count (↺) should stay at 0
