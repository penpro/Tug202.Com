#!/usr/bin/env bash
set -euo pipefail

# Build the Vite frontend and sync dist/ into the nginx web root.
#
# Usage:
#   ./deploy_frontend.sh
#   ./deploy_frontend.sh /home/ubuntu/Tug202.Com
#   ./deploy_frontend.sh /home/ubuntu/Tug202.Com /var/www/tug202

REPO_ROOT="${1:-$HOME/Tug202.Com}"
WEB_ROOT="${2:-/var/www/tug202}"
FRONTEND_DIR="$REPO_ROOT/frontend"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "package.json not found in: $FRONTEND_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"

echo "==> Installing frontend dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Syncing dist/ to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
# --delete removes stale hashed bundles from previous builds.
sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

echo ""
echo "==> Frontend deployed to $WEB_ROOT"
