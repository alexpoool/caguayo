"""Fixture: ficha No. 6/26 del libro '06 TABLE ARROZ CONGRI Y POLLO DESHUESADO.xlsx'.

Insumos = 657.06 (hoja Materiales G24), salario directo = 47.2193074501574
(hoja Mano de obra I21). Coeficientes = hoja Gastos / fórmulas de la hoja Ficha.
Resultado esperado: precio unitario ajustado = 1143.2087238498195 CUP.
"""

from decimal import Decimal

import pytest

from src.services.ficha_costo_calculo import calcular_ficha

# Entradas del Excel
TOTAL_INSUMOS = Decimal("657.06")
SALARIO_DIRECTO = Decimal("47.2193074501574")

COEFS = dict(
    gasto_combustible=Decimal("0"),
    gasto_osde=Decimal("0"),
    nivel_produccion=Decimal("1"),
    pct_energia=Decimal("3"),
    pct_agua=Decimal("0.5"),
    pct_otros_gastos_directos=Decimal("17"),
    pct_vacaciones=Decimal("9.09"),
    coef_gastos_asociados=Decimal("0.2587298394047821"),
    coef_gastos_generales=Decimal("0.4195769613893774"),
    coef_gastos_distribucion=Decimal("0.3216931992058406"),
    coef_gastos_financieros=Decimal("1.4939751466265447"),
    pct_seguridad_social=Decimal("12.5"),
    pct_fuerza_trabajo=Decimal("5"),
    pct_utilidad=Decimal("25"),
    pct_impuesto_ventas=Decimal("18"),
)


@pytest.fixture
def resultado():
    return calcular_ficha(
        total_insumos=TOTAL_INSUMOS, salario_directo=SALARIO_DIRECTO, **COEFS
    )


def test_gasto_material(resultado):
    assert float(resultado["gasto_energia"]) == pytest.approx(19.7118, abs=1e-6)
    assert float(resultado["gasto_agua"]) == pytest.approx(3.2853, abs=1e-6)
    assert float(resultado["gasto_material"]) == pytest.approx(680.0571, abs=1e-6)


def test_salario(resultado):
    assert float(resultado["vacaciones"]) == pytest.approx(4.292235047219308, abs=1e-6)
    assert float(resultado["salario_total"]) == pytest.approx(
        51.51154249737671, abs=1e-6
    )


def test_costo_total(resultado):
    assert float(resultado["otros_gastos_directos"]) == pytest.approx(111.7002, abs=1e-6)
    assert float(resultado["gastos_asociados"]) == pytest.approx(
        13.327573117838885, abs=1e-6
    )
    assert float(resultado["costo_total"]) == pytest.approx(856.5964156152157, abs=1e-6)


def test_gastos(resultado):
    assert float(resultado["gastos_generales"]) == pytest.approx(
        21.6130564775291, abs=1e-6
    )
    assert float(resultado["gastos_distribucion"]) == pytest.approx(
        16.57091290200873, abs=1e-6
    )
    assert float(resultado["gastos_financieros"]) == pytest.approx(
        0.7695696425547786, abs=1e-6
    )
    assert float(resultado["gastos_tributarios"]) == pytest.approx(
        9.014519937040925, abs=1e-6
    )
    assert float(resultado["total_gastos"]) == pytest.approx(
        38.953539022092606, abs=1e-6
    )


def test_total_costos_gastos(resultado):
    assert float(resultado["total_costos_gastos"]) == pytest.approx(
        895.5499546373084, abs=1e-6
    )


def test_utilidad(resultado):
    assert float(resultado["utilidad"]) == pytest.approx(41.881198919543685, abs=1e-6)


def test_precio(resultado):
    assert float(resultado["precio_tarifa"]) == pytest.approx(937.431153556852, abs=1e-6)
    assert float(resultado["impuesto_ventas"]) == pytest.approx(
        168.73760764023336, abs=1e-6
    )
    assert float(resultado["precio_unitario_ajustado"]) == pytest.approx(
        1143.2087238498195, abs=1e-6
    )


def test_nivel_produccion_2_divide_precio():
    r = calcular_ficha(
        total_insumos=TOTAL_INSUMOS,
        salario_directo=SALARIO_DIRECTO,
        nivel_produccion=Decimal("2"),
        **{k: v for k, v in COEFS.items() if k != "nivel_produccion"},
    )
    assert float(r["precio_unitario_ajustado"]) == pytest.approx(
        1143.2087238498195 / 2, abs=1e-6
    )
