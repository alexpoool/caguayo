"""Genera el esquema SQL (DDL) a partir de los modelos SQLModel actuales.

Uso:
    cd backend && uv run python scripts/generar_esquema_sql.py [ruta_salida]

Por defecto genera `backend/schema.sql`.
No requiere conexión a base de datos: compila la metadata de los modelos
con el dialecto de PostgreSQL (incluye enums, FKs, índices y constraints).
"""

import os
import sys
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_mock_engine  # noqa: E402

# Importar todos los modelos para registrarlos en la metadata
import src.models  # noqa: E402, F401
from src.models import SQLModel  # noqa: E402
from src.models.anexo_producto import AnexoProducto  # noqa: E402, F401 (no está en __init__)


def main() -> None:
    salida = (
        sys.argv[1]
        if len(sys.argv) > 1
        else os.path.join(BACKEND_DIR, "schema.sql")
    )

    statements: list[str] = []

    def dump(sql, *multiparams, **params):
        statement = str(sql.compile(dialect=engine.dialect)).strip()
        if statement:
            statements.append(statement)

    engine = create_mock_engine("postgresql://", dump)

    SQLModel.metadata.create_all(engine, checkfirst=False)

    header = (
        "-- ============================================================\n"
        "-- Esquema de la base de datos (PostgreSQL)\n"
        "-- Generado desde los modelos SQLModel del backend\n"
        f"-- Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        "-- Uso: psql -d <base_de_datos> -f schema.sql\n"
        "-- ============================================================\n\n"
    )

    body = ";\n\n".join(statements) + ";\n"

    os.makedirs(os.path.dirname(os.path.abspath(salida)), exist_ok=True)
    with open(salida, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("BEGIN;\n\n")
        f.write(body)
        f.write("\nCOMMIT;\n")

    tablas = len(SQLModel.metadata.tables)
    print(
        f"Esquema generado en {salida} "
        f"({len(statements)} sentencias, {tablas} tablas)"
    )


if __name__ == "__main__":
    main()
