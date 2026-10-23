# Resetea, migra, siembra datos por defecto y corre el ETL completo.
# Reanudable: cada etapa deja marca en scripts/.estado_reset/ y se salta si ya
# terminó. Pensado para relanzarse después de cada reinicio del host.
set -x
ROOT=$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)
STATE=$ROOT/scripts/.estado_reset
VENV=$ROOT/backend/.venv/bin/python
cd $ROOT/scripts
mkdir -p $STATE

marca() { [ -f "$STATE/$1.hecho" ]; }

# ── 1) Migraciones alembic por base de datos ────────────────────────────────
for db in caguayo_sa caguayo caguayosa; do
    if marca "alembic_$db"; then echo "OK ya: alembic $db"; continue; fi
    cd $ROOT/backend
    DATABASE_URL="postgresql+asyncpg://postgres:12345678@127.0.0.1:5432/$db" \
        $VENV -m alembic upgrade head \
        && touch $STATE/alembic_$db.hecho \
        || { echo "FALLO alembic $db"; exit 1; }
done

# ── 2) Datos por defecto por base de datos ─────────────────────────────────
for db in caguayo_sa caguayo caguayosa; do
    if marca "init_$db"; then echo "OK ya: init_office $db"; continue; fi
    cd $ROOT/backend
    $VENV -m scripts.init_office $db \
        && touch $STATE/init_$db.hecho \
        || { echo "FALLO init_office $db"; exit 1; }
done

# ── 3) Cadena completa del ETL (fases 0..P), destino caguayo_sa ────────────
if marca etl; then
    echo "OK ya: etl"
else
    cd $ROOT/etl
    $VENV main.py --commit \
        && touch $STATE/etl.hecho \
        || { echo "FALLO etl"; exit 1; }
fi

echo "EXIT=0"
