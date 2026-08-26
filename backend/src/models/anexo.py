from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal
from sqlalchemy import Index

if TYPE_CHECKING:
    from .convenio import Convenio
    from .item_anexo import ItemAnexo


class Anexo(SQLModel, table=True):
    __tablename__ = "anexo"
    __table_args__ = (
        Index("idx_anexo_codigo", "codigo_anexo"),
        Index("idx_anexo_convenio", "id_convenio"),
        Index("idx_anexo_dependencia", "id_dependencia"),
    )

    id_anexo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_convenio: int = Field(foreign_key="convenio.id_convenio")
    nombre_anexo: str = Field(max_length=200)
    fecha: date
    codigo_anexo: Optional[str] = Field(default=None, max_length=50)
    id_dependencia: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )
    comision: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10)

    convenios: Optional["Convenio"] = Relationship(back_populates="anexos")
    items_anexo: List["ItemAnexo"] = Relationship(back_populates="anexo")
