import os
import re
import logging
import psycopg2
import contextlib
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def _validar_nombre_tabla(nombre: str) -> str:
    """Valida que el nombre de tabla/columna sea seguro (sin SQL injection)."""
    if not nombre:
        raise ValueError("El nombre de tabla/columna no puede estar vacío")
    if not re.match(r'^[a-zA-Z0-9_]+$', nombre):
        raise ValueError(f"Nombre inválido: '{nombre}'. Solo se permiten letras, números y guiones bajos")
    return nombre


@contextlib.contextmanager
def get_db_connection(database: str, host: str = None, port: int = None,
                      user: str = None, password: str = None):
    """Context manager para conexiones psycopg2 que garantiza el cierre."""
    conn = psycopg2.connect(
        host=host or os.getenv("ADMIN_DB_HOST", "localhost"),
        port=port or int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=user or os.getenv("ADMIN_DB_USER", "postgres"),
        password=password or os.getenv("ADMIN_DB_PASSWORD"),
        database=database,
    )
    try:
        yield conn
    finally:
        conn.close()


class ReplicacionService:
    CENTRAL_DB = os.environ["CENTRAL_DATABASE"]

    @staticmethod
    def get_sucursales() -> List[Dict[str, Any]]:
        try:
            with get_db_connection(ReplicacionService.CENTRAL_DB) as conn:
                cur = conn.cursor()

                cur.execute("""
                    SELECT nombre_database, host, puerto, usuario, contrasenia
                    FROM conexion_database
                    ORDER BY nombre_database
                """)
                rows = cur.fetchall()

                if rows:
                    cur.close()
                    return [
                        {
                            "nombre_database": row[0],
                            "host": row[1],
                            "puerto": row[2],
                            "usuario": row[3],
                            "contrasenia": row[4],
                        }
                        for row in rows
                    ]

                central = ReplicacionService.CENTRAL_DB
                cur.execute("""
                    SELECT datname 
                    FROM pg_database 
                    WHERE datistemplate = false 
                    AND datname != %s
                    AND datname != 'postgres'
                    AND datname NOT LIKE 'template%'
                    ORDER BY datname
                """, (central,))
                rows = cur.fetchall()
                cur.close()

                return [
                    {
                        "nombre_database": row[0],
                        "host": "localhost",
                        "puerto": 5432,
                        "usuario": "postgres",
                        "contrasenia": os.getenv("ADMIN_DB_PASSWORD"),
                    }
                    for row in rows
                ]
        except Exception as e:
            logger.error("Error getting sucursales: %s", e)
            return []

    @staticmethod
    def get_conexion_sucursal(
        nombre_database: str,
        host: str = None,
        puerto: int = None,
        usuario: str = None,
        contrasenia: str = None,
    ) -> Optional[psycopg2.extensions.connection]:
        """L6 FIX: Ahora recibe credenciales de la sucursal en lugar de ignorarlas."""
        try:
            conn = psycopg2.connect(
                host=host or os.getenv("ADMIN_DB_HOST", "localhost"),
                port=puerto or int(os.getenv("ADMIN_DB_PORT", 5432)),
                user=usuario or os.getenv("ADMIN_DB_USER", "postgres"),
                password=contrasenia or os.getenv("ADMIN_DB_PASSWORD"),
                database=nombre_database,
            )
            return conn
        except Exception as e:
            logger.error("Error connecting to %s: %s", nombre_database, e)
            return None

    @staticmethod
    def replicar_tabla(
        tabla: str,
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        # V2 FIX: Validar nombre de tabla
        _validar_nombre_tabla(tabla)

        # V2 FIX: Validar nombres de columnas
        for key in list(datos.keys()) + list((condicion or {}).keys()):
            _validar_nombre_tabla(key)

        sucursales = ReplicacionService.get_sucursales()

        for sucursal in sucursales:
            if sucursal["nombre_database"] == ReplicacionService.CENTRAL_DB:
                continue

            # L6 FIX: Usar credenciales de la sucursal
            conn = ReplicacionService.get_conexion_sucursal(
                sucursal["nombre_database"],
                host=sucursal.get("host"),
                puerto=sucursal.get("puerto"),
                usuario=sucursal.get("usuario"),
                contrasenia=sucursal.get("contrasenia"),
            )
            if not conn:
                continue

            cur = conn.cursor()
            try:
                if operacion == "INSERT":
                    columns = ", ".join(datos.keys())
                    placeholders = ", ".join(["%s"] * len(datos))
                    values = list(datos.values())
                    cur.execute(
                        f"INSERT INTO {tabla} ({columns}) VALUES ({placeholders})",
                        values,
                    )
                elif operacion == "UPDATE":
                    set_clause = ", ".join([f"{k} = %s" for k in datos.keys()])
                    values = list(datos.values())
                    if condicion:
                        where_clause = " AND ".join(
                            [f"{k} = %s" for k in condicion.keys()]
                        )
                        values += list(condicion.values())
                        cur.execute(
                            f"UPDATE {tabla} SET {set_clause} WHERE {where_clause}",
                            values,
                        )
                    else:
                        cur.execute(f"UPDATE {tabla} SET {set_clause}", values)
                elif operacion == "DELETE":
                    if condicion:
                        where_clause = " AND ".join(
                            [f"{k} = %s" for k in condicion.keys()]
                        )
                        values = list(condicion.values())
                        cur.execute(f"DELETE FROM {tabla} WHERE {where_clause}", values)

                conn.commit()
                logger.info(
                    "[REPLICACION] %s on %s.%s",
                    operacion, sucursal["nombre_database"], tabla
                )
            except Exception as e:
                conn.rollback()
                logger.error(
                    "[REPLICACION] Error on %s.%s: %s",
                    sucursal["nombre_database"], tabla, e
                )
            finally:
                cur.close()
                conn.close()

    @staticmethod
    def replicar_moneda(
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        ReplicacionService.replicar_tabla("moneda", datos, operacion, condicion)

    @staticmethod
    def replicar_tipo_dependencia(
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        ReplicacionService.replicar_tabla(
            "tipo_dependencia", datos, operacion, condicion
        )

    @staticmethod
    def replicar_dependencia(
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        ReplicacionService.replicar_tabla("dependencia", datos, operacion, condicion)

    @staticmethod
    def replicar_cuenta_dependencia(
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        ReplicacionService.replicar_tabla(
            "cuenta_dependencias", datos, operacion, condicion
        )
