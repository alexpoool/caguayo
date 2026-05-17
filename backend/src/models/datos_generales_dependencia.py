from sqlmodel import SQLModel, Field
from typing import Optional


class DatosGeneralesDependencia(SQLModel, table=True):
    __tablename__ = "datos_generales_dependencia"

    id_datos_generales: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"autoincrement": True}
    )
    direccion: str = Field(max_length=255)
    telefono: str = Field(max_length=20)
    email: str = Field(max_length=100)
