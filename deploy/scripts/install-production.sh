#!/usr/bin/env bash
set -Eeuo pipefail
if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta: sudo ./deploy/scripts/install-production.sh" >&2
  exit 1
fi
APP_ROOT="/opt/caguayo"
REPO_ROOT="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd -P)"
if [[ "$REPO_ROOT" != "$APP_ROOT" ]]; then
  echo "El repositorio debe estar instalado en $APP_ROOT (actual: $REPO_ROOT)." >&2
  echo "Copia el proyecto a $APP_ROOT y vuelve a ejecutar." >&2
  exit 1
fi
for file in "$APP_ROOT/.env" "$APP_ROOT/backend/.env"; do
  [[ -s "$file" ]] || { echo "Falta configurar $file a partir de su .env.example." >&2; exit 1; }
done
grep -q '^AUTH_DATABASE=.' "$APP_ROOT/.env" || { echo "Define AUTH_DATABASE en .env"; exit 1; }
grep -q '^CENTRAL_DATABASE=.' "$APP_ROOT/.env" || { echo "Define CENTRAL_DATABASE en .env"; exit 1; }
grep -q '^SECRET_KEY=.' "$APP_ROOT/.env" || { echo "Define SECRET_KEY en .env"; exit 1; }
grep -q '^DATABASE_URL=.' "$APP_ROOT/backend/.env" || { echo "Define DATABASE_URL en backend/.env"; exit 1; }
SECRET_VALUE="$(sed -n 's/^SECRET_KEY=//p' "$APP_ROOT/.env" | tail -n 1 | tr -d "\"'")"
if [[ -z "$SECRET_VALUE" || "$SECRET_VALUE" == "change-me-to-a-random-64-char-string" || "$SECRET_VALUE" == "change-me-in-production" ]]; then
  echo "SECRET_KEY no puede conservar el valor de ejemplo." >&2
  exit 1
fi
[[ -x "$APP_ROOT/backend/.venv/bin/uvicorn" ]] || { echo "Falta backend/.venv. Ejecuta deploy/scripts/deploy.sh."; exit 1; }
[[ -s "$APP_ROOT/frontend/dist/index.html" ]] || { echo "Falta frontend/dist. Ejecuta deploy/scripts/deploy.sh."; exit 1; }
command -v nginx >/dev/null || { echo "Nginx no está instalado."; exit 1; }
command -v openssl >/dev/null || { echo "openssl no está instalado."; exit 1; }
systemctl cat postgresql.service >/dev/null 2>&1 || { echo "No se encuentra postgresql.service."; exit 1; }
if ! id caguayo >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin caguayo
fi
install -d -o caguayo -g caguayo -m 0750 /var/backups/postgresql /var/log/caguayo
chown root:caguayo "$APP_ROOT/.env" "$APP_ROOT/backend/.env"
chmod 0640 "$APP_ROOT/.env" "$APP_ROOT/backend/.env"
chmod 0755 "$APP_ROOT" "$APP_ROOT/backend" "$APP_ROOT/frontend"
chmod -R a+rX "$APP_ROOT/frontend/dist"
"$APP_ROOT/deploy/scripts/generate-local-tls.sh"
sed "s|@APP_ROOT@|$APP_ROOT|g" \
  "$APP_ROOT/deploy/systemd/caguayo-backend.service" \
  > /etc/systemd/system/caguayo-backend.service
chmod 0644 /etc/systemd/system/caguayo-backend.service
sed "s|@APP_ROOT@|$APP_ROOT|g" \
  "$APP_ROOT/deploy/nginx/caguayo.conf" \
  > /etc/nginx/sites-available/caguayo
ln -sfn /etc/nginx/sites-available/caguayo /etc/nginx/sites-enabled/caguayo
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable postgresql
systemctl enable nginx
systemctl enable caguayo-backend
systemctl start postgresql
systemctl restart caguayo-backend
systemctl restart nginx
echo
echo "Caguayo quedó configurado para iniciar con Debian."
echo "URL: https://caguayo.home.arpa"
echo "Comprueba: systemctl status caguayo-backend nginx postgresql"
echo "CA pública para clientes: /usr/local/share/ca-certificates/caguayo-local-ca.crt"
echo "No distribuyas la clave privada: /etc/caguayo/ca/caguayo-local-ca.key"
