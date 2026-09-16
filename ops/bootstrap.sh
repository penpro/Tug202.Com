#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap for a fresh Ubuntu EC2 instance (tested on 26.04, 1 GB RAM).
# Installs the stack, clones the repo, creates the DB + .env with generated
# secrets, installs nginx config, and runs the first deploy. Idempotent enough
# to re-run if a step fails partway.
#
# Usage (on the server):
#   curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/bootstrap.sh | bash
# or after a manual clone:
#   ~/Tug202.Com/ops/bootstrap.sh
#
# After it finishes: point DNS at this box, then run ops/enable-https.sh.

REPO_URL="${REPO_URL:-https://github.com/penpro/Tug202.Com.git}"
REPO_ROOT="${REPO_ROOT:-$HOME/Tug202.Com}"
DB_NAME="tug202"
DB_USER="tug202_user"
WEB_ROOT="/var/www/tug202"

log() { echo ""; echo "==> $*"; }

# ---- swap (1 GB instances OOM during `vite build` and MySQL start) ---------
if ! swapon --show | grep -q '/swapfile'; then
  log "Creating 2 GB swapfile"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# ---- packages -------------------------------------------------------------
log "apt packages"
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update -qq
sudo -E apt-get install -y -qq nginx mysql-server git rsync curl ca-certificates ufw >/dev/null

if ! command -v node >/dev/null 2>&1; then
  log "Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null
  sudo -E apt-get install -y -qq nodejs >/dev/null
fi
node --version

if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2"
  sudo npm install -g pm2 >/dev/null 2>&1
fi
# Boot persistence: pm2 prints a sudo command; run it for the ubuntu user.
sudo env PATH="$PATH:/usr/bin" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true

# ---- repo -----------------------------------------------------------------
if [ ! -d "$REPO_ROOT/.git" ]; then
  log "Cloning $REPO_URL"
  git clone --quiet "$REPO_URL" "$REPO_ROOT"
else
  log "Repo exists; pulling"
  git -C "$REPO_ROOT" pull --ff-only --quiet
fi
cd "$REPO_ROOT"
chmod +x deploy_*.sh db/migrate.sh ops/*.sh

# ---- database -------------------------------------------------------------
sudo systemctl enable --now mysql >/dev/null
if ! sudo mysql -Nse "SELECT 1 FROM mysql.user WHERE user='$DB_USER' AND host='localhost';" | grep -q 1; then
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)"
  log "Creating database $DB_NAME and user $DB_USER"
  sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
else
  log "DB user exists; keeping existing password from backend/.env"
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' backend/.env 2>/dev/null | cut -d= -f2- || true)"
fi

# ---- backend .env ---------------------------------------------------------
if [ ! -f backend/.env ]; then
  log "Writing backend/.env with generated secrets"
  ADMIN_TOKEN="$(openssl rand -hex 32)"
  cat > backend/.env <<ENV
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

PORT=3202
NODE_ENV=production

ADMIN_TOKEN=$ADMIN_TOKEN

# Fill these in to enable outbound notification mail (see ops/README.md).
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@tug202.org
NOTIFY_EMAIL=
ENV
  chmod 600 backend/.env
fi

log "Running migrations"
./db/migrate.sh "$DB_NAME"

# ---- nginx ----------------------------------------------------------------
log "nginx site config"
sudo cp nginx/security-headers.conf /etc/nginx/snippets/tug202-security-headers.conf
sudo cp nginx/tug202.org.conf /etc/nginx/sites-available/tug202.org
sudo ln -sf /etc/nginx/sites-available/tug202.org /etc/nginx/sites-enabled/tug202.org
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p "$WEB_ROOT"
sudo nginx -t
sudo systemctl enable --now nginx >/dev/null
sudo systemctl reload nginx

# ---- firewall (belt and braces; the EC2 security group is the real gate) --
sudo ufw allow OpenSSH >/dev/null
sudo ufw allow 'Nginx Full' >/dev/null
sudo ufw --force enable >/dev/null

# ---- first deploy ---------------------------------------------------------
./deploy_backend.sh "$REPO_ROOT"
./deploy_frontend.sh "$REPO_ROOT" "$WEB_ROOT"
pm2 save >/dev/null

log "Smoke test"
sleep 1
curl -fsS -H "Host: tug202.org" http://127.0.0.1/api/health && echo
curl -fsS -H "Host: tug202.org" http://127.0.0.1/ | grep -o '<title>[^<]*</title>'

echo ""
echo "Bootstrap complete."
echo "  Admin token (keep private):  $(grep -E '^ADMIN_TOKEN=' backend/.env | cut -d= -f2-)"
echo "  Next: point DNS A records at this instance, then run ops/enable-https.sh"
