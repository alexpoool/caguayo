#!/bin/bash
set -e

echo "==> Verificando si la base de datos necesita inicialización..."
EXISTEN_TABLAS=$(uv run python -c "
import psycopg2, os
conn = psycopg2.connect(
    host=os.getenv('ADMIN_DB_HOST','db'),
    port=int(os.getenv('ADMIN_DB_PORT',5432)),
    user=os.getenv('ADMIN_DB_USER','caguayo'),
    password=os.getenv('POSTGRES_PASSWORD'),
    dbname=os.getenv('AUTH_DATABASE','caguayo'))
cur = conn.cursor()
cur.execute(\"SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'\")
count = cur.fetchone()[0]
print(count)
conn.close()
")

if [ "$EXISTEN_TABLAS" -eq 0 ]; then
    echo "==> Base de datos vacía. Ejecutando init.sql..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${ADMIN_DB_HOST:-db}" \
        -p "${ADMIN_DB_PORT:-5432}" \
        -U "${ADMIN_DB_USER:-caguayo}" \
        -d "${AUTH_DATABASE:-caguayo}" \
        -f /app/backend/sql/init.sql
    echo "==> Marcando migraciones como aplicadas..."
    uv run alembic stamp head
fi

echo "==> Running database migrations..."
uv run alembic upgrade head

echo "==> Starting application..."
exec uv run uvicorn main:app --host 0.0.0.0 --port 8000
