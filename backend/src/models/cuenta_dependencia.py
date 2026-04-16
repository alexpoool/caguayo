from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .dependencia import Dependencia
    from .moneda import Moneda


class CuentaDependencia(SQLModel, table=True):
    __tablename__ = "cuenta_dependencias"

    id_cuenta: Optional[int] = Field(default=None, primary_key=True)
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    titular: str = Field(max_length=150)
    banco: str = Field(max_length=100)
    sucursal: Optional[int] = None
    numero_cuenta: str = Field(max_length=50)
    direccion: str = Field(max_length=255)

    dependencia: Optional["Dependencia"] = Relationship(
        back_populates="cuentas_dependencias"
    )
    moneda: Optional["Moneda"] = Relationship(back_populates="cuentas_dependencias")
