#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  🌴 Caguayo — Script de Desarrollo para Android/Termux
# =============================================================================
#  Variante de scripts/dev.sh para este entorno. Los motivos están comentados
#  junto a cada diferencia; en resumen:
#
#   - PostgreSQL no sobrevive al cierre de la terminal en Termux, así que aquí
#     se arranca y se espera de verdad. dev.sh no lo hace y aun así reporta
#     "Backend listo", porque /health no consulta la base.
#   - Los timeouts de dev.sh son 15 s, calibrados para un PC. Aquí un arranque
#     en frío del backend pasa de 30 s y Vite necesita ~8 s solo, así que 15 s
#     falla siempre.
#   - dev.sh es un menú interactivo con `while true; read`, que ignora los
#     argumentos. Este script usa banderas, no hay nada que bloquear esperando
#     entrada.
#   - uvicorn va sin --reload: en un móvil con la swap llena, el watcher extra
#     compite por la CPU y ralentiza el arranque.
#
#  Uso:
#    ./scripts/dev-termux.sh start     # postgres + backend + frontend
#    ./scripts/dev-termux.sh stop
#    ./scripts/dev-termux.sh restart
#    ./scripts/dev-termux.sh status
#    ./scripts/dev-termux.sh watchdog  # re-lanza lo que Android mate
#    ./scripts/dev-termux.sh logs      # log del backend
# =============================================================================

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
# Ruta absoluta de este mismo script: el watchdog se relanza a sí mismo y $0
# depende de cómo lo haya invocado el usuario.
SELF="$ROOT_DIR/scripts/$(basename "${BASH_SOURCE[0]}")"

PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
PGDATA="${PGDATA:-$PREFIX/var/lib/postgresql}"
RUNDIR="${TMPDIR:-$PREFIX/tmp}/caguayo-dev"
BACKEND_PID="$RUNDIR/backend.pid"
FRONTEND_PID="$RUNDIR/frontend.pid"
WATCHDOG_PID="$RUNDIR/watchdog.pid"
BACKEND_LOG="$RUNDIR/backend.log"
FRONTEND_LOG="$RUNDIR/frontend.log"
WATCHDOG_LOG="$RUNDIR/watchdog.log"

# Cada cuánto el watchdog revisa qué falta.
WATCHDOG_INTERVAL="${WATCHDOG_INTERVAL:-15}"

# Tiempo máximo para que cada servicio abra su puerto. Frío en este móvil:
# el backend tarda más de 30 s, Vite ~8 s + carga de módulos.
BACKEND_TIMEOUT="${BACKEND_TIMEOUT:-90}"
FRONTEND_TIMEOUT="${FRONTEND_TIMEOUT:-90}"

mkdir -p "$RUNDIR"

R=$'\033[1;31m'; G=$'\033[1;32m'; Y=$'\033[1;33m'; B=$'\033[1;34m'
C=$'\033[1;36m'; W=$'\033[1;37m'; D=$'\033[0m'; DIM=$'\033[2m'

say()  { echo -e "${C}ℹ${D} ${W}$*${D}"; }
ok()   { echo -e "   ${G}✔${D} ${G}$*${D}"; }
warn() { echo -e "   ${Y}⚠${D} ${Y}$*${D}"; }
fail() { echo -e "   ${R}✘${D} ${R}$*${D}"; }
head1(){ echo -e "${B}   ─ $1${D}"; }

# ── Postgres ────────────────────────────────────────────────────────────────
# Android 12 mata los procesos de la app cuando va a background, y aquí el
# postmaster cae cada vez que el usuario cambia de app o apaga la pantalla. Por
# eso existe el watchdog, que lo relanza.
#
# No usamos el servicio sv de $PREFIX/var/service/postgres: en Termux `sv up`
# responde "runsv not running" porque no hay ningún runsvdir levantándose solo,
# y arrancarlo a mano sería un proceso más sin superviviente. pg_ctl sí resuelve
# el postmaster.pid que deja un SIGKILL ("another server might be running;
# trying to start server anyway"), así que relanza limpio.
start_postgres() {
  head1 "PostgreSQL"
  if pg_isready -q 2>/dev/null; then
    ok "ya escuchando en 5432"
    return 0
  fi

  say "arrancando cluster en $PGDATA"
  pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" start >/dev/null 2>&1

  for _ in $(seq 1 30); do
    if pg_isready -q 2>/dev/null; then
      ok "aceptando conexiones"
      return 0
    fi
    sleep 1
  done

  fail "PostgreSQL no respondió en 30s. Log: $PGDATA/server.log"
  return 1
}

# Sin esto, Doze mete la app en cached y el sistema se lleva postgres y uvicorn
# en cuanto Termux deja de estar en primer plano. Es idempotente.
take_wake_lock() {
  command -v termux-wake-lock >/dev/null 2>&1 || return 0
  if termux-wake-lock >/dev/null 2>&1; then
    ok "wake lock tomado"
  else
    warn "no se pudo tomar el wake lock; Android puede congelar la app"
  fi
}

# ── Puerto ──────────────────────────────────────────────────────────────────
# No usamos `ss -tlnp | grep -oP`: en Termux el `ss` es el de /system/bin y el
# grep -P depende de la build. Comprobamos con curl cuando se puede y con
# /proc/net/tcp como respaldo.
port_open() {
  local port="$1"
  curl -s -o /dev/null --max-time 3 "http://127.0.0.1:${port}/" 2>/dev/null && return 0
  curl -s -o /dev/null --max-time 3 "http://localhost:${port}/" 2>/dev/null && return 0
  # /proc/net/tcp: estado 0A = LISTEN, en hexadecimallittle-endian.
  local hex
  hex=$(printf '%04X' "$port")
  grep -qi ":${hex} .* 0A " /proc/net/tcp /proc/net/tcp6 2>/dev/null && return 0
  return 1
}

# wait_service <pid> <port> <label> <timeout> <logfile>
wait_service() {
  local pid="$1" port="$2" label="$3" timeout="$4" log="$5"
  local i=0

  while [ "$i" -lt "$timeout" ]; do
    # Si el proceso murió, no esperamos más: distinguir lentitud de caída.
    if ! kill -0 "$pid" 2>/dev/null; then
      echo ""
      fail "$label murió durante el arranque"
      show_log "$log" 20
      return 1
    fi
    if port_open "$port"; then
      echo ""
      ok "$label listo en ${port} (${i}s, PID ${pid})"
      return 0
    fi
    printf "\r   ${C}…${D} ${DIM}${label} arrancando ${i}s/${timeout}s${D}  "
    sleep 1
    i=$((i + 1))
  done

  echo ""
  fail "$label no abrió el puerto ${port} en ${timeout}s"
  show_log "$log" 20
  return 1
}

show_log() {
  local log="$1" lines="${2:-20}"
  [ -f "$log" ] || return 0
  echo -e "   ${DIM}── últimas ${lines} líneas de $(basename "$log") ──${D}"
  tail -n "$lines" "$log" | sed 's/^/   │ /'
}

# ── Carga de entorno ────────────────────────────────────────────────────────
# connection.py:43 hace os.environ["AUTH_DATABASE"] sin default: si falta,
# uvicorn muere al importar. Verificamos aquí para dar un error legible.
load_env() {
  if [ -f backend/.env ]; then set -a; source backend/.env; set +a; fi
  if [ -f .env ]; then set -a; source .env; set +a; fi

  if [ -z "${AUTH_DATABASE:-}" ]; then
    fail "AUTH_DATABASE no está definido en .env"
    echo -e "   ${DIM}El backend hace os.environ[\"AUTH_DATABASE\"] sin default${D}"
    return 1
  fi

  PG_HOST="${POSTGRES_HOST:-127.0.0.1}"
  PG_PORT="${DB_PORT:-5432}"
  PG_USER="${POSTGRES_USER:-postgres}"
  PG_PASS="${POSTGRES_PASSWORD:-postgres}"
  return 0
}

# ── START ───────────────────────────────────────────────────────────────────
# Backend y frontend van en funciones sueltas porque el watchdog los relanza
# uno a uno: si Android solo se lleva uvicorn, vite no se toca.
start_backend() {
  (
    cd "$ROOT_DIR/backend"
    export DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${AUTH_DATABASE}"
    # Sin --reload a propósito: el watcher extra compite por la CPU.
    exec .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
  ) > "$BACKEND_LOG" 2>&1 &
  local bpid=$!
  echo "$bpid" > "$BACKEND_PID"
  wait_service "$bpid" 8000 "Backend" "$BACKEND_TIMEOUT" "$BACKEND_LOG"
}

start_frontend() {
  (
    cd "$ROOT_DIR/frontend"
    exec pnpm dev
  ) > "$FRONTEND_LOG" 2>&1 &
  local fpid=$!
  echo "$fpid" > "$FRONTEND_PID"
  wait_service "$fpid" 5173 "Frontend" "$FRONTEND_TIMEOUT" "$FRONTEND_LOG"
}

# El watchdog se relanza a sí mismo desacoplado (setsid), para que sobreviva
# al cierre de la terminal. Idempotente: si ya hay uno vivo no abre un segundo.
start_watchdog() {
  local wpid
  wpid=$(cat "$WATCHDOG_PID" 2>/dev/null)
  if [ -n "$wpid" ] && kill -0 "$wpid" 2>/dev/null; then
    ok "watchdog ya activo (PID ${wpid})"
    return 0
  fi

  setsid nohup "$SELF" watchdog >> "$WATCHDOG_LOG" 2>&1 < /dev/null &
  sleep 1
  wpid=$(cat "$WATCHDOG_PID" 2>/dev/null)
  if [ -n "$wpid" ] && kill -0 "$wpid" 2>/dev/null; then
    ok "watchdog activo cada ${WATCHDOG_INTERVAL}s (PID ${wpid})"
  else
    warn "el watchdog no arrancó; revisa $WATCHDOG_LOG"
  fi
}

do_start() {
  local nowatch="${1:-}"

  echo -e "${G}🌴 Caguayo — arranque en Termux${D}"
  echo ""

  do_stop >/dev/null 2>&1

  take_wake_lock
  start_postgres || return 1
  load_env || return 1

  head1 "Backend (uvicorn :8000)"
  start_backend || return 1

  head1 "Frontend (vite :5173)"
  start_frontend || return 1

  # El watchdog va incluido: sin él, en cuanto Termux va a background Android
  # se lleva los servicios y no hay quien los vuelva a levantar.
  [ "$nowatch" = "--no-watch" ] || start_watchdog

  echo ""
  ok "Proyecto arriba"
  echo -e "   ${DIM}API   ${D} http://localhost:8000/docs"
  echo -e "   ${DIM}Front ${D} http://localhost:5173"
  echo -e "   ${DIM}Logs  ${D} $RUNDIR/backend.log  $RUNDIR/frontend.log"
  echo -e "   ${DIM}Parar ${D} $0 stop"
  return 0
}

# ── STOP ────────────────────────────────────────────────────────────────────
do_stop() {
  head1 "Deteniendo"

  # El watchdog se para antes que los servicios: si no, relanza lo que acabamos
  # de matar. do_start también pasa por aquí, y luego lanza uno nuevo, así que
  # nunca quedan dos peleándose por el PID file.
  if [ -f "$WATCHDOG_PID" ]; then
    local wpid
    wpid=$(cat "$WATCHDOG_PID" 2>/dev/null)
    if [ -n "$wpid" ] && kill -0 "$wpid" 2>/dev/null; then
      kill -TERM "$wpid" 2>/dev/null
      ok "watchdog detenido PID ${wpid}"
    fi
    rm -f "$WATCHDOG_PID"
  fi

  for f in "$FRONTEND_PID" "$BACKEND_PID"; do
    [ -f "$f" ] || continue
    local pid
    pid=$(cat "$f" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      # El grupo entero: uvicorn/vite lanzan subprocesos hijos.
      kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
      sleep 1
      kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
      ok "detenido PID ${pid}"
    fi
    rm -f "$f"
  done
  # Huérfanos por si el PID file se perdió.
  pkill -f "uvicorn main:app" 2>/dev/null
  pkill -f "vite" 2>/dev/null
  return 0
}

# ── STATUS ──────────────────────────────────────────────────────────────────
do_status() {
  head1 "Estado"
  if pg_isready -q 2>/dev/null; then ok "PostgreSQL  :5432"; else fail "PostgreSQL  :5432 caído"; fi

  local bpid fpid
  bpid=$(cat "$BACKEND_PID" 2>/dev/null)
  fpid=$(cat "$FRONTEND_PID" 2>/dev/null)

  if [ -n "$bpid" ] && kill -0 "$bpid" 2>/dev/null; then
    ok "Backend     :8000 (PID ${bpid})"
  else
    fail "Backend     :8000 parado"
  fi

  if [ -n "$fpid" ] && kill -0 "$fpid" 2>/dev/null; then
    ok "Frontend    :5173 (PID ${fpid})"
  else
    fail "Frontend    :5173 parado"
  fi

  local wpid
  wpid=$(cat "$WATCHDOG_PID" 2>/dev/null)
  if [ -n "$wpid" ] && kill -0 "$wpid" 2>/dev/null; then
    ok "Watchdog    :cada ${WATCHDOG_INTERVAL}s (PID ${wpid})"
  else
    fail "Watchdog    :parado (arrácalo con: $0 watchdog)"
  fi
}

# ── WATCHDOG ─────────────────────────────────────────────────────────────────
# La respuesta al problema real: Android mata procesos individuales, no la app
# entera (vite sobrevive a los mismos paused que se llevan uvicorn). Así que
# "comprobar y reparar" funciona mejor que "revivirlo todo cada vez".
#
# Only_raise <pidfile> <port>: 0 si hay que relanzar ese servicio.
only_raise() {
  local pidfile="$1" port="$2" pid
  pid=$(cat "$pidfile" 2>/dev/null)
  # PID vivo: lo arrancamos nosotros y sigue en pie, no se toca.
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && return 1
  # Sin PID: si el puerto está abierto es otro proceso, no es nuestro.
  port_open "$port" && return 1
  return 0
}

do_watchdog() {
  if ! load_env; then return 1; fi

  echo "$$" > "$WATCHDOG_PID"
  # Sin trap, un Ctrl-C deja el PID file y `stop` mata a un PID ya reciclado.
  trap 'rm -f "$WATCHDOG_PID"; exit 0' INT TERM

  say "watchdog activo cada ${WATCHDOG_INTERVAL}s. Ctrl-C para salir."
  while true; do
    if ! pg_isready -q 2>/dev/null; then
      warn "PostgreSQL caído, relanzando"
      start_postgres >/dev/null 2>&1
    fi

    if only_raise "$BACKEND_PID" 8000; then
      warn "Backend :8000 caído, relanzando"
      start_backend >/dev/null 2>&1 || warn "el backend no volvió a abrir el puerto"
    fi

    if only_raise "$FRONTEND_PID" 5173; then
      warn "Frontend :5173 caído, relanzando"
      start_frontend >/dev/null 2>&1 || warn "el frontend no volvió a abrir el puerto"
    fi

    sleep "$WATCHDOG_INTERVAL"
  done
}

# ── RUN ──────────────────────────────────────────────────────────────────────
# A diferencia de `start`, este proceso NO se termina: se queda vivo como padre
# de postgres, uvicorn, vite y watchdog. Los cuatro cuelgan de él con la
# terminal detrás, en vez de quedar sueltos con PPID 1.
#
# Ojo con las expectativas: Android decide mirando el estado de la app (en caché
# o servicio en primer plano), no si un proceso tiene padre o terminal. Para el
# framework, un postgres con padre vivo y uno huérfano son el mismo proceso de
# la misma app. Puede que los mate igual. Lo que sí arregla es el día a día:
# Ctrl-C para todo limpio, sin PIDs huérfanos ni el pkill de emergencia.
do_run() {
  local -a RUN_PIDS=()

  echo -e "${G}🌴 Caguayo — ejecución en primer plano (Ctrl-C para parar)${D}"
  echo ""

  do_stop >/dev/null 2>&1
  take_wake_lock

  # postgres como hijo, no daemon: pg_ctl lo dejaría suelto con PPID 1.
  head1 "PostgreSQL"
  if pg_isready -q 2>/dev/null; then
    ok "ya escuchando en 5432"
  else
    say "arrancando cluster en $PGDATA (hijo de este proceso)"
    postgres -D "$PGDATA" >> "$PGDATA/server.log" 2>&1 &
    RUN_PIDS+=("$!")
    for _ in $(seq 1 30); do
      pg_isready -q 2>/dev/null && break
      sleep 1
    done
    if pg_isready -q 2>/dev/null; then
      ok "aceptando conexiones"
    else
      fail "PostgreSQL no respondió en 30s. Log: $PGDATA/server.log"
      return 1
    fi
  fi

  load_env || return 1

  head1 "Backend (uvicorn :8000)"
  (
    cd "$ROOT_DIR/backend"
    export DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${AUTH_DATABASE}"
    exec .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
  ) > "$BACKEND_LOG" 2>&1 &
  local bpid=$!
  echo "$bpid" > "$BACKEND_PID"
  RUN_PIDS+=("$bpid")
  wait_service "$bpid" 8000 "Backend" "$BACKEND_TIMEOUT" "$BACKEND_LOG" || return 1

  head1 "Frontend (vite :5173)"
  (
    cd "$ROOT_DIR/frontend"
    exec pnpm dev
  ) > "$FRONTEND_LOG" 2>&1 &
  local fpid=$!
  echo "$fpid" > "$FRONTEND_PID"
  RUN_PIDS+=("$fpid")
  wait_service "$fpid" 5173 "Frontend" "$FRONTEND_TIMEOUT" "$FRONTEND_LOG" || return 1

  # El watchdog también cuelga de aquí: mismo árbol, no un setsid suelto.
  "$SELF" watchdog >> "$WATCHDOG_LOG" 2>&1 &
  RUN_PIDS+=("$!")
  echo "$!" > "$WATCHDOG_PID"

  echo ""
  ok "Proyecto arriba"
  echo -e "   ${DIM}API   ${D} http://localhost:8000/docs"
  echo -e "   ${DIM}Front ${D} http://localhost:5173"
  echo -e "   ${DIM}Logs  ${D} $RUNDIR/backend.log  $RUNDIR/frontend.log"
  echo -e "   ${DIM}Parar ${D} $0 stop   (o Ctrl-C aquí)"

  # Los hijos primero, y a los nietos también: pnpm deja un node vite detrás.
  run_cleanup() {
    local pid child
    for pid in "${RUN_PIDS[@]}"; do
      [ -n "$pid" ] || continue
      pkill -P "$pid" 2>/dev/null
      kill -TERM "$pid" 2>/dev/null
    done
    sleep 1
    for pid in "${RUN_PIDS[@]}"; do
      [ -n "$pid" ] || continue
      kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
    done
    rm -f "$BACKEND_PID" "$FRONTEND_PID" "$WATCHDOG_PID"
    unset -f run_cleanup
  }
  trap 'run_cleanup; exit 0' INT TERM

  wait
}

# ── LOGS ────────────────────────────────────────────────────────────────────
# El error útil en uvicorn está enterrado bajo ~30 líneas de traceback, así que
# `logs errors` filtra: cabecera del error, la línea que lo lanza y el resumen.
LOG_ERRORS_RE='Traceback|Error|ERROR|Exception|FATAL|CRITICAL|ModuleNotFound|OperationalError|Warning:'

do_logs() {
  local what="${1:-both}" follow="${2:-}"

  case "$what" in
    backend)  follow=$([[ "$follow" == "-f" ]] && echo "-f") ; tail $follow "$BACKEND_LOG" ;;
    frontend) follow=$([[ "$follow" == "-f" ]] && echo "-f") ; tail $follow "$FRONTEND_LOG" ;;
    errors)
      echo -e "${Y}── errores del backend ──${D}"
      grep -nE "$LOG_ERRORS_RE" "$BACKEND_LOG" | tail -40
      echo ""
      echo -e "${DIM}(sin resultados = no hay errores registrados)${D}"
      ;;
    both)
      # Backend y frontend intercalados no sirven: se pisan entre sí. Backend
      # arriba, frontend abajo, cada uno con su cabecera.
      echo -e "${B}══ BACKEND ══${D}"
      tail -n 40 "$BACKEND_LOG" 2>/dev/null
      echo ""
      echo -e "${B}══ FRONTEND ══${D}"
      tail -n 25 "$FRONTEND_LOG" 2>/dev/null
      echo ""
      echo -e "${DIM}logs errors   → solo los errores${D}"
      echo -e "${DIM}logs backend  → solo el backend${D}"
      ;;
    *) fail "logs: opción desconocida: $what"; return 1 ;;
  esac
}

# ── TRY ─────────────────────────────────────────────────────────────────────
# Hace la petición y vuelca SOLO las líneas de log que se generaron durante
# ella. Para "ver qué falla en esta función" es más útil que un tail manual.
do_try() {
  local path="$1" method="${2:-POST}"
  local body="${3:-}"
  local before after code out

  if ! curl -s -o /dev/null --max-time 3 "http://127.0.0.1:8000/health"; then
    fail "el backend no responde. Levántalo con: $0 start"
    return 1
  fi

  before=$(wc -l < "$BACKEND_LOG" 2>/dev/null || echo 0)

  if [ -n "$body" ]; then
    out=$(curl -s --max-time 60 -w "\n__HTTP__%{http_code}" \
          -X "$method" "http://127.0.0.1:8000${path}" \
          -H "Content-Type: application/json" -d "$body" 2>&1)
  else
    out=$(curl -s --max-time 60 -w "\n__HTTP__%{http_code}" \
          -X "$method" "http://127.0.0.1:8000${path}" 2>&1)
  fi

  code=$(printf '%s' "$out" | sed -n 's/^__HTTP__//p' | tail -1)
  printf '%s' "$out" | sed '/^__HTTP__/d' | head -c 2000
  echo ""

  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
    ok "HTTP ${code}"
  else
    fail "HTTP ${code}"
  fi

  # Lo que el log escribió durante esta petición.
  after=$(wc -l < "$BACKEND_LOG" 2>/dev/null || echo 0)
  if [ "$after" -gt "$before" ]; then
    echo ""
    echo -e "${Y}── log generado por esta petición ──${D}"
    tail -n +$((before + 1)) "$BACKEND_LOG" | grep -vE "INFO:.*(GET|POST|PUT|DELETE|PATCH)" | head -45
  fi
  return 0
}

# ── Dispatch ────────────────────────────────────────────────────────────────
case "${1:-}" in
  start)   do_start "${2:-}" ;;
  stop)    do_stop    ;;
  restart) do_stop; echo ""; do_start ;;
  status)  do_status  ;;
  watchdog) do_watchdog ;;
  run)      do_run ;;
  logs)    do_logs "${2:-both}" "${3:-}" ;;
  try)     shift; do_try "$@" ;;
  ""|-h|--help|help)
    cat <<EOF
Uso: $0 <comando>

  start            PostgreSQL + backend + frontend + watchdog
  start --no-watch igual, pero sin el watchdog (para depurar)
  stop             detiene watchdog, backend y frontend
  restart          stop + start
  status           muestra qué está corriendo
  watchdog         solo el vigilante, relanza lo que Android mate (Ctrl-C)
  run             todo en primer plano, colgado de este proceso (Ctrl-C para
                   parar). En background: $0 run &
                   A diferencia de start, aquí postgres NO es daemon: es hijo
                   del script, así que el árbol entero queda vivo junto.

  logs             backend (40 líneas) + frontend (25 líneas)
  logs backend     solo el backend
  logs frontend    solo el frontend
  logs errors      solo errores del backend, filtrados
  logs backend -f  sigue el log del backend en vivo

  try RUTA [POST|GET] [JSON_BODY]
                   hace la petición y muestra el log que generó.
                   Ej: $0 try /api/v1/auth/login POST \\
                          '{"alias":"admin","contrasenia":"admin123","base_datos":"caguayo"}'
EOF
    ;;
  *) fail "comando desconocido: $1"; sed -n '/Uso:/,$p' "$0"; exit 1 ;;
esac