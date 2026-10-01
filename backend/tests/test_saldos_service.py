"""Tests de SaldoService: la tabla `saldos` que alimenta el saldo inicial.

Cubre:
  - registrar_confirmacion append en orden cronológico (saldo acumulado).
  - registrar_confirmacion fuera de orden → reconstruye la cadena.
  - recalcular_cadena excluye movimientos no confirmados.
  - El reporte toma el snapshot MÁS CERCANO hacia atrás de fecha_inicio.
  - Wiring real: confirmar_movimiento escribe snapshot y cancelar lo recalcula.
"""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.models import SQLModel
from src.models.categoria import Categorias, Subcategorias
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos
from src.models.saldo import Saldo
from src.services.reportes_service import get_movimientos_dependencia
from src.services.saldo_service import SaldoService


def _tipos(db):
    """Tipos con los factores del seed real."""
    factores = {
        "compra": 1, "venta": -1, "RECEPCION": 1, "MERMA": -1,
        "DONACION": -1, "DEVOLUCION": -1, "AJUSTE_QUITAR": -1, "AJUSTE_AGREGAR": 1,
    }
    tipo_ids = {}
    for i, (tipo, factor) in enumerate(factores.items(), start=1):
        db.add(TipoMovimiento(id_tipo_movimiento=i, tipo=tipo, factor=factor))
        tipo_ids[tipo] = i
    return tipo_ids


def _datos_base(db):
    _tipos(db)
    db.add(Dependencia(
        id_dependencia=1, nombre="Dep Test", denominacion="DEP",
        direccion="Calle 1", telefono="555", email="d@d.co", web="w.co",
        id_tipo_dependencia=1,
    ))
    cat = Categorias(id_categoria=1, nombre="Cat")
    db.add(cat)
    db.add(Subcategorias(id_subcategoria=1, nombre="Sub", id_categoria=1))
    db.add(Productos(
        id_producto=1, codigo="P001", nombre="Producto Uno",
        id_subcategoria=1, moneda_compra=1, moneda_venta=1,
        precio_compra=2, precio_venta=0, precio_minimo=0,
    ))


async def _db_con_tablas(tablas):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: TipoMovimiento.metadata.create_all(c, tables=tablas)
        )
    session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    return engine, session_factory


@pytest.fixture
async def db():
    """Solo las tablas del subconjunto de saldos/reportes."""
    engine, session_factory = await _db_con_tablas([
        Categorias.__table__,
        Subcategorias.__table__,
        Dependencia.__table__,
        TipoMovimiento.__table__,
        Movimiento.__table__,
        Productos.__table__,
        Saldo.__table__,
    ])
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def db_full():
    """Metadata COMPLETO: para ejercitar el wiring real de MovimientoService."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.create_all(c))
    session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
    await engine.dispose()


async def _snapshots(db, pid=1):
    result = await db.execute(
        select(Saldo)
        .where(Saldo.id_producto == pid, Saldo.id_dependencia == 1)
        .order_by(Saldo.fecha, Saldo.id_saldo)
    )
    return [(s.fecha, s.saldo) for s in result.scalars().all()]


def _mov(db, tipo_ids, tipo, cantidad, fecha, estado="confirmado", pid=1):
    mov = Movimiento(
        id_tipo_movimiento=tipo_ids[tipo], id_dependencia=1,
        id_producto=pid, cantidad=cantidad, fecha=fecha, estado=estado,
    )
    db.add(mov)
    return mov


# ── registrar_confirmacion ──────────────────────────────────────────────────


async def test_append_cronologico_acumula(db):
    """Dos confirmaciones en orden → dos snapshots con saldo acumulado."""
    _datos_base(db)
    await db.commit()
    base = datetime(2026, 9, 10, 12, 0, 0)

    mov1 = _mov(db, {"compra": 1, "venta": 2}, "compra", 5, base)
    await db.flush()
    await SaldoService.registrar_confirmacion(db, mov1, 1)

    mov2 = _mov(db, {"compra": 1, "venta": 2}, "venta", 2, base + timedelta(days=1))
    await db.flush()
    await SaldoService.registrar_confirmacion(db, mov2, -1)
    await db.commit()

    filas = await _snapshots(db)
    assert filas == [
        (base, Decimal(5)),
        (base + timedelta(days=1), Decimal(3)),
    ]


async def test_fuera_de_orden_reconstruye_cadena(db):
    """Un movimiento con fecha ANTERIOR al último snapshot recalcula toda la
    cadena: los snapshots deben quedar en orden de fecha con saldo correcto."""
    _datos_base(db)
    await db.commit()
    base = datetime(2026, 9, 10, 12, 0, 0)

    # Se confirma primero el del 10 (5 unidades)…
    mov_tarde = _mov(db, {"compra": 1}, "compra", 5, base)
    await db.flush()
    await SaldoService.registrar_confirmacion(db, mov_tarde, 1)

    # …y luego llega uno pendiente con fecha del 5 (3 unidades).
    mov_temprano = _mov(db, {"compra": 1}, "compra", 3, base - timedelta(days=5))
    await db.flush()
    await SaldoService.registrar_confirmacion(db, mov_temprano, 1)
    await db.commit()

    filas = await _snapshots(db)
    assert filas == [
        (base - timedelta(days=5), Decimal(3)),
        (base, Decimal(8)),  # 3 + 5: el saldo del 10 ahora incluye el del 5
    ]


async def test_recalcular_excluye_no_confirmados(db):
    """La cadena solo refleja movimientos confirmados."""
    _datos_base(db)
    await db.commit()
    base = datetime(2026, 9, 10, 12, 0, 0)

    conf = _mov(db, {"compra": 1, "venta": 2}, "compra", 10, base)
    pend = _mov(db, {"compra": 1, "venta": 2}, "venta", 4, base, estado="pendiente")
    canc = _mov(db, {"compra": 1, "venta": 2}, "venta", 99, base, estado="cancelado")
    await db.commit()

    await SaldoService.recalcular_cadena(db, 1, 1)
    await db.commit()

    filas = await _snapshots(db)
    assert filas == [(base, Decimal(10))]
    # sanity: los otros dos existen como movimientos pero no cuentan
    assert pend.estado == "pendiente" and canc.estado == "cancelado"
    assert conf.estado == "confirmado"


# ── Lectura desde el reporte ────────────────────────────────────────────────


async def test_reporte_toma_snapshot_mas_cercano_hacia_atras(db):
    """Con varios snapshots previos, el saldo inicial es el MÁS CERCANO a
    fecha_inicio (no el primero ni el acumulado de todo la historia)."""
    _datos_base(db)
    # Snapshots directos: 10 uds el 01/09, 4 uds el 05/09
    db.add(Saldo(id_producto=1, id_dependencia=1,
                 fecha=datetime(2026, 9, 1), saldo=Decimal(10)))
    db.add(Saldo(id_producto=1, id_dependencia=1,
                 fecha=datetime(2026, 9, 5), saldo=Decimal(4)))
    # Movimiento dentro del rango para que el producto aparezca en la fila
    _mov(db, {"compra": 1, "venta": 2}, "venta", 1, datetime(2026, 9, 7, 9, 0, 0))
    await db.commit()

    movimientos, _ = await get_movimientos_dependencia(
        db, 1, datetime(2026, 9, 7).date(), datetime(2026, 9, 8).date()
    )

    p1 = next(m for m in movimientos if m["codigo"] == "P001")
    # 4 unidades del snapshot 05/09 × precio_compra 2 = 8 (no 10×2=20)
    assert p1["saldo_inicial"] == 8
    assert p1["venta"] == 1
    assert p1["saldo_final"] == 6  # 8 − 1×2


# ── Wiring real: confirmar/cancelar de MovimientoService ────────────────────


async def test_confirmar_escribe_snapshot_y_cancelar_recalcula(db_full):
    """El hook real: confirmar inserta la fila en `saldos`; cancelar reconstruye
    la cadena sin ese movimiento."""
    from src.services.movimiento_service import MovimientoService

    _datos_base(db_full)
    await db_full.commit()
    base = datetime(2026, 9, 10, 12, 0, 0)

    mov = _mov(db_full, {"compra": 1}, "compra", 7, base, estado="pendiente")
    await db_full.commit()
    id_mov = mov.id_movimiento

    await MovimientoService.confirmar_movimiento(db_full, id_mov)

    filas = await _snapshots(db_full)
    assert filas == [(base, Decimal(7))]

    await MovimientoService.cancelar_movimiento(db_full, id_mov)

    filas = await _snapshots(db_full)
    assert filas == []  # sin confirmados → cadena vacía

    # Un segundo movimiento sobrevive a la cancelación del primero
    otro = _mov(db_full, {"compra": 1}, "compra", 3, base + timedelta(days=1),
                estado="pendiente")
    await db_full.commit()
    await MovimientoService.confirmar_movimiento(db_full, otro.id_movimiento)
    await MovimientoService.cancelar_movimiento(db_full, id_mov)  # idempotente

    filas = await _snapshots(db_full)
    assert filas == [(base + timedelta(days=1), Decimal(3))]
