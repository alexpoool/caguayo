from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class LogEntry(SQLModel, table=True):
    __tablename__ = "log"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"autoincrement": True}
    )
    timestamp: datetime = Field(default_factory=datetime.now)
    nivel: str = Field(max_length=20)
    tipo: str = Field(max_length=20)
    mensaje: str = Field(max_length=500)
    detalle: Optional[str] = Field(default=None, max_length=2000)
    ip: Optional[str] = Field(default=None, max_length=50)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuarios.id_usuario")
    endpoint: Optional[str] = Field(default=None, max_length=200)
    method: Optional[str] = Field(default=None, max_length=10)
    status_code: Optional[int] = Field(default=None)
    usuario_nombre: Optional[str] = Field(default=None, max_length=100)
    navegador: Optional[str] = Field(default=None, max_length=100)