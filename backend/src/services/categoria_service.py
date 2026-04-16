from src.repository import categorias_repo
from src.models import Categorias
from src.dto import CategoriasCreate, CategoriasUpdate, CategoriasRead
from src.services.base_service import GenericService

class CategoriaServiceClass(GenericService[Categorias, CategoriasCreate, CategoriasUpdate, CategoriasRead]):
    pass

categoria_service = CategoriaServiceClass(
    repository=categorias_repo,
    read_schema=CategoriasRead,
    model_name="Categorias"
)
