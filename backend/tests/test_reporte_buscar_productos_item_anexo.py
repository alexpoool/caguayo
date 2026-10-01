"""Tests de integración para buscar_productos_item_anexo (SQL real en SQLite).

El buscador del reporte de movimientos por producto consulta `item_anexo`:
  - Devuelve productos ÚNICOS (varios items del mismo producto = 1 opción).
  - Busca por nombre, código de producto y código de item (ILIKE).
  - Incluye productos agotados (entrada - vendido = 0): el reporte es histórico.
  - Excluye productos sin ningún registro en item_anexo.
"""

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.item_anexo import ItemAnexo
from src.models.producto import Productos
from src.services.reportes_service import buscar_productos_item_anexo


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: ItemAnexo.metadata.create_all(
                c,
                tables=[Productos.__table__, ItemAnexo.__table__],
            )
        )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def datos_base(db):
    """3 productos: P001 y P002 tienen item_anexo, P003 no tiene ninguno."""
    db.add_all([
        Productos(id_producto=1, codigo="P001", nombre="Producto Uno",
                  id_subcategoria=1, moneda_compra=1, moneda_venta=1,
                  precio_compra=2, precio_venta=0, precio_minimo=0),
        Productos(id_producto=2, codigo="P002", nombre="Producto Dos",
                  id_subcategoria=1, moneda_compra=1, moneda_venta=1,
                  precio_compra=2, precio_venta=0, precio_minimo=0),
        Productos(id_producto=3, codigo="P003", nombre="Sin Item Propio",
                  id_subcategoria=1, moneda_compra=1, moneda_venta=1,
                  precio_compra=2, precio_venta=0, precio_minimo=0),
    ])
    await db.flush()
    db.add_all([
        # Agotado (entrada == vendido): debe seguir apareciendo en el histórico
        ItemAnexo(id_item_anexo=1, id_anexo=1, id_producto=1, entrada=10,
                  vendido=10, precio_compra=1, precio_venta=2, id_moneda=1,
                  codigo="001.001.9001", a_vender=False),
        ItemAnexo(id_item_anexo=2, id_anexo=1, id_producto=1, entrada=5,
                  vendido=1, precio_compra=1, precio_venta=2, id_moneda=1,
                  codigo="001.001.9002", a_vender=True),
        ItemAnexo(id_item_anexo=3, id_anexo=2, id_producto=2, entrada=3,
                  vendido=0, precio_compra=1, precio_venta=2, id_moneda=1,
                  codigo="001.002.9003", a_vender=True),
    ])
    await db.commit()


async def test_devuelve_productos_unicos_y_excluye_sin_item(db, datos_base):
    """Dos items del mismo producto = 1 opción; P003 (sin item_anexo) no sale."""
    productos = await buscar_productos_item_anexo(db)

    assert [p["id_producto"] for p in productos] == [2, 1]  # orden por nombre
    assert productos[0]["nombre"] == "Producto Dos"
    assert productos[1]["nombre"] == "Producto Uno"
    assert all(p["codigo"] for p in productos)


async def test_incluye_productos_agotados(db, datos_base):
    """P001 tiene un item con stock 0: el reporte es histórico, debe listarlos."""
    productos = await buscar_productos_item_anexo(db, "Producto Uno")

    assert [p["id_producto"] for p in productos] == [1]


async def test_busca_por_nombre_case_insensitive(db, datos_base):
    assert [p["id_producto"] for p in await buscar_productos_item_anexo(db, "uno")] == [1]
    assert [p["id_producto"] for p in await buscar_productos_item_anexo(db, "UNO")] == [1]


async def test_busca_por_codigo_producto(db, datos_base):
    assert [p["id_producto"] for p in await buscar_productos_item_anexo(db, "P002")] == [2]


async def test_busca_por_codigo_item(db, datos_base):
    """El código de item_anexo (001.002.9003) también es buscable."""
    assert [p["id_producto"] for p in await buscar_productos_item_anexo(db, "9003")] == [2]


async def test_sin_coincidencias_devuelve_vacio(db, datos_base):
    assert await buscar_productos_item_anexo(db, "no-existe-999") == []


async def test_respeta_el_limite(db, datos_base):
    productos = await buscar_productos_item_anexo(db, limite=1)

    assert len(productos) == 1
    assert productos[0]["nombre"] == "Producto Dos"
