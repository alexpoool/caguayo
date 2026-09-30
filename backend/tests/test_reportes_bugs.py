"""Tests de regresión para los bugs corregidos en reportes_service.py.

Cada test falla antes del fix correspondiente y pasa después:
  - get_existencias ignora movimientos no confirmados.
  - get_movimientos_producto ignora movimientos no confirmados.
  - get_movimientos_producto incluye TODO el día de fecha_fin (incluye horas).
  - get_registro_clientes está definida una sola vez.
  - get_resumen_liquidaciones no recibe tipo_concepto (parámetro muerto).
"""

import inspect

import pytest
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.categoria import Categorias, Subcategorias
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos
from src.services import reportes_service
from src.services.reportes_service import (
    get_existencias,
    get_movimientos_producto,
)


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
    """Tipos de movimiento con factores con signo + dependencia + 2 productos."""
    factores = {"compra": 1, "RECEPCION": 1, "venta": -1, "MERMA": -1}
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


# ── get_existencias: solo confirmados ───────────────────────────────────────


async def test_existencias_excluye_movimientos_no_confirmados(db, datos_base):
    """Un movimiento cancelado NO debe alterar el stock calculado."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 1, "RECEPCION", 10, base)
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 500, base, estado="cancelado")
    _crear_mov(db, tipo_ids, 1, "compra", 7, base, estado="pendiente")
    await db.commit()

    existencias, _ = await get_existencias(db, 1)

    p1 = next(e for e in existencias if e["codigo"] == "P001")
    assert p1["cantidad"] == 10


async def test_existencias_devuelve_cero_si_todo_no_esta_confirmado(db, datos_base):
    """Si solo hay no confirmados, el producto no debe aparecer con stock."""
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 1, "RECEPCION", 42, base, estado="pendiente")
    await db.commit()

    existencias, _ = await get_existencias(db, 1)

    assert not [e for e in existencias if e["codigo"] == "P001"]


# ── get_movimientos_producto: solo confirmados ──────────────────────────────


async def test_movimientos_producto_excluye_no_confirmados(db, datos_base):
    tipo_ids = datos_base
    base = datetime(2026, 9, 10, 12, 0, 0)

    _crear_mov(db, tipo_ids, 1, "compra", 5, base)
    _crear_mov(db, tipo_ids, 1, "compra", 999, base, estado="cancelado")
    await db.commit()

    movimientos, _, _ = await get_movimientos_producto(
        db, 1, 1, (base - timedelta(days=1)).date(), (base + timedelta(days=1)).date()
    )

    assert [m["cantidad"] for m in movimientos] == [5]


# ── get_movimientos_producto: fecha_fin incluye todo el día ─────────────────


async def test_movimientos_producto_incluye_todo_el_dia_de_fecha_fin(db, datos_base):
    """Un movimiento a las 23:59 del día de fecha_fin debe entrar.

    Con `Movimiento.fecha <= fecha_fin` (date vs datetime) este movimiento se
    excluye, porque 23:59 > midnight del mismo día.
    """
    tipo_ids = datos_base
    fecha_fin = date(2026, 9, 10)

    _crear_mov(db, tipo_ids, 1, "compra", 3, datetime(2026, 9, 10, 23, 59, 59))
    _crear_mov(db, tipo_ids, 1, "compra", 4, datetime(2026, 9, 9, 23, 59, 59))
    await db.commit()

    movimientos, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 9), fecha_fin
    )

    assert sorted(m["cantidad"] for m in movimientos) == [3, 4]


async def test_movimientos_producto_excluye_dia_posterior(db, datos_base):
    """Un movimiento al día siguiente NO debe entrar."""
    tipo_ids = datos_base
    fecha_fin = date(2026, 9, 10)

    _crear_mov(db, tipo_ids, 1, "compra", 3, datetime(2026, 9, 10, 12, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 4, datetime(2026, 9, 11, 0, 0, 1))
    await db.commit()

    movimientos, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 9), fecha_fin
    )

    assert [m["cantidad"] for m in movimientos] == [3]


async def test_movimientos_producto_respeta_fecha_inicio(db, datos_base):
    """Un movimiento antes de fecha_inicio NO debe entrar."""
    tipo_ids = datos_base

    _crear_mov(db, tipo_ids, 1, "compra", 3, datetime(2026, 9, 8, 12, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 4, datetime(2026, 9, 10, 12, 0, 0))
    await db.commit()

    movimientos, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    assert [m["cantidad"] for m in movimientos] == [4]


# ── Definición duplicada ────────────────────────────────────────────────────


def test_get_registro_clientes_esta_definida_una_sola_vez():
    """Debe existir UNA sola definición de get_registro_clientes.

    Se comprueba leyendo el código fuente del módulo y contando las
    definiciones de nivel superior, en vez de contar en runtime (donde la
    segunda ya habría pisen a la primera y el bug sería invisible).
    """
    import inspect as _inspect

    source = _inspect.getsource(reportes_service)
    encabezado = source.splitlines()
    definiciones = [
        i for i, linea in enumerate(encabezado)
        if linea.startswith("async def get_registro_clientes(")
    ]

    assert len(definiciones) == 1, (
        f"get_registro_clientes definida {len(definiciones)} veces "
        f"en las líneas {[i + 1 for i in definiciones]}"
    )


def test_get_registro_clientes_no_tiene_parametros_adicionales():
    """Control: la función vigente conserva su firma pública original."""
    firma = inspect.signature(reportes_service.get_registro_clientes)
    assert list(firma.parameters) == ["db"]


# ── Parámetro muerto tipo_concepto ─────────────────────────────────────────


def test_get_resumen_liquidaciones_no_acepta_tipo_concepto():
    """tipo_concepto se recibía pero nunca se usaba: se elimina de la firma."""
    firma = inspect.signature(reportes_service.get_resumen_liquidaciones)
    assert "tipo_concepto" not in firma.parameters
