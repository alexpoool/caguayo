from decimal import Decimal

from src.services.dj08_service import (
    calcular_escala,
    calcular_base_imponible,
)
from src.dto.dj08_dto import DJ08Input


def test_escala_con_datos_del_pdf_oficial():
    """Base imponible 960380 (como el documento de referencia) → 298421."""
    filas, total_base, total_importe = calcular_escala(Decimal("960380"))
    assert total_base == Decimal("960380")
    assert total_importe == Decimal("298421")
    assert len(filas) == 10
    # Última fila ocupada: 800000-1000000 con base 160380 y 45%
    ultima = filas[8]
    assert ultima.base_imponible == Decimal("160380")
    assert ultima.tipo == 45
    assert ultima.importe == Decimal("72171")
    # Fila 54 (tramo 50%) queda en cero
    assert filas[9].base_imponible == Decimal("0")
    assert filas[9].importe == Decimal("0")


def test_escala_base_negativa_da_todo_cero():
    filas, total_base, total_importe = calcular_escala(Decimal("-5"))
    assert total_base == Decimal("0")
    assert total_importe == Decimal("0")
    assert all(f.importe == 0 for f in filas)


def test_escala_base_cero():
    _, total_base, total_importe = calcular_escala(Decimal("0"))
    assert total_base == Decimal("0")
    assert total_importe == Decimal("0")


def test_base_imponible_con_datos_del_pdf():
    entrada = DJ08Input(ano_fiscal=2025)
    bi = calcular_base_imponible(
        total_ingresos=Decimal("1000000"),
        minimo_exento=Decimal("39120"),
        total_gastos=Decimal("500"),
        total_tributos=Decimal("0"),
        entrada=entrada,
    )
    assert bi == Decimal("960380")


def test_base_imponible_descuenta_tributos_y_otros():
    entrada = DJ08Input(
        ano_fiscal=2025,
        contribucion_restauracion=Decimal("100"),
        otros_descuentos=Decimal("50"),
    )
    bi = calcular_base_imponible(
        total_ingresos=Decimal("100000"),
        minimo_exento=Decimal("39120"),
        total_gastos=Decimal("1000"),
        total_tributos=Decimal("880"),
        entrada=entrada,
    )
    # 100000 - 39120 - 1000 - 880 - 100 - 50 = 58850
    assert bi == Decimal("58850")


def test_base_imponible_no_es_negativa():
    entrada = DJ08Input(ano_fiscal=2025)
    bi = calcular_base_imponible(
        total_ingresos=Decimal("1000"),
        minimo_exento=Decimal("39120"),
        total_gastos=Decimal("0"),
        total_tributos=Decimal("0"),
        entrada=entrada,
    )
    assert bi == Decimal("0")
