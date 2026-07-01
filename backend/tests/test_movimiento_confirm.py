import pytest
from datetime import datetime
from sqlmodel import select
from src.services.movimiento_service import MovimientoService
from src.services.existencia_service import ExistenciaService
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos


async def test_confirmar_entrada_salida(db_session):
    """Compra (entrada) y MERMA (salida): ambos se confirman y actualizan stock."""

    producto_id = 203
    cantidad_compra = 7
    cantidad_merma = 3

    producto = await db_session.get(Productos, producto_id)
    if not producto:
        pytest.skip(f"Producto id={producto_id} no existe en esta BD")

    stock_inicial = await ExistenciaService.calcular_stock_producto(db_session, producto_id)

    tipo_compra = (
        await db_session.exec(
            select(TipoMovimiento).where(TipoMovimiento.tipo == "compra")
        )
    ).one()

    # Buscar una dependencia válida
    from src.models import Dependencia
    deps = (await db_session.exec(select(Dependencia).limit(1))).first()
    if not deps:
        pytest.skip("No hay dependencias en la BD")
    dep_id = deps.id_dependencia

    mov_compra = Movimiento(
        id_tipo_movimiento=tipo_compra.id_tipo_movimiento,
        id_dependencia=dep_id,
        id_producto=producto_id,
        cantidad=cantidad_compra,
        fecha=datetime.now(),
        estado="pendiente",
    )
    db_session.add(mov_compra)
    await db_session.commit()

    await MovimientoService.confirmar_movimiento(db_session, mov_compra.id_movimiento)

    stock_despues = await ExistenciaService.calcular_stock_producto(db_session, producto_id)
    assert stock_despues == stock_inicial + cantidad_compra, (
        f"Expected {stock_inicial + cantidad_compra}, got {stock_despues}"
    )

    tipo_merma = (
        await db_session.exec(
            select(TipoMovimiento).where(TipoMovimiento.tipo == "MERMA")
        )
    ).one()

    mov_merma = Movimiento(
        id_tipo_movimiento=tipo_merma.id_tipo_movimiento,
        id_dependencia=dep_id,
        id_producto=producto_id,
        cantidad=cantidad_merma,
        fecha=datetime.now(),
        estado="pendiente",
    )
    db_session.add(mov_merma)
    await db_session.commit()

    await MovimientoService.confirmar_movimiento(db_session, mov_merma.id_movimiento)

    stock_final = await ExistenciaService.calcular_stock_producto(db_session, producto_id)
    assert stock_final == stock_inicial + cantidad_compra - cantidad_merma, (
        f"Expected {stock_inicial + cantidad_compra - cantidad_merma}, "
        f"got {stock_final}"
    )

    await MovimientoService.cancelar_movimiento(db_session, mov_compra.id_movimiento)
    await MovimientoService.cancelar_movimiento(db_session, mov_merma.id_movimiento)


async def test_confirmar_stock_insuficiente_rechaza(db_session):
    """MERMA sin stock disponible → ValueError."""

    producto_id = 207

    producto = await db_session.get(Productos, producto_id)
    if not producto:
        pytest.skip(f"Producto id={producto_id} no existe en esta BD")

    tipo_merma = (
        await db_session.exec(
            select(TipoMovimiento).where(TipoMovimiento.tipo == "MERMA")
        )
    ).one()

    from src.models import Dependencia
    deps = (await db_session.exec(select(Dependencia).limit(1))).first()
    if not deps:
        pytest.skip("No hay dependencias en la BD")
    dep_id = deps.id_dependencia

    mov = Movimiento(
        id_tipo_movimiento=tipo_merma.id_tipo_movimiento,
        id_dependencia=dep_id,
        id_producto=producto_id,
        cantidad=99999,
        fecha=datetime.now(),
        estado="pendiente",
    )
    db_session.add(mov)
    await db_session.commit()

    with pytest.raises(ValueError, match="Stock insuficiente"):
        await MovimientoService.confirmar_movimiento(db_session, mov.id_movimiento)

    await MovimientoService.cancelar_movimiento(db_session, mov.id_movimiento)
