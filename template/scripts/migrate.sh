#!/usr/bin/env bash
#
# Apply pending Supabase migrations to the target database.
#
# Runs as the first step of every Vercel build (vercel.json buildCommand) —
# A non-zero exit fails
# the build, so the deployment never goes live and the previous one keeps
# serving: a migration that fails never ships alongside code that needs it.
#
# Idempotent: `supabase db push` applies only migrations not yet recorded in
# the remote `supabase_migrations.schema_migrations` table.
#
# Requires SUPABASE_DB_URL — the full Postgres connection string incl. password.
# Use the Supabase **Session pooler** string (port 5432):
#   postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres
# Not the direct connection (db.<ref>.supabase.co, IPv6-only; Vercel builds are
# IPv4) and not the transaction pooler (6543; DDL needs a session).
#
# Unset → skipped, never failed, so an unconfigured preview can still deploy
# (the app then runs in device-only demo mode).
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "[migrate] SUPABASE_DB_URL not set — skipping migrations."
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUPA_BIN="$ROOT/node_modules/.bin/supabase"
if [ ! -x "$SUPA_BIN" ]; then
  echo "[migrate] supabase CLI not found at $SUPA_BIN (devDependency — was npm install run?)" >&2
  exit 1
fi

HOSTPORT="$(printf '%s' "$SUPABASE_DB_URL" | sed -E 's#^[a-zA-Z]+://[^@]*@##; s#[/?].*$##')"
echo "[migrate] Target: ${HOSTPORT}"
case "$HOSTPORT" in
  db.*.supabase.co*) echo "[migrate] WARNING: direct connection is IPv6-only; use the Session pooler if this fails." >&2 ;;
  *:6543*) echo "[migrate] WARNING: 6543 is the transaction pooler; migrations need the session pooler on 5432." >&2 ;;
esac

cd "$ROOT"
echo "[migrate] Pushing migrations..."
# --yes: the build is non-interactive, and the CLI (v3) refuses to apply to a
#   hosted database without explicit consent. Deploying IS that consent.
# --include-all: apply a migration even if its timestamp sorts before one
#   already applied (parallel branches).
if "$SUPA_BIN" db push --include-all --yes --remote="$SUPABASE_DB_URL"; then
  echo "[migrate] Done."
  exit 0
fi
echo "[migrate] Migration push failed — halting the deploy." >&2
echo "[migrate] Never rename or delete a migration that has deployed; add a tombstone instead (see README)." >&2
exit 1
