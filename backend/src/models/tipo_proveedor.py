from sqlmodel import SQLModel, Field
from typing import Optional


class TipoProveedor(SQLModel, table=True):
    __tablename__ = "tipo_proveedor"

    id_tipo_proveedor: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None
