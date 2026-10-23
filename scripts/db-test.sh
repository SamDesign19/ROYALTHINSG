#!/usr/bin/env bash
# Applies every migration + reference seed to a throw-away local PostgreSQL database
# (with a minimal Supabase shim) and runs the SQL test suite.
# Usage: scripts/db-test.sh            (needs psql access as a superuser, e.g. PGUSER=postgres)
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-royal_ink_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d postgres -c "alter database $DB set search_path = \"\$user\", public, extensions"

run() {
  echo "== $1"
  local out
  out=$("${PSQL[@]}" -d "$DB" -o /dev/null -f "$1" 2>&1) || { echo "$out"; exit 1; }
  echo "$out" | grep -v "NOTICE:.*skipping" || true
}
run tests/db/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in supabase/seed/*.sql; do run "$f"; done
run tests/db/01_helpers.sql
run tests/db/02_fixtures.sql
status=0
for f in tests/db/test_*.sql; do
  echo "== $f"
  if ! "${PSQL[@]}" -d "$DB" -o /dev/null -f "$f" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'; then status=1; fi
done
echo "== tests/db/race.sh"
tests/db/race.sh "$DB" || status=1
[ "$status" -eq 0 ] && echo "ALL DATABASE TESTS PASSED" || { echo "DATABASE TESTS FAILED"; exit 1; }
