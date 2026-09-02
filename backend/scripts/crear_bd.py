#!/usr/bin/env python3
"""Crea una nueva base de datos tenant, configura FDW y aplica alembic stamp.

Uso:
    uv run python scripts/crear_bd.py <nombre_bd>
    uv run python scripts/crear_bd.py <nombre_bd> --drop-first
    uv run python scripts/crear_bd.py <nombre_bd> --dry-run

Ejemplo:
    uv run python scripts/crear_bd.py dependencia_sancti_spiritus

Este script reemplaza la creación automática que antes se hacía desde el
formulario de dependencias. La nueva BD debe registrarse después en
conexion_database desde la interfaz de administración.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys

import psycopg2
from dotenv import load_dotenv

# Cargar .env del backend
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

ALEMBIC_CFG_PATH = os.path.join(BACKEND_DIR, "alembic.ini")

# ── Configuración desde variables de entorno ─────────────────────────
ADMIN_DB_HOST = os.getenv("ADMIN_DB_HOST", "localhost")
ADMIN_DB_PORT = int(os.getenv("ADMIN_DB_PORT", 5432))
ADMIN_DB_USER = os.getenv("ADMIN_DB_USER", "postgres")
ADMIN_DB_PASSWORD = os.getenv("ADMIN_DB_PASSWORD", "")
ADMIN_DB_NAME = os.getenv("ADMIN_DB_NAME", "postgres")
CENTRAL_DB = os.environ["CENTRAL_DATABASE"]


# ── Validación ───────────────────────────────────────────────────────
def validar_nombre_bd(nombre: str) -> None:
    """Valida que el nombre de la base de datos sea seguro."""
    if not nombre:
        raise ValueError("El nombre de la base de datos no puede estar vacío")
    if len(nombre) > 63:
        raise ValueError(
            "El nombre de la base de datos no puede tener más de 63 caracteres"
        )
    if not re.match(r"^[a-zA-Z0-9_]+$", nombre):
        raise ValueError(
            f"Nombre de base de datos inválido: '{nombre}'. "
            "Solo se permiten letras, números y guiones bajos"
        )


# ── Conexiones ───────────────────────────────────────────────────────
def connect_admin() -> psycopg2.extensions.connection:
    conn = psycopg2.connect(
        host=ADMIN_DB_HOST,
        port=ADMIN_DB_PORT,
        user=ADMIN_DB_USER,
        password=ADMIN_DB_PASSWORD,
        dbname=ADMIN_DB_NAME,
        client_encoding="utf8",
    )
    conn.set_session(autocommit=True)
    return conn


def connect_db(db_name: str) -> psycopg2.extensions.connection:
    conn = psycopg2.connect(
        host=ADMIN_DB_HOST,
        port=ADMIN_DB_PORT,
        user=ADMIN_DB_USER,
        password=ADMIN_DB_PASSWORD,
        dbname=db_name,
        client_encoding="utf8",
    )
    conn.set_session(autocommit=True)
    return conn


# ── Pasos de creación ───────────────────────────────────────────────
def crear_database(nombre: str) -> bool:
    """Crea la base de datos. Retorna True si se creó, False si ya existía."""
    print(f"  1/6  Creando base de datos '{nombre}'...")
    conn = connect_admin()
    cur = conn.cursor()
    try:
        cur.execute(
            f"CREATE DATABASE {nombre} WITH ENCODING 'UTF8' TEMPLATE template0"
        )
        print(f"       ✓ Base de datos '{nombre}' creada")
        return True
    except psycopg2.errors.DuplicateDatabase:
        print(f"       ⚠ La base de datos '{nombre}' ya existe")
        return False
    finally:
        cur.close()
        conn.close()


def eliminar_database(nombre: str) -> None:
    """Elimina la base de datos si existe."""
    conn = connect_admin()
    cur = conn.cursor()
    cur.execute(f"DROP DATABASE IF EXISTS {nombre}")
    print(f"       ✓ Base de datos '{nombre}' eliminada")
    cur.close()
    conn.close()


def configurar_fdw(nombre: str) -> None:
    """Configura la extensión postgres_fdw y el servidor FDW hacia la BD central."""
    print("  2/6  Configurando FDW (postgres_fdw + servidor_central)...")
    with connect_db(nombre) as conn:
        conn.autocommit = True
        cur = conn.cursor()

        # Extensión
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgres_fdw;")
        print("       ✓ Extensión postgres_fdw creada")

        # Servidor FDW hacia la BD central
        try:
            cur.execute("DROP SERVER IF EXISTS servidor_central CASCADE;")
            cur.execute(
                """
                CREATE SERVER servidor_central
                FOREIGN DATA WRAPPER postgres_fdw
                OPTIONS (
                    host %s,
                    dbname %s,
                    port %s
                );
                """,
                (ADMIN_DB_HOST, CENTRAL_DB, str(ADMIN_DB_PORT)),
            )
            cur.execute(
                "CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER "
                "SERVER servidor_central "
                "OPTIONS (user %s, password %s)",
                (ADMIN_DB_USER, ADMIN_DB_PASSWORD),
            )
            print("       ✓ Servidor FDW 'servidor_central' configurado")
        except Exception as e:
            print(f"       ⚠ Error configurando FDW: {e}")

        cur.close()


def copiar_esquema(nombre: str) -> None:
    """Copia el esquema desde la BD central usando pg_dump | psql."""
    print("  3/6  Copiando esquema desde la BD central...")
    central_url = (
        f"postgresql://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}"
        f"@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{CENTRAL_DB}"
    )
    target_url = (
        f"postgresql://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}"
        f"@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{nombre}"
    )

    dump_cmd = [
        "pg_dump", central_url,
        "--schema-only", "--no-owner", "--no-privileges",
        "--no-publications", "--no-subscriptions",
        "--no-security-labels", "--no-tablespaces",
        "--no-comments",
    ]
    psql_cmd = ["psql", target_url, "-v", "ON_ERROR_STOP=0"]

    dump_proc = subprocess.Popen(
        dump_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    psql_proc = subprocess.Popen(
        psql_cmd,
        stdin=dump_proc.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    dump_proc.stdout.close()
    stdout, stderr = psql_proc.communicate(timeout=120)

    if psql_proc.returncode != 0 and "already exists" not in (stderr or ""):
        # Warning, no error — tablas que ya existen son OK
        print(f"       ⚠ pg_dump/psql warnings: {(stderr or '')[:300]}")
    else:
        print("       ✓ Esquema copiado exitosamente")


def alembic_stamp(nombre: str) -> None:
    """Hace stamp head en la BD con alembic."""
    print("  4/6  Ejecutando alembic stamp head...")
    db_url = (
        f"postgresql+asyncpg://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}"
        f"@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{nombre}"
    )

    env = os.environ.copy()
    env["DATABASE_URL"] = db_url

    result = subprocess.run(
        [
            sys.executable, "-m", "alembic",
            "-c", os.path.abspath(ALEMBIC_CFG_PATH),
            "stamp", "head",
        ],
        capture_output=True,
        text=True,
        timeout=120,
        env=env,
        cwd=BACKEND_DIR,
    )

    if result.returncode != 0:
        print(f"       ⚠ Alembic stamp warnings: {result.stderr[:300]}")
    else:
        print("       ✓ Alembic stamphead completado")


def init_office_seed(nombre: str) -> None:
    """Ejecuta init_office.py para insertar datos semilla en la BD tenant."""
    print("  5/6  Insertando datos semilla (init_office)...")
    try:
        from scripts.init_office import init_office
        inserted, errors = init_office(nombre)
        if inserted:
            print(f"       ✓ Datos insertados: {', '.join(inserted)}")
        else:
            print("       ⚠ No se insertaron datos (tablas ya tenían datos)")
        for err in errors:
            print(f"       ✗ Error: {err}")
    except Exception as e:
        print(f"       ⚠ Error ejecutando init_office: {e}")


def registrar_en_conexion_database(nombre: str) -> None:
    """Registra la nueva BD en la tabla conexion_database de la BD central."""
    print("  6/6  Registrando en conexion_database...")
    try:
        with connect_db(CENTRAL_DB) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO conexion_database (host, puerto, nombre_database, usuario, contrasenia)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    ADMIN_DB_HOST,
                    ADMIN_DB_PORT,
                    nombre,
                    ADMIN_DB_USER,
                    ADMIN_DB_PASSWORD,
                ),
            )
            conn.commit()
            cur.close()
            print(f"       ✓ '{nombre}' registrada en conexion_database")
    except Exception as e:
        print(f"       ⚠ No se pudo registrar en conexion_database: {e}")
        print(f"         Regístrela manualmente desde la interfaz de administración.")


# ── Listar BDs existentes ───────────────────────────────────────────
def listar_databases() -> list[str]:
    """Retorna los nombres de todas las bases de datos del servidor."""
    excluded = {"postgres", "template0", "template1"}
    with connect_admin() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT datname FROM pg_database "
            "WHERE datistemplate = false AND datname NOT IN %s "
            "ORDER BY datname",
            (tuple(excluded),),
        )
        dbs = [row[0] for row in cur.fetchall()]
        cur.close()
    return dbs


# ── Main ─────────────────────────────────────────────────────────────
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="crear_bd",
        description="Crea una nueva base de datos tenant con esquema, FDW y alembic.",
    )
    parser.add_argument(
        "nombre",
        nargs="?",
        help="Nombre de la base de datos a crear",
    )
    parser.add_argument(
        "--drop-first",
        action="store_true",
        help="Eliminar la BD si ya existe antes de crearla",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostrar qué se haría sin ejecutar nada",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        dest="listar",
        help="Listar todas las bases de datos existentes",
    )
    parser.add_argument(
        "--no-register",
        action="store_true",
        help="No registrar en conexion_database automáticamente",
    )
    args = parser.parse_args(argv)

    # Listar BDs
    if args.listar:
        dbs = listar_databases()
        print(f"Bases de datos existentes ({len(dbs)}):")
        for db in dbs:
            print(f"  • {db}")
        return 0

    # Validar nombre
    if not args.nombre:
        parser.error("Debe especificar un nombre de base de datos o usar --list")

    try:
        validar_nombre_bd(args.nombre)
    except ValueError as e:
        print(f"Error: {e}")
        return 1

    nombre = args.nombre

    # Dry run
    if args.dry_run:
        print(f"DRY RUN — Se crearía la base de datos '{nombre}' con:")
        print(f"  1. CREATE DATABASE {nombre}")
        print(f"  2. Configurar FDW (postgres_fdw + servidor_central)")
        print(f"  3. Copiar esquema desde '{CENTRAL_DB}'")
        print(f"  4. Alembic stamp head")
        print(f"  5. Insertar datos semilla (init_office)")
        if not args.no_register:
            print(f"  6. Registrar en conexion_database")
        return 0

    # Drop first si se pide
    if args.drop_first:
        print(f"Eliminando base de datos '{nombre}' si existe...")
        eliminar_database(nombre)

    print(f"\n{'=' * 60}")
    print(f"  Creando base de datos tenant: {nombre}")
    print(f"{'=' * 60}\n")

    try:
        # 1. Crear BD
        is_new = crear_database(nombre)

        # 2. Configurar FDW
        configurar_fdw(nombre)

        # 3. Copiar esquema
        copiar_esquema(nombre)

        # 4. Alembic stamp
        alembic_stamp(nombre)

        # 5. Datos semilla
        init_office_seed(nombre)

        # 6. Registrar en conexion_database
        if not args.no_register:
            registrar_en_conexion_database(nombre)

        print(f"\n{'=' * 60}")
        print(f"  ✅ Base de datos '{nombre}' creada exitosamente")
        print(f"{'=' * 60}")
        print(f"\nDatos semilla insertados:")
        print(f"  • Dependencia matriz (Caguayo S.A)")
        print(f"  • Usuario admin (alias: admin)")
        print(f"  • Cliente Caguayo SA")
        print(f"  • Convenio + Anexo base recepción")
        print(f"\nPróximos pasos:")
        print(f"  1. Registre la dependencia desde la interfaz de administración")
        print(f"  2. Seleccione la BD '{nombre}' en el campo 'Base de Datos'")
        print(f"  3. La tabla 'log' se verificará automáticamente al conectar")
        print()
        return 0

    except Exception as e:
        print(f"\n❌ Error creando la base de datos '{nombre}': {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
