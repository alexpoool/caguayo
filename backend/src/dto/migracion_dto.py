# -*- coding: utf-8 -*-
"""DTOs de la migración del legacy."""
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class IdentidadBase(BaseModel):
    base_etl: str
    base_app: str
    coherente: bool
    detalle: List[str] = []


class EstadoMigracion(BaseModel):
    recuentos: Dict[str, int] = {}
    errores_migracion: int = 0
    revision: Optional[str] = None
    identidad: IdentidadBase
    operacion_en_curso: bool = False
    # `dump_disponible` sustituye a los ficheros que se subían antes: ahora el
    # legacy viene en el repositorio y lo único que hay que poder responder es si
    # está en su sitio.
    dump_disponible: bool = True
    dump_ruta: Optional[str] = None


class FaseInforme(BaseModel):
    letra: str
    titulo: str
    a_insertar: int = 0
    detalle: List[str] = []


class InformeMigracion(BaseModel):
    ok: bool
    commit: bool
    codigo: int
    total_a_insertar: int = 0
    resultado: Optional[str] = None
    fases: List[FaseInforme] = []
    log: List[str] = []
