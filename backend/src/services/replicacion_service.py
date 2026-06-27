import os
import psycopg2
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class ReplicacionService:
    CENTRAL_DB = "caguayosa"

    @staticmethod
    def get_sucursales() -> List[Dict[str, Any]]:
        try:
            conn = psycopg2.connect(
                host=os.getenv("ADMIN_DB_HOST", "localhost"),
                port=int(os.getenv("ADMIN_DB_PORT", 5432)),
                user=os.getenv("ADMIN_DB_USER", "postgres"),
                password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
                database="caguayosa",
            )
            cur = conn.cursor()

            cur.execute("""
                SELECT nombre_database, host, puerto, usuario, contrasenia
                FROM conexion_database
                ORDER BY nombre_database
            """)
            rows = cur.fetchall()

            if rows:
                cur.close()
                conn.close()
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

            cur.execute("""
                SELECT datname 
                FROM pg_database 
                WHERE datistemplate = false 
                AND datname != 'caguayosa'
                AND datname != 'postgres'
                AND datname NOT LIKE 'template%'
                ORDER BY datname
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()

            return [
                {
                    "nombre_database": row[0],
                    "host": "localhost",
                    "puerto": 5432,
                    "usuario": "postgres",
                    "contrasenia": os.getenv("ADMIN_DB_PASSWORD", "postgres"),
                }
                for row in rows
            ]
        except Exception as e:
            print(f"[REPLICACION] Error getting sucursales: {e}")
            return []

    @staticmethod
    def get_conexion_sucursal(
        nombre_database: str,
    ) -> Optional[psycopg2.extensions.connection]:
        try:
            conn = psycopg2.connect(
                host=os.getenv("ADMIN_DB_HOST", "localhost"),
                port=int(os.getenv("ADMIN_DB_PORT", 5432)),
                user=os.getenv("ADMIN_DB_USER", "postgres"),
                password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
                database=nombre_database,
            )
            return conn
        except Exception as e:
            print(f"[REPLICACION] Error connecting to {nombre_database}: {e}")
            return None

    @staticmethod
    def replicar_tabla(
        tabla: str,
        datos: Dict[str, Any],
        operacion: str = "INSERT",
        condicion: Optional[Dict[str, Any]] = None,
    ) -> None:
        sucursales = ReplicacionService.get_sucursales()

        for sucursal in sucursales:
            if sucursal["nombre_database"] == ReplicacionService.CENTRAL_DB:
                continue

            conn = ReplicacionService.get_conexion_sucursal(sucursal["nombre_database"])
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
                print(
                    f"[REPLICACION] {operacion} on {sucursal['nombre_database']}.{tabla}"
                )
            except Exception as e:
                conn.rollback()
                print(
                    f"[REPLICACION] Error on {sucursal['nombre_database']}.{tabla}: {e}"
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
