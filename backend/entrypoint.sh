#!/bin/bash
set -e

echo "==> Running database migrations..."
uv run alembic upgrade head

echo "==> Initializing office data if needed..."
uv run python -m scripts.init_office "${AUTH_DATABASE:-caguayo}" || true

echo "==> Starting application..."
exec uv run uvicorn main:app --host 0.0.0.0 --port 8000
