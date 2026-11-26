#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT_DIR"
for cmd in uv pnpm node; do
  command -v "$cmd" >/dev/null || { echo "Falta el comando requerido: $cmd" >&2; exit 1; }
done
[[ -f uv.lock && -f frontend/pnpm-lock.yaml ]] || { echo "Faltan archivos lock."; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22 && b<12)) process.exit(1)' || {
  echo "Se requiere Node.js 22.12 o superior para compilar el frontend." >&2
  exit 1
}
SERVICE_WAS_ACTIVE=0
if sudo systemctl is-active --quiet caguayo-backend 2>/dev/null; then
  SERVICE_WAS_ACTIVE=1
  sudo systemctl stop caguayo-backend
fi
restore_service() {
  if [[ "$SERVICE_WAS_ACTIVE" == "1" ]]; then
    sudo systemctl start caguayo-backend || true
  fi
}
trap restore_service EXIT
echo "[1/4] Instalando dependencias Python desde caché local..."
(cd "$ROOT_DIR/backend" && uv sync --offline --frozen --no-dev)
echo "[2/4] Instalando dependencias frontend desde el almacén local..."
(cd "$ROOT_DIR/frontend" && pnpm install --offline --frozen-lockfile)
echo "[3/4] Compilando React para producción..."
(cd "$ROOT_DIR/frontend" && VITE_API_BASE_URL=/api/v1 pnpm build)
echo "[4/4] Aplicando migraciones e inicializando bases configuradas..."
"$ROOT_DIR/deploy/scripts/bootstrap-databases.sh"
chmod -R a+rX "$ROOT_DIR/backend/.venv" "$ROOT_DIR/frontend/dist"
if [[ "$SERVICE_WAS_ACTIVE" == "1" ]]; then
  sudo systemctl start caguayo-backend
  SERVICE_WAS_ACTIVE=0
fi
trap - EXIT
echo "Despliegue completado. Nginx sirve frontend y API bajo el mismo dominio."
