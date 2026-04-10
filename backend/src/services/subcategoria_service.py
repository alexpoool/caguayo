from src.repository.subcategorias_repo import subcategorias_repo
from src.models import Subcategorias
from src.dto import SubcategoriasCreate, SubcategoriasRead, SubcategoriasUpdate
from src.services.base_service import GenericService


class SubcategoriaServiceClass(
    GenericService[
        Subcategorias, SubcategoriasCreate, SubcategoriasUpdate, SubcategoriasRead
    ]
):
    def _to_read_dto(self, db_subcategoria) -> SubcategoriasRead:
        """Convierte un modelo de base de datos a DTO, evitando problemas con relaciones lazy."""
        return SubcategoriasRead(
            id_subcategoria=db_subcategoria.id_subcategoria,
            id_categoria=db_subcategoria.id_categoria,
            nombre=db_subcategoria.nombre,
            descripcion=db_subcategoria.descripcion,
            categoria=None,  # No cargamos la relación para evitar problemas
        )


subcategorias_service = SubcategoriaServiceClass(
    repository=subcategorias_repo,
    read_schema=SubcategoriasRead,
    model_name="Subcategoría",
)
