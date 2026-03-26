import os
import psycopg2
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

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
    """Obtiene todas las bases de datos de PostgreSQL usando usuario lector"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("LECTOR_HOST", "localhost"),
            port=int(os.getenv("LECTOR_PORT", 5432)),
            user=os.getenv("LECTOR_USER", "usuariolector"),
            password=os.getenv("LECTOR_PASSWORD", "usuariolector123"),
            database="postgres",
            client_encoding="utf8",
        )
        cur = conn.cursor()
        cur.execute(
            "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template0', 'template1')"
        )
        databases = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()

        return [ConexionResponse(nombre_database=db) for db in databases]
    except Exception as e:
        print(f"Error getting databases: {e}")
        return []


@router.post("/test")
async def test_conexion(data: ConexionTestRequest):
    """Prueba la conexión a una base de datos específica"""
    try:
        conn = psycopg2.connect(
            host=data.host,
            port=data.puerto,
            user=os.getenv("LECTOR_USER", "usuariolector"),
            password=os.getenv("LECTOR_PASSWORD", "usuariolector123"),
            database=data.nombre_database,
            client_encoding="utf8",
        )
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return {"success": True, "message": "Conexión exitosa"}
    except Exception as e:
        return {"success": False, "message": str(e)}


class DependenciaResponse(BaseModel):
    id_dependencia: int
    nombre: str


@router.get("/{db_name}/dependencias", response_model=List[DependenciaResponse])
async def get_dependencias_por_db(db_name: str):
    """Obtiene las dependencias de una base de datos específica"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "1234"),
            database=db_name,
            client_encoding="utf8",
        )
        cur = conn.cursor()
        cur.execute("SELECT id_dependencia, nombre FROM dependencia ORDER BY nombre")
        dependencias = [
            DependenciaResponse(id_dependencia=row[0], nombre=row[1])
            for row in cur.fetchall()
        ]
        cur.close()
        conn.close()
        return dependencias
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al obtener dependencias de {db_name}: {str(e)}",
        )
