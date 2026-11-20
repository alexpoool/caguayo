from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from sqlmodel import select, func
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import productos_repo, categorias_repo, moneda_repo
from src.repository.ventas_clientes_repo import ventas_repo, ventas_cliente_repo
from src.dto import (
    DashboardStats,
    ProductoStats,
    VentasTrends,
    MovimientosTrends,
    VentaRead,
    ClienteRead,
)
from src.models import (
    Ventas,
    EstadoVenta,
    Productos,
    Movimiento,
    TipoMovimiento,
    DetalleVenta,
    Cliente,
)


async def calcular_cantidad_producto(db: AsyncSession, producto_id: int) -> int:
    """Calcular la cantidad disponible de un producto basado en movimientos confirmados."""
    statement = (
        select(func.sum(Movimiento.cantidad * TipoMovimiento.factor))
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .where(Movimiento.id_producto == producto_id)
        .where(Movimiento.estado == "confirmado")
    )
    result = await db.exec(statement)
    cantidad = result.first()
    return int(cantidad) if cantidad else 0


class DashboardService:
    @staticmethod
    async def get_stats(db: AsyncSession) -> DashboardStats:
        """Obtener estadísticas del dashboard usando agregaciones SQL."""
        from src.dto import ProductoSimpleRead
        from src.models import Categorias, Moneda
        from sqlalchemy import case

        hoy = datetime.now().date()
        ayer = hoy - timedelta(days=1)
        inicio_hoy = datetime.combine(hoy, datetime.min.time())
        fin_hoy = datetime.combine(hoy, datetime.max.time())
        inicio_ayer = datetime.combine(ayer, datetime.min.time())
        fin_ayer = datetime.combine(ayer, datetime.max.time())

        # Conteos y métricas generales sin cargar todas las filas.
        result = await db.exec(select(
            func.count(Ventas.id_venta).label("total"),
            func.count(case((Ventas.estado == EstadoVenta.PENDIENTE, 1))).label("pendientes"),
            func.count(case((Ventas.estado == EstadoVenta.COMPLETADA, 1))).label("completadas"),
            func.count(case((Ventas.estado == EstadoVenta.ANULADA, 1))).label("anuladas"),
            func.coalesce(func.avg(Ventas.total), 0).label("ticket"),
        ))
        ventas_stats = result.one()
        total_productos = (await db.exec(select(func.count()).select_from(Productos))).one()
        total_clientes = (await db.exec(select(func.count()).select_from(Cliente))).one()
        total_categorias = (await db.exec(select(func.count()).select_from(Categorias))).one()
        total_monedas = (await db.exec(select(func.count()).select_from(Moneda))).one()

        periodo_result = await db.exec(select(
            func.coalesce(func.sum(case((
                (Ventas.fecha >= inicio_hoy) & (Ventas.fecha <= fin_hoy), Ventas.total
            ), else_=0)), 0).label("hoy"),
            func.count(case((
                (Ventas.fecha >= inicio_hoy) & (Ventas.fecha <= fin_hoy), 1
            ))).label("cantidad_hoy"),
            func.coalesce(func.sum(case((
                (Ventas.fecha >= inicio_ayer) & (Ventas.fecha <= fin_ayer), Ventas.total
            ), else_=0)), 0).label("ayer"),
        ).where(Ventas.fecha >= inicio_ayer, Ventas.fecha <= fin_hoy))
        periodo = periodo_result.one()
        ventas_hoy = Decimal(str(periodo.hoy or 0))
        ventas_ayer = Decimal(str(periodo.ayer or 0))
        ventas_hoy_cantidad = int(periodo.cantidad_hoy or 0)
        crecimiento = float(((ventas_hoy - ventas_ayer) / ventas_ayer) * 100) if ventas_ayer > 0 else (100.0 if ventas_hoy > 0 else 0.0)

        # Calcular existencias de todos los productos en una única consulta.
        stock_statement = select(
            Productos.id_producto, Productos.codigo, Productos.nombre,
            Productos.descripcion, Productos.precio_venta, Productos.precio_minimo,
            Productos.precio_compra,
            func.coalesce(func.sum(Movimiento.cantidad * TipoMovimiento.factor), 0).label("cantidad"),
        ).select_from(Productos).outerjoin(
            Movimiento,
            (Movimiento.id_producto == Productos.id_producto) & (Movimiento.estado == "confirmado"),
        ).outerjoin(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        ).group_by(Productos.id_producto)
        stock_result = await db.exec(stock_statement)
        productos_agotados = 0
        valor_inventario_compra = Decimal("0")
        valor_inventario_venta = Decimal("0")
        productos_stock_bajo_dto = []
        for row in stock_result.all():
            cantidad = int(row.cantidad or 0)
            if cantidad <= 0:
                productos_agotados += 1
            valor_inventario_compra += Decimal(str(row.precio_compra or 0)) * cantidad
            valor_inventario_venta += Decimal(str(row.precio_venta or 0)) * cantidad
            if cantidad <= 10 and len(productos_stock_bajo_dto) < 5:
                productos_stock_bajo_dto.append(ProductoSimpleRead(
                    id_producto=row.id_producto, codigo=row.codigo, nombre=row.nombre,
                    descripcion=row.descripcion, precio_venta=row.precio_venta,
                    precio_minimo=row.precio_minimo, cantidad=cantidad,
                ))

        ultimas_ventas_db = await ventas_repo.get_multi(
            db, skip=0, limit=5,
            load_options=[
                selectinload(Ventas.cliente).selectinload(Cliente.provincia),
                selectinload(Ventas.cliente).selectinload(Cliente.municipio),
                selectinload(Ventas.cliente).selectinload(Cliente.cliente_natural),
                selectinload(Ventas.cliente).selectinload(Cliente.cliente_juridica),
                selectinload(Ventas.cliente).selectinload(Cliente.cliente_tcp),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            ],
        )
        ultimas_ventas = [VentaRead.model_validate(v) for v in ultimas_ventas_db]
        clientes_recientes_db = await ventas_cliente_repo.get_multi(
            db, skip=0, limit=5,
            load_options=[
                selectinload(Cliente.provincia), selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas), selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica), selectinload(Cliente.cliente_tcp),
            ],
        )
        clientes_recientes = [ClienteRead.model_validate(c) for c in clientes_recientes_db]
        top_productos = await DashboardService._get_top_productos(db)

        return DashboardStats(
            total_productos=total_productos,
            total_ventas=int(ventas_stats.total or 0),
            total_clientes=total_clientes,
            total_categorias=total_categorias,
            total_monedas=total_monedas,
            ventas_hoy=ventas_hoy,
            ventas_hoy_cantidad=ventas_hoy_cantidad,
            ventas_ayer=ventas_ayer,
            ventas_crecimiento_porcentaje=crecimiento,
            ventas_pendientes=int(ventas_stats.pendientes or 0),
            ventas_completadas=int(ventas_stats.completadas or 0),
            ventas_anuladas=int(ventas_stats.anuladas or 0),
            ticket_promedio=Decimal(str(ventas_stats.ticket or 0)),
            productos_stock_bajo=productos_stock_bajo_dto,
            productos_agotados=productos_agotados,
            valor_inventario_compra=valor_inventario_compra,
            valor_inventario_venta=valor_inventario_venta,
            ultimas_ventas=ultimas_ventas,
            clientes_recientes=clientes_recientes,
            top_productos=top_productos,
        )

    @staticmethod
    async def _get_top_productos(
        db: AsyncSession, limit: int = 5
    ) -> List[ProductoStats]:
        """Obtener los productos más vendidos."""
        # Consulta para obtener productos más vendidos
        statement = (
            select(
                Productos.id_producto,
                Productos.nombre,
                func.sum(DetalleVenta.cantidad).label("cantidad_vendida"),
                func.sum(DetalleVenta.cantidad * DetalleVenta.precio_unitario).label(
                    "monto_total"
                ),
            )
            .join(DetalleVenta, Productos.id_producto == DetalleVenta.id_producto)
            .join(Ventas, DetalleVenta.id_venta == Ventas.id_venta)
            .where(Ventas.estado == EstadoVenta.COMPLETADA)
            .group_by(Productos.id_producto, Productos.nombre)
            .order_by(func.sum(DetalleVenta.cantidad).desc())
            .limit(limit)
        )

        results = await db.exec(statement)
        productos_data = results.all()

        # Calcular total para porcentajes
        total_monto = (
            sum(float(p.monto_total) for p in productos_data) if productos_data else 1
        )

        top_productos = []
        for p in productos_data:
            porcentaje = (
                (float(p.monto_total) / total_monto) * 100 if total_monto > 0 else 0
            )
            top_productos.append(
                ProductoStats(
                    id_producto=p.id_producto,
                    nombre=p.nombre,
                    cantidad_vendida=int(p.cantidad_vendida),
                    monto_total=Decimal(str(p.monto_total)),
                    porcentaje=round(porcentaje, 1),
                )
            )

        return top_productos

    @staticmethod
    async def get_trends(db: AsyncSession, dias: int = 7) -> VentasTrends:
        """Obtener tendencia de ventas con una sola consulta agregada."""
        hoy = datetime.now().date()
        desde = hoy - timedelta(days=max(dias - 1, 0))
        inicio = datetime.combine(desde, datetime.min.time())
        fin = datetime.combine(hoy, datetime.max.time())
        statement = select(
            func.date(Ventas.fecha).label("fecha"),
            func.coalesce(func.sum(Ventas.total), 0).label("monto"),
            func.count(Ventas.id_venta).label("cantidad"),
        ).where(Ventas.fecha >= inicio, Ventas.fecha <= fin).group_by(
            func.date(Ventas.fecha)
        )
        result = await db.exec(statement)
        por_fecha = {row.fecha.isoformat(): row for row in result.all()}
        fechas, montos, cantidades = [], [], []
        for i in range(max(dias, 0) - 1, -1, -1):
            fecha = hoy - timedelta(days=i)
            row = por_fecha.get(fecha.isoformat())
            fechas.append(fecha.isoformat())
            montos.append(Decimal(str(row.monto or 0)) if row else Decimal("0"))
            cantidades.append(int(row.cantidad or 0) if row else 0)
        return VentasTrends(fechas=fechas, montos=montos, cantidades=cantidades, periodo="semana")

    @staticmethod
    async def get_movimientos_trends(
        db: AsyncSession, dias: int = 7
    ) -> MovimientosTrends:
        """Obtener tendencia de movimientos con una sola consulta agregada."""
        hoy = datetime.now().date()
        desde = hoy - timedelta(days=max(dias - 1, 0))
        inicio = datetime.combine(desde, datetime.min.time())
        fin = datetime.combine(hoy, datetime.max.time())
        statement = select(
            func.date(Movimiento.fecha).label("fecha"),
            TipoMovimiento.tipo,
            func.count(Movimiento.id_movimiento).label("cantidad"),
        ).join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        ).where(
            Movimiento.fecha >= inicio, Movimiento.fecha <= fin
        ).group_by(func.date(Movimiento.fecha), TipoMovimiento.tipo)
        result = await db.exec(statement)
        por_fecha_tipo = {
            (row.fecha.isoformat(), row.tipo): int(row.cantidad or 0)
            for row in result.all()
        }
        fechas = [(hoy - timedelta(days=i)).isoformat() for i in range(max(dias, 0) - 1, -1, -1)]
        return MovimientosTrends(
            fechas=fechas,
            recepciones=[por_fecha_tipo.get((f, "RECEPCION"), 0) for f in fechas],
            mermas=[por_fecha_tipo.get((f, "MERMA"), 0) for f in fechas],
            donaciones=[por_fecha_tipo.get((f, "DONACION"), 0) for f in fechas],
            devoluciones=[por_fecha_tipo.get((f, "DEVOLUCION"), 0) for f in fechas],
            periodo="semana",
        )
