#!/bin/bash
# =============================================================================
#  🌴 Caguayo — Script de Desarrollo
#  Inicia backend + frontend con verificación de base de datos
# =============================================================================

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
BLINK='\033[5m'   # Blink
BG_R='\033[41m'   # Background rojo
BG_G='\033[42m'   # Background verde
BG_B='\033[44m'   # Background azul
BG_M='\033[45m'   # Background magenta
BG_C='\033[46m'   # Background cian
UL='\033[4m'      # Underline

# ── Funciones auxiliares ──────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${BG_M}${W}                                                                    ${D}"
  echo -e "${BG_M}${W}   🌴  C A G U A Y O   —   SISTEMA DE GESTIÓN  🌴               ${D}"
  echo -e "${BG_M}${W}                                                                    ${D}"
  echo ""
  echo -e "${C}   ╔═══════════════════════════════════════════════════════════╗${D}"
  echo -e "${C}   ║${D}  ${M}🚀 Script de Desarrollo${D}                                   ${C}║${D}"
  echo -e "${C}   ║${D}  ${DIM}Backend + Frontend + Base de Datos${D}                        ${C}║${D}"
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

spinner() {
  local chars=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while kill -0 "$1" 2>/dev/null; do
    echo -ne "\r   ${M}${chars[$i]}${D} ${DIM}$2${D}  "
    i=$(( (i + 1) % ${#chars[@]} ))
    sleep 0.1
  done
  echo -ne "\r\033[K"
}

# ── Colores para las barras de progreso ───────────────────────────────────
bar_colors=("$R" "$Y" "$G" "$C" "$B" "$M")

progress_bar() {
  local current=$1
  local total=$2
  local label=$3
  local width=40
  local filled=$(( current * width / total ))
  local empty=$(( width - filled ))
  local color_idx=$(( current % ${#bar_colors[@]} ))

  printf "\r   ${bar_colors[$color_idx]}["
  printf '%0.s█' $(seq 1 $filled 2>/dev/null) || true
  printf '%0.s░' $(seq 1 $empty 2>/dev/null) || true
  printf "]${D} ${W}%d%%${D} ${DIM}%s${D}   " $(( current * 100 / total )) "$label"
}

# ── Inicio ────────────────────────────────────────────────────────────────
print_banner

# ── Cargar .env ──────────────────────────────────────────────────────────
section "📋 ${W}Cargando variables de entorno${D}"

if [ -f .env ]; then
  set -a
  source .env
  set +a
  ok "Archivo .env cargado"
else
  warn "No se encontró .env — usando valores por defecto"
  if [ -f .env.example ]; then
    step "Copiando .env.example → .env"
    cp .env.example .env
    set -a
    source .env
    set +a
    ok ".env creado desde .env.example"
  fi
fi

PG_HOST="${ADMIN_DB_HOST:-localhost}"
PG_PORT="${ADMIN_DB_PORT:-5432}"
PG_USER="${ADMIN_DB_USER:-postgres}"
PG_PASS="${ADMIN_DB_PASSWORD:-postgres}"
AUTH_DB="${AUTH_DATABASE:-caguayo}"
CENTRAL_DB="${CENTRAL_DATABASE:-caguayosa}"

echo ""
info "Host: ${UL}${PG_HOST}:${PG_PORT}${D}"
info "User: ${UL}${PG_USER}${D}"
info "Auth DB: ${UL}${AUTH_DB}${D}"
info "Central DB: ${UL}${CENTRAL_DB}${D}"

# ── Verificar prerequisitos ──────────────────────────────────────────────
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

# ── Verificar conexión a PostgreSQL ──────────────────────────────────────
section "🐘 ${W}Verificando conexión a PostgreSQL${D}"

step "Conectando a ${UL}${PG_HOST}:${PG_PORT}${D}"

if PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
  ok "Conexión exitosa a PostgreSQL"
else
  fail "No se pudo conectar a PostgreSQL"
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

# ── Verificar bases de datos ─────────────────────────────────────────────
section "🗄️  ${W}Verificando bases de datos${D}"

check_db() {
  local db=$1
  step "Verificando BD ${UL}${db}${D}"
  EXISTS=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null)
  if [ "$EXISTS" = "1" ]; then
    ok "BD '${db}' existe"
    # Verificar tablas
    TABLES=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null)
    if [ "$TABLES" -gt 0 ] 2>/dev/null; then
      ok "${TABLES} tablas encontradas en '${db}'"
    else
      warn "BD '${db}' existe pero está vacía — se aplicarán migraciones"
    fi
  else
    warn "BD '${db}' no existe — se creará automáticamente"
  fi
}

check_db "$AUTH_DB"
check_db "$CENTRAL_DB"

# ── Aplicar migraciones si es necesario ──────────────────────────────────
section "🔄 ${W}Aplicando migraciones${D}"

cd backend 2>/dev/null || true

step "Ejecutando alembic upgrade head en ${UL}${CENTRAL_DB}${D}"
DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${CENTRAL_DB}" \
  uv run alembic upgrade head 2>&1 | tail -5
ok "Migraciones aplicadas en '${CENTRAL_DB}'"

if [ "$AUTH_DB" != "$CENTRAL_DB" ]; then
  step "Ejecutando alembic upgrade head en ${UL}${AUTH_DB}${D}"
  DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${AUTH_DB}" \
    uv run alembic upgrade head 2>&1 | tail -5
  ok "Migraciones aplicadas en '${AUTH_DB}'"
fi

cd ..

# ── Verificar que las tablas de tipo_entidad existen ─────────────────────
section "🔎 ${W}Verificando integridad de la base de datos${D}"

check_table() {
  local db=$1
  local table=$2
  EXISTS=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'" 2>/dev/null)
  if [ "$EXISTS" = "1" ]; then
    COUNT=$(PGPASSWORD="${PG_PASS}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "SELECT count(*) FROM ${table}" 2>/dev/null)
    ok "Tabla '${table}' → ${COUNT} registros"
  else
    warn "Tabla '${table}' no encontrada en '${db}'"
  fi
}

check_table "$CENTRAL_DB" "tipo_entidad"
check_table "$CENTRAL_DB" "tipo_cuenta"
check_table "$CENTRAL_DB" "tipo_dependencia"
check_table "$CENTRAL_DB" "usuarios"

# ── Verificar puertos ────────────────────────────────────────────────────
section "🔌 ${W}Verificando puertos${D}"

check_port() {
  local port=$1
  local name=$2
  step "Verificando puerto ${UL}${port}${D} (${name})"
  if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
    fail "Puerto ${port} ya está en uso (${name})"
    info "Usar otro puerto o detener el proceso que lo usa"
    return 1
  else
    ok "Puerto ${port} disponible (${name})"
  fi
}

PORT_OK=1
check_port 8000 "Backend" || PORT_OK=0
check_port 5173 "Frontend" || PORT_OK=0

if [ $PORT_OK -eq 0 ]; then
  echo ""
  warn "Algunos puertos están ocupados — la app puede fallar"
  echo -e "   ${Y}¿Continuar de todas formas? (s/N):${D} "
  read -r response
  if [[ ! "$response" =~ ^[sS]$ ]]; then
    echo -e "\n   ${R}Cancelado.${D}"
    exit 1
  fi
fi

# ── Instalar dependencias ────────────────────────────────────────────────
section "📦 ${W}Verificando dependencias${D}"

step "Instalando dependencias del backend"
cd backend
uv sync --frozen 2>&1 | tail -3
ok "Backend — dependencias instaladas"
cd ..

step "Instalando dependencias del frontend"
cd frontend
pnpm install --frozen-lockfile 2>&1 | tail -3
ok "Frontend — dependencias instaladas"
cd ..

# ── Todo listo ───────────────────────────────────────────────────────────
section "✅ ${W}Todo listo para iniciar${D}"

echo -e "   ${G}╔═══════════════════════════════════════════════════════╗${D}"
echo -e "   ${G}║${D}  ${W}Iniciando servicios...${D}                                ${G}║${D}"
echo -e "   ${G}╚═══════════════════════════════════════════════════════╝${D}"
echo ""

# ── Iniciar Backend ──────────────────────────────────────────────────────
echo -e "   ${B}┌───────────────────────────────────────────────────────┐${D}"
echo -e "   ${B}│${D}  ${M}🚀 BACKEND${D}  ${DIM}→ http://localhost:8000${D}                  ${B}│${D}"
echo -e "   ${B}│${D}  ${DIM}uvicorn main:app --reload --port 8000${D}               ${B}│${D}"
echo -e "   ${B}└───────────────────────────────────────────────────────┘${D}"
echo ""

cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..
spinner $BACKEND_PID "Backend arrancando..."
sleep 1
ok "Backend iniciado ${DIM}(PID: $BACKEND_PID)${D}"

# ── Iniciar Frontend ────────────────────────────────────────────────────
echo ""
echo -e "   ${C}┌───────────────────────────────────────────────────────┐${D}"
echo -e "   ${C}│${D}  ${M}🎨 FRONTEND${D} ${DIM}→ http://localhost:5173${D}                 ${C}│${D}"
echo -e "   ${C}│${D}  ${DIM}pnpm dev${D}                                            ${C}│${D}"
echo -e "   ${C}└───────────────────────────────────────────────────────┘${D}"
echo ""

cd frontend
pnpm dev &
FRONTEND_PID=$!
cd ..
spinner $FRONTEND_PID "Frontend arrancando..."
sleep 1
ok "Frontend iniciado ${DIM}(PID: $FRONTEND_PID)${D}"

# ── Resumen final ───────────────────────────────────────────────────────
echo ""
echo -e "${BG_C}${W}                                                                    ${D}"
echo -e "${BG_C}${W}   🌴  C A G U A Y O   —   SISTEMA ACTIVO  🌴                    ${D}"
echo -e "${BG_C}${W}                                                                    ${D}"
echo ""
echo -e "   ${G}╔═══════════════════════════════════════════════════════╗${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🌐 Frontend:${D}  http://localhost:5173                  ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🔌 Backend:${D}   http://localhost:8000                  ${G}║${D}"
echo -e "   ${G}║${D}  ${W}📖 API Docs:${D}  http://localhost:8000/docs             ${G}║${D}"
echo -e "   ${G}║${D}  ${W}🗄️  Database:${D} ${PG_HOST}:${PG_PORT}                     ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}║${D}  ${Y}👤 Usuario:${D}   admin                                 ${G}║${D}"
echo -e "   ${G}║${D}  ${Y}🔑 Contraseña:${D} Admin123@                            ${G}║${D}"
echo -e "   ${G}║${D}                                                       ${G}║${D}"
echo -e "   ${G}╚═══════════════════════════════════════════════════════╝${D}"
echo ""
echo -e "   ${DIM}Presiona Ctrl+C para detener todos los servicios${D}"
echo -e "   ${DIM}Backend PID: ${W}$BACKEND_PID${D} ${DIM}| Frontend PID: ${W}$FRONTEND_PID${D}"
echo ""

# ── Trap para cleanup al salir ───────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "\n   ${R}Deteniendo servicios...${D}"
  kill $BACKEND_PID 2>/dev/null && ok "Backend detenido" || warn "Backend ya no estaba corriendo"
  kill $FRONTEND_PID 2>/dev/null && ok "Frontend detenido" || warn "Frontend ya no estaba corriendo"
  echo ""
  echo -e "${M}   🌴 ¡Hasta luego!${D}"
  echo ""
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Esperar ──────────────────────────────────────────────────────────────
wait
