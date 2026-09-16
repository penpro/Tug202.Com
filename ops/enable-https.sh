#!/usr/bin/env bash
set -euo pipefail

# Issue the Let's Encrypt certificate once DNS for tug202.org points here.
# Safe to re-run; certbot is idempotent and auto-renews via systemd timer.
#
# Usage (on the server):
#   ~/Tug202.Com/ops/enable-https.sh
#   DOMAINS="tug202.org www.tug202.org" ~/Tug202.Com/ops/enable-https.sh

DOMAINS="${DOMAINS:-tug202.org www.tug202.org}"
EMAIL="${CERT_EMAIL:-}"

if ! command -v certbot >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  sudo -E apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
fi

# Fail early if DNS is not pointed here yet.
MY_IP="$(curl -fsS http://checkip.amazonaws.com || true)"
for d in $DOMAINS; do
  RESOLVED="$(getent hosts "$d" | awk '{print $1}' | head -1 || true)"
  if [ "$RESOLVED" != "$MY_IP" ]; then
    echo "DNS for $d resolves to '${RESOLVED:-nothing}' but this instance is $MY_IP." >&2
    echo "Point the A record here and wait for it to propagate before running this." >&2
    exit 1
  fi
done

ARGS=(--nginx --redirect --agree-tos --non-interactive)
if [ -n "$EMAIL" ]; then ARGS+=(-m "$EMAIL"); else ARGS+=(--register-unsafely-without-email); fi
for d in $DOMAINS; do ARGS+=(-d "$d"); done

sudo certbot "${ARGS[@]}"
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run >/dev/null && echo "Auto-renewal OK"

echo ""
curl -sI "https://$(echo "$DOMAINS" | cut -d' ' -f1)" | grep -iE '^HTTP|strict-transport|content-security' || true
