#!/bin/bash
# =============================================================================
#  🌴 Caguayo — Script de Setup para nueva PC
#  Ejecutar desde la raíz del proyecto: ./setup.sh
# =============================================================================

set -e

# ── Colores y formato ──────────────────────────────────────────────────────
R='\033[1;31m'    # Rojo bold
G='\033[1;32m'    # Verde bold
Y='\033[1;33m'    # Amarillo bold
B='\033[1;34m'    # Azul bold
M='\033[1;35m'    # Magenta bold
C='\033[1;36m'    # Cian bold
W='\033[1;37m'    # Blanco bold
D='\033[0m'       # Reset
DIM='\033[2m'     # Dim
UL='\033[4m'      # Underline
BG_R='\033[41m'   # Background rojo
BG_G='\033[42m'   # Background verde
BG_M='\033[45m'   # Background magenta
BG_C='\033[46m'   # Background cian

# ── Funciones auxiliares ──────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${BG_M}${W}                                                                    ${D}"
  echo -e "${BG_M}${W}   🌴  C A G U A Y O   —   SISTEMA DE GESTIÓN  🌴               ${D}"
  echo -e "${BG_M}${W}                                                                    ${D}"
  echo ""
  echo -e "${C}   ╔═══════════════════════════════════════════════════════════╗${D}"
  echo -e "${C}   ║${D}  ${M}📦 Script de Setup${D}                                      ${C}║${D}"
  echo -e "${C}   ║${D}  ${DIM}Instalación completa para nueva PC${D}                       ${C}║${D}"
  echo -e "${C}   ╚═══════════════════════════════════════════════════════════╝${D}"
  echo ""
}

section() {
  echo ""
  echo -e "${B}   ┌─────────────────────────────────────────────────────────┐${D}"
  echo -e "${B}   │${D}  $1"
  echo -e "${B}   └─────────────────────────────────────────────────────────┘${D}"
  echo ""
}

ok() {
  echo -e "   ${BG_G}${W} ✔ ${D} ${G}$1${D}"
}

warn() {
  echo -e "   ${Y}⚠ ${D} ${Y}$1${D}"
}

fail() {
  echo -e "   ${BG_R}${W} ✘ ${D} ${R}$1${D}"
}

info() {
  echo -e "   ${C}ℹ ${D} ${DIM}$1${D}"
}

step() {
  echo -e "   ${M}▸${D} ${W}$1${D} ${DIM}...${D}"
}

# ── Inicio ────────────────────────────────────────────────────────────────
print_banner

# ══════════════════════════════════════════════════════════════════════════
#  1) VERIFICAR PREREQUISITOS
# ══════════════════════════════════════════════════════════════════════════
section "🔍 ${W}Verificando prerequisitos${D}"

MISSING=0

for cmd in uv pnpm psql; do
  step "Verificando $cmd"
  if command -v $cmd &> /dev/null; then
    VERSION=$($cmd --version 2>/dev/null | head -1)
    ok "$cmd ${DIM}($VERSION)${D}"
  else
    fail "$cmd NO encontrado"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo ""
  echo -e "${R}   ╔═══════════════════════════════════════════════════════╗${D}"
  echo -e "${R}   ║${D}  ${R}Faltan prerequisitos. Instalar y volver a ejecutar.${D}   ${R}║${D}"
  echo -e "${R}   ╚═══════════════════════════════════════════════════════╝${D}"
  echo ""
  exit 1
fi

ok "Todos los prerequisitos instalados"

# Podman es opcional (despliegue containerizado)
step "Verificando podman"
USE_PODMAN=0
if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
  USE_PODMAN=1
  ok "Podman detectado ${DIM}(despliegue containerizado disponible)${D}"
else
  warn "Podman no encontrado — se ejecutará sin contenedores"
  info "Para containerizar: https://podman.io/getting-started/installation"
fi

# ══════════════════════════════════════════════════════════════════════════
#  2) CONFIGURAR .env
# ══════════════════════════════════════════════════════════════════════════
section "📋 ${W}Configurando variables de entorno${D}"

if [ ! -f .env ]; then
  step "Creando .env desde .env.example"
  cp .env.example .env

  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '\n/+=' | head -c 64)
  PG_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '\n/+=' | head -c 20)

  sed -i "s/change-me-to-a-random-64-char-string/${SECRET}/" .env
  sed -i "s/change-me/${PG_PASS}/" .env

  ok ".env creado con SECRET_KEY y POSTGRES_PASSWORD generados"
else
  ok "Archivo .env ya existe"
fi

# Cargar variables del .env
set -a
source .env
set +a

PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${DB_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASS="${POSTGRES_PASSWORD:-postgres}"AUTH_DB="${AUTH_DATABASE:-caguayosa}"
  CENTRAL_DB="${CENTRAL_DATABASE:-caguayosa}"

# ══════════════════════════════════════════════════════════════════════════
#  3) FORZAR CONEXIÓN A POSTGRESQL
# ══════════════════════════════════════════════════════════════════════════
section "🐘 ${W}Conectando a PostgreSQL${D}"

# Auto-detectar puerto
step "Buscando PostgreSQL en ${UL}${PG_HOST}:${PG_PORT}${D}"
if ! PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
  if [ "$PG_PORT" != "5432" ]; then
    warn "Puerto ${PG_PORT} no responde — intentando puerto 5432"
    PG_PORT=5432
    if PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
      ok "Conectado en puerto 5432"
    fi
  fi
fi

# Bucle de reconexión forzada
MAX_RETRIES=30
RETRY=0
CONNECTED=0

while [ $CONNECTED -eq 0 ] && [ $RETRY -lt $MAX_RETRIES ]; do
  RETRY=$((RETRY + 1))
  if PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
    CONNECTED=1
  else
    if [ $RETRY -eq 1 ]; then
      echo ""
      info "PostgreSQL no responde — intentando reconexión automática..."
    fi
    printf "\r   ${M}⏳${D} ${DIM}Intento ${RETRY}/${MAX_RETRIES} — esperando PostgreSQL...${D}   "
    sleep 2
  fi
done

echo ""

if [ $CONNECTED -eq 1 ]; then
  ok "Conexión exitosa a PostgreSQL ${DIM}(${PG_HOST}:${PG_PORT})${D}"
else
  fail "No se pudo conectar a PostgreSQL después de ${MAX_RETRIES} intentos"
  echo ""
  info "Verificar que PostgreSQL esté corriendo:"
  echo -e "   ${C}┌──────────────────────────────────────────────────────┐${D}"
  echo -e "   ${C}│${D}  ${W}Linux:${D}  sudo systemctl start postgresql             ${C}│${D}"
  echo -e "   ${C}│${D}  ${W}Mac:${D}    brew services start postgresql               ${C}│${D}"
  echo -e "   ${C}│${D}  ${W}Docker:${D} podman run -d -p 5432:5432 postgres:16    ${C}│${D}"
  echo -e "   ${C}└──────────────────────────────────────────────────────┘${D}"
  echo ""
  exit 1
fi

info "Host: ${UL}${PG_HOST}:${PG_PORT}${D}"
info "User: ${UL}${PG_USER}${D}"
info "Auth DB: ${UL}${AUTH_DB}${D}"
info "Central DB: ${UL}${CENTRAL_DB}${D}"

# ══════════════════════════════════════════════════════════════════════════
#  4) CREAR BASES DE DATOS
# ══════════════════════════════════════════════════════════════════════════
section "🗄️  ${W}Bases de datos${D}"

check_and_create_db() {
  local db=$1
  step "Verificando BD ${UL}${db}${D}"
  EXISTS=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null)
  if [ "$EXISTS" = "1" ]; then
    ok "BD '${db}' existe"
  else
    step "Creando BD ${UL}${db}${D}"
    PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE ${db} WITH ENCODING 'UTF8';" &> /dev/null
    ok "BD '${db}' creada"
  fi
}

check_and_create_db "$AUTH_DB"
check_and_create_db "$CENTRAL_DB"

# ══════════════════════════════════════════════════════════════════════════
#  5) APLICAR MIGRACIONES + DATOS SEMILLA
# ══════════════════════════════════════════════════════════════════════════
section "🔄 ${W}Migraciones y datos semilla${D}"

cd backend 2>/dev/null || true

step "Alembic upgrade en ${UL}${CENTRAL_DB}${D}"
DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${CENTRAL_DB}" \
  uv run alembic upgrade head 2>&1 | grep -E "🆕|✅|⚠|Running" | sed 's/^/   /'
ok "Migraciones '${CENTRAL_DB}' aplicadas"

if [ "$AUTH_DB" != "$CENTRAL_DB" ]; then
  step "Alembic upgrade en ${UL}${AUTH_DB}${D}"
  DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${AUTH_DB}" \
    uv run alembic upgrade head 2>&1 | grep -E "🆕|✅|⚠|Running" | sed 's/^/   /'
  ok "Migraciones '${AUTH_DB}' aplicadas"
fi

# ── Init office ──────────────────────────────────────────────────────────
step "Inicializando datos de oficina en ${UL}${CENTRAL_DB}${D}"
ADMIN_DB_HOST="$PG_HOST" ADMIN_DB_PORT="$PG_PORT" ADMIN_DB_USER="$PG_USER" ADMIN_DB_PASSWORD="$PG_PASS" \
  uv run python -m scripts.init_office "$CENTRAL_DB" 2>&1 | grep -E "Datos|ERROR|Done" | sed 's/^/   /'
ok "Oficina inicializada en '${CENTRAL_DB}'"

if [ "$AUTH_DB" != "$CENTRAL_DB" ]; then
  step "Inicializando datos de oficina en ${UL}${AUTH_DB}${D}"
  ADMIN_DB_HOST="$PG_HOST" ADMIN_DB_PORT="$PG_PORT" ADMIN_DB_USER="$PG_USER" ADMIN_DB_PASSWORD="$PG_PASS" \
    uv run python -m scripts.init_office "$AUTH_DB" 2>&1 | grep -E "Datos|ERROR|Done" | sed 's/^/   /'
  ok "Oficina inicializada en '${AUTH_DB}'"
fi

cd ..

# ══════════════════════════════════════════════════════════════════════════
#  6) INSTALAR DEPENDENCIAS
# ══════════════════════════════════════════════════════════════════════════
section "📦 ${W}Instalando dependencias${D}"

step "Backend — uv sync"
cd backend
uv sync --frozen 2>&1 | tail -1 | sed 's/^/   /'
ok "Backend — dependencias instaladas"
cd ..

step "Frontend — pnpm install"
cd frontend
pnpm install --frozen-lockfile 2>&1 | tail -1 | sed 's/^/   /'
ok "Frontend — dependencias instaladas"
cd ..

# ══════════════════════════════════════════════════════════════════════════
#  7) VERIFICAR INTEGRIDAD
# ══════════════════════════════════════════════════════════════════════════
section "🔎 ${W}Verificando integridad${D}"

check_table() {
  local db=$1
  local table=$2
  EXISTS=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'" 2>/dev/null)
  if [ "$EXISTS" = "1" ]; then
    COUNT=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "SELECT count(*) FROM ${table}" 2>/dev/null)
    ok "'${table}' → ${COUNT} registros"
  else
    warn "'${table}' no encontrada"
  fi
}

check_table "$CENTRAL_DB" "usuarios"
check_table "$CENTRAL_DB" "moneda"
check_table "$CENTRAL_DB" "provincia"
check_table "$CENTRAL_DB" "dependencia"
check_table "$CENTRAL_DB" "grupo"

# ══════════════════════════════════════════════════════════════════════════
#  RESUMEN FINAL
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BG_C}${W}                                                                    ${D}"
echo -e "${BG_C}${W}   🌴  C A G U A Y O   —   SETUP COMPLETADO  🌴                   ${D}"
echo -e "${BG_C}${W}                                                                    ${D}"
echo ""
echo -e "   ${G}╔═══════════════════════════════════════════════════════╗${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🗄️  Bases de datos:${D}                                  ${G}║${D}"
echo -e "   ${G}║${D}     Auth:     ${UL}${AUTH_DB}${D}                                  ${G}║${D}"
echo -e "   ${G}║${D}     Central:  ${UL}${CENTRAL_DB}${D}                                  ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🌐 Frontend:${D}  http://localhost:5173                  ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🔌 Backend:${D}   http://localhost:8000                  ${G}║${D}"
echo -e "   ${G}║${D}  ${W}📖 API Docs:${D}  http://localhost:8000/docs             ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${Y}👤 Usuario:${D}    admin                                 ${G}║${D}"
echo -e "   ${G}║${D}  ${Y}🔑 Contraseña:${D} admin123                              ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${R}⚠ IMPORTANTE: Cambiar la contraseña del admin${D}        ${G}║${D}"
echo -e "   ${G}║${D}  ${R}  en el primer inicio de sesión.${D}                      ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}╚═══════════════════════════════════════════════════════╝${D}"
echo ""
if [ $USE_PODMAN -eq 1 ]; then
  echo -e "   ${C}Para iniciar con contenedores:${D}"
  echo -e "   ${W}   podman-compose up --build${D}"
else
  echo -e "   ${C}Para iniciar el servidor de desarrollo:${D}"
  echo -e "   ${W}   ./dev.sh${D}"
fi
echo ""
echo -e "   ${DIM}¡Listo para trabajar! 🌴${D}"
echo ""
