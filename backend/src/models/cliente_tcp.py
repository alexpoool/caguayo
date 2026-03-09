from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .cliente import Cliente


class ClienteTCP(SQLModel, table=True):
    __tablename__ = "cliente_tcp"

    id_cliente: int = Field(primary_key=True, foreign_key="clientes.id_cliente")
    nombre: str = Field(max_length=50)
    primer_apellido: str = Field(max_length=50)
    segundo_apellido: Optional[str] = Field(default=None, max_length=50)
    direccion: str = Field(sa_column_kwargs={'nullable': True})
    numero_registro_proyecto: Optional[str] = Field(default=None, max_length=50)
    fecha_aprobacion: Optional[date] = Field(default=None)

    cliente: "Cliente" = Relationship(back_populates="cliente_tcp")
