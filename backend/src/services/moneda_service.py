from src.repository.base import CRUDBase
from src.models import Moneda
from src.dto import MonedaCreate, MonedaUpdate, MonedaRead
from src.services.base_service import GenericService

moneda_repo = CRUDBase[Moneda, MonedaCreate, MonedaUpdate](Moneda)

class MonedaServiceClass(GenericService[Moneda, MonedaCreate, MonedaUpdate, MonedaRead]):
    pass

moneda_service = MonedaServiceClass(
    repository=moneda_repo,
    read_schema=MonedaRead,
    model_name="Moneda"
)
