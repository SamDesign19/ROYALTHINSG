#!/usr/bin/env bash
# Local development / end-to-end test stack without the Supabase CLI:
#   * PostgreSQL 16 (Docker) with the Supabase shim, every migration, the reference seed
#     and the TEST-ONLY fixtures from tests/db/02_fixtures.sql (invented data, never for production),
#   * PostgREST (Docker), the same REST engine Supabase runs,
#   * scripts/local-gateway.mjs on :54321, which exposes PostgREST under /rest/v1 like a Supabase project.
# Supabase Auth and Storage are not emulated (not needed by the storefront yet).
#
# Usage: scripts/local-stack.sh up | down | env
# `up` prints the environment variables to put in .env.local (or export) for `npm run dev`.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_PORT="${LOCAL_PG_PORT:-54322}"
REST_PORT="${LOCAL_REST_PORT:-54330}"
GATEWAY_PORT="${LOCAL_GATEWAY_PORT:-54321}"
JWT_SECRET="local-development-jwt-secret-at-least-32-chars"
STATE_DIR=".local-stack"
PG_CONTAINER=royal-ink-db
REST_CONTAINER=royal-ink-rest

anon_key() {
  node -e '
    const c = require("crypto");
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const body = b({ alg: "HS256", typ: "JWT" }) + "." + b({ role: "anon", iss: "local", iat: 1700000000, exp: 4100000000 });
    console.log(body + "." + c.createHmac("sha256", process.argv[1]).update(body).digest("base64url"));
  ' "$JWT_SECRET"
}

print_env() {
  cat <<ENV
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${GATEWAY_PORT}
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(anon_key)
ENV
}

down() {
  [ -f "$STATE_DIR/gateway.pid" ] && kill "$(cat "$STATE_DIR/gateway.pid")" 2>/dev/null || true
  docker rm -f "$PG_CONTAINER" "$REST_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$STATE_DIR"
}

up() {
  down
  mkdir -p "$STATE_DIR"
  docker run -d --name "$PG_CONTAINER" -e POSTGRES_PASSWORD=postgres -p "$PG_PORT:5432" postgres:16 >/dev/null
  export PGHOST=127.0.0.1 PGPORT="$PG_PORT" PGUSER=postgres PGPASSWORD=postgres
  for _ in $(seq 1 60); do pg_isready -q && break; sleep 1; done
  sleep 1
  local PSQL=(psql -v ON_ERROR_STOP=1 -q -X -d postgres)
  "${PSQL[@]}" -c "alter database postgres set search_path = \"\$user\", public, extensions"
  run() { "${PSQL[@]}" -o /dev/null -f "$1" 2>&1 | grep -v -E "NOTICE:.*skipping|^$" || true; }
  run tests/db/00_supabase_shim.sql
  for f in supabase/migrations/*.sql; do run "$f"; done
  for f in supabase/seed/*.sql; do run "$f"; done
  run tests/db/02_fixtures.sql
  "${PSQL[@]}" <<'SQL'
create role authenticator login password 'authenticator' noinherit;
grant anon, authenticated, service_role to authenticator;
SQL

  docker run -d --name "$REST_CONTAINER" --network host \
    -e PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:${PG_PORT}/postgres" \
    -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
    -e PGRST_DB_EXTRA_SEARCH_PATH=public,extensions \
    -e PGRST_JWT_SECRET="$JWT_SECRET" -e PGRST_SERVER_PORT="$REST_PORT" \
    postgrest/postgrest:v12.2.3 >/dev/null

  REST_PORT="$REST_PORT" GATEWAY_PORT="$GATEWAY_PORT" nohup node scripts/local-gateway.mjs \
    >"$STATE_DIR/gateway.log" 2>&1 &
  echo $! >"$STATE_DIR/gateway.pid"
  for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${GATEWAY_PORT}/rest/v1/wilayas?select=code&limit=1" \
      -H "apikey: $(anon_key)" >/dev/null && break
    sleep 1
  done
  print_env >"$STATE_DIR/env"
  echo "Local stack is up. Environment (also in $STATE_DIR/env):"
  print_env
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  env) print_env ;;
  *) echo "usage: $0 up|down|env" >&2; exit 2 ;;
esac
