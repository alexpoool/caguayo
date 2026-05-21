from datetime import datetime
from sqlmodel import select
from src.services.movimiento_service import MovimientoService
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos


async def test_confirmar_entrada_salida(db_session):
    """Compra (entrada) y MERMA (salida): ambos se confirman y actualizan stock."""

    producto_id = 203
    cantidad_compra = 7
    cantidad_merma = 3

    producto = await db_session.get(Productos, producto_id)
    stock_inicial = producto.existencia

    tipo_compra = (await db_session.exec(
        select(TipoMovimiento).where(TipoMovimiento.tipo == "compra")
    )).one()

    mov_compra = Movimiento(
        id_tipo_movimiento=tipo_compra.id_tipo_movimiento,
        id_dependencia=242,
        id_producto=producto_id,
        cantidad=cantidad_compra,
        fecha=datetime.utcnow(),
        estado="pendiente",
    )
    db_session.add(mov_compra)
    await db_session.commit()

    await MovimientoService.confirmar_movimiento(db_session, mov_compra.id_movimiento)

    await db_session.refresh(producto)
    assert producto.existencia == stock_inicial + cantidad_compra, (
        f"Expected {stock_inicial + cantidad_compra}, got {producto.existencia}"
    )

    tipo_merma = (await db_session.exec(
        select(TipoMovimiento).where(TipoMovimiento.tipo == "MERMA")
    )).one()

    mov_merma = Movimiento(
        id_tipo_movimiento=tipo_merma.id_tipo_movimiento,
        id_dependencia=242,
        id_producto=producto_id,
        cantidad=cantidad_merma,
        fecha=datetime.utcnow(),
        estado="pendiente",
    )
    db_session.add(mov_merma)
    await db_session.commit()

    await MovimientoService.confirmar_movimiento(db_session, mov_merma.id_movimiento)

    await db_session.refresh(producto)
    assert producto.existencia == stock_inicial + cantidad_compra - cantidad_merma, (
        f"Expected {stock_inicial + cantidad_compra - cantidad_merma}, "
        f"got {producto.existencia}"
    )

    await MovimientoService.cancelar_movimiento(db_session, mov_compra.id_movimiento)
    await MovimientoService.cancelar_movimiento(db_session, mov_merma.id_movimiento)


async def test_confirmar_stock_insuficiente_rechaza(db_session):
    """MERMA sin stock disponible → ValueError."""

    producto_id = 207

    tipo_merma = (await db_session.exec(
        select(TipoMovimiento).where(TipoMovimiento.tipo == "MERMA")
    )).one()

    mov = Movimiento(
        id_tipo_movimiento=tipo_merma.id_tipo_movimiento,
        id_dependencia=242,
        id_producto=producto_id,
        cantidad=99999,
        fecha=datetime.utcnow(),
        estado="pendiente",
    )
    db_session.add(mov)
    await db_session.commit()

    import pytest
    with pytest.raises(ValueError, match="Stock insuficiente"):
        await MovimientoService.confirmar_movimiento(db_session, mov.id_movimiento)

    await MovimientoService.cancelar_movimiento(db_session, mov.id_movimiento)
