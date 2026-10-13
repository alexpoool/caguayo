"""Asistencia diaria de los empleados (script v3, sección 6)."""

from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


class RrhhAsistencia(SQLModel, table=True):
    __tablename__ = "asistencia"
    __table_args__ = (
        CheckConstraint(
            "hora_entrada IS NULL OR hora_salida IS NULL OR hora_salida > hora_entrada",
            name="chk_asistencia_horas",
        ),
        CheckConstraint(
            "estado NOT IN ('presente','tardanza') OR hora_entrada IS NOT NULL",
            name="chk_asistencia_presente_con_horas",
        ),
        CheckConstraint(
            "estado IN ('presente','ausente','tardanza','permiso','vacaciones','feriado','incapacidad')",
            name="chk_asistencia_estado",
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_asistencia_empleado"),
            nullable=False,
        )
    )
    fecha: date
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    estado: str = Field(default="ausente", max_length=20)
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
