"""Tests de integración para get_movimientos_dependencia (SQL real en SQLite).

Valida el comportamiento aritmético del reporte de movimientos por dependencia:
  - Las columnas muestran la MAGNITUD del movimiento (el factor con signo no se
    aplica dos veces: los tipos de salida tienen factor -1 en el seed).
  - DEVOLUCION es salida (factor -1 en tipo_movimiento), no entrada.
  - Los ajustes (AJUSTE_AGREGAR/AJUSTE_QUITAR) se muestran netos.
  - Solo cuentan movimientos confirmados (pendientes y cancelados excluidos).
  - El rango incluye todo el día de fecha_fin.
"""

import pytest
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.categoria import Categorias, Subcategorias
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos
from src.services.reportes_service import get_movimientos_dependencia


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: TipoMovimiento.metadata.create_all(
                c,
                tables=[
                    Categorias.__table__,
                    Subcategorias.__table__,
                    Dependencia.__table__,
                    TipoMovimiento.__table__,
                    Movimiento.__table__,
                    Productos.__table__,
                ],
            )
        )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def datos_base(db):
    """Tipos de movimiento con factores con signo (como el seed) + 2 productos."""
    factores = {
        "compra": 1, "venta": -1, "RECEPCION": 1, "MERMA": -1,
        "DONACION": -1, "DEVOLUCION": -1, "AJUSTE_AGREGAR": 1, "AJUSTE_QUITAR": -1,
    }
    tipo_ids = {}
    for i, (tipo, factor) in enumerate(factores.items(), start=1):
        db.add(TipoMovimiento(id_tipo_movimiento=i, tipo=tipo, factor=factor))
        tipo_ids[tipo] = i

    db.add(Dependencia(
        id_dependencia=1, nombre="Dep Test", denominacion="DEP",
        direccion="Calle 1", telefono="555", email="d@d.co", web="w.co",
        id_tipo_dependencia=1,
    ))
    cat = Categorias(id_categoria=1, nombre="Cat")
    db.add(cat)
    await db.flush()
    db.add(Subcategorias(id_subcategoria=1, nombre="Sub", id_categoria=cat.id_categoria))
    await db.flush()
    db.add_all([
        Productos(id_producto=1, codigo="P001", nombre="Producto Uno",
                  id_subcategoria=1, moneda_compra=1, moneda_venta=1,
                  precio_compra=2, precio_venta=0, precio_minimo=0),
        Productos(id_producto=2, codigo="P002", nombre="Producto Dos",
                  id_subcategoria=1, moneda_compra=1, moneda_venta=1,
                  precio_compra=2, precio_venta=0, precio_minimo=0),
    ])
    await db.commit()
    return tipo_ids


def _crear_mov(db, tipo_ids, pid, tipo, cantidad, fecha, estado="confirmado"):
    db.add(Movimiento(
        id_tipo_movimiento=tipo_ids[tipo], id_dependencia=1,
        id_producto=pid, cantidad=cantidad, fecha=fecha, estado=estado,
    ))


async def test_saldo_inicial_entradas_salidas_y_ajustes(db, datos_base):
    """P1 (precio_compra=2): si=10×2=20 (recepción previa); en rango venta 3,
    compra 2, donación 1, ajuste +5; venta cancelada no cuenta.
    Saldo en MONTOS: sf = 20 + (2−3−1+5)×2 = 26."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 1, "RECEPCION", 10, base - timedelta(days=5))
    _crear_mov(db, tipo_ids, 1, "venta", 3, base)
    _crear_mov(db, tipo_ids, 1, "compra", 2, base + timedelta(days=1))
    _crear_mov(db, tipo_ids, 1, "DONACION", 1, base + timedelta(days=2))
    _crear_mov(db, tipo_ids, 1, "AJUSTE_AGREGAR", 5, base + timedelta(days=2))
    _crear_mov(db, tipo_ids, 1, "venta", 99, base + timedelta(days=3), estado="cancelado")
    await db.commit()

    fi = (base - timedelta(days=1)).date()
    ff = (base + timedelta(days=3)).date()
    movimientos, _ = await get_movimientos_dependencia(db, 1, fi, ff)

    p1 = next(m for m in movimientos if m["codigo"] == "P001")
    # Saldos = montos valorados a precio_compra (2)
    assert p1["saldo_inicial"] == 20
    assert p1["saldo_final"] == 26
    # Columnas de movimiento = cantidades
    assert p1["venta"] == 3
    assert p1["compra"] == 2
    assert p1["donacion"] == 1
    assert p1["ajustes"] == 5


async def test_devolucion_es_salida_y_pendientes_no_cuentan(db, datos_base):
    """P2: DEVOLUCION 4 es salida (sf = -4); venta pendiente 50 no cuenta."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 2, "DEVOLUCION", 4, base + timedelta(days=1))
    _crear_mov(db, tipo_ids, 2, "venta", 50, base + timedelta(days=1), estado="pendiente")
    await db.commit()

    fi = base.date()
    ff = (base + timedelta(days=3)).date()
    movimientos, _ = await get_movimientos_dependencia(db, 1, fi, ff)

    p2 = next(m for m in movimientos if m["codigo"] == "P002")
    assert p2["devolucion"] == 4
    assert p2["venta"] == 0
    # Monto: 0 − 4×2 = −8
    assert p2["saldo_final"] == -8


async def test_incluye_todo_el_dia_de_fecha_fin(db, datos_base):
    """Un movimiento a las 23:59 del día fecha_fin debe incluirse."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 23, 59, 0)

    _crear_mov(db, tipo_ids, 1, "compra", 7, base)
    await db.commit()

    fi = base.date()
    ff = base.date()  # mismo día
    movimientos, _ = await get_movimientos_dependencia(db, 1, fi, ff)

    p1 = next(m for m in movimientos if m["codigo"] == "P001")
    assert p1["compra"] == 7
    assert p1["saldo_final"] == 14  # 7 × 2


async def test_ajuste_quitar_resta(db, datos_base):
    """AJUSTE_QUITAR resta del saldo final y se muestra negativo."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 1, "compra", 10, base)
    _crear_mov(db, tipo_ids, 1, "AJUSTE_QUITAR", 4, base + timedelta(days=1))
    await db.commit()

    fi = base.date()
    ff = (base + timedelta(days=1)).date()
    movimientos, _ = await get_movimientos_dependencia(db, 1, fi, ff)

    p1 = next(m for m in movimientos if m["codigo"] == "P001")
    assert p1["ajustes"] == -4
    assert p1["saldo_final"] == 12  # (10 − 4) × 2
