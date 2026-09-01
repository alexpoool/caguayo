#!/bin/bash
# =============================================================================
#  🌴 Caguayo — Script de Desarrollo
#  Menú interactivo: Start / Stop / Restart
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
UL='\033[4m'      # Underline
BG_R='\033[41m'   # Background rojo
BG_G='\033[42m'   # Background verde
BG_B='\033[44m'   # Background azul
BG_M='\033[45m'   # Background magenta
BG_C='\033[46m'   # Background cian

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${SCRIPT_DIR}/.dev_pids"

# ── Funciones auxiliares ──────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${BG_M}${W}                                                                    ${D}"
  echo -e "${BG_M}${W}   🌴  C A G U A Y O   —   SISTEMA DE GESTIÓN  🌴               ${D}"
  echo -e "${BG_M}${W}                                                                    ${D}"
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

# ── Cargar .env ──────────────────────────────────────────────────────────
load_env() {
  if [ -f .env ]; then
    set -a
    source .env
    set +a
  fi

  PG_HOST="${POSTGRES_HOST:-localhost}"
  PG_PORT="${DB_PORT:-5433}"
  PG_USER="${POSTGRES_USER:-postgres}"
  PG_PASS="${POSTGRES_PASSWORD:-postgres}"
  AUTH_DB="${AUTH_DATABASE:-caguayo}"
  CENTRAL_DB="${CENTRAL_DATABASE:-caguayosa}"
}

# ══════════════════════════════════════════════════════════════════════════
#  STOP — Detener todos los servicios
# ══════════════════════════════════════════════════════════════════════════
do_stop() {
  section "🛑 ${W}Deteniendo servicios${D}"

  if [ -f "$PID_FILE" ]; then
    BACKEND_PID=$(grep "^BACKEND=" "$PID_FILE" | cut -d= -f2)
    FRONTEND_PID=$(grep "^FRONTEND=" "$PID_FILE" | cut -d= -f2)

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
      kill "$BACKEND_PID" 2>/dev/null
      ok "Backend detenido ${DIM}(PID: $BACKEND_PID)${D}"
    else
      warn "Backend no estaba corriendo"
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
      kill "$FRONTEND_PID" 2>/dev/null
      ok "Frontend detenido ${DIM}(PID: $FRONTEND_PID)${D}"
    else
      warn "Frontend no estaba corriendo"
    fi

    rm -f "$PID_FILE"
  else
    # Intentar matar por puerto
    BACKEND_FOUND=$(ss -tlnp 2>/dev/null | grep ":8000 " | grep -oP 'pid=\K[0-9]+' | head -1)
    FRONTEND_FOUND=$(ss -tlnp 2>/dev/null | grep ":5173 " | grep -oP 'pid=\K[0-9]+' | head -1)

    if [ -n "$BACKEND_FOUND" ]; then
      kill "$BACKEND_FOUND" 2>/dev/null
      ok "Backend detenido ${DIM}(PID: $BACKEND_FOUND)${D}"
    else
      warn "Backend no estaba corriendo en puerto 8000"
    fi

    if [ -n "$FRONTEND_FOUND" ]; then
      kill "$FRONTEND_FOUND" 2>/dev/null
      ok "Frontend detenido ${DIM}(PID: $FRONTEND_FOUND)${D}"
    else
      warn "Frontend no estaba corriendo en puerto 5173"
    fi
  fi

  echo ""
}

# ══════════════════════════════════════════════════════════════════════════
#  START — Iniciar Backend + Frontend
# ══════════════════════════════════════════════════════════════════════════
do_start() {
  # Verificar que no estén corriendo
  if [ -f "$PID_FILE" ]; then
    BACKEND_PID=$(grep "^BACKEND=" "$PID_FILE" | cut -d= -f2)
    FRONTEND_PID=$(grep "^FRONTEND=" "$PID_FILE" | cut -d= -f2)
    RUNNING=0
    [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null && RUNNING=1
    [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null && RUNNING=1
    if [ $RUNNING -eq 1 ]; then
      warn "Los servicios ya están corriendo"
      info "Backend PID: ${BACKEND_PID:-?} | Frontend PID: ${FRONTEND_PID:-?}"
      echo ""
      return
    fi
  fi

  load_env

  # Verificar puertos
  PORT_OK=1
  for port in 8000 5173; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
      warn "Puerto ${port} ya está en uso"
      PORT_OK=0
    fi
  done

  if [ $PORT_OK -eq 0 ]; then
    echo -e "   ${Y}¿Detener procesos y continuar? (s/N):${D} "
    read -r response
    if [[ "$response" =~ ^[sS]$ ]]; then
      do_stop
    else
      echo -e "   ${R}Cancelado.${D}"
      echo ""
      return
    fi
  fi

  # ── Backend ────────────────────────────────────────────────────────────
  section "🚀 ${W}Iniciando Backend${D}"

  echo -e "   ${B}┌───────────────────────────────────────────────────────┐${D}"
  echo -e "   ${B}│${D}  ${M}🚀 BACKEND${D}  ${DIM}→ http://localhost:8000${D}                  ${B}│${D}"
  echo -e "   ${B}│${D}  ${DIM}uvicorn main:app --reload --port 8000${D}               ${B}│${D}"
  echo -e "   ${B}└───────────────────────────────────────────────────────┘${D}"
  echo ""

  cd "$SCRIPT_DIR/backend"
  DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${AUTH_DB}" \
    uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  cd "$SCRIPT_DIR"
  spinner $BACKEND_PID "Backend arrancando..."
  sleep 2
  ok "Backend iniciado ${DIM}(PID: $BACKEND_PID)${D}"

  # ── Frontend ───────────────────────────────────────────────────────────
  section "🎨 ${W}Iniciando Frontend${D}"

  echo -e "   ${C}┌───────────────────────────────────────────────────────┐${D}"
  echo -e "   ${C}│${D}  ${M}🎨 FRONTEND${D} ${DIM}→ http://localhost:5173${D}                 ${C}│${D}"
  echo -e "   ${C}│${D}  ${DIM}pnpm dev${D}                                            ${C}│${D}"
  echo -e "   ${C}└───────────────────────────────────────────────────────┘${D}"
  echo ""

  cd "$SCRIPT_DIR/frontend"
  pnpm dev &
  FRONTEND_PID=$!
  cd "$SCRIPT_DIR"
  spinner $FRONTEND_PID "Frontend arrancando..."
  sleep 1
  ok "Frontend iniciado ${DIM}(PID: $FRONTEND_PID)${D}"

  # Guardar PIDs
  echo "BACKEND=$BACKEND_PID" > "$PID_FILE"
  echo "FRONTEND=$FRONTEND_PID" >> "$PID_FILE"

  # ── Resumen ────────────────────────────────────────────────────────────
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
  echo -e "   ${G}║${D}  ${Y}👤 Usuario:${D}    admin                                 ${G}║${D}"
  echo -e "   ${G}║${D}  ${Y}🔑 Contraseña:${D} admin123                              ${G}║${D}"
  echo -e "   ${G}║${D}                                                       ${G}║${D}"
  echo -e "   ${G}╚═══════════════════════════════════════════════════════╝${D}"
  echo ""
  echo -e "   ${DIM}Backend PID: ${W}$BACKEND_PID${D} ${DIM}| Frontend PID: ${W}$FRONTEND_PID${D}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════
#  RESTART — Detener y volver a iniciar
# ══════════════════════════════════════════════════════════════════════════
do_restart() {
  section "🔄 ${W}Reiniciando servicios${D}"
  do_stop
  sleep 1
  do_start
}

# ══════════════════════════════════════════════════════════════════════════
#  STATUS — Verificar estado
# ══════════════════════════════════════════════════════════════════════════
do_status() {
  section "📊 ${W}Estado de servicios${D}"

  BACKEND_OK=0
  FRONTEND_OK=0

  if [ -f "$PID_FILE" ]; then
    BACKEND_PID=$(grep "^BACKEND=" "$PID_FILE" | cut -d= -f2)
    FRONTEND_PID=$(grep "^FRONTEND=" "$PID_FILE" | cut -d= -f2)
    [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null && BACKEND_OK=1
    [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null && FRONTEND_OK=1
  fi

  # Verificar por puerto también
  [ $BACKEND_OK -eq 0 ] && ss -tlnp 2>/dev/null | grep -q ":8000 " && BACKEND_OK=2
  [ $FRONTEND_OK -eq 0 ] && ss -tlnp 2>/dev/null | grep -q ":5173 " && FRONTEND_OK=2

  if [ $BACKEND_OK -ge 1 ]; then
    ok "Backend ${DIM}→ http://localhost:8000${D} ${G}(activo)${D}"
  else
    fail "Backend ${DIM}→ http://localhost:8000${D} ${R}(inactivo)${D}"
  fi

  if [ $FRONTEND_OK -ge 1 ]; then
    ok "Frontend ${DIM}→ http://localhost:5173${D} ${G}(activo)${D}"
  else
    fail "Frontend ${DIM}→ http://localhost:5173${D} ${R}(inactivo)${D}"
  fi

  echo ""
}

# ══════════════════════════════════════════════════════════════════════════
#  MENÚ PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════
print_banner

show_menu() {
  echo -e "   ${C}╔═══════════════════════════════════════════════════════╗${D}"
  echo -e "   ${C}║${D}                                                       ${C}║${D}"
  echo -e "   ${C}║${D}  ${W}1)${D}  ${G}▶ Start${D}    Iniciar servicios                      ${C}║${D}"
  echo -e "   ${C}║${D}  ${W}2)${D}  ${R}■ Stop${D}     Detener servicios                      ${C}║${D}"
  echo -e "   ${C}║${D}  ${W}3)${D}  ${Y}↻ Restart${D}  Reiniciar servicios                    ${C}║${D}"
  echo -e "   ${C}║${D}  ${W}4)${D}  ${B}📊 Status${D}  Ver estado de servicios                ${C}║${D}"
  echo -e "   ${C}║${D}  ${W}5)${D}  ${M}✕ Exit${D}     Salir del script                       ${C}║${D}"
  echo -e "   ${C}║${D}                                                       ${C}║${D}"
  echo -e "   ${C}╚═══════════════════════════════════════════════════════╝${D}"
  echo ""
  echo -e "   ${DIM}Selecciona una opción:${D} "
}

# Trap para cleanup al salir con Ctrl+C
cleanup() {
  echo ""
  echo -e "\n   ${R}Deteniendo servicios...${D}"
  if [ -f "$PID_FILE" ]; then
    BACKEND_PID=$(grep "^BACKEND=" "$PID_FILE" | cut -d= -f2)
    FRONTEND_PID=$(grep "^FRONTEND=" "$PID_FILE" | cut -d= -f2)
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && ok "Backend detenido"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "Frontend detenido"
    rm -f "$PID_FILE"
  fi
  echo ""
  echo -e "${M}   🌴 ¡Hasta luego!${D}"
  echo ""
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Bucle del menú ──────────────────────────────────────────────────────
while true; do
  show_menu
  read -r choice
  case $choice in
    1|start|Start)
      do_start
      ;;
    2|stop|Stop)
      do_stop
      ;;
    3|restart|Restart)
      do_restart
      ;;
    4|status|Status)
      do_status
      ;;
    5|exit|Exit|quit|Quit)
      cleanup
      ;;
    *)
      echo -e "   ${R}Opción no válida${D}"
      echo ""
      ;;
  esac
done
