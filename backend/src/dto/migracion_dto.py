# -*- coding: utf-8 -*-
"""DTOs de la migración del legacy."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FicheroLegacyInfo(BaseModel):
    rol: str
    etiqueta: str
    descripcion: str
    subido: bool
    bytes: int = 0
    ruta: Optional[str] = None


class FicherosSubidos(BaseModel):
    ficheros: Dict[str, FicheroLegacyInfo] = {}


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
    ficheros: Dict[str, FicheroLegacyInfo] = {}


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
