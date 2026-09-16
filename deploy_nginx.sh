#!/usr/bin/env bash
set -euo pipefail

# Sync nginx/*.conf from the repo into /etc/nginx and reload if anything
# changed. Runs from deploy_all.sh so a CSP or proxy tweak ships with a
# normal push, no manual copy on the server.
#
# The certbot-managed 443 block lives in the sites-available file, so that
# file is NOT overwritten once certbot has touched it; only the headers
# snippet is always synced. Change the site config by hand after HTTPS, or
# re-run certbot after copying.

REPO_ROOT="${1:-$HOME/Tug202.Com}"
SNIPPET_SRC="$REPO_ROOT/nginx/security-headers.conf"
SNIPPET_DST="/etc/nginx/snippets/tug202-security-headers.conf"
SITE_SRC="$REPO_ROOT/nginx/tug202.org.conf"
SITE_DST="/etc/nginx/sites-available/tug202.org"
changed=0

if ! sudo cmp -s "$SNIPPET_SRC" "$SNIPPET_DST"; then
  echo "==> Updating $SNIPPET_DST"
  sudo cp "$SNIPPET_SRC" "$SNIPPET_DST"
  changed=1
fi

if [ ! -f "$SITE_DST" ]; then
  echo "==> Installing $SITE_DST"
  sudo cp "$SITE_SRC" "$SITE_DST"
  sudo ln -sf "$SITE_DST" /etc/nginx/sites-enabled/tug202.org
  changed=1
elif sudo grep -q "managed by Certbot" "$SITE_DST"; then
  if ! sudo cmp -s "$SITE_SRC" "$SITE_DST"; then
    echo "==> nginx/tug202.org.conf differs from the certbot-managed live config; not overwriting. Merge by hand if intended."
  fi
elif ! sudo cmp -s "$SITE_SRC" "$SITE_DST"; then
  echo "==> Updating $SITE_DST"
  sudo cp "$SITE_SRC" "$SITE_DST"
  changed=1
fi

if [ "$changed" -eq 1 ]; then
  sudo nginx -t
  sudo systemctl reload nginx
  echo "==> nginx reloaded"
else
  echo "==> nginx config unchanged"
fi
