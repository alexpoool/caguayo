from typing import List, Optional, Dict, Any
from sqlmodel import select, func, col
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime

from ..models.movimiento import Movimiento, TipoMovimiento
from ..models.producto import Productos
from ..models.dependencia import Dependencia
from ..models.anexo import Anexo
from ..models.convenio import Convenio
from ..models.cliente import Cliente


class ReportesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stock_por_producto(
        self, id_dependencia: Optional[int] = None, fecha_corte=None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene el stock actual de productos.
        Si se especifica id_dependencia, filtra por esa dependencia.
        Si se especifica fecha_corte, solo considera movimientos hasta esa fecha.
        """
        from datetime import datetime, time

        # Calcular el stock sumando (cantidad * factor)
        # Necesitamos unir Movimiento con TipoMovimiento para obtener el factor

        query = (
            select(
                Productos,
                func.sum(Movimiento.cantidad * TipoMovimiento.factor).label(
                    "stock_actual"
                ),
            )
            .join(Movimiento, Productos.id_producto == Movimiento.id_producto)  # type: ignore
            .join(
                TipoMovimiento,
                Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
            )  # type: ignore
            .group_by(col(Productos.id_producto))
        )

        if id_dependencia:
            query = query.where(Movimiento.id_dependencia == id_dependencia)

        if fecha_corte:
            # Incluir todos los movimientos hasta el final del día de corte
            fecha_limite = datetime.combine(fecha_corte, time(23, 59, 59))
            query = query.where(Movimiento.fecha <= fecha_limite)

        results = (await self.db.exec(query)).all()

        report_data = []
        for row in results:
            producto = row[0]
            stock_actual = row[1]
            if stock_actual != 0:
                report_data.append(
                    {
                        "id_producto": producto.id_producto,
                        "codigo": producto.codigo,
                        "nombre": producto.nombre,
                        "stock_actual": stock_actual,
                    }
                )

        return report_data

    async def get_movimientos_filtro(
        self,
        fecha_inicio: Optional[datetime],
        fecha_fin: Optional[datetime],
        id_dependencia: Optional[int] = None,
        id_producto: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Obtiene un reporte detallado de movimientos.
        Cada fila incluye:
          - saldo_inicial: stock acumulado ANTES del movimiento
          - saldo_final:   saldo_inicial + (cantidad * factor)
          - codigo_producto:   código corto del producto (ej. ART-001)
          - codigo_movimiento: código extenso del movimiento/lote
        """

        # ── 1. Obtener movimientos con datos relacionados ────
        query = (
            select(  # type: ignore
                Movimiento,
                col(TipoMovimiento.tipo),
                col(TipoMovimiento.factor),
                col(Productos.nombre),
                col(Productos.codigo),
                col(Dependencia.nombre),
                col(Anexo.codigo).label("anexo_codigo"),
                col(Anexo.numero_anexo).label("anexo_numero"),
                col(Cliente.nombre).label("proveedor_nombre"),
            )
            .join(
                TipoMovimiento,
                Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
            )  # type: ignore
            .join(Productos, Movimiento.id_producto == Productos.id_producto)  # type: ignore
            .join(Dependencia, Movimiento.id_dependencia == Dependencia.id_dependencia)  # type: ignore
            .outerjoin(Anexo, Movimiento.id_anexo == Anexo.id_anexo)  # type: ignore
            .outerjoin(Convenio, Movimiento.id_convenio == Convenio.id_convenio)  # type: ignore
            .outerjoin(Cliente, Convenio.id_cliente == Cliente.id_cliente)  # type: ignore
            .order_by(
                col(Movimiento.fecha).desc(), col(Movimiento.id_movimiento).desc()
            )
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

        if not results:
            return []

        # ── 2. Calcular stock acumulado por producto hasta fecha_fin ──
        product_ids = list({row[0].id_producto for row in results})

        stock_query = (
            select(
                Movimiento.id_producto,
                func.sum(Movimiento.cantidad * TipoMovimiento.factor),
            )
            .join(
                TipoMovimiento,
                Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
            )  # type: ignore
            .where(col(Movimiento.id_producto).in_(product_ids))
            .group_by(Movimiento.id_producto)
        )
        if fecha_fin:
            stock_query = stock_query.where(Movimiento.fecha <= fecha_fin)

        stock_results = (await self.db.exec(stock_query)).all()
        saldos: Dict[int, int] = {row[0]: int(row[1] or 0) for row in stock_results}

        # ── 3. Recorrer movimientos (DESC) calculando saldo_inicial / saldo_final ──
        report_data = []
        for row in results:
            mov = row[0]
            tipo_movimiento = row[1]
            factor = row[2]
            producto_nombre = row[3]
            codigo_producto = row[4]
            dependencia_nombre = row[5]
            anexo_codigo = row[6]
            anexo_numero = row[7]
            proveedor_nombre = row[8]

            # Construir el Código Extenso: PROD / ANEXO / PROVEEDOR
            partes_codigo = [
                x
                for x in [
                    codigo_producto or "",
                    anexo_codigo or anexo_numero or "",
                    proveedor_nombre or "",
                ]
                if x
            ]
            codigo_extenso = " / ".join(partes_codigo)

            pid = mov.id_producto
            impacto = mov.cantidad * factor

            saldo_final = saldos.get(pid, 0)
            saldo_inicial = saldo_final - impacto
            # Actualizar saldo acumulado para el siguiente movimiento (más antiguo)
            saldos[pid] = saldo_inicial

            report_data.append(
                {
                    "id_movimiento": mov.id_movimiento,
                    "fecha": mov.fecha,
                    "producto": producto_nombre,
                    "codigo_producto": codigo_producto or "",
                    "codigo_movimiento": codigo_extenso,
                    "tipo": tipo_movimiento,
                    "cantidad": mov.cantidad,
                    "factor": factor,
                    "dependencia": dependencia_nombre,
                    "observacion": mov.observacion,
                    "saldo_inicial": saldo_inicial,
                    "saldo_final": saldo_final,
                }
            )

        return report_data
