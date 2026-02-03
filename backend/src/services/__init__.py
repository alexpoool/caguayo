from sqlmodel import Session
from decimal import Decimal
from datetime import datetime
from typing import List
from src.repository import productos_repo, categorias_repo, ventas_repo, movimiento_repo
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    ProductosRead,
    CategoriasCreate,
    CategoriasUpdate,
    CategoriasRead,
    VentasCreate,
    VentasUpdate,
    VentasRead,
    MovimientoCreate,
    MovimientoUpdate,
    MovimientoRead,
    DashboardStats,
)
from src.models import Productos, Categorias, Ventas, Movimiento


class ProductosService:
    @staticmethod
    def create_producto(db: Session, producto: ProductosCreate) -> ProductosRead:
        db_producto = productos_repo.create(db, obj_in=producto)
        return ProductosRead.from_orm(db_producto)

    @staticmethod
    def get_producto(db: Session, producto_id: int) -> ProductosRead:
        db_producto = productos_repo.get(db, id=producto_id)
        return ProductosRead.from_orm(db_producto) if db_producto else None

    @staticmethod
    def get_productos(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[ProductosRead]:
        db_productos = productos_repo.get_multi(db, skip=skip, limit=limit)
        return [ProductosRead.from_orm(p) for p in db_productos]

    @staticmethod
    def update_producto(
        db: Session, producto_id: int, producto: ProductosUpdate
    ) -> ProductosRead:
        db_producto = productos_repo.get(db, id=producto_id)
        if db_producto:
            updated_producto = productos_repo.update(
                db, db_obj=db_producto, obj_in=producto
            )
            return ProductosRead.from_orm(updated_producto)
        return None

    @staticmethod
    def delete_producto(db: Session, producto_id: int) -> bool:
        return productos_repo.remove(db, id=producto_id) is not None

    @staticmethod
    def search_productos(db: Session, nombre: str) -> List[ProductosRead]:
        db_productos = productos_repo.get_by_nombre(db, nombre=nombre)
        return [ProductosRead.from_orm(p) for p in db_productos]


class CategoriasService:
    @staticmethod
    def create_categoria(db: Session, categoria: CategoriasCreate) -> CategoriasRead:
        db_categoria = categorias_repo.create(db, obj_in=categoria)
        return CategoriasRead.from_orm(db_categoria)

    @staticmethod
    def get_categoria(db: Session, categoria_id: int) -> CategoriasRead:
        db_categoria = categorias_repo.get(db, id=categoria_id)
        return CategoriasRead.from_orm(db_categoria) if db_categoria else None

    @staticmethod
    def get_categorias(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[CategoriasRead]:
        db_categorias = categorias_repo.get_multi(db, skip=skip, limit=limit)
        return [CategoriasRead.from_orm(c) for c in db_categorias]

    @staticmethod
    def update_categoria(
        db: Session, categoria_id: int, categoria: CategoriasUpdate
    ) -> CategoriasRead:
        db_categoria = categorias_repo.get(db, id=categoria_id)
        if db_categoria:
            updated_categoria = categorias_repo.update(
                db, db_obj=db_categoria, obj_in=categoria
            )
            return CategoriasRead.from_orm(updated_categoria)
        return None

    @staticmethod
    def delete_categoria(db: Session, categoria_id: int) -> bool:
        return categorias_repo.remove(db, id=categoria_id) is not None


class VentasService:
    @staticmethod
    def create_venta(db: Session, venta: VentasCreate) -> VentasRead:
        db_venta = ventas_repo.create(db, obj_in=venta)
        return VentasRead.from_orm(db_venta)

    @staticmethod
    def get_venta(db: Session, venta_id: int) -> VentasRead:
        db_venta = ventas_repo.get(db, id=venta_id)
        return VentasRead.from_orm(db_venta) if db_venta else None

    @staticmethod
    def get_ventas(db: Session, skip: int = 0, limit: int = 100) -> List[VentasRead]:
        db_ventas = ventas_repo.get_multi(db, skip=skip, limit=limit)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    def get_ventas_mes_actual(db: Session) -> List[VentasRead]:
        now = datetime.now()
        db_ventas = ventas_repo.get_by_mes(db, year=now.year, month=now.month)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    def confirmar_venta(db: Session, venta_id: int) -> VentasRead:
        db_venta = ventas_repo.get(db, id=venta_id)
        if db_venta:
            db_venta.confirmacion = True
            db.commit()
            db.refresh(db_venta)
            return VentasRead.from_orm(db_venta)
        return None


class MovimientoService:
    @staticmethod
    def create_movimiento(db: Session, movimiento: MovimientoCreate) -> MovimientoRead:
        db_movimiento = movimiento_repo.create(db, obj_in=movimiento)
        return MovimientoRead.from_orm(db_movimiento)

    @staticmethod
    def get_movimiento(db: Session, movimiento_id: int) -> MovimientoRead:
        db_movimiento = movimiento_repo.get(db, id=movimiento_id)
        return MovimientoRead.from_orm(db_movimiento) if db_movimiento else None

    @staticmethod
    def get_movimientos(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[MovimientoRead]:
        db_movimientos = movimiento_repo.get_multi(db, skip=skip, limit=limit)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    def get_movimientos_pendientes(db: Session) -> List[MovimientoRead]:
        db_movimientos = movimiento_repo.get_pendientes(db)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    def confirmar_movimiento(db: Session, movimiento_id: int) -> MovimientoRead:
        db_movimiento = movimiento_repo.get(db, id=movimiento_id)
        if db_movimiento:
            db_movimiento.confirmacion = True
            db.commit()
            db.refresh(db_movimiento)
            return MovimientoRead.from_orm(db_movimiento)
        return None


class DashboardService:
    @staticmethod
    def get_stats(db: Session) -> DashboardStats:
        # Obtener estadísticas básicas
        total_productos = len(productos_repo.get_all(db))
        total_ventas = len(ventas_repo.get_all(db))
        total_movimientos = len(movimiento_repo.get_all(db))
        total_categorias = len(categorias_repo.get_all(db))

        # Ventas del mes actual
        ventas_mes = ventas_repo.get_by_mes(
            db, datetime.now().year, datetime.now().month
        )
        ventas_mes_actual = sum(v.monto for v in ventas_mes)

        # Productos con stock bajo (simulado)
        productos_stock = productos_repo.get_stock_bajo(db, limite=5)
        productos_stock_bajo = [ProductosRead.from_orm(p) for p in productos_stock]

        return DashboardStats(
            total_productos=total_productos,
            total_ventas=total_ventas,
            total_movimientos=total_movimientos,
            total_categorias=total_categorias,
            ventas_mes_actual=ventas_mes_actual,
            productos_stock_bajo=productos_stock_bajo,
        )
