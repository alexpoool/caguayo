from sqlmodel import SQLModel
from typing import Optional, List


class ProvinciaBase(SQLModel):
    nombre: str


class ProvinciaCreate(ProvinciaBase):
    pass


class ProvinciaRead(ProvinciaBase):
    id_provincia: int


class ProvinciaUpdate(SQLModel):
    nombre: Optional[str] = None


class MunicipioBase(SQLModel):
    id_provincia: int
    nombre: str


class MunicipioCreate(MunicipioBase):
    pass


class MunicipioRead(MunicipioBase):
    id_municipio: int
    provincia: Optional[ProvinciaRead] = None


class MunicipioUpdate(SQLModel):
    id_provincia: Optional[int] = None
    nombre: Optional[str] = None
