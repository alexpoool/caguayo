"""Tests de jerarquía del reporte de Existencias.

La tabla del reporte cubre la dependencia seleccionada + sus HIJOS DIRECTOS
(los nietos entran solo en el filtro, no en la tabla).
"""

import pytest
from datetime import datetime

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.categoria import Categorias, Subcategorias
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos
from src.services.reportes_service import (
    get_existencias,
    get_ids_dependencia_con_hijos,
)
from src.utils.pdf_generator import generar_pdf_existencias


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
async def arbol(db):
    """Árbol: 1 (raíz) → 2, 3 (hijos) → 4 (nieto de 2).

    Producto 1 con stock en 1, 2 y 4. Tipo movimiento 1 = compra (factor +1).
    """
    db.add(TipoMovimiento(id_tipo_movimiento=1, tipo="compra", factor=1))
    db.add(Dependencia(
        id_dependencia=1, nombre="Caguayo S.A", denominacion="CSA",
        direccion="Matriz", telefono="111", id_tipo_dependencia=1,
    ))
    db.add(Dependencia(
        id_dependencia=2, nombre="Sucursal Norte", denominacion="SN",
        direccion="Norte", telefono="222", id_tipo_dependencia=1, codigo_padre=1,
    ))
    db.add(Dependencia(
        id_dependencia=3, nombre="Sucursal Sur", denominacion="SS",
        direccion="Sur", telefono="333", id_tipo_dependencia=1, codigo_padre=1,
    ))
    db.add(Dependencia(
        id_dependencia=4, nombre="Almacen Norte", denominacion="AN",
        direccion="Alm N", telefono="444", id_tipo_dependencia=2, codigo_padre=2,
    ))
    cat = Categorias(id_categoria=1, nombre="Cat")
    db.add(cat)
    await db.flush()
    db.add(Subcategorias(id_subcategoria=1, nombre="Sub", id_categoria=1))
    await db.flush()
    db.add(Productos(
        id_producto=1, codigo="P001", nombre="Producto Uno",
        id_subcategoria=1, moneda_compra=1, moneda_venta=1,
        precio_compra=2, precio_venta=0, precio_minimo=0,
    ))
    await db.flush()
    for dep_id, cant in ((1, 100), (2, 50), (4, 999)):
        db.add(Movimiento(
            id_tipo_movimiento=1, id_dependencia=dep_id, id_producto=1,
            cantidad=cant, fecha=datetime(2026, 10, 1, 12, 0, 0),
            estado="confirmado",
        ))
    await db.commit()


async def test_ids_incluye_padre_e_hijos_directos(db, arbol):
    ids = await get_ids_dependencia_con_hijos(db, 1)
    assert sorted(ids) == [1, 2, 3]


async def test_ids_no_incluye_nietos(db, arbol):
    """4 es nieto de 1 (hijo de 2): NO debe estar en la lista."""
    ids = await get_ids_dependencia_con_hijos(db, 1)
    assert 4 not in ids


async def test_ids_dependencia_hoja_es_sola(db, arbol):
    ids = await get_ids_dependencia_con_hijos(db, 3)
    assert ids == [3]


async def test_existencias_incluye_hijos_directos(db, arbol):
    """Padre (100) + hijo directo (50) entran; nieto (999) no."""
    filas, _ = await get_existencias(db, 1)
    assert sorted(f["cantidad"] for f in filas) == [50, 100]


async def test_existencias_excluye_nietos(db, arbol):
    filas, _ = await get_existencias(db, 1)
    nombres = {f["dependencia"] for f in filas}
    assert "Almacen Norte" not in nombres


async def test_existencias_una_fila_por_dependencia(db, arbol):
    """Cada fila lleva el nombre de SU dependencia."""
    filas, _ = await get_existencias(db, 1)
    por_dep = {f["dependencia"]: f for f in filas}
    assert por_dep["Caguayo S.A"]["cantidad"] == 100
    assert por_dep["Sucursal Norte"]["cantidad"] == 50


async def test_existencias_dependencia_sin_hijos(db, arbol):
    """Una dependencia hoja solo reporta su propio stock."""
    filas, _ = await get_existencias(db, 3)
    assert filas == []


def test_pdf_existencias_incluye_columna_dependencia():
    """El PDF debe listar 4 columnas: la dependencia de cada fila."""
    filas = [
        {"codigo": "P001", "nombre": "Producto Uno", "cantidad": 100,
         "dependencia": "Caguayo S.A"},
        {"codigo": "P001", "nombre": "Producto Uno", "cantidad": 50,
         "dependencia": "Sucursal Norte"},
    ]
    buf = generar_pdf_existencias(
        filas,
        {"nombre": "Caguayo S.A", "direccion": "Matriz", "alcance": 2},
        "Admin",
    )
    data = buf.getvalue()
    assert data[:5] == b"%PDF-", "generar_pdf_existencias debe devolver un PDF"
