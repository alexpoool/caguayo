"""Tests de regresión para los bugs corregidos en reportes_service.py.

Cada test falla antes del fix correspondiente y pasa después:
  - get_existencias ignora movimientos no confirmados.
  - get_movimientos_producto ignora movimientos no confirmados.
  - get_movimientos_producto incluye TODO el día de fecha_fin (incluye horas).
  - get_registro_clientes está definida una sola vez.
  - get_resumen_liquidaciones no recibe tipo_concepto (parámetro muerto).
"""

import inspect
from types import SimpleNamespace
from unittest.mock import AsyncMock
from decimal import Decimal

import pytest
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.categoria import Categorias, Subcategorias
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos
from src.models.moneda import Moneda
from src.models.saldo import Saldo
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
                    Moneda.__table__,
                    TipoMovimiento.__table__,
                    Productos.__table__,
                    Movimiento.__table__,
                    Saldo.__table__,
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
    db.add(Moneda(id_moneda=1, nombre="USD", denominacion="Dólar estadounidense", simbolo="USD"))
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


def _crear_mov(db, tipo_ids, pid, tipo, cantidad, fecha, estado="confirmado", precio_compra=Decimal("2"), moneda_compra=1):
    db.add(Movimiento(
        id_tipo_movimiento=tipo_ids[tipo], id_dependencia=1,
        id_producto=pid, cantidad=cantidad, fecha=fecha, estado=estado,
        precio_compra=precio_compra, moneda_compra=moneda_compra,
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

    movimientos, _, _, _ = await get_movimientos_producto(
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

    movimientos, _, _, _ = await get_movimientos_producto(
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

    movimientos, _, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 9), fecha_fin
    )

    assert [m["cantidad"] for m in movimientos] == [3]


async def test_movimientos_producto_respeta_fecha_inicio(db, datos_base):
    """Un movimiento antes de fecha_inicio NO debe entrar."""
    tipo_ids = datos_base

    _crear_mov(db, tipo_ids, 1, "compra", 3, datetime(2026, 9, 8, 12, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 4, datetime(2026, 9, 10, 12, 0, 0))
    await db.commit()

    movimientos, _, _, _ = await get_movimientos_producto(
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


async def test_movimientos_producto_calcula_saldos_progresivos_y_resumen_por_tipo(db, datos_base):
    tipo_ids = datos_base
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 10, datetime(2026, 9, 8, 9, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 4, datetime(2026, 9, 10, 9, 0, 0))
    _crear_mov(db, tipo_ids, 1, "venta", 3, datetime(2026, 9, 10, 10, 0, 0))
    _crear_mov(db, tipo_ids, 1, "MERMA", 1, datetime(2026, 9, 10, 11, 0, 0))
    await db.commit()

    movimientos, _, _, resumen = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    assert [m["saldo_inicial"] for m in movimientos] == [20.0, 28.0, 22.0]
    assert [m["saldo_final"] for m in movimientos] == [28.0, 22.0, 20.0]
    assert [m["tipo_movimiento"] for m in movimientos] == ["compra", "venta", "MERMA"]
    assert {item["tipo"]: item["cantidad_total"] for item in resumen} == {
        "compra": 4.0, "venta": 3.0, "MERMA": 1.0
    }


async def test_movimientos_producto_ignora_snapshot_inconsistente_y_reconstruye_historico(db, datos_base):
    from src.models.saldo import Saldo

    tipo_ids = datos_base
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 99, datetime(2026, 9, 8, 9, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 2, datetime(2026, 9, 10, 9, 0, 0))
    db.add(Saldo(
        id_producto=1, id_dependencia=1,
        fecha=datetime(2026, 9, 9, 23, 0, 0), saldo=12,
    ))
    await db.commit()

    movimientos, _, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )
    assert movimientos[0]["saldo_inicial"] == 198.0
    assert movimientos[0]["saldo_final"] == 202.0

async def test_movimientos_producto_rechaza_producto_de_otra_dependencia(db, datos_base):
    from src.services.reportes_service import get_movimientos_producto

    db.add(Dependencia(
        id_dependencia=2, nombre="Otra Dep", denominacion="OTRA",
        direccion="Calle 2", telefono="555", email="o@d.co", web="w.co",
        id_tipo_dependencia=1,
    ))
    _crear_mov(db, datos_base, 1, "compra", 5, datetime(2026, 9, 10, 9, 0, 0))
    await db.commit()

    with pytest.raises(ValueError, match="no pertenece"):
        await get_movimientos_producto(
            db, 2, 1, date(2026, 9, 10), date(2026, 9, 10)
        )


async def test_movimientos_producto_normaliza_resumen_sin_perder_rotulo(db, datos_base):
    tipo_ids = datos_base
    db.add(TipoMovimiento(id_tipo_movimiento=5, tipo="recepcion", factor=1))
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 3, datetime(2026, 9, 10, 9, 0, 0))
    db.add(Movimiento(
        id_tipo_movimiento=5, id_dependencia=1, id_producto=1,
        cantidad=4, fecha=datetime(2026, 9, 10, 10, 0, 0), estado="confirmado",
        precio_compra=Decimal("2"), moneda_compra=1,
    ))
    await db.commit()

    movimientos, _, _, resumen = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    assert [m["saldo_final"] for m in movimientos] == [6.0, 14.0]
    assert resumen == [{"tipo": "RECEPCION", "cantidad_total": 7.0}]


async def test_movimientos_producto_saldo_progresivo_incluye_ajustes_y_devoluciones(db, datos_base):
    tipo_ids = datos_base
    db.add_all([
        TipoMovimiento(id_tipo_movimiento=5, tipo="devolucion", factor=-1),
        TipoMovimiento(id_tipo_movimiento=6, tipo="ajuste_agregar", factor=1),
        TipoMovimiento(id_tipo_movimiento=7, tipo="ajuste_quitar", factor=-1),
    ])
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 10, datetime(2026, 9, 9, 9, 0, 0))
    db.add_all([
        Movimiento(id_tipo_movimiento=5, id_dependencia=1, id_producto=1,
                   cantidad=2, fecha=datetime(2026, 9, 10, 9, 0, 0), estado="confirmado"),
        Movimiento(id_tipo_movimiento=6, id_dependencia=1, id_producto=1,
                   cantidad=5, fecha=datetime(2026, 9, 10, 10, 0, 0), estado="confirmado"),
        Movimiento(id_tipo_movimiento=7, id_dependencia=1, id_producto=1,
                   cantidad=3, fecha=datetime(2026, 9, 10, 11, 0, 0), estado="confirmado"),
    ])
    await db.commit()

    movimientos, _, _, resumen = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    assert [m["saldo_inicial"] for m in movimientos] == [20.0, 16.0, 26.0]
    assert [m["saldo_final"] for m in movimientos] == [16.0, 26.0, 20.0]
    assert {item["tipo"]: item["cantidad_total"] for item in resumen} == {
        "devolucion": 2.0, "ajuste_agregar": 5.0, "ajuste_quitar": 3.0
    }


async def test_movimientos_producto_orden_estable_para_misma_fecha(db, datos_base):
    tipo_ids = datos_base
    fecha = datetime(2026, 9, 10, 9, 0, 0)
    _crear_mov(db, tipo_ids, 1, "RECEPCION", 10, datetime(2026, 9, 9, 9, 0, 0))
    _crear_mov(db, tipo_ids, 1, "compra", 2, fecha)
    _crear_mov(db, tipo_ids, 1, "venta", 1, fecha)
    await db.commit()

    movimientos, _, _, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    assert [m["saldo_inicial"] for m in movimientos] == [20.0, 24.0]
    assert [m["saldo_final"] for m in movimientos] == [24.0, 22.0]



async def test_movimientos_producto_aplica_coste_promedio_ponderado(db, datos_base):
    tipo_ids = datos_base
    _crear_mov(
        db, tipo_ids, 1, "RECEPCION", 10, datetime(2026, 9, 8, 9, 0, 0),
        precio_compra=Decimal("2"),
    )
    _crear_mov(
        db, tipo_ids, 1, "compra", 10, datetime(2026, 9, 9, 9, 0, 0),
        precio_compra=Decimal("4"),
    )
    _crear_mov(db, tipo_ids, 1, "venta", 10, datetime(2026, 9, 10, 9, 0, 0))
    await db.commit()

    movimientos, _, producto_info, _ = await get_movimientos_producto(
        db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
    )

    # Coste medio tras las dos entradas: (10×2 + 10×4) / 20 = 3.
    assert movimientos[0]["saldo_inicial"] == 60.0
    assert movimientos[0]["saldo_final"] == 30.0
    assert producto_info["moneda_simbolo"] == "USD"


async def test_movimientos_producto_rechaza_mezclar_monedas(db, datos_base):
    tipo_ids = datos_base
    db.add(Moneda(
        id_moneda=2, nombre="EUR", denominacion="Euro", simbolo="EUR"
    ))
    _crear_mov(
        db, tipo_ids, 1, "RECEPCION", 5, datetime(2026, 9, 8, 9, 0, 0),
        moneda_compra=1,
    )
    _crear_mov(
        db, tipo_ids, 1, "compra", 5, datetime(2026, 9, 9, 9, 0, 0),
        moneda_compra=2,
    )
    await db.commit()

    with pytest.raises(ValueError, match="varias monedas"):
        await get_movimientos_producto(
            db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
        )


async def test_movimientos_producto_rechaza_entrada_sin_coste_historico(db, datos_base):
    tipo_ids = datos_base
    db.add(Movimiento(
        id_tipo_movimiento=tipo_ids["RECEPCION"],
        id_dependencia=1,
        id_producto=1,
        cantidad=5,
        fecha=datetime(2026, 9, 9, 9, 0, 0),
        estado="confirmado",
        precio_compra=None,
        moneda_compra=None,
    ))
    await db.commit()

    with pytest.raises(ValueError, match="no tiene precio de compra"):
        await get_movimientos_producto(
            db, 1, 1, date(2026, 9, 10), date(2026, 9, 10)
        )

async def test_informe_desempeno_realizadores_no_selecciona_columnas_opcionales_del_modelo(monkeypatch):
    """El informe no debe pedir columnas del modelo que no necesita, como referencia_bancaria."""
    fecha = date(2026, 11, 1)
    fila = SimpleNamespace(
        pl_id_liquidacion=10,
        pl_id_persona=7,
        pl_id_moneda=1,
        pl_numero="RL-10",
        pl_fecha_emision=fecha,
        pl_fecha_liquidacion=None,
        pl_importe=Decimal("100.00"),
        pl_devengado=Decimal("90.00"),
        pl_tributario_monto=Decimal("5.00"),
        pl_comision_bancaria=Decimal("1.00"),
        pl_gasto_empresa=Decimal("2.00"),
        pl_neto_pagar=Decimal("82.00"),
        pl_tipo_pago="TRANSFERENCIA",
        pl_confirmado=True,
        tercero_nombre="Realizador Test",
        moneda_nombre="USD",
        moneda_simbolo="USD",
    )

    class Resultado:
        def all(self):
            return [fila]

    class DB:
        statement = None

        async def execute(self, statement):
            self.statement = statement
            return Resultado()

    db_mock = DB()
    monkeypatch.setattr(
        reportes_service,
        "nombres_completos_por_cliente",
        AsyncMock(return_value={7: "Realizador Test"}),
    )

    data, meta = await reportes_service.get_informe_desempeno(
        db_mock, tipo_tercero="realizadores"
    )

    sql = str(db_mock.statement).lower()
    assert "referencia_bancaria" not in sql
    assert "persona_liquidacion.importe_agencia" not in sql
    assert "persona_liquidacion.id_persona" in sql
    assert len(data) == 1
    assert data[0]["tipo_tercero"] == "Realizador"
    assert data[0]["neto_pagar"] == 82.0
    assert data[0]["importe_agencia"] == 10.0
    assert meta["total_items"] == 1

