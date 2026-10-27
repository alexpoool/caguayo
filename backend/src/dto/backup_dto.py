"""DTOs de la funcionalidad de backups/restauración de dependencias."""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class BackupInfo(BaseModel):
    """Un dump disponible en BACKUP_DIR para la base de datos de una dependencia."""
    archivo: str
    base_datos: str
    fecha: str                                    # isoformat local, del patrón del nombre o del mtime
    fecha_iso: str
    tamano_bytes: int
    checksum_ok: Optional[bool] = None            # None = no hay .sha256 con qué comparar
    cabecera_ok: Optional[bool] = None            # pg_restore -l (sólo si se pidió verificación detallada)
    detalle_error: Optional[str] = None


class BackupResumenStats(BaseModel):
    """Conteo de filas por tabla guardado junto al dump (.stats)."""
    fecha_stats: Optional[str] = None
    tablas: Dict[str, int] = Field(default_factory=dict)


class BaseDatoPrevia(BaseModel):
    """Copia de rollback generada por un restore anterior ({bd}_prev_*)."""
    nombre: str
    fecha: Optional[str] = None                   # parseada del sufijo _prev_YYYYMMDD_HHMMSS si existe


class BackupJobStep(BaseModel):
    paso: str
    estado: str                                   # pendiente | en_curso | ok | error | advertencia
    detalle: Optional[str] = None


class BackupJob(BaseModel):
    """Estado de un job en background (backup o restaurar)."""
    id: str
    tipo: str                                     # backup | restaurar
    base_datos: str
    archivo: Optional[str] = None
    estado: str                                   # pendiente | ejecutando | completado | fallido
    pasos: List[BackupJobStep] = Field(default_factory=list)
    resultado: Optional[dict] = None
    error: Optional[str] = None
    creado_iso: Optional[str] = None
    terminado_iso: Optional[str] = None


class BackupListado(BaseModel):
    """Respuesta de listar: dumps validos + copias _prev_ de rollback."""
    base_datos: str
    backups: List[BackupInfo] = Field(default_factory=list)
    bds_previas: List[BaseDatoPrevia] = Field(default_factory=list)


class BackupRestaurarRequest(BaseModel):
    archivo: str = Field(..., description="Nombre del .dump dentro de BACKUP_DIR")


class BackupJobIniciado(BaseModel):
    job_id: str
    tipo: str
    estado: str
