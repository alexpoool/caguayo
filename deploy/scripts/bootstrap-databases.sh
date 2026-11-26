#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
PYTHON="$ROOT_DIR/backend/.venv/bin/python"
[[ -x "$PYTHON" ]] || { echo "Primero ejecuta deploy/scripts/deploy.sh para preparar el entorno Python." >&2; exit 1; }
[[ -s "$ROOT_DIR/.env" && -s "$ROOT_DIR/backend/.env" ]] || { echo "Configura .env y backend/.env antes de continuar." >&2; exit 1; }
# Parse .env files with python-dotenv (not 'source': values may contain spaces).
eval "$("$PYTHON" - "$ROOT_DIR/.env" "$ROOT_DIR/backend/.env" <<'PY'
import shlex, sys
from dotenv import dotenv_values
values = {}
for path in sys.argv[1:]:
    values.update({k: v for k, v in dotenv_values(path).items() if v is not None})
keys = (
    "AUTH_DATABASE", "CENTRAL_DATABASE", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "POSTGRES_HOST", "DB_PORT", "ADMIN_DB_USER", "ADMIN_DB_PASSWORD",
    "ADMIN_DB_HOST", "ADMIN_DB_PORT",
)
for key in keys:
    if key in values:
        print(f"export {key}={shlex.quote(values[key])}")
PY
)"
: "${AUTH_DATABASE:?Define AUTH_DATABASE en .env}"
: "${CENTRAL_DATABASE:?Define CENTRAL_DATABASE en .env}"
: "${POSTGRES_USER:?Define POSTGRES_USER en backend/.env}"
: "${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en backend/.env}"
if [[ "$POSTGRES_PASSWORD" == "change-me" || "$POSTGRES_PASSWORD" == "password" ]]; then
  echo "Cambia POSTGRES_PASSWORD antes de inicializar la base de datos." >&2
  exit 1
fi
PG_HOST="${POSTGRES_HOST:-127.0.0.1}"
PG_PORT="${DB_PORT:-5432}"
ADMIN_USER="${ADMIN_DB_USER:-$POSTGRES_USER}"
ADMIN_PASSWORD="${ADMIN_DB_PASSWORD:-$POSTGRES_PASSWORD}"
ADMIN_HOST="${ADMIN_DB_HOST:-$PG_HOST}"
ADMIN_PORT="${ADMIN_DB_PORT:-$PG_PORT}"
DATABASES=("$AUTH_DATABASE")
if [[ "$CENTRAL_DATABASE" != "$AUTH_DATABASE" ]]; then
  DATABASES+=("$CENTRAL_DATABASE")
fi
for db in "${DATABASES[@]}"; do
  [[ "$db" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Nombre de base de datos no válido: $db" >&2; exit 1; }
done
for db in "${DATABASES[@]}"; do
  echo "Verificando base de datos: $db"
  EXISTS="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname = '$db'")"
  if [[ "$EXISTS" != "1" ]]; then
    echo "Creando base de datos: $db"
    PGPASSWORD="$POSTGRES_PASSWORD" createdb -h "$PG_HOST" -p "$PG_PORT" -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$db"
  fi
  DB_URL="$("$PYTHON" - "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$PG_HOST" "$PG_PORT" "$db" <<'PY'
import sys
from urllib.parse import quote
user, password, host, port, database = sys.argv[1:]
print(f"postgresql+asyncpg://{quote(user, safe='')}:{quote(password, safe='')}@{host}:{port}/{database}")
PY
)"
  echo "Aplicando migraciones en $db..."
  (
    cd "$ROOT_DIR/backend"
    DATABASE_URL="$DB_URL" AUTH_DATABASE="$AUTH_DATABASE" uv run --offline alembic upgrade heads
    ADMIN_DB_HOST="$ADMIN_HOST" ADMIN_DB_PORT="$ADMIN_PORT" \
      ADMIN_DB_USER="$ADMIN_USER" ADMIN_DB_PASSWORD="$ADMIN_PASSWORD" \
      uv run --offline python -m scripts.init_office "$db"
  )
done
echo "Bases de datos listas: ${DATABASES[*]}"
