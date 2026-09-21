#!/usr/bin/env bash
set -euo pipefail

# Configure outbound mail (Gmail SMTP via app password) on the server.
# Prompts for the secret so it never has to be pasted anywhere else.
#
#   ssh -t -i 202.pem ubuntu@<host> ~/Tug202.Com/ops/set-smtp.sh
#
# Prereq: Google Account -> Security -> 2-Step Verification ON ->
# App passwords -> create one named "tug202" -> 16-character code.

ENV="$HOME/Tug202.Com/backend/.env"
[ -f "$ENV" ] || { echo "no $ENV"; exit 1; }

read -r -p "Gmail address to send from [wesleyaweaverjr@gmail.com]: " USER_ADDR
USER_ADDR="${USER_ADDR:-wesleyaweaverjr@gmail.com}"
read -r -p "Notification recipient for form submissions [$USER_ADDR]: " NOTIFY
NOTIFY="${NOTIFY:-$USER_ADDR}"
read -r -s -p "Gmail app password (16 chars, spaces ok, input hidden): " APP_PW; echo
APP_PW="${APP_PW// /}"
[ ${#APP_PW} -eq 16 ] || { echo "That is ${#APP_PW} characters; a Gmail app password is 16. Nothing changed."; exit 1; }

# Replace or append each key.
setkey() { grep -q "^$1=" "$ENV" && sed -i "s|^$1=.*|$1=$2|" "$ENV" || echo "$1=$2" >> "$ENV"; }
setkey SMTP_HOST smtp.gmail.com
setkey SMTP_PORT 587
setkey SMTP_USER "$USER_ADDR"
setkey SMTP_PASS "$APP_PW"
setkey SMTP_FROM "\"Tug Comanche Foundation\" <$USER_ADDR>"
setkey NOTIFY_EMAIL "$NOTIFY"
chmod 600 "$ENV"

echo "==> restarting backend"
pm2 restart tug202-backend --update-env >/dev/null

echo "==> sending a test message to $NOTIFY"
cd "$HOME/Tug202.Com/backend" && node scripts/test-mail.js "$NOTIFY"
