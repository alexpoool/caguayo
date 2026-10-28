"""Solicitudes de vacaciones y permisos (script v3, sección 8).

Sin colisión con `solicitud_servicio` (módulo Proyecto).
"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


class RrhhSolicitud(SQLModel, table=True):
    __tablename__ = "solicitudes"
    __table_args__ = (
        CheckConstraint("fecha_fin >= fecha_inicio", name="chk_solicitud_fechas"),
        CheckConstraint("tipo IN ('vacaciones','permiso')", name="chk_solicitud_tipo"),
        CheckConstraint(
            "estado IN ('pendiente','aprobada','rechazada','cancelada')",
            name="chk_solicitud_estado",
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_solicitudes_empleado"),
            nullable=False,
        )
    )
    tipo: str = Field(max_length=20)
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = None
    estado: str = Field(default="pendiente", max_length=20)
    aprobado_por: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="SET NULL", name="fk_solicitudes_aprobador"
            ),
        ),
    )
    fecha_aprobacion: Optional[datetime] = None
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
