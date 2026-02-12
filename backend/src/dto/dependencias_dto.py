from sqlmodel import SQLModel


class DependenciaRead(SQLModel):
    id_dependencia: int
    id_tipo_dependencia: int
    id_datos_generales: int
    nombre: str
