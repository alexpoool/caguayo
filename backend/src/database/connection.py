import os
from typing import AsyncGenerator
from fastapi import Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "caguayo-secret-key-change-in-production")
ALGORITHM = "HS256"


# Base URL sin el nombre de la base de datos
def get_base_db_url() -> str:
    """Obtiene la URL base de la base de datos sin el nombre de la DB"""
    DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://postgres:1234@localhost:5432/caguayo"
    )

    # Convertir a asyncpg si es necesario
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    elif DATABASE_URL.startswith("postgresql+psycopg://"):
        DATABASE_URL = DATABASE_URL.replace(
            "postgresql+psycopg://", "postgresql+asyncpg://"
        )

    # de la base de datos para obtener la URL base
    if "/?" in DATABASE_URL:
        base_url = DATABASE_URL.split("/?")[0]
    else:
        parts = DATABASE_URL.rsplit("/", 1)
        base_url = parts[0] if len(parts) > 1 else DATABASE_URL

    return base_url


# Almacenar engines por nombre de base de datos
_engines: dict[str, AsyncEngine] = {}


def get_engine(base_datos: str) -> AsyncEngine:
    """Obtiene o crea un engine para la base de datos específica"""
    if base_datos not in _engines:
        base_url = get_base_db_url()
        db_url = f"{base_url}/{base_datos}"
        _engines[base_datos] = create_async_engine(
            db_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
        )
    return _engines[base_datos]


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Obtiene una sesión para la base de datos del token JWT"""
    # Extraer base_datos del token JWT
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        # Si no hay token, usar la base de datos por defecto
        base_datos = os.getenv("DEFAULT_DATABASE", "caguayo")
    else:
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            base_datos = payload.get(
                "base_datos", os.getenv("DEFAULT_DATABASE", "caguayo")
            )
        except JWTError:
            base_datos = os.getenv("DEFAULT_DATABASE", "caguayo")

    engine = get_engine(base_datos)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_auth_session() -> AsyncGenerator[AsyncSession, None]:
    """Obtiene una sesión para la base de datos de autenticación (donde están los usuarios)

    Esta función siempre se conecta a la base de datos principal/configuración,
    no a la base de datos seleccionada por el usuario.
    """
    auth_db = os.getenv("AUTH_DATABASE", "caguayo")
    engine = get_engine(auth_db)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
