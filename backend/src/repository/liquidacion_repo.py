from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, TypeVar
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from src.repository.base import CRUDBase
from src.models.cliente import Cliente
from src.models.liquidacion import Liquidacion
from src.models.productos_en_liquidacion import ProductosEnLiquidacion
from src.utils.nombres import filtro_nombre_completo

ModelType = TypeVar("ModelType")


def _aplicar_busqueda(statement, search: Optional[str]):
    """Busca por código de liquidación o por el nombre del proveedor.

    Incluye los apellidos (personas naturales/TCP) mediante un EXISTS, para que
    el total paginado y la lista usen el mismo WHERE.
    """
    if not search or not search.strip():
        return statement
    patron = f"%{search.strip()}%"
    return statement.join(
        Cliente, Cliente.id_cliente == Liquidacion.id_cliente
    ).where(
        or_(
            Liquidacion.codigo.ilike(patron),
            filtro_nombre_completo(search.strip()),
        )
    )


class LiquidacionRepository(CRUDBase[Liquidacion, dict, dict]):
    async def get_by_codigo(
        self, db: AsyncSession, codigo: str
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.codigo == codigo)
        result = await db.exec(statement)
        return result.first()

    async def get_by_cliente(
        self, db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.id_cliente == cliente_id)
            .order_by(Liquidacion.id_liquidacion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_anexo(
        self, db: AsyncSession, anexo_id: int
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.id_anexo == anexo_id)
        result = await db.exec(statement)
        return result.first()

    async def get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.id_liquidacion == id)
            .options(
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.producto
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.anexo
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.moneda
                ),
                selectinload(Liquidacion.moneda),
                selectinload(Liquidacion.cliente),
                selectinload(Liquidacion.convenio),
                selectinload(Liquidacion.anexo),
            )
        )
        result = await db.exec(statement)
        return result.first()

    async def get_multi_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        cliente_id: Optional[int] = None, search: Optional[str] = None
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .options(
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.producto
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.anexo
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.moneda
                ),
                selectinload(Liquidacion.moneda),
                selectinload(Liquidacion.cliente),
                selectinload(Liquidacion.convenio),
                selectinload(Liquidacion.anexo),
            )
        )
        if cliente_id is not None:
            statement = statement.where(Liquidacion.id_cliente == cliente_id)
        statement = _aplicar_busqueda(statement, search)
        statement = statement.order_by(Liquidacion.id_liquidacion.desc()).offset(skip).limit(limit)
        result = await db.exec(statement)
        return result.all()

    async def count_liquidaciones(
        self, db: AsyncSession, cliente_id: Optional[int] = None,
        variante: str = "", search: Optional[str] = None
    ) -> int:
        """Total con el mismo WHERE que get_multi/pendientes/liquidadas.
        variante: '', 'pendientes' o 'liquidadas'."""
        statement = select(func.count()).select_from(Liquidacion)
        if variante == "pendientes":
            statement = statement.where(~Liquidacion.liquidada)
        elif variante == "liquidadas":
            statement = statement.where(Liquidacion.liquidada)
        if cliente_id is not None:
            statement = statement.where(Liquidacion.id_cliente == cliente_id)
        statement = _aplicar_busqueda(statement, search)
        result = await db.exec(statement)
        return result.one()

    async def get_by_cliente_with_relations(
        self, db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.id_cliente == cliente_id)
            .options(
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.producto
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.anexo
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.moneda
                ),
                selectinload(Liquidacion.moneda),
                selectinload(Liquidacion.cliente),
                selectinload(Liquidacion.convenio),
                selectinload(Liquidacion.anexo),
            )
            .order_by(Liquidacion.id_liquidacion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(~Liquidacion.liquidada)
            .order_by(Liquidacion.id_liquidacion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        cliente_id: Optional[int] = None, search: Optional[str] = None
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(~Liquidacion.liquidada)
            .options(
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.producto
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.anexo
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.moneda
                ),
                selectinload(Liquidacion.moneda),
                selectinload(Liquidacion.cliente),
                selectinload(Liquidacion.convenio),
                selectinload(Liquidacion.anexo),
            )
        )
        if cliente_id is not None:
            statement = statement.where(Liquidacion.id_cliente == cliente_id)
        statement = _aplicar_busqueda(statement, search)
        statement = statement.order_by(Liquidacion.id_liquidacion.desc()).offset(skip).limit(limit)
        result = await db.exec(statement)
        return result.all()

    async def get_liquidadas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion).where(Liquidacion.liquidada).order_by(
                Liquidacion.id_liquidacion.desc()
            ).offset(skip).limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_liquidadas_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        cliente_id: Optional[int] = None, search: Optional[str] = None
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.liquidada)
            .options(
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.producto
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.anexo
                ),
                selectinload(Liquidacion.productos_en_liquidacion).selectinload(
                    ProductosEnLiquidacion.moneda
                ),
                selectinload(Liquidacion.moneda),
                selectinload(Liquidacion.cliente),
                selectinload(Liquidacion.convenio),
                selectinload(Liquidacion.anexo),
            )
        )
        if cliente_id is not None:
            statement = statement.where(Liquidacion.id_cliente == cliente_id)
        statement = _aplicar_busqueda(statement, search)
        statement = statement.order_by(Liquidacion.id_liquidacion.desc()).offset(skip).limit(limit)
        result = await db.exec(statement)
        return result.all()

    async def get_cantidad_liquidaciones_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(Liquidacion)
            .where(func.extract("YEAR", Liquidacion.fecha_emision) == anio)
        )
        result = await db.exec(statement)
        return result.one()

    async def get_codigo_anio(self, db: AsyncSession, anio: int) -> int:
        cantidad = await self.get_cantidad_liquidaciones_anio(db, anio)
        return cantidad + 1


liquidacion_repo = LiquidacionRepository(Liquidacion)
