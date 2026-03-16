from typing import List, Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.cliente_repo import (
    cliente_repo,
    cliente_natural_repo,
    cliente_juridica_repo,
    cliente_tcp_repo,
    tipo_entidad_repo,
    cuenta_repo,
)
from src.models import Cliente
from src.dto import (
    ClienteCreate,
    ClienteRead,
    ClienteUpdate,
    ClienteNaturalCreate,
    ClienteNaturalRead,
    ClienteNaturalUpdate,
    ClienteJuridicaCreate,
    ClienteJuridicaRead,
    ClienteJuridicaUpdate,
    ClienteTCPCreate,
    ClienteTCPRead,
    ClienteTCPUpdate,
    TipoEntidadCreate,
    TipoEntidadRead,
    TipoEntidadUpdate,
    CuentaCreate,
    CuentaRead,
    CuentaUpdate,
)


class ClienteService:
    @staticmethod
    async def create_cliente(db: AsyncSession, cliente: ClienteCreate) -> ClienteRead:
        # Convertir DTO a diccionario
        obj_data = cliente.model_dump()
        print(f"DEBUG model_dump: {obj_data}")

        # Crear el cliente directamente
        db_cliente = Cliente(**obj_data)
        print(f"DEBUG Cliente created: {db_cliente.__dict__}")

        db.add(db_cliente)
        await db.commit()
        await db.refresh(db_cliente)

        # Verificar qué se guardó
        print(f"DEBUG After commit: {db_cliente.__dict__}")

        return ClienteRead.model_validate(db_cliente)

    @staticmethod
    async def get_cliente(db: AsyncSession, cliente_id: int) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get_with_relations(db, id=cliente_id)
        return ClienteRead.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_clientes(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ClienteRead]:
        db_clientes = await cliente_repo.get_multi_with_relations(
            db, skip=skip, limit=limit
        )
        return [ClienteRead.model_validate(c) for c in db_clientes]

    @staticmethod
    async def update_cliente(
        db: AsyncSession, cliente_id: int, cliente_update: ClienteUpdate
    ) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(db, id=cliente_id)
        if not db_cliente:
            return None
        updated_cliente = await cliente_repo.update(
            db, db_obj=db_cliente, obj_in=cliente_update
        )
        return ClienteRead.model_validate(updated_cliente)

    @staticmethod
    async def delete_cliente(db: AsyncSession, cliente_id: int) -> bool:
        db_cliente = await cliente_repo.remove(db, id=cliente_id)
        return db_cliente is not None

    @staticmethod
    async def get_cliente_by_cedula(
        db: AsyncSession, cedula_rif: str
    ) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get_by_cedula(db, cedula_rif=cedula_rif)
        return ClienteRead.model_validate(db_cliente) if db_cliente else None


class ClienteNaturalService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_natural: ClienteNaturalCreate
    ) -> ClienteNaturalRead:
        db_obj = await cliente_natural_repo.create(db, obj_in=cliente_natural)
        return ClienteNaturalRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteNaturalRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteNaturalUpdate
    ) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_natural_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteNaturalRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_natural_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteJuridicaService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_juridica: ClienteJuridicaCreate
    ) -> ClienteJuridicaRead:
        db_obj = await cliente_juridica_repo.create(db, obj_in=cliente_juridica)
        return ClienteJuridicaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteJuridicaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteJuridicaUpdate
    ) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_juridica_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteJuridicaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_juridica_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteTCPService:
    @staticmethod
    async def create(db: AsyncSession, cliente_tcp: ClienteTCPCreate) -> ClienteTCPRead:
        db_obj = await cliente_tcp_repo.create(db, obj_in=cliente_tcp)
        return ClienteTCPRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteTCPRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteTCPUpdate
    ) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_tcp_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return ClienteTCPRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_tcp_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class TipoEntidadService:
    @staticmethod
    async def create(
        db: AsyncSession, tipo_entidad: TipoEntidadCreate
    ) -> TipoEntidadRead:
        db_obj = await tipo_entidad_repo.create(db, obj_in=tipo_entidad)
        return TipoEntidadRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        return TipoEntidadRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession) -> List[TipoEntidadRead]:
        db_objs = await tipo_entidad_repo.get_all(db)
        return [TipoEntidadRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: TipoEntidadUpdate
    ) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await tipo_entidad_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return TipoEntidadRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await tipo_entidad_repo.remove(db, id=id)
        return db_obj is not None


class CuentaService:
    @staticmethod
    async def create(db: AsyncSession, cuenta: CuentaCreate) -> CuentaRead:
        db_obj = await cuenta_repo.create(db, obj_in=cuenta)
        return CuentaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get_with_relations(db, id=id)
        return CuentaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_multi(db, skip=skip, limit=limit)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def get_by_cliente(db: AsyncSession, id_cliente: int) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_by_cliente(db, id_cliente=id_cliente)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: CuentaUpdate
    ) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await cuenta_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return CuentaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await cuenta_repo.remove(db, id=id)
        return db_obj is not None
