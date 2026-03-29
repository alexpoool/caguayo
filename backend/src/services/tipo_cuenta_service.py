from src.repository.base import CRUDBase
from src.models import TipoCuenta
from src.dto import TipoCuentaCreate, TipoCuentaUpdate, TipoCuentaRead
from src.services.base_service import GenericService

tipo_cuenta_repo = CRUDBase[TipoCuenta, TipoCuentaCreate, TipoCuentaUpdate](TipoCuenta)

class TipoCuentaServiceClass(GenericService[TipoCuenta, TipoCuentaCreate, TipoCuentaUpdate, TipoCuentaRead]):
    pass

tipo_cuenta_service = TipoCuentaServiceClass(
    repository=tipo_cuenta_repo,
    read_schema=TipoCuentaRead,
    model_name="Tipo de Cuenta"
)
