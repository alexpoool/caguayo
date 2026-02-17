from src.models import Moneda
from src.repository.base import CRUDBase
from src.dto import MonedaCreate, MonedaUpdate


class MonedaRepository(CRUDBase[Moneda, MonedaCreate, MonedaUpdate]):
    pass


moneda_repo = MonedaRepository(Moneda)
