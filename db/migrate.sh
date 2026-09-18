#!/usr/bin/env bash
#
# Apply database migrations from db/migrations/ in filename order.
#
# Runs on the EC2 server. Uses `sudo mysql` (root via auth_socket), the same
# way init.sql is applied. Tracks applied files in schema_migrations so it is
# safe to rerun on every deploy.
#
# Usage:
#   ./db/migrate.sh            # database "tug202"
#   ./db/migrate.sh otherdb    # override database name

set -euo pipefail

DB_NAME="${1:-tug202}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not found on PATH" >&2
  exit 1
fi

if ! sudo mysql -Nse "SHOW DATABASES LIKE '$DB_NAME';" | grep -q "$DB_NAME"; then
  echo "Database '$DB_NAME' does not exist. Run ops/bootstrap.sh first." >&2
  exit 1
fi

sudo mysql "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
SQL

applied=0
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$file" ] || continue
  name="$(basename "$file")"
  if sudo mysql -Nse "SELECT 1 FROM $DB_NAME.schema_migrations WHERE filename='$name';" | grep -q 1; then
    continue
  fi
  echo "==> Applying $name"
  sudo mysql "$DB_NAME" < "$file"
  sudo mysql -e "INSERT INTO $DB_NAME.schema_migrations (filename) VALUES ('$name');"
  applied=$((applied + 1))
done

if [ "$applied" -eq 0 ]; then
  echo "==> No new migrations."
else
  echo "==> Applied $applied migration(s)."
fi
