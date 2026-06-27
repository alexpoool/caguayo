from sqlmodel import SQLModel, Field
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    pass


class Transaccion(SQLModel, table=True):
    __tablename__ = "transaccion"

    id_transaccion: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )

    # Relaciones
    pass
