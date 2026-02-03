from sqlmodel import Session, select, func
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
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Productos]:
        statement = select(self.model).order_by(self.model.id_producto.desc()).offset(skip).limit(limit)
        return db.exec(statement).all()

    def get_by_nombre(self, db: Session, nombre: str) -> List[Productos]:
        statement = select(Productos).where(Productos.nombre.contains(nombre)).order_by(Productos.id_producto.desc())
        return db.exec(statement).all()

    def get_by_categoria(self, db: Session, id_categoria: int) -> List[Productos]:
        statement = select(Productos).where(
            Productos.id_subcategoria.in_(
                select(Productos.id_subcategoria).where(
                    Productos.id_subcategoria == id_categoria
                )
            )
        )
        return db.exec(statement).all()

    def get_stock_bajo(self, db: Session, limite: int = 10) -> List[Productos]:
        # Aquí podrías agregar lógica de stock si tienes un campo de stock
        statement = select(Productos).limit(limite)
        return db.exec(statement).all()


# Repositories específicos para cada entidad
class CategoriasRepository(CRUDBase[Categorias, CategoriasCreate, CategoriasUpdate]):
    pass


class VentasRepository(CRUDBase[Ventas, VentasCreate, VentasUpdate]):
    def get_by_mes(self, db: Session, year: int, month: int) -> List[Ventas]:
        statement = select(Ventas).where(
            func.extract("year", Ventas.fecha_registro) == year,
            func.extract("month", Ventas.fecha_registro) == month,
        )
        return db.exec(statement).all()

    def get_ventas_confirmadas(self, db: Session) -> List[Ventas]:
        statement = select(Ventas).where(Ventas.confirmacion)
        return db.exec(statement).all()


class MovimientoRepository(CRUDBase[Movimiento, MovimientoCreate, MovimientoUpdate]):
    def get_by_tipo(self, db: Session, id_tipo_movimiento: int) -> List[Movimiento]:
        statement = select(Movimiento).where(
            Movimiento.id_tipo_movimiento == id_tipo_movimiento
        )
        return db.exec(statement).all()

    def get_pendientes(self, db: Session) -> List[Movimiento]:
        statement = select(Movimiento).where(not Movimiento.confirmacion)
        return db.exec(statement).all()


# Instancias de repositories
productos_repo = ProductosRepository(Productos)
categorias_repo = CategoriasRepository(Categorias)
ventas_repo = VentasRepository(Ventas)
movimiento_repo = MovimientoRepository(Movimiento)
