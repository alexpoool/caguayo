from sqlmodel import SQLModel, Field
from typing import Optional
from decimal import Decimal
from sqlalchemy import Index

# Precisión monetaria
_AMT = dict(max_digits=20, decimal_places=6)


class FichaTarifa(SQLModel, table=True):
    __tablename__ = "ficha_tarifa"
    __table_args__ = (
        Index("idx_ficha_tarifa_categoria", "categoria"),
    )

    id_tarifa: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    # Categoría ocupacional (única): p.ej. ELABORADOR DE ALIMENTOS
    categoria: str = Field(max_length=150)
    # Salario por hora
    tarifa_horaria: Decimal = Field(default=Decimal("0"), **_AMT)
