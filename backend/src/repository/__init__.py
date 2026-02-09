from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
from src.models import Productos, Categorias, Subcategorias, Ventas, Movimiento
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
    async def _get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[Productos]:
        """Helper method to get a product with all relationships eagerly loaded."""
        statement = (
            select(self.model)
            .options(
                selectinload(Productos.subcategoria).selectinload(
                    Subcategorias.categoria
                ),
                selectinload(Productos.moneda_compra_rel),
                selectinload(Productos.moneda_venta_rel),
            )
            .where(self.model.id_producto == id)
        )
        results = await db.exec(statement)
        return results.first()

    async def get(self, db: AsyncSession, id: int) -> Optional[Productos]:
        return await self._get_with_relations(db, id)

    async def create(self, db: AsyncSession, *, obj_in: ProductosCreate) -> Productos:
        obj_data = obj_in.dict()
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        # Reload with relationships
        return await self._get_with_relations(db, db_obj.id_producto)

    async def update(
        self, db: AsyncSession, *, db_obj: Productos, obj_in: ProductosUpdate
    ) -> Productos:
        obj_data = obj_in.dict(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        # Reload with relationships
        return await self._get_with_relations(db, db_obj.id_producto)

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[Productos]:
        statement = (
            select(self.model)
            .options(
                selectinload(Productos.subcategoria).selectinload(
                    Subcategorias.categoria
                ),
                selectinload(Productos.moneda_compra_rel),
                selectinload(Productos.moneda_venta_rel),
            )
            .order_by(self.model.id_producto.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_nombre(self, db: AsyncSession, nombre: str) -> List[Productos]:
        statement = (
            select(Productos)
            .options(
                selectinload(Productos.subcategoria).selectinload(
                    Subcategorias.categoria
                ),
                selectinload(Productos.moneda_compra_rel),
                selectinload(Productos.moneda_venta_rel),
            )
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
        statement = (
            select(Productos)
            .options(
                selectinload(Productos.subcategoria).selectinload(
                    Subcategorias.categoria
                ),
                selectinload(Productos.moneda_compra_rel),
                selectinload(Productos.moneda_venta_rel),
            )
            .limit(limite)
        )
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
