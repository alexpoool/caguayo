from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.repository.base import CRUDBase
from src.models import Cuenta
from src.dto import CuentaCreate, CuentaUpdate, CuentaRead
from src.services.base_service import GenericService

cuenta_repo = CRUDBase[Cuenta, CuentaCreate, CuentaUpdate](Cuenta)

class CuentaServiceClass(GenericService[Cuenta, CuentaCreate, CuentaUpdate, CuentaRead]):
    async def create(self, db: AsyncSession, obj_in: CuentaCreate) -> CuentaRead:
        db_obj = await self.repository.create(db, obj_in=obj_in)
        # Recargar con las relaciones
        statement = (
            select(Cuenta)
            .where(Cuenta.id_cuenta == db_obj.id_cuenta)
            .options(
                selectinload(Cuenta.tipo_cuenta),
                selectinload(Cuenta.moneda),
            )
        )
        result = await db.exec(statement)
        db_obj_with_rels = result.first()
        return self._to_read_dto(db_obj_with_rels)

cuenta_service = CuentaServiceClass(
    repository=cuenta_repo,
    read_schema=CuentaRead,
    model_name="Cuenta"
)
