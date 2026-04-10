from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .cliente import Cliente
    from .tipo_entidad import TipoEntidad


class ClienteNatural(SQLModel, table=True):
    __tablename__ = "clientes_persona_natural"

    id_cliente: int = Field(primary_key=True, foreign_key="clientes.id_cliente")
    nombre: str = Field(max_length=50)
    primer_apellido: str = Field(max_length=50)
    segundo_apellido: Optional[str] = Field(default=None, max_length=50)
    carnet_identidad: str = Field(max_length=11, unique=True)
    codigo_expediente: Optional[str] = Field(default=None, max_length=50)
    numero_registro: Optional[str] = Field(default=None, max_length=50)
    catalogo: Optional[str] = Field(default=None, max_length=100)
    es_trabajador: bool = Field(default=False)
    ocupacion: Optional[str] = Field(default=None, max_length=100)
    centro_trabajo: Optional[str] = Field(default=None, max_length=200)
    correo_trabajo: Optional[str] = Field(default=None, max_length=100)
    direccion_trabajo: Optional[str] = Field(
        default=None, sa_column_kwargs={"nullable": True}
    )
    telefono_trabajo: Optional[str] = Field(default=None, max_length=20)
    en_baja: bool = Field(default=False)
    fecha_baja: Optional[date] = Field(default=None)
    vigencia: Optional[date] = Field(default=None)

    cliente: "Cliente" = Relationship(back_populates="cliente_natural")
