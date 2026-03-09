from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import productos_repo, categorias_repo, moneda_repo
from src.repository.ventas_clientes_repo import ventas_repo, cliente_repo
from src.dto import (
    ProductosRead,
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
    Cliente,
    Movimiento,
    TipoMovimiento,
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
        """Obtener todas las estadísticas del dashboard."""

        # Fechas de referencia
        hoy = datetime.now().date()
        ayer = hoy - timedelta(days=1)
        inicio_hoy = datetime.combine(hoy, datetime.min.time())
        fin_hoy = datetime.combine(hoy, datetime.max.time())
        inicio_ayer = datetime.combine(ayer, datetime.min.time())
        fin_ayer = datetime.combine(ayer, datetime.max.time())

        # Conteos principales
        productos = await productos_repo.get_all(db)
        total_productos = len(productos)

        ventas = await ventas_repo.get_all(db)
        total_ventas = len(ventas)

        clientes = await cliente_repo.get_all(db)
        total_clientes = len(clientes)

        categorias = await categorias_repo.get_all(db)
        total_categorias = len(categorias)

        monedas = await moneda_repo.get_all(db)
        total_monedas = len(monedas)

        # Ventas de hoy (prioridad según usuario)
        ventas_hoy_list = await ventas_repo.get_by_fecha_range(db, inicio_hoy, fin_hoy)
        ventas_hoy = Decimal(str(sum(v.total for v in ventas_hoy_list)))
        ventas_hoy_cantidad = len(ventas_hoy_list)

        # Ventas de ayer para comparativa
        ventas_ayer_list = await ventas_repo.get_by_fecha_range(
            db, inicio_ayer, fin_ayer
        )
        ventas_ayer = Decimal(str(sum(v.total for v in ventas_ayer_list)))

        # Cálculo de crecimiento porcentaje
        if ventas_ayer > 0:
            ventas_crecimiento_porcentaje = float(
                ((ventas_hoy - ventas_ayer) / ventas_ayer) * 100
            )
        else:
            ventas_crecimiento_porcentaje = 100.0 if ventas_hoy > 0 else 0.0

        # Estados de ventas
        ventas_pendientes = len(
            [v for v in ventas if v.estado == EstadoVenta.PENDIENTE]
        )
        ventas_completadas = len(
            [v for v in ventas if v.estado == EstadoVenta.COMPLETADA]
        )
        ventas_anuladas = len([v for v in ventas if v.estado == EstadoVenta.ANULADA])

        # Ticket promedio
        if ventas:
            ticket_promedio = Decimal(str(sum(v.total for v in ventas))) / Decimal(
                len(ventas)
            )
        else:
            ticket_promedio = Decimal("0")

        # Inventario - Calcular cantidades basadas en movimientos
        # Obtener productos con cantidades calculadas
        from src.dto import ProductoSimpleRead

        productos_con_cantidad = []
        productos_agotados = 0
        valor_inventario_compra = Decimal("0")
        valor_inventario_venta = Decimal("0")

        for p in productos:
            cantidad = await calcular_cantidad_producto(db, p.id_producto)

            # Crear DTO simple sin relaciones lazy
            producto_dto = ProductoSimpleRead(
                id_producto=p.id_producto,
                codigo=p.codigo,
                nombre=p.nombre,
                descripcion=p.descripcion,
                precio_venta=p.precio_venta,
                precio_minimo=p.precio_minimo,
                cantidad=cantidad,
            )
            productos_con_cantidad.append(producto_dto)

            if cantidad == 0:
                productos_agotados += 1

            valor_inventario_compra += Decimal(str(p.precio_compra or 0)) * Decimal(
                cantidad
            )
            valor_inventario_venta += Decimal(str(p.precio_venta or 0)) * Decimal(
                cantidad
            )

        # Productos con stock bajo (cantidad <= 10)
        productos_stock_bajo_dto = [
            p for p in productos_con_cantidad if p.cantidad <= 10
        ][:5]

        # Últimas ventas (con relaciones)
        ultimas_ventas_db = await ventas_repo.get_multi_with_relations(
            db, skip=0, limit=5
        )
        ultimas_ventas = [VentaRead.model_validate(v) for v in ultimas_ventas_db]

        # Clientes recientes (últimos 5 registrados)
        clientes_recientes_db = await cliente_repo.get_multi(db, skip=0, limit=5)
        clientes_recientes = [
            ClienteRead.model_validate(c) for c in clientes_recientes_db
        ]

        # Top productos vendidos
        top_productos = await DashboardService._get_top_productos(db)

        return DashboardStats(
            total_productos=total_productos,
            total_ventas=total_ventas,
            total_clientes=total_clientes,
            total_categorias=total_categorias,
            total_monedas=total_monedas,
            ventas_hoy=ventas_hoy,
            ventas_hoy_cantidad=ventas_hoy_cantidad,
            ventas_ayer=ventas_ayer,
            ventas_crecimiento_porcentaje=ventas_crecimiento_porcentaje,
            ventas_pendientes=ventas_pendientes,
            ventas_completadas=ventas_completadas,
            ventas_anuladas=ventas_anuladas,
            ticket_promedio=ticket_promedio,
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
        from src.models import DetalleVenta

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
        """Obtener tendencia de ventas para gráficos."""
        hoy = datetime.now().date()
        fechas = []
        montos = []
        cantidades = []

        for i in range(dias - 1, -1, -1):
            fecha = hoy - timedelta(days=i)
            inicio = datetime.combine(fecha, datetime.min.time())
            fin = datetime.combine(fecha, datetime.max.time())

            # Obtener ventas del día
            ventas_dia = await ventas_repo.get_by_fecha_range(db, inicio, fin)

            fechas.append(fecha.isoformat())
            montos.append(Decimal(str(sum(v.total for v in ventas_dia))))
            cantidades.append(len(ventas_dia))

        return VentasTrends(
            fechas=fechas, montos=montos, cantidades=cantidades, periodo="semana"
        )

    @staticmethod
    async def get_movimientos_trends(
        db: AsyncSession, dias: int = 7
    ) -> MovimientosTrends:
        """Obtener tendencia de movimientos para gráficos."""
        hoy = datetime.now().date()
        fechas = []
        recepciones = []
        mermas = []
        donaciones = []
        devoluciones = []

        for i in range(dias - 1, -1, -1):
            fecha = hoy - timedelta(days=i)
            inicio = datetime.combine(fecha, datetime.min.time())
            fin = datetime.combine(fecha, datetime.max.time())

            # Obtener movimientos del día con su tipo
            statement = (
                select(
                    TipoMovimiento.tipo,
                    func.count(Movimiento.id_movimiento).label("cantidad"),
                )
                .join(
                    Movimiento,
                    Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
                )
                .where(Movimiento.fecha >= inicio)
                .where(Movimiento.fecha <= fin)
                .group_by(TipoMovimiento.tipo)
            )

            results = await db.exec(statement)
            movimientos_dia = {row.tipo: row.cantidad for row in results.all()}

            fechas.append(fecha.isoformat())
            recepciones.append(movimientos_dia.get("RECEPCION", 0))
            mermas.append(movimientos_dia.get("MERMA", 0))
            donaciones.append(movimientos_dia.get("DONACION", 0))
            devoluciones.append(movimientos_dia.get("DEVOLUCION", 0))

        return MovimientosTrends(
            fechas=fechas,
            recepciones=recepciones,
            mermas=mermas,
            donaciones=donaciones,
            devoluciones=devoluciones,
            periodo="semana",
        )
