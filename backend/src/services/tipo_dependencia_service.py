from src.repository.base import CRUDBase
from src.models import TipoDependencia
from src.dto import TipoDependenciaCreate, TipoDependenciaUpdate, TipoDependenciaRead
from src.services.base_service import GenericService

tipo_dependencia_repo = CRUDBase[
    TipoDependencia, TipoDependenciaCreate, TipoDependenciaUpdate
](TipoDependencia)

class TipoDependenciaServiceClass(GenericService[
    TipoDependencia, TipoDependenciaCreate, TipoDependenciaUpdate, TipoDependenciaRead
]):
    pass

tipo_dependencia_service = TipoDependenciaServiceClass(
    repository=tipo_dependencia_repo,
    read_schema=TipoDependenciaRead,
    model_name="Tipo de Dependencia"
)
