from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import selectinload
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
        from sqlmodel import select
        from sqlalchemy.orm import selectinload
        from src.models.cliente_natural import ClienteNatural
        from src.models.cliente_juridica import ClienteJuridica
        from src.models.cliente_tcp import ClienteTCP

        async with db.begin():
            # Convert DTO to dict, excluding specific subtypes
            obj_data = cliente.model_dump(
                exclude={"cliente_natural", "cliente_juridica", "cliente_tcp"}
            )
            db_cliente = Cliente(**obj_data)
            db.add(db_cliente)
            await db.flush()  # Gets the id_cliente without finalizing transaction

            tipo = cliente.tipo_persona
            if tipo == "NATURAL" and cliente.cliente_natural:
                nat_data = cliente.cliente_natural.model_dump()
                nat_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteNatural(**nat_data))
            elif tipo == "JURIDICA" and cliente.cliente_juridica:
                jur_data = cliente.cliente_juridica.model_dump()
                jur_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteJuridica(**jur_data))
            elif tipo == "TCP" and cliente.cliente_tcp:
                tcp_data = cliente.cliente_tcp.model_dump()
                tcp_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteTCP(**tcp_data))

            await db.flush()

        # The begin() context manager handles the commit()
        await db.refresh(db_cliente)

        # Load relationships explicitly
        db_cliente = await db.get(
            Cliente,
            db_cliente.id_cliente,
            options=[
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
            ],
        )
        return ClienteRead.model_validate(db_cliente)

    @staticmethod
    async def get_cliente(db: AsyncSession, cliente_id: int) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(
            db,
            id=cliente_id,
            load_options=[
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
            ],
        )
        return ClienteRead.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_clientes(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10000,
        tipo_relacion: Optional[str] = None,
    ) -> List[ClienteRead]:
        from sqlalchemy import or_

        statement = select(Cliente).options(
            selectinload(Cliente.provincia),
            selectinload(Cliente.municipio),
        )

        if tipo_relacion:
            # Support comma-separated values (e.g., "PROVEEDOR,AMBAS")
            tipos = [t.strip() for t in tipo_relacion.split(",") if t.strip()]
            if len(tipos) == 1:
                statement = statement.where(Cliente.tipo_relacion == tipos[0])
            elif len(tipos) > 1:
                statement = statement.where(Cliente.tipo_relacion.in_(tipos))

        statement = statement.offset(skip).limit(limit)
        results = await db.exec(statement)
        db_clientes = list(results.all())

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
        await db.execute(
            text("DELETE FROM clientes WHERE id_cliente = :id"), {"id": cliente_id}
        )
        await db.commit()
        return True

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
