#!/usr/bin/env bash
set -euo pipefail

# Install backend deps and (re)start the PM2 process "tug202-backend".
# Assumes `git pull` already ran. Idempotent.
#
# Usage:
#   ./deploy_backend.sh
#   ./deploy_backend.sh /home/ubuntu/Tug202.Com

REPO_ROOT="${1:-$HOME/Tug202.Com}"
BACKEND_DIR="$REPO_ROOT/backend"
PM2_NAME="tug202-backend"

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "package.json not found in: $BACKEND_DIR" >&2
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "WARNING: $BACKEND_DIR/.env does not exist."
  echo "         cp backend/.env.example backend/.env and fill it in, or the"
  echo "         backend cannot reach MySQL and the forms will return 500."
fi

# Owner-only perms on .env every deploy; chmod is idempotent.
[ -f "$BACKEND_DIR/.env" ] && chmod 600 "$BACKEND_DIR/.env"

cd "$BACKEND_DIR"

echo "==> Installing backend dependencies"
npm install --omit=dev

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  echo "==> Restarting PM2 process: $PM2_NAME"
  pm2 restart "$PM2_NAME" --update-env
else
  echo "==> Starting new PM2 process: $PM2_NAME"
  pm2 start server.js --name "$PM2_NAME" --update-env
  pm2 save
fi

echo ""
echo "==> Backend deployed"
pm2 status "$PM2_NAME" || true
