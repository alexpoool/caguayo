#!/bin/bash
set -e

echo "=== Instalando uv ==="
pip install --no-cache-dir uv

echo ""
echo "=== Instalando Node.js 20 via nvm ==="
source /usr/local/share/nvm/nvm.sh
nvm install 20
nvm alias default 20
npm install -g pnpm

echo ""
echo "=== Instalando dependencias del backend ==="
cd /workspace/backend
uv sync

echo ""
echo "=== Instalando dependencias del frontend ==="
cd /workspace/frontend
pnpm install

echo ""
echo "=== Ejecutando migraciones ==="
cd /workspace/backend
uv run alembic upgrade head 2>/dev/null || echo "Migrations skipped (run manually if needed)"

echo ""
echo "=== Devcontainer listo ==="
echo "Backend:  cd /workspace/backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "Frontend: cd /workspace/frontend && pnpm dev --host"