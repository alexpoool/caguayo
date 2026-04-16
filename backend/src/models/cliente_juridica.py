from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente import Cliente
    from .tipo_entidad import TipoEntidad


class ClienteJuridica(SQLModel, table=True):
    __tablename__ = "clientes_persona_juridica"

    id_cliente: int = Field(primary_key=True, foreign_key="clientes.id_cliente")
    codigo_reup: str = Field(max_length=50, unique=True)
    id_tipo_entidad: Optional[int] = Field(
        default=None, foreign_key="tipo_entidad.id_tipo_entidad"
    )

    cliente: "Cliente" = Relationship(back_populates="cliente_juridica")
    tipo_entidad: Optional["TipoEntidad"] = Relationship()
