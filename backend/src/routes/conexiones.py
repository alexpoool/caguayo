import os
import logging
from dotenv import load_dotenv
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_auth_session
from src.models import ConexionDatabase
from fastapi import Depends

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conexiones", tags=["conexiones"])


class ConexionResponse(BaseModel):
    id_conexion: int | None = None
    nombre_database: str
    host: str = "localhost"
    puerto: int = 5432
    usuario: str | None = None
    contrasenia: str | None = None


class ConexionTestRequest(BaseModel):
    nombre_database: str
    host: str = "localhost"
    puerto: int = 5432


@router.get("", response_model=List[ConexionResponse])
async def get_conexiones():
    """Lista bases de datos sin modificar su estructura ni sus datos."""

    try:
        conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD"),
            database="postgres",
            client_encoding="utf8",
        )
        cur = conn.cursor()
        cur.execute(
            "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres' ORDER BY datname"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        return [
            ConexionResponse(
                nombre_database=row[0],
            )
            for row in rows
        ]
    except Exception as e:
        logger.error("Error al obtener conexiones de PostgreSQL: %s", e, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="No se pudieron obtener las bases de datos. Verifique la conexión al servidor PostgreSQL.",
        )


@router.post("/test")
async def test_conexion(data: ConexionTestRequest, db: AsyncSession = Depends(get_auth_session)):
    """Comprueba conexión y esquema mínimo sin modificar la base de datos."""
    conn = None
    cur = None
    try:
        try:
            result = await db.exec(select(ConexionDatabase).where(ConexionDatabase.nombre_database == data.nombre_database))
            saved = result.first()
        except SQLAlchemyError:
            await db.rollback()
            saved = None
        host = (saved.host if saved else None) or os.getenv("ADMIN_DB_HOST", "localhost")
        port = saved.puerto if saved else int(os.getenv("ADMIN_DB_PORT", 5432))
        user = (saved.usuario if saved else None) or os.getenv("ADMIN_DB_USER", "postgres")
        password = (saved.contrasenia if saved else None) or os.getenv("ADMIN_DB_PASSWORD")
        conn = psycopg2.connect(host=host, port=port, user=user, password=password, database=data.nombre_database, connect_timeout=5, client_encoding="utf8")
        cur = conn.cursor()
        required = {
            "usuarios": {"id_usuario", "alias", "contrasenia", "nombre", "primer_apellido", "ci", "cargo", "id_grupo", "id_dependencia"},
            "dependencia": {"id_dependencia", "nombre", "base_datos", "host", "puerto", "id_provincia", "id_municipio"},
            "provincia": {"id_provincia", "nombre"},
            "municipio": {"id_municipio", "id_provincia", "nombre"},
            "grupo": {"id_grupo", "nombre"},
            "grupo_funcionalidad": {"id_grupo", "id_funcionalidad"},
            "funcionalidad": {"id_funcionalidad", "nombre"},
            "sesion": {"id_sesion", "id_usuario", "token", "base_datos", "fecha_expiracion"},
        }
        cur.execute("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ANY(%s)", (list(required.keys()),))
        actual = {}
        for table_name, column_name in cur.fetchall():
            actual.setdefault(table_name, set()).add(column_name)
        missing = [name for name, columns in required.items() if columns - actual.get(name, set())]
        if missing:
            logger.info("Database %s rejected because its ITEMLI schema is incomplete", data.nombre_database)
            return {"success": False, "message": "La base de datos no tiene la estructura requerida por ITEMLI Reports."}
        return {"success": True, "message": "Conexión y estructura compatibles"}
    except Exception as exc:
        logger.warning("Database compatibility check failed for %s: %s", data.nombre_database, type(exc).__name__)
        return {"success": False, "message": "No se pudo conectar o validar esta base de datos. Puedes seleccionar otra."}
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()
