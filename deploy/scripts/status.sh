#!/usr/bin/env bash
set -u
echo "=== Servicios Caguayo ==="
for service in postgresql caguayo-backend nginx dnsmasq; do
  if systemctl list-unit-files "$service.service" --no-legend 2>/dev/null | grep -q "$service.service"; then
    printf "%-18s " "$service"
    systemctl is-active "$service" || true
  fi
done
echo
echo "=== Backend local ==="
curl --silent --show-error --fail http://127.0.0.1:8000/health || true
echo
echo "=== Sitio HTTPS local ==="
if [[ -r /usr/local/share/ca-certificates/caguayo-local-ca.crt ]]; then
  curl --silent --show-error --fail \
    --resolve caguayo.home.arpa:443:127.0.0.1 \
    --cacert /usr/local/share/ca-certificates/caguayo-local-ca.crt \
    https://caguayo.home.arpa/health || true
else
  echo "No se encuentra la CA local."
fi
echo
echo "=== Nginx ==="
sudo nginx -t 2>&1 || true
