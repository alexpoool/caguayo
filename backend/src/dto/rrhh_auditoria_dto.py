"""DTOs del submódulo RRHH — Auditoría (Fase 9).

La auditoría es la lectura del log de la aplicación (tabla `log`). Quién
escribe ahí: el frontend (cada llamada a la API vía `POST /api/v1/logs`,
tipo `REQUEST`), los servicios del módulo (alta/corrección de
solicitudes, generación de nómina) y `AppLogger` (acciones y errores).
Ojo: el `LoggingMiddleware` está DESHABILITADO en `main.py`. El
submódulo solo EXPONE esos registros con filtros; no escribe en la
tabla.

Niveles de la BD: `INFO`, `WARNING`, `ERROR`.
Tipos de la BD: `REQUEST`, `SOLICITUD`, `ACTION`, `NOMINA`, `FRONTEND`.
"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

__all__ = ["RrhhAuditoriaFila"]


class RrhhAuditoriaFila(SQLModel):
    """Una entrada del log de auditoría, con todos sus campos.

    `endpoint`/`method`/`status_code` existen en el esquema pero el
    escritor por defecto (el frontend vía `POST /api/v1/logs`) codifica
    esa información dentro de `mensaje` (p. ej. `"GET
    /rrhh/nomina/costo - 200"`) y no rellena estas columnas, así que
    casi siempre son `None`; se exponen igual por si algún flujo las
    rellena.
    """

    id: int
    timestamp: datetime
    nivel: str = Field(max_length=20)
    tipo: str = Field(max_length=20)
    mensaje: str = Field(max_length=500)
    detalle: Optional[str] = Field(default=None, max_length=2000)
    ip: Optional[str] = Field(default=None, max_length=50)
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = Field(default=None, max_length=100)
    endpoint: Optional[str] = Field(default=None, max_length=200)
    method: Optional[str] = Field(default=None, max_length=10)
    status_code: Optional[int] = None
    navegador: Optional[str] = Field(default=None, max_length=100)
