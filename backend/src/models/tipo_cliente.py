from sqlmodel import SQLModel, Field
from typing import Optional


class TipoCliente(SQLModel, table=True):
    __tablename__ = "tipo_cliente"

    id_tipo_cliente: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None
