from typing import List, Optional, Dict, Any
from sqlmodel import select, func, col
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime

from ..models.movimiento import Movimiento, TipoMovimiento
from ..models.producto import Productos
from ..models.dependencia import Dependencia
from ..models.categoria import Categorias, Subcategorias

class ReportesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stock_por_producto(self, id_dependencia: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtiene el stock actual de productos.
        Si se especifica id_dependencia, filtra por esa dependencia.
        """
        # Calcular el stock sumando (cantidad * factor)
        # Necesitamos unir Movimiento con TipoMovimiento para obtener el factor
        
        query = (
            select(
                Productos,
                Categorias.nombre,
                Subcategorias.nombre,
                func.sum(Movimiento.cantidad * TipoMovimiento.factor).label("stock_actual")
            )
            .join(Movimiento, Productos.id_producto == Movimiento.id_producto)  # type: ignore
            .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)  # type: ignore
            .join(Subcategorias, Productos.id_subcategoria == Subcategorias.id_subcategoria)  # type: ignore
            .join(Categorias, Subcategorias.id_categoria == Categorias.id_categoria)  # type: ignore
            .group_by(col(Productos.id_producto), col(Categorias.nombre), col(Subcategorias.nombre))
        )

        if id_dependencia:
            query = query.where(Movimiento.id_dependencia == id_dependencia)
            
        # Filtrar solo productos con stock > 0
        # Generalmente, reporte de existencias muestra todo lo que tiene movimiento o existencia.
        # Por ahora mostramos todo lo agrupado.
        
        results = (await self.db.exec(query)).all()
        
        report_data = []
        for row in results:
            producto = row[0]
            stock_actual = row[3]
            if stock_actual != 0:
                report_data.append({
                    "id_producto": producto.id_producto,
                    "codigo": producto.codigo,
                    "nombre": producto.nombre,
                    "categoria": row[1],
                    "subcategoria": row[2],
                    "stock_actual": stock_actual
                })
                
        return report_data

    async def get_movimientos_filtro(
        self, 
        fecha_inicio: Optional[datetime],
        fecha_fin: Optional[datetime],
        id_dependencia: Optional[int] = None,
        id_producto: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene un reporte detallado de movimientos.
        """
        saldo_inicial = 0
        
        # Calcular el stock total hasta la fecha_fin (o actual) para el saldo regresivo
        if id_producto:
            query_stock = (
                select(func.sum(Movimiento.cantidad * TipoMovimiento.factor))
                .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)  # type: ignore
                .where(Movimiento.id_producto == id_producto)
            )
            if fecha_fin:
                query_stock = query_stock.where(Movimiento.fecha <= fecha_fin)
            
            result_stock = (await self.db.exec(query_stock)).first()
            if result_stock:
                saldo_inicial = result_stock[0] or 0  # type: ignore

        query = (
            select(  # type: ignore
                Movimiento,
                col(TipoMovimiento.tipo),
                col(TipoMovimiento.factor),
                col(Productos.nombre),
                col(Dependencia.nombre)
            )
            .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)  # type: ignore
            .join(Productos, Movimiento.id_producto == Productos.id_producto)  # type: ignore
            .join(Dependencia, Movimiento.id_dependencia == Dependencia.id_dependencia)  # type: ignore
            .order_by(col(Movimiento.fecha).desc(), col(Movimiento.id_movimiento).desc())
        )

        if fecha_inicio:
            query = query.where(Movimiento.fecha >= fecha_inicio)
        if fecha_fin:
            query = query.where(Movimiento.fecha <= fecha_fin)
        if id_dependencia:
            query = query.where(Movimiento.id_dependencia == id_dependencia)
        if id_producto:
            query = query.where(Movimiento.id_producto == id_producto)

        results = (await self.db.exec(query)).all()
        
        report_data = []
        current_saldo = saldo_inicial

        for row in results:
            mov = row[0]
            tipo_movimiento = row[1]
            factor = row[2]
            producto_nombre = row[3]
            dependencia_nombre = row[4]

            impacto = mov.cantidad * factor

            report_data.append({
                "id_movimiento": mov.id_movimiento,
                "fecha": mov.fecha,
                "producto": producto_nombre,
                "tipo": tipo_movimiento,
                "cantidad": mov.cantidad,
                "factor": factor,
                "dependencia": dependencia_nombre,
                "observacion": mov.observacion,
                "saldo": current_saldo 
            })
            
            # Restamos el impacto para obtener el saldo anterior (ya que vamos hacia atras en el tiempo)
            current_saldo = current_saldo - impacto
            
        return report_data
