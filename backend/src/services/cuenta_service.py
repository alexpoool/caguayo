from sqlalchemy.orm import selectinload
from src.repository.base import CRUDBase
from src.models import Cuenta
from src.dto import CuentaCreate, CuentaUpdate, CuentaRead
from src.services.base_service import GenericService

cuenta_repo = CRUDBase[Cuenta, CuentaCreate, CuentaUpdate](Cuenta)


class CuentaServiceClass(
    GenericService[Cuenta, CuentaCreate, CuentaUpdate, CuentaRead]
):
    pass


cuenta_service = CuentaServiceClass(
    repository=cuenta_repo,
    read_schema=CuentaRead,
    model_name="Cuenta",
    default_load_options=[
        selectinload(Cuenta.moneda),
    ],
)
