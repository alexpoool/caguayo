"""Branding: datos de la empresa responsable de esta instalación.

Público (sin autenticación): el Login necesita saber el nombre del
cliente antes de autenticarse. Sólo expone texto config de Settings,
nunca secretos.
"""
from fastapi import APIRouter

from src.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/branding")
def obtener_branding():
    """Marca del cliente de esta instalación (default "ERP")."""
    return {
        "empresa": {
            "nombre": settings.EMPRESA_NOMBRE,
            "razon_social": settings.EMPRESA_RAZON_SOCIAL,
        }
    }
