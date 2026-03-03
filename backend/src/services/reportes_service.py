from typing import List, Optional, Dict, Any
from sqlmodel import select, func, case
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
                Productos.id_producto,
                Productos.nombre,
                Productos.codigo,
                Categorias.nombre.label("categoria_nombre"),
                Subcategorias.nombre.label("subcategoria_nombre"),
                func.sum(Movimiento.cantidad * TipoMovimiento.factor).label("stock_actual")
            )
            .join(Movimiento, Productos.id_producto == Movimiento.id_producto)
            .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)
            .join(Subcategorias, Productos.id_subcategoria == Subcategorias.id_subcategoria)
            .join(Categorias, Subcategorias.id_categoria == Categorias.id_categoria)
            .group_by(Productos.id_producto, Productos.nombre, Productos.codigo, Categorias.nombre, Subcategorias.nombre)
        )

        if id_dependencia:
            query = query.where(Movimiento.id_dependencia == id_dependencia)
            
        # Filtrar solo productos con stock > 0
        # Generalmente, reporte de existencias muestra todo lo que tiene movimiento o existencia.
        # Por ahora mostramos todo lo agrupado.
        
        results = (await self.db.exec(query)).all()
        
        report_data = []
        for row in results:
            if row.stock_actual != 0: 
                report_data.append({
                    "id_producto": row.id_producto,
                    "codigo": row.codigo,
                    "nombre": row.nombre,
                    "categoria": row.categoria_nombre,
                    "subcategoria": row.subcategoria_nombre,
                    "stock_actual": row.stock_actual
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
        query = (
            select(
                Movimiento,
                TipoMovimiento.tipo.label("tipo_movimiento"),
                TipoMovimiento.factor,
                Productos.nombre.label("producto_nombre"),
                Dependencia.nombre.label("dependencia_nombre")
            )
            .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)
            .join(Productos, Movimiento.id_producto == Productos.id_producto)
            .join(Dependencia, Movimiento.id_dependencia == Dependencia.id_dependencia)
            .order_by(Movimiento.fecha.desc())
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
        for row in results:
            mov = row.Movimiento
            report_data.append({
                "id_movimiento": mov.id_movimiento,
                "fecha": mov.fecha,
                "producto": row.producto_nombre,
                "tipo": row.tipo_movimiento,
                "cantidad": mov.cantidad,
                "factor": row.factor,
                "dependencia": row.dependencia_nombre,
                "observacion": mov.observacion,
                "saldo": 0 # TODO: Calcular saldo progresivo si es necesario
            })
            
        return report_data
