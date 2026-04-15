from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.models import (
    Cliente,
    ClienteNatural,
    ClienteJuridica,
    ClienteTCP,
    TipoEntidad,
    Cuenta,
)
from src.repository.base import CRUDBase
from src.dto import (
    ClienteCreate,
    ClienteUpdate,
    ClienteNaturalCreate,
    ClienteNaturalUpdate,
)
from src.dto import ClienteJuridicaCreate, ClienteJuridicaUpdate
from src.dto import ClienteTCPCreate, ClienteTCPUpdate
from src.dto import TipoEntidadCreate, TipoEntidadUpdate
from src.dto import CuentaCreate, CuentaUpdate


class ClienteRepository(CRUDBase[Cliente, ClienteCreate, ClienteUpdate]):
    async def get_by_cedula(
        self, db: AsyncSession, cedula_rif: str
    ) -> Optional[Cliente]:
        statement = select(self.model).where(self.model.cedula_rif == cedula_rif)
        results = await db.exec(statement)
        return results.first()

    async def get_by_numero(
        self, db: AsyncSession, numero_cliente: str
    ) -> Optional[Cliente]:
        statement = select(self.model).where(
            self.model.numero_cliente == numero_cliente
        )
        results = await db.exec(statement)
        return results.first()


class ClienteNaturalRepository(
    CRUDBase[ClienteNatural, ClienteNaturalCreate, ClienteNaturalUpdate]
):
    async def get_with_cliente(
        self, db: AsyncSession, id_cliente: int
    ) -> Optional[ClienteNatural]:
        statement = select(self.model).where(self.model.id_cliente == id_cliente)
        results = await db.exec(statement)
        return results.first()


class ClienteJuridicaRepository(
    CRUDBase[ClienteJuridica, ClienteJuridicaCreate, ClienteJuridicaUpdate]
):
    async def get_with_cliente(
        self, db: AsyncSession, id_cliente: int
    ) -> Optional[ClienteJuridica]:
        statement = (
            select(self.model)
            .options(selectinload(ClienteJuridica.tipo_entidad))
            .where(self.model.id_cliente == id_cliente)
        )
        results = await db.exec(statement)
        return results.first()


class ClienteTCPRepository(CRUDBase[ClienteTCP, ClienteTCPCreate, ClienteTCPUpdate]):
    async def get_with_cliente(
        self, db: AsyncSession, id_cliente: int
    ) -> Optional[ClienteTCP]:
        statement = select(self.model).where(self.model.id_cliente == id_cliente)
        results = await db.exec(statement)
        return results.first()


class TipoEntidadRepository(
    CRUDBase[TipoEntidad, TipoEntidadCreate, TipoEntidadUpdate]
):
    pass


class CuentaRepository(CRUDBase[Cuenta, CuentaCreate, CuentaUpdate]):
    async def get_by_cliente(self, db: AsyncSession, id_cliente: int) -> List[Cuenta]:
        statement = (
            select(self.model)
            .options(
                selectinload(Cuenta.moneda),
            )
            .where(self.model.id_cliente == id_cliente)
        )
        results = await db.exec(statement)
        return list(results.all())


# Instancias
cliente_repo = ClienteRepository(Cliente)
cliente_natural_repo = ClienteNaturalRepository(ClienteNatural)
cliente_juridica_repo = ClienteJuridicaRepository(ClienteJuridica)
cliente_tcp_repo = ClienteTCPRepository(ClienteTCP)
tipo_entidad_repo = TipoEntidadRepository(TipoEntidad)
cuenta_repo = CuentaRepository(Cuenta)
