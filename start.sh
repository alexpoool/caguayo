#!/bin/bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────
SESSION="caguayo"
BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)/backend"
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)/frontend"
TIMEOUT=60  # seconds to wait for each service
# ────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e " ${GREEN}✓${NC} $1"; }
info() { echo -e " ${CYAN}→${NC} $1"; }
warn() { echo -e " ${YELLOW}⚠${NC} $1"; }
fail() { echo -e " ${RED}✗${NC} $1"; }

cleanup() {
    echo
    warn "Interrupción recibida. Limpiando..."
    tmux kill-session -t "$SESSION" 2>/dev/null || true
    exit 1
}
trap cleanup SIGINT SIGTERM

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Caguayo — Inicialización del proyecto"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# ── 1. Prerequisitos ──────────────────────────────────
info "Verificando prerequisitos..."
FAIL=0
for cmd in python3 uv node pnpm tmux psql; do
    if ! command -v "$cmd" &>/dev/null; then
        fail "No encontrado: $cmd"
        FAIL=1
    fi
done
if ! python3 -c "import sys; assert sys.version_info >= (3, 13)" 2>/dev/null; then
    fail "Python >= 3.13 requerido"
    FAIL=1
fi
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ "${NODE_VER:-0}" -lt 20 ]; then
    fail "Node.js >= 20 requerido (tienes v$(node -v 2>/dev/null || echo '?'))"
    FAIL=1
fi
[ "$FAIL" = 1 ] && exit 1
ok "Prerequisitos satisfechos"

# ── 2. PostgreSQL ──────────────────────────────────────
info "Verificando PostgreSQL..."
if pg_isready -q 2>/dev/null; then
    ok "PostgreSQL está corriendo"
else
    fail "PostgreSQL no está accesible. Ejecútalo e intenta de nuevo."
    exit 1
fi

# ── 3. Dependencias ────────────────────────────────────
info "Verificando dependencias del backend..."
if [ -d "$BACKEND_DIR/.venv" ]; then
    ok "Backend dependencies already installed"
else
    info "Instalando dependencias del backend..."
    (cd "$BACKEND_DIR" && uv sync)
    ok "Backend dependencies installed"
fi

info "Verificando dependencias del frontend..."
if [ -d "$FRONTEND_DIR/node_modules" ]; then
    ok "Frontend dependencies already installed"
else
    info "Instalando dependencias del frontend..."
    (cd "$FRONTEND_DIR" && pnpm install)
    ok "Frontend dependencies installed"
fi

# ── 4. Base de datos ───────────────────────────────────
DB_URL="${DATABASE_URL:-postgresql+psycopg://postgres:debianpostgres@localhost:5432/caguayosa}"
DB_NAME=$(echo "$DB_URL" | sed 's/.*\/\([^?]*\).*/\1/')
DB_USER=$(echo "$DB_URL" | sed 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS=$(echo "$DB_URL" | sed 's/.*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo "$DB_URL" | sed 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo "$DB_URL" | sed 's/.*:\([0-9]*\)\/.*/\1/')
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 && \
    DB_EXISTS=1 || DB_EXISTS=0

if [ "$DB_EXISTS" = 1 ]; then
    ok "Base de datos '$DB_NAME' ya existe"
else
    info "Creando base de datos '$DB_NAME'..."
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE \"$DB_NAME\"" 2>&1 || {
        fail "No se pudo crear la base de datos. Verifica credenciales en backend/.env"
        exit 1
    }
    ok "Base de datos '$DB_NAME' creada"
fi

# ── 5. Migraciones ─────────────────────────────────────
info "Ejecutando migraciones (alembic)..."
(cd "$BACKEND_DIR" && uv run alembic upgrade head 2>&1)
ok "Migraciones aplicadas"

# ── 6. Iniciar servicios en tmux ───────────────────────
tmux kill-session -t "$SESSION" 2>/dev/null || true
sleep 0.5

tmux new-session -d -s "$SESSION" -n "caguayo" 2>/dev/null || {
    fail "No se pudo crear la sesión tmux"
    exit 1
}

# Panel izquierdo: Backend
tmux send-keys -t "$SESSION:0.0" "cd $BACKEND_DIR && echo '==> Backend iniciando...' && exec uv run python main.py" Enter

# Panel derecho: Frontend
tmux split-window -h -t "$SESSION:0.0"
tmux send-keys -t "$SESSION:0.1" "cd $FRONTEND_DIR && echo '==> Frontend iniciando...' && exec pnpm dev" Enter

tmux select-layout -t "$SESSION:0" even-horizontal 2>/dev/null || true
ok "Sesión tmux '$SESSION' creada"

# ── 7. Verificar health ────────────────────────────────
echo
info "Verificando servicios (timeout: ${TIMEOUT}s)..."
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"

BE_OK=0; FE_OK=0
for i in $(seq 1 $TIMEOUT); do
    if [ "$BE_OK" = 0 ]; then
        if curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; then
            BE_OK=1
            ok "Backend responde en $BACKEND_URL"
        fi
    fi
    if [ "$FE_OK" = 0 ]; then
        if curl -sf "$FRONTEND_URL" >/dev/null 2>&1; then
            FE_OK=1
            ok "Frontend responde en $FRONTEND_URL"
        fi
    fi
    [ "$BE_OK" = 1 ] && [ "$FE_OK" = 1 ] && break
    sleep 1
done

if [ "$BE_OK" = 0 ]; then
    fail "Backend no respondió después de ${TIMEOUT}s — revisa logs en tmux"
fi
if [ "$FE_OK" = 0 ]; then
    fail "Frontend no respondió después de ${TIMEOUT}s — revisa logs en tmux"
fi

# ── 8. Resumen ─────────────────────────────────────────
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Resumen"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo "  tmux:     tmux attach -t $SESSION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
