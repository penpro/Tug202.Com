#!/usr/bin/env bash
set -euo pipefail

# One-shot deploy on the EC2 server: pull, migrate, backend, frontend.
#
# Usage:
#   ./deploy_all.sh
#   ./deploy_all.sh /home/ubuntu/Tug202.Com
#
# Individual steps:
#   db/migrate.sh
#   deploy_nginx.sh
#   deploy_backend.sh
#   deploy_frontend.sh

REPO_ROOT="${1:-$HOME/Tug202.Com}"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Repo root does not look like a git checkout: $REPO_ROOT" >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "==> git pull"
git pull --ff-only

echo ""
echo "==> Applying database migrations"
"$REPO_ROOT/db/migrate.sh"

echo ""
echo "==> Syncing nginx config"
"$REPO_ROOT/deploy_nginx.sh" "$REPO_ROOT"

echo ""
echo "==> Deploying backend"
"$REPO_ROOT/deploy_backend.sh" "$REPO_ROOT"

echo ""
echo "==> Deploying frontend"
"$REPO_ROOT/deploy_frontend.sh" "$REPO_ROOT"

echo ""
echo "==> All done."
