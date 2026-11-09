#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CivicResolve-AI — project-local PostgreSQL cluster manager
#
# Creates and runs an isolated PostgreSQL cluster inside ./server/.pgdata on
# port 5433 with trust auth, so the project never touches your system-wide
# Postgres instance and needs no password.
#
#   bash scripts/db.sh init   # create the cluster (once)
#   bash scripts/db.sh up     # start it + create the civicresolve database
#   bash scripts/db.sh down   # stop it
#   bash scripts/db.sh status # show whether it is running
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/server/.pgdata"
PORT="${PGPORT:-5433}"
DB_NAME="${PGDATABASE:-civicresolve}"
LOG_FILE="$DATA_DIR/server.log"

# Locate the PostgreSQL binaries (Homebrew, EDB installer, or PATH).
find_pg_bin() {
  if [ -n "${PGBIN:-}" ] && [ -x "$PGBIN/initdb" ]; then echo "$PGBIN"; return; fi
  for candidate in \
    /opt/homebrew/opt/postgresql@18/bin \
    /opt/homebrew/opt/postgresql@17/bin \
    /usr/local/opt/postgresql@18/bin \
    /Library/PostgreSQL/18/bin \
    /Library/PostgreSQL/17/bin \
    /Applications/Postgres.app/Contents/Versions/latest/bin; do
    if [ -x "$candidate/initdb" ]; then echo "$candidate"; return; fi
  done
  if command -v initdb >/dev/null 2>&1; then dirname "$(command -v initdb)"; return; fi
  echo ""
}

PGBIN="$(find_pg_bin)"
if [ -z "$PGBIN" ]; then
  echo "ERROR: could not find PostgreSQL binaries (initdb/pg_ctl)." >&2
  echo "Install PostgreSQL or set PGBIN=/path/to/postgres/bin" >&2
  exit 1
fi

cmd_init() {
  if [ -d "$DATA_DIR" ] && [ -f "$DATA_DIR/PG_VERSION" ]; then
    echo "cluster already initialised at $DATA_DIR"
    return
  fi
  mkdir -p "$DATA_DIR"
  echo "initialising PostgreSQL cluster in $DATA_DIR ..."
  "$PGBIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
  {
    echo ""
    echo "# ---- CivicResolve-AI overrides ----"
    echo "port = $PORT"
    echo "listen_addresses = '127.0.0.1'"
    echo "fsync = off"
    echo "synchronous_commit = off"
    echo "full_page_writes = off"
  } >> "$DATA_DIR/postgresql.conf"
  echo "cluster ready (port $PORT)"
}

is_running() {
  [ -d "$DATA_DIR" ] && "$PGBIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1
}

cmd_up() {
  cmd_init
  if is_running; then
    echo "postgres already running on port $PORT"
  else
    echo "starting postgres on port $PORT ..."
    "$PGBIN/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $PORT -k /tmp" -w start
  fi
  # Create the application database if it does not exist yet.
  if ! "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -lqt 2>/dev/null | cut -d '|' -f1 | grep -qw "$DB_NAME"; then
    echo "creating database '$DB_NAME' ..."
    "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U postgres "$DB_NAME"
  fi
  echo "postgres ready:  postgresql://postgres@127.0.0.1:$PORT/$DB_NAME"
}

cmd_down() {
  if is_running; then
    "$PGBIN/pg_ctl" -D "$DATA_DIR" -m fast stop
    echo "postgres stopped"
  else
    echo "postgres is not running"
  fi
}

cmd_status() {
  if is_running; then
    echo "running on port $PORT (data: $DATA_DIR)"
  else
    echo "stopped"
  fi
}

case "${1:-up}" in
  init)   cmd_init ;;
  up)     cmd_up ;;
  down)   cmd_down ;;
  status) cmd_status ;;
  *) echo "usage: bash scripts/db.sh {init|up|down|status}" >&2; exit 1 ;;
esac
