from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.models import Productos, Categorias, Ventas, Movimiento
from src.repository.base import CRUDBase
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    CategoriasCreate,
    CategoriasUpdate,
    VentasCreate,
    VentasUpdate,
    MovimientoCreate,
    MovimientoUpdate,
)


class ProductosRepository(CRUDBase[Productos, ProductosCreate, ProductosUpdate]):
    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[Productos]:
        statement = (
            select(self.model)
            .order_by(self.model.id_producto.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_nombre(self, db: AsyncSession, nombre: str) -> List[Productos]:
        statement = (
            select(Productos)
            .where(Productos.nombre.contains(nombre))
            .order_by(Productos.id_producto.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_categoria(
        self, db: AsyncSession, id_categoria: int
    ) -> List[Productos]:
        subquery = select(Productos.id_subcategoria).where(
            Productos.id_subcategoria == id_categoria
        )
        statement = select(Productos).where(Productos.id_subcategoria.in_(subquery))
        results = await db.exec(statement)
        return results.all()

    async def get_stock_bajo(
        self, db: AsyncSession, limite: int = 10
    ) -> List[Productos]:
        # Aquí podrías agregar lógica de stock si tienes un campo de stock
        statement = select(Productos).limit(limite)
        results = await db.exec(statement)
        return results.all()


# Repositories específicos para cada entidad
class CategoriasRepository(CRUDBase[Categorias, CategoriasCreate, CategoriasUpdate]):
    pass


class VentasRepository(CRUDBase[Ventas, VentasCreate, VentasUpdate]):
    async def get_by_mes(self, db: AsyncSession, year: int, month: int) -> List[Ventas]:
        statement = select(Ventas).where(
            func.extract("year", Ventas.fecha_registro) == year,
            func.extract("month", Ventas.fecha_registro) == month,
        )
        results = await db.exec(statement)
        return results.all()

    async def get_ventas_confirmadas(self, db: AsyncSession) -> List[Ventas]:
        statement = select(Ventas).where(Ventas.confirmacion == True)  # noqa: E712
        results = await db.exec(statement)
        return results.all()


class MovimientoRepository(CRUDBase[Movimiento, MovimientoCreate, MovimientoUpdate]):
    async def get_by_tipo(
        self, db: AsyncSession, id_tipo_movimiento: int
    ) -> List[Movimiento]:
        statement = select(Movimiento).where(
            Movimiento.id_tipo_movimiento == id_tipo_movimiento
        )
        results = await db.exec(statement)
        return results.all()

    async def get_pendientes(self, db: AsyncSession) -> List[Movimiento]:
        statement = select(Movimiento).where(Movimiento.confirmacion == False)  # noqa: E712
        results = await db.exec(statement)
        return results.all()


# Instancias de repositories
productos_repo = ProductosRepository(Productos)
categorias_repo = CategoriasRepository(Categorias)
ventas_repo = VentasRepository(Ventas)
movimiento_repo = MovimientoRepository(Movimiento)
