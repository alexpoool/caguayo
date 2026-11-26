#!/usr/bin/env bash
set -Eeuo pipefail
if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta: sudo ./deploy/scripts/configure-dnsmasq.sh IP_DEL_SERVIDOR" >&2
  exit 1
fi
SERVER_IP="${1:?Indica la IP fija del servidor, por ejemplo 192.168.1.100}"
python3 - "$SERVER_IP" <<'PY'
import ipaddress, sys
ipaddress.ip_address(sys.argv[1])
PY
command -v dnsmasq >/dev/null || {
  echo "dnsmasq no está instalado. Instálalo desde el repositorio/medio local de Debian." >&2
  exit 1
}
if ! ip -o addr show | grep -Fq "$SERVER_IP/"; then
  echo "La IP $SERVER_IP no está asignada a este servidor. Configura primero una IP estática." >&2
  exit 1
fi
install -d -m 0755 /etc/dnsmasq.d
cat > /etc/dnsmasq.d/caguayo.conf <<EOF
# DNS local para Caguayo. No proporciona DHCP.
port=53
listen-address=127.0.0.1,$SERVER_IP
bind-dynamic
domain-needed
bogus-priv
no-resolv
cache-size=1000
address=/caguayo.home.arpa/$SERVER_IP
EOF
dnsmasq --test
systemctl enable dnsmasq
systemctl restart dnsmasq
echo "DNS local configurado: caguayo.home.arpa -> $SERVER_IP"
echo "Configura el DHCP del router para entregar $SERVER_IP como DNS a los clientes."
echo "Si el router no permite cambiar DNS, agrega la entrada en hosts de cada PC."
