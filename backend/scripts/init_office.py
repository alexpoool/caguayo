"""Inicializa una base de datos de tenant con datos de oficina principal.

Ejecuta después de 'alembic upgrade head' para insertar:
- Dependencia matriz (oficina principal)
- Usuario superadministrador
- Cliente Caguayo SA (proveedor interno)
- Convenio base recepción
- Anexo base recepción

Uso:
    uv run python -m scripts.init_office <db_name> [--admin-password <hash>]
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

ADMIN_DEFAULT_PASSWORD_HASH = os.getenv(
    "ADMIN_DEFAULT_PASSWORD_HASH",
    "$2b$12$UXqjLZwpFj20eC7HOaD0c.OKVFhFNUl4bleMtIr9.c8Bi2pRu9GLC",
)


def _connect(db_name: str):
    return psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        dbname=db_name,
        client_encoding="utf8",
    )


def _table_count(conn, table: str) -> int:
    cur = conn.cursor()
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    n = cur.fetchone()[0]
    cur.close()
    return n


def init_office(db_name: str, admin_password_hash: str | None = None) -> list[str]:
    """Inserta datos de oficina principal si las tablas están vacías."""
    password_hash = admin_password_hash or ADMIN_DEFAULT_PASSWORD_HASH
    errors: list[str] = []
    inserted: list[str] = []

    conn = _connect(db_name)
    conn.autocommit = True
    cur = conn.cursor()
    try:

        # 1. Dependencia matriz (solo si tabla vacía)
        if _table_count(conn, "dependencia") == 0:
            try:
                cur.execute("""
                    INSERT INTO dependencia (
                        id_tipo_dependencia, nombre, denominacion, direccion,
                        telefono, email, web, id_provincia, id_municipio,
                        base_datos, descripcion
                    ) VALUES (
                        (SELECT id_tipo_dependencia FROM tipo_dependencia WHERE nombre = 'SUCURSAL'),
                        'Caguayo S.A', 'SA', 'Vista Alegre',
                        '+53 7 1234567', 'info@caguayo.cu', 'https://caguayo.cu',
                        (SELECT id_provincia FROM provincia WHERE nombre = 'Santiago de Cuba'),
                        (SELECT id_municipio FROM municipio WHERE nombre = 'Santiago de Cuba' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'Santiago de Cuba')),
                        %s,
                        'Oficina principal de Caguayo'
                    )
                """, (db_name,))
                inserted.append("dependencia")
            except Exception as e:
                errors.append(f"dependencia: {e}")

        # 2. Usuario superadministrador (solo si tabla vacía)
        if _table_count(conn, "usuarios") == 0:
            try:
                cur.execute("""
                    INSERT INTO usuarios (
                        ci, nombre, primer_apellido, segundo_apellido,
                        alias, contrasenia, contrasenia_plana, id_grupo, id_dependencia, cargo
                    ) VALUES (
                        '00000000000', 'Administrador', 'Principal', 'Sistema',
                        'admin', %s, 'admin123',
                        (SELECT id_grupo FROM grupo WHERE nombre = 'ADMINISTRADOR'),
                        (SELECT id_dependencia FROM dependencia WHERE nombre = 'Caguayo S.A' LIMIT 1),
                        'Superadministrador'
                    )
                """, (password_hash,))
                inserted.append("usuarios")
            except Exception as e:
                errors.append(f"usuarios: {e}")

        # 3. Cliente Caguayo SA (proveedor interno)
        if _table_count(conn, "clientes") == 0:
            try:
                cur.execute("""
                    INSERT INTO clientes (
                        nombre, tipo_persona, nit, codigo, direccion,
                        tipo_relacion, estado, fecha_registro
                    ) VALUES (
                        'Caguayo S.A', 'JURIDICA', 'NIT-CAGUAYO-001',
                        'CAGUAYO', 'Vista Alegre', 'CLIENTE', 'ACTIVO', CURRENT_DATE
                    )
                """)
                inserted.append("clientes")
            except Exception as e:
                errors.append(f"clientes: {e}")

        # 4. Convenio base recepción
        if _table_count(conn, "convenio") == 0:
            try:
                cur.execute("""
                    INSERT INTO convenio (
                        id_cliente, nombre_convenio, fecha, vigencia,
                        id_tipo_convenio, codigo
                    ) VALUES (
                        (SELECT id_cliente FROM clientes WHERE codigo = 'CAGUAYO'),
                        'Convenio Base Recepción',
                        CURRENT_DATE,
                        '2099-12-31',
                        (SELECT id_tipo_convenio FROM tipo_convenio WHERE nombre = 'COMPRA VENTA'),
                        'BASE-REC'
                    )
                """)
                inserted.append("convenio")
            except Exception as e:
                errors.append(f"convenio: {e}")

        # 5. Anexo base recepción
        if _table_count(conn, "anexo") == 0:
            try:
                cur.execute("""
                    INSERT INTO anexo (
                        id_convenio, nombre_anexo, fecha, codigo_anexo,
                        id_dependencia, comision
                    ) VALUES (
                        (SELECT id_convenio FROM convenio WHERE codigo = 'BASE-REC'),
                        'Anexo Base Recepción',
                        CURRENT_DATE,
                        'ANEXO-BASE-REC',
                        (SELECT id_dependencia FROM dependencia WHERE nombre = 'Caguayo S.A' LIMIT 1),
                        0
                    )
                """)
                inserted.append("anexo")
            except Exception as e:
                errors.append(f"anexo: {e}")

        cur.close()
    finally:
        conn.close()

    return inserted, errors


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="init_office",
        description="Inicializa datos de oficina principal en una base de datos.",
    )
    parser.add_argument("db_name", help="Nombre de la base de datos a inicializar")
    parser.add_argument(
        "--admin-password",
        help="Hash de bcrypt de la contraseña del admin (default: variable de entorno)",
    )
    args = parser.parse_args(argv)

    inserted, errors = init_office(args.db_name, args.admin_password)

    print("=" * 60)
    print(f"==> Inicializando oficina en '{args.db_name}'")
    print("=" * 60)
    if inserted:
        print(f"Datos insertados: {', '.join(inserted)}")
    else:
        print("No se insertaron datos (tablas ya tenían datos)")
    for err in errors:
        print(f"  [ERROR] {err}")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
