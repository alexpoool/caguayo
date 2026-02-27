from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .dependencia import Dependencia
    from .tipo_cuenta import TipoCuenta
    from .cliente import Cliente


class Cuenta(SQLModel, table=True):
    __tablename__ = "cuenta"

    id_cuenta: Optional[int] = Field(default=None, primary_key=True)
    id_dependencia: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )
    id_cliente: Optional[int] = Field(default=None, foreign_key="clientes.id_cliente")
    id_tipo_cuenta: Optional[int] = Field(
        default=None, foreign_key="tipo_cuenta.id_tipo_cuenta"
    )
    titular: str = Field(max_length=150)
    banco: str = Field(max_length=100)
    sucursal: Optional[int] = None
    direccion: str = Field(max_length=255)

    tipo_cuenta: "TipoCuenta" = Relationship(back_populates="cuentas")
    dependencia: Optional["Dependencia"] = Relationship(back_populates="cuentas")
    cliente: Optional["Cliente"] = Relationship(back_populates="cuentas")
