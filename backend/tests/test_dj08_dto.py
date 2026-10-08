from decimal import Decimal
from datetime import date

from src.dto.dj08_dto import DJ08Input, ActividadEconomicaCreate, TributoCreate


def test_declaracion_read_requiere_campos_calculados():
    """DeclaracionJuradaRead expone los totales para la lista del frontend."""
    from src.dto.dj08_dto import DeclaracionJuradaRead

    campos = set(DeclaracionJuradaRead.model_fields.keys())
    for esperado in ("codigo", "estado", "total_pagar", "base_imponible"):
        assert esperado in campos


def test_dj08_input_defaults_legales():
    d = DJ08Input(ano_fiscal=2025)
    assert d.minimo_exento == Decimal("39120")
    assert d.opera_en_municipio is True
    assert d.cuotas_mensuales == Decimal("0")


def test_actividad_create_valida():
    a = ActividadEconomicaCreate(
        codigo="0002",
        nombre="Actividad principal",
        fecha_inicio=date(2025, 1, 1),
        fecha_fin=date(2025, 12, 31),
        ingresos=Decimal("1000000"),
        gastos=Decimal("500"),
    )
    assert a.orden == 0


def test_tributo_create_valida():
    t = TributoCreate(nombre="Impuesto sobre las Ventas y/o Servicio", importe=Decimal("100"))
    assert t.importe == Decimal("100")


def test_actividad_fechas_son_obligatorias():
    """Las fechas Desde/Hasta son obligatorias (las imprime el PDF oficial)."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ActividadEconomicaCreate(codigo="0002", nombre="Sin fechas")


def test_actividad_fechas_aceptan_iso():
    """El frontend enva ISO yyyy-mm-dd (patrn DateInput)."""
    a = ActividadEconomicaCreate(
        codigo="0002",
        nombre="Actividad",
        fecha_inicio="2025-01-01",
        fecha_fin="2025-12-31",
    )
    assert a.fecha_inicio == date(2025, 1, 1)
    assert a.fecha_fin == date(2025, 12, 31)
