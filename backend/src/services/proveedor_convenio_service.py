from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import TipoCliente, TipoConvenio, TipoProveedor
from src.dto import (
    TipoClienteCreate,
    TipoClienteUpdate,
    TipoClienteRead,
    TipoConvenioCreate,
    TipoConvenioUpdate,
    TipoConvenioRead,
    TipoProveedorCreate,
    TipoProveedorUpdate,
    TipoProveedorRead,
)

tipo_cliente_repo = CRUDBase[TipoCliente, TipoClienteCreate, TipoClienteUpdate](
    TipoCliente
)
tipo_convenio_repo = CRUDBase[TipoConvenio, TipoConvenioCreate, TipoConvenioUpdate](
    TipoConvenio
)
tipo_proveedor_repo = CRUDBase[TipoProveedor, TipoProveedorCreate, TipoProveedorUpdate](
    TipoProveedor
)


class TipoClienteService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoClienteCreate) -> TipoClienteRead:
        db_obj = await tipo_cliente_repo.create(db, obj_in=data)
        return TipoClienteRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoClienteRead:
        db_obj = await tipo_cliente_repo.get(db, id=id)
        return TipoClienteRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoClienteRead]:
        db_objs = await tipo_cliente_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoClienteRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoClienteUpdate
    ) -> TipoClienteRead:
        db_obj = await tipo_cliente_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_cliente_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoClienteRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_cliente_repo.remove(db, id=id)
        return result is not None


class TipoConvenioService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoConvenioCreate) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.create(db, obj_in=data)
        return TipoConvenioRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.get(db, id=id)
        return TipoConvenioRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoConvenioRead]:
        db_objs = await tipo_convenio_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoConvenioRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoConvenioUpdate
    ) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_convenio_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoConvenioRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_convenio_repo.remove(db, id=id)
        return result is not None


class TipoProveedorService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoProveedorCreate) -> TipoProveedorRead:
        db_obj = await tipo_proveedor_repo.create(db, obj_in=data)
        return TipoProveedorRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoProveedorRead:
        db_obj = await tipo_proveedor_repo.get(db, id=id)
        return TipoProveedorRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoProveedorRead]:
        db_objs = await tipo_proveedor_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoProveedorRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoProveedorUpdate
    ) -> TipoProveedorRead:
        db_obj = await tipo_proveedor_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_proveedor_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoProveedorRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_proveedor_repo.remove(db, id=id)
        return result is not None
