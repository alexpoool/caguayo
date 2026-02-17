from src.models import Subcategorias
from src.repository.base import CRUDBase
from src.dto import (
    SubcategoriasCreate,
    SubcategoriasUpdate,
)


class SubcategoriasRepository(
    CRUDBase[Subcategorias, SubcategoriasCreate, SubcategoriasUpdate]
):
    pass


subcategorias_repo = SubcategoriasRepository(Subcategorias)
