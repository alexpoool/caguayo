from src.models import Categorias
from src.repository.base import CRUDBase
from src.dto import (
    CategoriasCreate,
    CategoriasUpdate,
)


class CategoriasRepository(CRUDBase[Categorias, CategoriasCreate, CategoriasUpdate]):
    pass


categorias_repo = CategoriasRepository(Categorias)
