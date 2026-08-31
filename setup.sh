#!/bin/bash
# =============================================================================
#  Caguayo — Script de Setup para nueva PC
#  Ejecutar desde la raíz del proyecto: ./setup.sh
# =============================================================================
set -e

echo "=============================================="
echo "  Caguayo — Setup para nueva PC"
echo "=============================================="
echo ""

# ── 1. Verificar prerequisitos ──────────────────────────────────────────────
echo "==> Verificando prerequisitos..."

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "  [ERROR] '$1' no encontrado. $2"
    return 1
  fi
}

MISSING=0
check_cmd "uv"               "Instalar: curl -LsSf https://astral.sh/uv/install.sh | sh" || MISSING=1
check_cmd "psql"             "Instalar: apt install postgresql-client" || MISSING=1
check_cmd "pnpm"             "Instalar: npm install -g pnpm" || MISSING=1

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "[ERROR] Faltan prerequisitos. Instalarlos y volver a ejecutar."
  exit 1
fi
echo "  [OK] prerequisitos base instalados (uv, psql, pnpm)."

# Podman es opcional (solo necesario para despliegue containerizado)
USE_PODMAN=0
if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
  USE_PODMAN=1
  echo "  [OK] Podman detectado (despliegue containerizado disponible)."
else
  echo "  [INFO] Podman no encontrado — se ejecutará sin contenedores."
  echo "         Para despliegue containerizado, instalar: https://podman.io/getting-started/installation"
fi
echo ""

# ── 2. Configurar .env ─────────────────────────────────────────────────────
echo "==> Configurando variables de entorno..."

if [ ! -f .env ]; then
  cp .env.example .env
  
  # Generar SECRET_KEY aleatorio
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '\n/+=' | head -c 64)
  
  # Generar password aleatorio para PostgreSQL
  PG_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '\n/+=' | head -c 20)
  
  # Reemplazar valores en .env
  sed -i "s/change-me-to-a-random-64-char-string/${SECRET}/" .env
  sed -i "s/change-me/${PG_PASS}/" .env
  
  echo "  [OK] Archivo .env creado con valores generados aleatoriamente."
  echo "  [INFO] SECRET_KEY y POSTGRES_PASSWORD generados."
else
  echo "  [OK] Archivo .env ya existe."
fi
echo ""

# ── 3. Verificar que PostgreSQL esté accesible ──────────────────────────────
echo "==> Verificando conexión a PostgreSQL..."

# Cargar variables del .env
export $(grep -v '^#' .env | xargs)

PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${DB_PORT:-5433}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASS_ENV="${POSTGRES_PASSWORD:-postgres}"

# Auto-detectar puerto: intentar .env, luego 5432 (por defecto local)
if ! PGPASSWORD="${PG_PASS_ENV}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
  if [ "$PG_PORT" != "5432" ]; then
    echo "  [WARN] Puerto ${PG_PORT} no responde — intentando puerto 5432 (local)"
    PG_PORT=5432
  fi
fi

if ! PGPASSWORD="${PG_PASS_ENV}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "SELECT 1" &> /dev/null; then
  echo "  [ERROR] No se puede conectar a PostgreSQL en $PG_HOST:$PG_PORT"
  echo "  [INFO] Verificar que PostgreSQL esté corriendo y las credenciales sean correctas."
  exit 1
fi
echo "  [OK] Conexión a PostgreSQL exitosa en puerto $PG_PORT"
echo ""

# ── 4. Crear bases de datos ────────────────────────────────────────────────
echo "==> Creando bases de datos..."

AUTH_DB="${AUTH_DATABASE:-caguayo}"
CENTRAL_DB="${CENTRAL_DATABASE:-caguayo_sa}"

create_db() {
  local db_name=$1
  EXISTS=$(PGPASSWORD="${PG_PASS_ENV}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" 2>/dev/null)
  if [ "$EXISTS" = "1" ]; then
    echo "  [OK] BD '${db_name}' ya existe."
  else
    PGPASSWORD="${PG_PASS_ENV}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE ${db_name} WITH ENCODING 'UTF8'" &> /dev/null
    echo "  [OK] BD '${db_name}' creada."
  fi
}

create_db "$AUTH_DB"
create_db "$CENTRAL_DB"
echo ""

# ── 5. Aplicar migraciones ─────────────────────────────────────────────────
echo "==> Aplicando migraciones Alembic..."

cd backend

# Migraciones para BD central
echo "  Migrando BD central (${CENTRAL_DB})..."
DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS_ENV}@${PG_HOST}:${PG_PORT}/${CENTRAL_DB}" \
  uv run alembic upgrade head 2>&1 | tail -3

# Migraciones para BD de autenticación
if [ "$AUTH_DB" != "$CENTRAL_DB" ]; then
  echo "  Migrando BD de auth (${AUTH_DB})..."
  DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASS_ENV}@${PG_HOST}:${PG_PORT}/${AUTH_DB}" \
    uv run alembic upgrade head 2>&1 | tail -3
fi

cd ..
echo ""

# ── 6. Inicializar datos de oficina ────────────────────────────────────────
echo "==> Inicializando datos de oficina..."

cd backend

echo "  Inicializando oficina en BD central (${CENTRAL_DB})..."
uv run python -m scripts.init_office "$CENTRAL_DB" 2>&1 | tail -5

if [ "$AUTH_DB" != "$CENTRAL_DB" ]; then
  echo "  Inicializando oficina en BD de auth (${AUTH_DB})..."
  uv run python -m scripts.init_office "$AUTH_DB" 2>&1 | tail -5
fi

cd ..
echo ""

# ── 7. Resumen ─────────────────────────────────────────────────────────────
echo "=============================================="
echo "  Setup completado exitosamente!"
echo "=============================================="
echo ""
echo "  Bases de datos creadas:"
echo "    - Auth:        ${AUTH_DB}"
echo "    - Central:     ${CENTRAL_DB}"
echo ""
echo "  Credenciales de acceso:"
echo "    - Usuario:     admin"
echo "    - Contraseña:  Admin123@"
echo ""
if [ $USE_PODMAN -eq 1 ]; then
  echo "  Para iniciar con contenedores:"
  echo "    podman-compose up --build"
else
  echo "  Para iniciar sin contenedores:"
  echo "    cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 &"
  echo "    cd frontend && pnpm dev &"
fi
echo ""
echo "  URLs:"
echo "    - Frontend:    http://localhost:5173"
echo "    - Backend:     http://localhost:8000"
echo "    - API Docs:    http://localhost:8000/docs"
echo ""
echo "  IMPORTANTE: Cambiar la contraseña del admin en el primer inicio."
echo "=============================================="
