"""Cálculo de la Ficha de Precio de Servicios.

Réplica EXACTA de las fórmulas de la hoja 'Ficha' del libro de cálculo oficial
(p.ej. '06 TABLE ARROZ CONGRI Y POLLO DESHUESADO.xlsx', ficha 6/26):

    F9  = total insumos              = Σ (norma_consumo × precio_unitario)
    F10 = combustible y lubricantes  (entrada manual)
    F11 = energía                    = F9 × pct_energia / 100
    F12 = agua                       = F9 × pct_agua / 100
    F8  = gasto material             = F9 + F10 + F11 + F12
    F14 = salario directo            = Σ (tarifa_horaria × norma_tiempo)
    F15 = vacaciones                 = F14 × pct_vacaciones / 100
    F13 = salario total              = F14 + F15
    F16 = otros gastos directos      = F9 × pct_otros_gastos_directos / 100
    F18 = gastos asociados prod.     = F13 × coef_gastos_asociados
    F19 = costo total                = F8 + F13 + F16 + F18
    F20 = gastos grles. y admón.     = F13 × coef_gastos_generales
    F22 = gastos distribución/venta  = F13 × coef_gastos_distribucion
    F24 = gastos financieros         = F13 × coef_gastos_financieros / 100
    F25 = financiamiento OSDE        (entrada manual)
    F27 = gastos tributarios         = F13 × (pct_seguridad_social + pct_fuerza_trabajo) / 100
    F29 = total de gastos            = F20 + F22 + F24 + F25
    F30 = total costos y gastos      = F19 + F29
    F31 = utilidad                   = (F30 − F8 − F20 − F22 − F24 − F25 − F27) × pct_utilidad / 100
    F32 = precio o tarifa            = F30 + F31
    F28 = impuesto s/ ventas         = F32 × pct_impuesto_ventas / 100
    F33 = precio unitario ajustado   = F32 / (1 − pct_impuesto_ventas/100) / nivel_produccion
"""

from decimal import Decimal
from typing import Dict

_D = Decimal


def _d(value) -> Decimal:
    """Convierte int/float/str/Decimal a Decimal sin pérdida."""
    if isinstance(value, Decimal):
        return value
    return _D(str(value))


def calcular_ficha(
    *,
    total_insumos,
    gasto_combustible,
    salario_directo,
    gasto_osde,
    nivel_produccion,
    pct_energia,
    pct_agua,
    pct_otros_gastos_directos,
    pct_vacaciones,
    coef_gastos_asociados,
    coef_gastos_generales,
    coef_gastos_distribucion,
    coef_gastos_financieros,
    pct_seguridad_social,
    pct_fuerza_trabajo,
    pct_utilidad,
    pct_impuesto_ventas,
) -> Dict[str, Decimal]:
    f9 = _d(total_insumos)
    f10 = _d(gasto_combustible)
    f11 = f9 * _d(pct_energia) / _D(100)
    f12 = f9 * _d(pct_agua) / _D(100)
    f8 = f9 + f10 + f11 + f12

    f14 = _d(salario_directo)
    f15 = f14 * _d(pct_vacaciones) / _D(100)
    f13 = f14 + f15

    f16 = f9 * _d(pct_otros_gastos_directos) / _D(100)
    f18 = f13 * _d(coef_gastos_asociados)
    f19 = f8 + f13 + f16 + f18

    f20 = f13 * _d(coef_gastos_generales)
    f22 = f13 * _d(coef_gastos_distribucion)
    f24 = f13 * _d(coef_gastos_financieros) / _D(100)
    f25 = _d(gasto_osde)

    f27 = f13 * (_d(pct_seguridad_social) + _d(pct_fuerza_trabajo)) / _D(100)

    f29 = f20 + f22 + f24 + f25
    f30 = f19 + f29
    f31 = (f30 - f8 - f20 - f22 - f24 - f25 - f27) * _d(pct_utilidad) / _D(100)
    f32 = f30 + f31
    f28 = f32 * _d(pct_impuesto_ventas) / _D(100)

    divisor = _D(1) - _d(pct_impuesto_ventas) / _D(100)
    nivel = _d(nivel_produccion)
    if nivel == 0:
        nivel = _D(1)
    f33 = f32 / divisor / nivel

    return {
        "gasto_energia": f11,
        "gasto_agua": f12,
        "gasto_material": f8,
        "vacaciones": f15,
        "salario_total": f13,
        "otros_gastos_directos": f16,
        "gastos_asociados": f18,
        "costo_total": f19,
        "gastos_generales": f20,
        "gastos_distribucion": f22,
        "gastos_financieros": f24,
        "gastos_tributarios": f27,
        "impuesto_ventas": f28,
        "total_gastos": f29,
        "total_costos_gastos": f30,
        "utilidad": f31,
        "precio_tarifa": f32,
        "precio_unitario_ajustado": f33,
    }
