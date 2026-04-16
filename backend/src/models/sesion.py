from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .usuarios import Usuario


class Sesion(SQLModel, table=True):
    __tablename__ = "sesion"

    id_sesion: Optional[int] = Field(default=None, primary_key=True)
    id_usuario: int = Field(foreign_key="usuarios.id_usuario")
    token: str = Field(max_length=500, unique=True)
    base_datos: str = Field(max_length=100)
    fecha_login: datetime = Field(default_factory=datetime.utcnow)
    fecha_expiracion: datetime

    usuario: "Usuario" = Relationship()
