"""Sincroniza el esquema de una base de datos existente a partir de un archivo SQL.

Compara una base de datos de destino con el esquema definido en ``init.sql``
(o ``new.sql``) y aplica **solo lo que falta** (vistas, tablas y columnas),
sin borrar ni modificar los datos existentes.

Uso:

    uv run python -m scripts.sync_schema <nombre_bd> [--sql init.sql] [--seeds] [--no-stamp]

Ejemplos:

    # Actualizar el esquema de una BD existente y adoptarla con alembic
    uv run python -m scripts.sync_schema galeria_conga

    # Ademas ejecutar los seeds (solo si las tablas estan vacias)
    uv run python -m scripts.sync_schema dependencia --seeds

    # Sincronizar un tenant desde new.sql sin tocar alembic
    uv run python -m scripts.sync_schema fundacion2 --sql new.sql --no-stamp
"""

from __future__ import annotations

import argparse
import os
import re
import sys

import psycopg2

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from src.services.database_service import DatabaseService  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ALEMBIC_CFG_PATH = os.path.join(HERE, "..", "alembic.ini")

VIEW_RE = re.compile(r"^\s*CREATE\s+OR\s+REPLACE\s+VIEW\s+(\w+)", re.I)
CREATE_TABLE_RE = re.compile(
    r"^\s*CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z_]+)", re.I
)
INSERT_RE = re.compile(r"^\s*INSERT\s+INTO\s+([a-z_]+)", re.I)
TABLE_CONSTRAINT_RE = re.compile(
    r"^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CONSTRAINT|CHECK)(\s|\()", re.I
)
BASE_TYPE_RE = re.compile(
    r"^([A-Z][A-Z0-9_]*\s*(?:\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)", re.I
)


# --------------------------------------------------------------------------- #
# Helpers de conexion y parser
# --------------------------------------------------------------------------- #
def _connect(db_name: str):
    return psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        dbname=db_name,
        client_encoding="utf8",
    )


def _read_statements(sql_path: str) -> list[str]:
    with open(sql_path, "r", encoding="utf-8") as f:
        return DatabaseService._split_sql_statements(f.read())


def _split_top_level(text: str, sep: str = ",") -> list[str]:
    """Divide ``text`` respetando parentesis y cadenas simples."""
    parts: list[str] = []
    depth = 0
    in_str = False
    current: list[str] = []
    for ch in text:
        if in_str:
            current.append(ch)
            if ch == "'":
                in_str = False
        elif ch == "'":
            in_str = True
            current.append(ch)
        elif ch in "([":
            depth += 1
            current.append(ch)
        elif ch in ")]":
            depth -= 1
            current.append(ch)
        elif ch == sep and depth == 0:
            tail = "".join(current).strip()
            if tail:
                parts.append(tail)
            current = []
        else:
            current.append(ch)
    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def _extract_table_body(statement: str) -> str:
    """Texto entre los parentesis externos equilibrados de un CREATE TABLE."""
    start = statement.find("(")
    if start == -1:
        return ""
    depth = 0
    for i in range(start, len(statement)):
        if statement[i] == "(":
            depth += 1
        elif statement[i] == ")":
            depth -= 1
            if depth == 0:
                return statement[start + 1 : i]
    return statement[start + 1 :]


def _parse_create_table(statement: str) -> tuple[str, list[tuple[str, str]]]:
    name = CREATE_TABLE_RE.match(statement).group(1)
    columns: list[tuple[str, str]] = []
    for line in _split_top_level(_extract_table_body(statement)):
        if not line or line.startswith("--"):
            continue
        if TABLE_CONSTRAINT_RE.match(line):
            continue
        m = re.match(r"^([a-z_]+)\s+(.+)$", line, re.S)
        if m:
            columns.append((m.group(1), m.group(2).strip()))
    return name, columns


# --------------------------------------------------------------------------- #
# Inspeccion de la base de datos
# --------------------------------------------------------------------------- #
def _existing_tables(conn) -> set[str]:
    cur = conn.cursor()
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    tabs = {row[0] for row in cur.fetchall()}
    cur.close()
    return tabs


def _table_columns(conn, table: str) -> set[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=%s",
        (table,),
    )
    cols = {row[0] for row in cur.fetchall()}
    cur.close()
    return cols


def _table_count(conn, table: str) -> int:
    cur = conn.cursor()
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    n = cur.fetchone()[0]
    cur.close()
    return n


def _stamp_alembic(db_name: str) -> None:
    from alembic import command
    from alembic.config import Config

    user = os.getenv("ADMIN_DB_USER", "postgres")
    password = os.getenv("ADMIN_DB_PASSWORD", "")
    host = os.getenv("ADMIN_DB_HOST", "localhost")
    port = os.getenv("ADMIN_DB_PORT", "5432")
    db_url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db_name}"
    cfg = Config(os.path.abspath(ALEMBIC_CFG_PATH))
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.stamp(cfg, "head")


def _report(db_name, sql_file, tables_created, columns_added, columns_failed,
            seeds_inserted, seeds_skipped, errors, stamp_status) -> None:
    print("=" * 60)
    print(f"==> Sincronizando esquema de '{db_name}' contra '{sql_file}'")
    print("=" * 60)
    print(f"Tablas creadas: {', '.join(tables_created) if tables_created else 'ninguna'}")
    for tabla, col, modo in columns_added:
        print(f"  {tabla} -> {col} (columna {modo})")
    if columns_added:
        print("Columnas añadidas:")
    for tabla, col, reason in columns_failed:
        print(f"  [FAIL] {tabla}.{col}: {reason}")
    if seeds_inserted:
        print(f"Seeds insertados: {', '.join(seeds_inserted)}")
    if seeds_skipped:
        print(f"Seeds saltados (tablas con datos): {', '.join(seeds_skipped)}")
    for err in errors:
        print(f"  [ERROR] {err}")
    print(f"Alembic: {stamp_status}")
    print("Done.")


def run(db_name: str, sql_file: str, do_seeds: bool, do_stamp: bool) -> int:
    sql_path = os.path.join(os.path.dirname(HERE), "sql", sql_file)
    if not os.path.exists(sql_path):
        print(f"[ERROR] No existe el archivo SQL: {sql_path}")
        return 2

    statements = _read_statements(sql_path)

    views: list[str] = []
    creates: list[tuple[str, str, list[tuple[str, str]]]] = []
    inserts: list[tuple[str, str]] = []

    for stmt in statements:
        if VIEW_RE.match(stmt):
            views.append(stmt)
        elif CREATE_TABLE_RE.match(stmt):
            name, columns = _parse_create_table(stmt)
            creates.append((name, stmt, columns))
        elif INSERT_RE.match(stmt):
            inserts.append((INSERT_RE.match(stmt).group(1), stmt))

    tables_created: list[str] = []
    columns_added: list[tuple[str, str, str]] = []
    columns_failed: list[tuple[str, str, str]] = []
    seeds_inserted: list[str] = []
    seeds_skipped: list[str] = []
    errors: list[str] = []

    conn = _connect(db_name)
    conn.autocommit = True
    cur = conn.cursor()
    existing = _existing_tables(conn)

    for stmt in views:
        try:
            cur.execute(stmt)
        except psycopg2.Error as e:
            errors.append(f"vista: {e}")

    for name, stmt, columns in creates:
        if name not in existing:
            try:
                cur.execute(stmt)
                tables_created.append(name)
            except psycopg2.Error as e:
                errors.append(f"tabla {name}: {e}")
            continue

        current_cols = _table_columns(conn, name)
        for col, tail in columns:
            if col in current_cols:
                continue
            try:
                cur.execute(
                    f'ALTER TABLE "{name}" ADD COLUMN IF NOT EXISTS "{col}" {tail}'
                )
                columns_added.append((name, col, "exacta"))
            except psycopg2.Error as first_err:
                alt = re.sub(r"\s+NOT\s+NULL\b", " ", tail, flags=re.I)
                try:
                    cur.execute(
                        f'ALTER TABLE "{name}" ADD COLUMN IF NOT EXISTS "{col}" {alt}'
                    )
                    columns_added.append((name, col, "nullable"))
                except psycopg2.Error:
                    m = BASE_TYPE_RE.match(tail.strip())
                    if m:
                        try:
                            cur.execute(
                                f'ALTER TABLE "{name}" ADD COLUMN IF NOT EXISTS "{col}" {m.group(1)}'
                            )
                            columns_added.append((name, col, "tipo-base"))
                        except psycopg2.Error as e:
                            columns_failed.append((name, col, str(e)))
                    else:
                        columns_failed.append((name, col, str(first_err)))

    if do_seeds:
        for table, stmt in inserts:
            try:
                if _table_count(conn, table) == 0:
                    cur.execute(stmt)
                    seeds_inserted.append(table)
                else:
                    seeds_skipped.append(table)
            except psycopg2.Error as e:
                errors.append(f"seed {table}: {e}")

    cur.close()
    conn.close()

    stamp_status = "no (--no-stamp)"
    if do_stamp:
        try:
            _stamp_alembic(db_name)
            stamp_status = "stamped a head"
        except Exception as e:
            stamp_status = f"ERROR: {e}"

    _report(db_name, sql_file, tables_created, columns_added, columns_failed,
            seeds_inserted, seeds_skipped, errors, stamp_status)
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="sync_schema",
        description="Sincroniza el esquema de una BD existente con un archivo SQL.",
    )
    parser.add_argument("db_name", help="Nombre de la base de datos a sincronizar")
    parser.add_argument(
        "--sql", default="init.sql", help="Archivo SQL base (init.sql | new.sql)"
    )
    parser.add_argument(
        "--seeds", action="store_true", help="Insertar seeds solo en tablas vacias"
    )
    parser.add_argument(
        "--no-stamp", action="store_true", help="No ejecutar alembic stamp head"
    )
    args = parser.parse_args(argv)
    return run(args.db_name, args.sql, args.seeds, not args.no_stamp)


if __name__ == "__main__":
    raise SystemExit(main())