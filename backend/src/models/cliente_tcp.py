from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .cliente import Cliente


class ClienteTCP(SQLModel, table=True):
    __tablename__ = "cliente_tcp"

    id_cliente_tcp: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(foreign_key="clientes.id_cliente")
    nombre: str = Field(max_length=150)
    primer_apellido: Optional[str] = Field(default=None, max_length=100)
    segundo_apellido: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=255)
    numero_registro_proyecto: Optional[str] = Field(default=None, max_length=50)
    fecha_aprobacion: Optional[date] = Field(default=None)

    cliente: "Cliente" = Relationship(back_populates="cliente_tcp")
