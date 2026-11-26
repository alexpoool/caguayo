#!/usr/bin/env bash
set -Eeuo pipefail
if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi
SERVER_IP="\${1:-}"
APP_DOMAIN="caguayo.home.arpa"
CA_DIR="/etc/caguayo/ca"
TLS_DIR="/etc/ssl/private"
CERT_DIR="/etc/ssl/certs"
CA_KEY="$CA_DIR/caguayo-local-ca.key"
CA_CERT="/usr/local/share/ca-certificates/caguayo-local-ca.crt"
SERVER_KEY="$TLS_DIR/caguayo.home.arpa.key"
SERVER_CERT="$CERT_DIR/caguayo.home.arpa.crt"
command -v openssl >/dev/null || { echo "Falta openssl."; exit 1; }
command -v update-ca-certificates >/dev/null || { echo "Falta el paquete ca-certificates."; exit 1; }
install -d -m 0700 "$CA_DIR"
install -d -m 0750 "$TLS_DIR"
if [[ ! -s "$CA_KEY" && -e "$CA_CERT" ]]; then
  echo "Existe el certificado CA pero falta su clave privada. No se regenerará automáticamente." >&2
  exit 1
fi
if [[ ! -s "$CA_KEY" ]]; then
  echo "Generando autoridad certificadora local..."
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout "$CA_KEY" \
    -out "$CA_DIR/caguayo-local-ca.crt" \
    -subj "/CN=Caguayo LAN Root CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "subjectKeyIdentifier=hash"
  chmod 0600 "$CA_KEY"
fi
install -m 0644 "$CA_DIR/caguayo-local-ca.crt" "$CA_CERT"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
cat > "$TMP_DIR/server.ext" <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names
[alt_names]
DNS.1=$APP_DOMAIN
EOF
if [[ -n "$SERVER_IP" ]]; then
  python3 - "$SERVER_IP" <<'PY'
import ipaddress, sys
ipaddress.ip_address(sys.argv[1])
PY
  printf 'IP.1=%s\n' "$SERVER_IP" >> "$TMP_DIR/server.ext"
fi
openssl req -new -newkey rsa:3072 -nodes -sha256 \
  -keyout "$SERVER_KEY" \
  -out "$TMP_DIR/server.csr" \
  -subj "/CN=$APP_DOMAIN"
openssl x509 -req -sha256 -days 825 \
  -in "$TMP_DIR/server.csr" \
  -CA "$CA_DIR/caguayo-local-ca.crt" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "$SERVER_CERT" \
  -extfile "$TMP_DIR/server.ext"
chmod 0600 "$SERVER_KEY"
chmod 0644 "$SERVER_CERT"
update-ca-certificates
echo "Certificado HTTPS creado para https://$APP_DOMAIN"
echo "Certificado CA para instalar en los equipos cliente: $CA_CERT"
