from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cuenta import Cuenta


class TipoCuenta(SQLModel, table=True):
    __tablename__ = "tipo_cuenta"

    id_tipo_cuenta: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None

    cuentas: List["Cuenta"] = Relationship(back_populates="tipo_cuenta")
