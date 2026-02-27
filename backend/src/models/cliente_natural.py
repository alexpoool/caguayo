from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .cliente import Cliente
    from .tipo_entidad import TipoEntidad


class ClienteNatural(SQLModel, table=True):
    __tablename__ = "cliente_natural"

    id_cliente_natural: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(foreign_key="clientes.id_cliente")
    codigo_expediente: Optional[str] = Field(default=None, max_length=50)
    numero_registro: Optional[str] = Field(default=None, max_length=50)
    carnet_identidad: Optional[str] = Field(default=None, max_length=50)
    es_trabajador: bool = Field(default=False)
    ocupacion: Optional[str] = Field(default=None, max_length=100)
    centro_laboral: Optional[str] = Field(default=None, max_length=150)
    centro_trabajo: Optional[str] = Field(default=None, max_length=150)
    correo_trabajo: Optional[str] = Field(default=None, max_length=100)
    direccion_trabajo: Optional[str] = Field(default=None, max_length=255)
    telefono_trabajo: Optional[str] = Field(default=None, max_length=20)
    catalogo: Optional[str] = Field(default=None, max_length=100)
    baja: bool = Field(default=False)
    fecha_baja: Optional[date] = Field(default=None)
    vigencia: Optional[date] = Field(default=None)
    codigo_reeup: Optional[str] = Field(default=None, max_length=12)
    id_tipo_entidad: Optional[int] = Field(
        default=None, foreign_key="tipo_entidad.id_tipo_entidad"
    )

    cliente: "Cliente" = Relationship(back_populates="cliente_natural")
    tipo_entidad: Optional["TipoEntidad"] = Relationship(
        back_populates="clientes_naturales"
    )
