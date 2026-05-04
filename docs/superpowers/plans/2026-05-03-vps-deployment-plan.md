# VPS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure the Debian 13 VPS to serve the Vite SPA and PHP API for `map.oe5ith.at` using Nginx and PHP-FPM.

**Architecture:** We will install `php8.4-fpm` and configure Nginx to serve static files from `/var/www/map.oe5ith.at/dist`. We will set up a specific location block for `/api/` that proxies PHP requests to the PHP-FPM Unix socket.

**Tech Stack:** Nginx, PHP-FPM (8.4), Debian 13.

---

### Task 1: Install PHP-FPM

**Files:**
- N/A

- [ ] **Step 1: Install php8.4-fpm**

```bash
apt-get update && apt-get install -y php8.4-fpm
```

- [ ] **Step 2: Verify PHP-FPM service is running**

```bash
systemctl status php8.4-fpm --no-pager
```
Expected: `Active: active (running)`

- [ ] **Step 3: Verify the socket exists**

```bash
ls -l /run/php/php8.4-fpm.sock
```
Expected: socket file exists and is owned by `www-data`.

### Task 2: Create Nginx Configuration

**Files:**
- Create: `/etc/nginx/sites-available/map.oe5ith.at.conf`

- [ ] **Step 1: Create the Nginx config file**

```bash
cat << 'EOF' > /etc/nginx/sites-available/map.oe5ith.at.conf
server {
    listen 80;
    listen [::]:80;
    server_name map.oe5ith.at;

    # Frontend (Vite Build)
    location / {
        root /var/www/map.oe5ith.at/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Routing
    location /api/ {
        root /var/www/map.oe5ith.at;
        index index.php;

        # Try the URI directly, then with .php extension
        try_files $uri $uri.php =404;
    }

    # PHP-FPM Handler
    location ~ \.php$ {
        root /var/www/map.oe5ith.at;
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Deny access to .htaccess files
    location ~ /\.ht {
        deny all;
    }
}
EOF
```

- [ ] **Step 2: Enable the site**

```bash
ln -s /etc/nginx/sites-available/map.oe5ith.at.conf /etc/nginx/sites-enabled/
```

- [ ] **Step 3: Test Nginx configuration**

```bash
nginx -t
```
Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

- [ ] **Step 4: Reload Nginx**

```bash
systemctl reload nginx
```

### Task 3: Create Dummy Files for Testing (Optional)

**Files:**
- Create: `/var/www/map.oe5ith.at/dist/index.html`
- Create: `/var/www/map.oe5ith.at/api/ping.php`

- [ ] **Step 1: Create dummy SPA index**

```bash
mkdir -p /var/www/map.oe5ith.at/dist
echo "<h1>map.oe5ith.at - SPA Placeholder</h1>" > /var/www/map.oe5ith.at/dist/index.html
```

- [ ] **Step 2: Create dummy API endpoint**

```bash
mkdir -p /var/www/map.oe5ith.at/api
echo "<?php echo json_encode(['status' => 'API is running on PHP-FPM']);" > /var/www/map.oe5ith.at/api/ping.php
```

- [ ] **Step 3: Set permissions**

```bash
chown -R www-data:www-data /var/www/map.oe5ith.at
```

- [ ] **Step 4: Local HTTP Test**

```bash
curl -H "Host: map.oe5ith.at" http://localhost/
```
Expected: `<h1>map.oe5ith.at - SPA Placeholder</h1>`

```bash
curl -H "Host: map.oe5ith.at" http://localhost/api/ping.php
```
Expected: `{"status":"API is running on PHP-FPM"}`