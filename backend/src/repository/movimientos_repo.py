from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from typing import List, Optional
from src.models import (
    Movimiento,
    Productos,
    Subcategorias,
    Cliente,
    TipoCliente,
    TipoConvenio,
    Dependencia,
    TipoDependencia,
    Convenio,
    Provincia,
    Municipio,
    TipoMovimiento,
)
from src.repository.base import CRUDBase
from src.dto import (
    MovimientoCreate,
    MovimientoUpdate,
)


class MovimientoRepository(CRUDBase[Movimiento, MovimientoCreate, MovimientoUpdate]):
    def _get_selectinload_options(self):
        """Helper method to get all selectinload options for Movimiento relationships."""
        return [
            selectinload(Movimiento.tipo_movimiento),  # type: ignore
            selectinload(Movimiento.dependencia).selectinload(
                Dependencia.tipo_dependencia
            ),  # type: ignore
            selectinload(Movimiento.dependencia).selectinload(Dependencia.provincia),  # type: ignore
            selectinload(Movimiento.dependencia).selectinload(Dependencia.municipio),  # type: ignore
            selectinload(Movimiento.dependencia).selectinload(Dependencia.cuentas),  # type: ignore
            selectinload(Movimiento.anexo),  # type: ignore
            selectinload(Movimiento.producto)
            .selectinload(  # type: ignore
                Productos.subcategoria
            )
            .selectinload(Subcategorias.categoria),  # type: ignore
            selectinload(Movimiento.producto).selectinload(  # type: ignore
                Productos.moneda_compra_rel
            ),
            selectinload(Movimiento.producto).selectinload(  # type: ignore
                Productos.moneda_venta_rel
            ),
            selectinload(Movimiento.liquidacion),  # type: ignore
            selectinload(Movimiento.convenio)
            .selectinload(Convenio.cliente)  # type: ignore
            .selectinload(Cliente.tipo_cliente),  # type: ignore
            selectinload(Movimiento.convenio).selectinload(Convenio.tipo_convenio),  # type: ignore
            selectinload(Movimiento.cliente).selectinload(Cliente.tipo_cliente),  # type: ignore
            selectinload(Movimiento.moneda_compra_rel),  # type: ignore
            selectinload(Movimiento.moneda_venta_rel),  # type: ignore
        ]

    async def _get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[Movimiento]:
        """Helper method to get a movimiento with all relationships eagerly loaded."""
        statement = (
            select(self.model)
            .options(*self._get_selectinload_options())
            .where(self.model.id_movimiento == id)
        )
        results = await db.exec(statement)
        return results.first()

    async def get(self, db: AsyncSession, id: int) -> Optional[Movimiento]:
        return await self._get_with_relations(db, id)

    async def create(self, db: AsyncSession, *, obj_in: MovimientoCreate) -> Movimiento:
        obj_data = obj_in.dict()
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        # Reload with relationships
        if db_obj.id_movimiento is None:
            raise ValueError("Movimiento was not assigned an ID")
        result = await self._get_with_relations(db, db_obj.id_movimiento)
        if result is None:
            raise ValueError("Failed to reload movimiento with relations")
        return result

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int | None = None,
        tipo: str = None,
    ) -> List[Movimiento]:
        from sqlalchemy import desc

        statement = select(Movimiento).options(*self._get_selectinload_options())

        if tipo:
            statement = statement.where(TipoMovimiento.tipo == tipo)

        statement = statement.order_by(desc(Movimiento.fecha))

        if limit:
            statement = statement.offset(skip).limit(limit)

        results = await db.exec(statement)
        return list(results.all())

    async def get_by_tipo(
        self, db: AsyncSession, id_tipo_movimiento: int
    ) -> List[Movimiento]:
        statement = (
            select(Movimiento)
            .options(*self._get_selectinload_options())
            .where(Movimiento.id_tipo_movimiento == id_tipo_movimiento)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_pendientes(self, db: AsyncSession) -> List[Movimiento]:
        statement = (
            select(Movimiento)
            .options(*self._get_selectinload_options())
            .where(Movimiento.estado == "pendiente")
            .order_by(Movimiento.fecha.desc())
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_anexo(self, db: AsyncSession, id_anexo: int) -> List[Movimiento]:
        """Obtener movimientos confirmados por anexo (para obtener productos disponibles)."""
        statement = (
            select(Movimiento)
            .options(*self._get_selectinload_options())
            .where(Movimiento.id_anexo == id_anexo)
            .where(Movimiento.estado == "confirmado")
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_productos_con_stock(self, db: AsyncSession) -> List[Movimiento]:
        """Obtener movimientos confirmados con cantidad > 0 (para salidas)."""
        statement = (
            select(Movimiento)
            .options(*self._get_selectinload_options())
            .where(Movimiento.estado == "confirmado")
            .where(Movimiento.cantidad > 0)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_ultima_recepcion_by_producto(
        self, db: AsyncSession, id_producto: int
    ) -> Optional[Movimiento]:
        """Obtener la última recepción confirmada de un producto."""
        from src.models import TipoMovimiento

        statement = (
            select(Movimiento)
            .options(*self._get_selectinload_options())
            .join(TipoMovimiento)
            .where(Movimiento.id_producto == id_producto)
            .where(Movimiento.estado == "confirmado")
            .where(TipoMovimiento.tipo == "RECEPCION")
            .order_by(Movimiento.fecha.desc())
        )
        results = await db.exec(statement)
        return results.first()


movimiento_repo = MovimientoRepository(Movimiento)
