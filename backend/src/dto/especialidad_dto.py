from sqlmodel import SQLModel
from typing import Optional


class EspecialidadBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = True


class EspecialidadCreate(EspecialidadBase):
    """Alta desde Configuración."""


class EspecialidadUpdate(SQLModel):
    """Edición parcial: se sólo lo que se envía."""

    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = None


class EspecialidadRead(EspecialidadBase):
    id_especialidad: Optional[int] = None
    """Artistas que tienen esta especialidad.

    Se incluye para que desactivar una especialidad no sea una sorpresa: desde
    Configuración se ve cuántos artistas quedan enlazados a ella.
    """

    artistas: int = 0