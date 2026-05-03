from sqlalchemy.orm import selectinload
from src.repository.base import CRUDBase
from src.models import CuentaDependencia
from src.dto import (
    CuentaDependenciaCreate,
    CuentaDependenciaUpdate,
    CuentaDependenciaRead,
)
from src.services.base_service import GenericService

cuenta_dependencia_repo = CRUDBase[
    CuentaDependencia, CuentaDependenciaCreate, CuentaDependenciaUpdate
](CuentaDependencia)


class CuentaDependenciaServiceClass(
    GenericService[
        CuentaDependencia,
        CuentaDependenciaCreate,
        CuentaDependenciaUpdate,
        CuentaDependenciaRead,
    ]
):
    pass


cuenta_dependencia_service = CuentaDependenciaServiceClass(
    repository=cuenta_dependencia_repo,
    read_schema=CuentaDependenciaRead,
    model_name="CuentaDependencia",
    default_load_options=[
        selectinload(CuentaDependencia.moneda),
    ],
)
