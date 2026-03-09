from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
from src.models import Productos, Subcategorias
from src.repository.base import CRUDBase
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
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
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, search: str = None
    ) -> List[Productos]:
        statement = select(self.model).options(
            selectinload(Productos.subcategoria).selectinload(Subcategorias.categoria),
            selectinload(Productos.moneda_compra_rel),
            selectinload(Productos.moneda_venta_rel),
        )

        # Agregar filtro de búsqueda si se proporciona
        if search:
            search_term = f"%{search}%"
            statement = statement.where(
                (self.model.nombre.ilike(search_term))
                | (self.model.descripcion.ilike(search_term))
            )

        statement = (
            statement.order_by(self.model.id_producto.desc()).offset(skip).limit(limit)
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
        self, db: AsyncSession, limite: int = 5
    ) -> List[Productos]:
        """Obtener productos con stock bajo basado en movimientos confirmados.

        Por ahora retorna los primeros productos. En una implementación completa,
        se calcularía la cantidad real sumando los movimientos confirmados.
        """
        statement = (
            select(self.model)
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
        return list(results.all())


productos_repo = ProductosRepository(Productos)
