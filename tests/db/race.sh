#!/usr/bin/env bash
# Concurrency test: N parallel guests each try to buy 2 of the last 3 units.
# Exactly one order may succeed and stock must never go negative.
set -euo pipefail
DB="$1"
PID='40000000-0000-0000-0000-000000000002'
psql -qAtX -d "$DB" -c "update inventory set quantity = 3 where product_id = '$PID'"
SQL="set role anon; select place_order('[{\"product_id\": \"$PID\", \"quantity\": 2}]',
  '{\"name\": \"Race\", \"phone\": \"0555000000\"}', '{\"method\": \"home\", \"wilaya_code\": 19, \"address_line\": \"x\"}')->>'order_number';"
tmp=$(mktemp -d)
for i in $(seq 1 6); do (psql -qAtX -d "$DB" -c "$SQL" > "$tmp/$i" 2>&1 || true) & done
wait
ok=$(grep -l '^RI-' "$tmp"/* | wc -l)
left=$(psql -qAtX -d "$DB" -c "select quantity from inventory where product_id = '$PID'")
rm -rf "$tmp"
if [ "$ok" -eq 1 ] && [ "$left" -eq 1 ]; then
  echo "  ok - concurrent checkout: 1 of 6 parallel orders succeeded, stock 3 -> 1"
else
  echo "FAIL: concurrent checkout: $ok orders succeeded, stock left $left"; exit 1
fi
