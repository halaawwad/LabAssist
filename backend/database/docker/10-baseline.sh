#!/bin/sh
# The official postgres image runs this only when PGDATA is empty.
set -eu
baseline_hash="$(sha256sum /labassist/baseline.sql | cut -d ' ' -f 1)"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 --file /labassist/baseline.sql
# Marker authorizes later Prisma baseline adoption only for this exact fresh init.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 --set baseline_hash="$baseline_hash" <<'SQL'
CREATE TABLE public.labassist_bootstrap (
  baseline_sha256 char(64) PRIMARY KEY,
  initialized_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.labassist_bootstrap(baseline_sha256) VALUES (:'baseline_hash');
SQL
