"""Mantenimiento de la tabla `saldos` (snapshot de stock por producto/dependencia).

`saldos.saldo` almacena la CANTIDAD NETA en unidades (Σ cantidad × factor de los
movimientos confirmados) por (id_producto, id_dependencia) hasta la fecha de la
fila. El valor monetario se calcula al leer (saldo × precio_compra actual), por
lo que la tabla no se ve afectada por cambios de precio o moneda.

Puntos de enganche (ambos en la MISMA transacción que cambia el estado):
- `MovimientoService.confirmar_movimiento` → `registrar_confirmacion`.
- `MovimientoService.cancelar_movimiento` → `recalcular_cadena`.

`saldos` es una caché derivada: `movimiento` sigue siendo la fuente de verdad.
Por eso toda escritura append (rápida) tiene fallback a `recalcular_cadena`
(reconstrucción completa del par) cuando la cronología se rompe.
"""

from decimal import Decimal
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.saldo import Saldo


class SaldoService:
    @staticmethod
    async def registrar_confirmacion(
        db: AsyncSession,
        movimiento: Movimiento,
        factor: int,
    ) -> None:
        """Registra el snapshot derivado de un movimiento recién confirmado.

        Debe llamarse DESPUÉS de poner `estado = "confirmado"` y ANTES del
        commit, para que el snapshot y el movimiento se persistan juntos.

        Casos:
        - No hay snapshots del par, o el movimiento es estrictamente posterior
          al último snapshot → append: saldo = último saldo + cantidad × factor.
        - El movimiento no es cronológico (fecha <= último snapshot; p. ej. un
          pendiente viejo confirmado tarde) → se recalcula toda la cadena del
          par para no corromper la lectura "más cercana hacia atrás".
        """
        delta = Decimal(movimiento.cantidad) * Decimal(factor)
        id_producto = movimiento.id_producto
        id_dependencia = movimiento.id_dependencia

        stmt = (
            select(Saldo)
            .where(
                Saldo.id_producto == id_producto,
                Saldo.id_dependencia == id_dependencia,
            )
            .order_by(Saldo.fecha.desc(), Saldo.id_saldo.desc())
            .limit(1)
        )
        # Bloquea la última fila ante confirmaciones concurrentes del mismo
        # producto+dependencia (evita pérdida de actualizaciones). SQLite
        # (tests) no soporta FOR UPDATE y lo ignora.
        if db.get_bind().dialect.name != "sqlite":
            stmt = stmt.with_for_update()

        ultimo = (await db.execute(stmt)).scalar_one_or_none()

        if ultimo is None:
            db.add(
                Saldo(
                    id_producto=id_producto,
                    id_dependencia=id_dependencia,
                    fecha=movimiento.fecha,
                    saldo=delta,
                )
            )
            return

        if movimiento.fecha > ultimo.fecha:
            db.add(
                Saldo(
                    id_producto=id_producto,
                    id_dependencia=id_dependencia,
                    fecha=movimiento.fecha,
                    saldo=ultimo.saldo + delta,
                )
            )
            return

        # Fuera de orden o empate de fecha: reconstruir la cadena completa.
        await SaldoService.recalcular_cadena(db, id_producto, id_dependencia)

    @staticmethod
    async def recalcular_cadena(
        db: AsyncSession, id_producto: int, id_dependencia: int
    ) -> None:
        """Reconstruye los snapshots del par desde los movimientos confirmados.

        Borra los snapshots existentes del par y los reinserta con el saldo
        acumulado en orden de fecha. Útil al cancelar un movimiento (cualquier
        snapshot posterior a su fecha queda inválido) y como fallback del
        registro fuera de orden. No hace commit: lo decide el llamador.
        """
        await db.execute(
            delete(Saldo).where(
                Saldo.id_producto == id_producto,
                Saldo.id_dependencia == id_dependencia,
            )
        )

        result = await db.execute(
            select(Movimiento.fecha, Movimiento.cantidad, TipoMovimiento.factor)
            .join(
                TipoMovimiento,
                Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
            )
            .where(
                Movimiento.id_producto == id_producto,
                Movimiento.id_dependencia == id_dependencia,
                Movimiento.estado == "confirmado",
            )
            .order_by(Movimiento.fecha, Movimiento.id_movimiento)
        )

        acumulado = Decimal(0)
        for fecha, cantidad, factor in result.all():
            acumulado += Decimal(cantidad) * Decimal(factor)
            db.add(
                Saldo(
                    id_producto=id_producto,
                    id_dependencia=id_dependencia,
                    fecha=fecha,
                    saldo=acumulado,
                )
            )

    @staticmethod
    async def obtener_saldo_anterior(
        db: AsyncSession,
        id_producto: int,
        id_dependencia: int,
        fecha: Any,
    ) -> Decimal:
        """Último snapshot con `fecha` estrictamente anterior al límite.

        Usado por el reporte como saldo inicial; devuelve 0 si no hay
        movimientos confirmados anteriores al rango filtrado.
        """
        stmt = (
            select(Saldo.saldo)
            .where(
                Saldo.id_producto == id_producto,
                Saldo.id_dependencia == id_dependencia,
                Saldo.fecha < fecha,
            )
            .order_by(Saldo.fecha.desc(), Saldo.id_saldo.desc())
            .limit(1)
        )
        resultado = (await db.execute(stmt)).scalar_one_or_none()
        return Decimal(resultado or 0)
