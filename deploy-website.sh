#!/bin/bash
# OE5ITH Map Deployment Script
# Merges the current build and API files into the production web root.

set -e

# Configuration
WEB_ROOT="/var/www/map.oe5ith.at"
BUILD_DIR="dist"
API_DIR="api"

echo "--- Starting Deployment for map.oe5ith.at ---"

# 1. Build the project
echo "[1/4] Building Vite project..."
npm run build

# 2. Sync files using rsync
# --delete removes files in destination that are no longer in source
echo "[2/4] Syncing files to $WEB_ROOT..."

# Ensure target directories exist
mkdir -p "$WEB_ROOT/dist"
mkdir -p "$WEB_ROOT/api"

# Sync build output (Frontend)
rsync -avz --delete "$BUILD_DIR/" "$WEB_ROOT/dist/"

# Sync API files
# Note: This will overwrite api/config.php if it exists in the source.
rsync -avz --delete --exclude='config.local.php' --exclude='*.example' "$API_DIR/" "$WEB_ROOT/api/"

# 3. Correct permissions
echo "[3/4] Setting permissions for www-data..."
chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} +
find "$WEB_ROOT" -type f -exec chmod 644 {} +

# 4. Reload Nginx (optional but recommended)
echo "[4/4] Reloading Nginx..."
systemctl reload nginx

echo "--- Deployment successfully finished! ---"
echo "URL: http://map.oe5ith.at (or https if SSL is already active)"
