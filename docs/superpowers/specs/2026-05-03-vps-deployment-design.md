# VPS Deployment Design: map.oe5ith.at

## Goal
Configure the Debian 13 VPS to serve the Vite SPA and PHP API for `map.oe5ith.at` using Nginx and PHP-FPM, ensuring secure socket-based communication and correct SPA routing.

## Current Environment
- OS: Debian 13 (Trixie)
- Nginx: 1.26.3
- PHP: 8.4.16 CLI installed (PHP-FPM missing)
- Web Root: `/var/www/map.oe5ith.at`

## Architecture

1.  **Web Server (Nginx):**
    -   Listens on port 80 (HTTPS/SSL will be handled by Certbot later).
    -   Server Name: `map.oe5ith.at`.
    -   Root Directory: `/var/www/map.oe5ith.at/dist` (contains the built Vite SPA).
    -   SPA Fallback: `try_files $uri $uri/ /index.html;` to allow direct URL access to frontend routes.
    -   Performance: Gzip compression enabled for text, CSS, JS, and JSON assets.

2.  **API Backend (PHP-FPM):**
    -   Package: `php8.4-fpm` to be installed.
    -   Communication via Unix socket (`/run/php/php8.4-fpm.sock`) instead of TCP port.
    -   API files location: `/var/www/map.oe5ith.at/api/`.
    -   Nginx Location block `^~ /api/` explicitly routes `.php` requests to the FPM socket.

## Deployment Strategy
- The application will be built locally (or via CI) using `npm run build`.
- The resulting `dist/` folder and the uncompiled `api/` folder will be transferred to `/var/www/map.oe5ith.at/` on the VPS.
- *Note: This design covers server configuration. Actual file transfer and DB setup are out of scope for this specific Nginx/PHP-FPM configuration step.*

## Required Steps
1. Install `php8.4-fpm`.
2. Create Nginx configuration file `/etc/nginx/sites-available/map.oe5ith.at.conf`.
3. Enable the site via symlink in `/etc/nginx/sites-enabled/`.
4. Test Nginx config and reload Nginx.
5. Verify PHP-FPM is running.