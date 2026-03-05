from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from src.repository.base import CRUDBase
from src.models import TipoCliente, TipoConvenio, Convenio
from src.dto import (
    TipoClienteCreate,
    TipoClienteUpdate,
    TipoClienteRead,
    TipoConvenioCreate,
    TipoConvenioUpdate,
    TipoConvenioRead,
    ConvenioCreate,
    ConvenioRead,
    ConvenioUpdate,
)

tipo_cliente_repo = CRUDBase[TipoCliente, TipoClienteCreate, TipoClienteUpdate](
    TipoCliente
)
tipo_convenio_repo = CRUDBase[TipoConvenio, TipoConvenioCreate, TipoConvenioUpdate](
    TipoConvenio
)
convenio_repo = CRUDBase[Convenio, ConvenioCreate, ConvenioUpdate](Convenio)


class TipoClienteService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoClienteCreate) -> TipoClienteRead:
        db_obj = await tipo_cliente_repo.create(db, obj_in=data)
        return TipoClienteRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoClienteRead:
        db_obj = await tipo_cliente_repo.get(db, id=id)
        if db_obj:
            return TipoClienteRead.model_validate(db_obj)
        return None

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
        if db_obj:
            return TipoConvenioRead.model_validate(db_obj)
        return None

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


class ConvenioService:
    @staticmethod
    async def _generar_codigo(db: AsyncSession, fecha: str) -> str:
        year = fecha[:4]
        statement = select(func.count(Convenio.id_convenio)).where(
            func.extract("year", Convenio.fecha) == int(year)
        )
        result = await db.exec(statement)
        count = result.one() or 0
        numero = count + 1
        return f"{year}.{numero}"

    @staticmethod
    async def create(db: AsyncSession, data: ConvenioCreate) -> ConvenioRead:
        if not data.codigo:
            data.codigo = await ConvenioService._generar_codigo(db, str(data.fecha))
        db_obj = await convenio_repo.create(db, obj_in=data)
        return ConvenioRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> ConvenioRead:
        db_obj = await convenio_repo.get(db, id=id)
        if db_obj:
            return ConvenioRead.model_validate(db_obj)
        return None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ConvenioRead]:
        db_objs = await convenio_repo.get_multi(db, skip=skip, limit=limit)
        return [ConvenioRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: ConvenioUpdate) -> ConvenioRead:
        db_obj = await convenio_repo.get(db, id=id)
        if db_obj:
            updated = await convenio_repo.update(db, db_obj=db_obj, obj_in=data)
            return ConvenioRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await convenio_repo.remove(db, id=id)
        return result is not None
