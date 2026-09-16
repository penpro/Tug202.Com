#!/usr/bin/env bash
set -euo pipefail

# Run from the local checkout (Git Bash on Windows is fine): push main, then
# ssh to the server and run deploy_all.sh there. Nothing builds locally.
#
# Usage:
#   ops/remote-deploy.sh
#   PEM=/path/to/202.pem HOST=ubuntu@1.2.3.4 ops/remote-deploy.sh

HOST="${HOST:-ubuntu@ec2-54-147-143-249.compute-1.amazonaws.com}"
PEM="${PEM:-$(dirname "$0")/../../202.pem}"

if [ ! -f "$PEM" ]; then
  echo "PEM key not found at $PEM (set PEM=...)" >&2
  exit 1
fi

echo "==> git push"
git push origin main

echo "==> deploy on $HOST"
ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST" '~/Tug202.Com/deploy_all.sh'
