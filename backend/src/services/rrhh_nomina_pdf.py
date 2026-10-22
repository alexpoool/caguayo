"""Nómina en PDF (Fase 6 v2).

Genera el documento imprimible del lote con el motor `PDFTemplate` (ReportLab
Platypus). El título cambia según el estado (`PRE NÓMINA` / `NÓMINA`) y la
tabla principal resume a cada empleado:

- Código, nombre y apellidos.
- A cobrar (salario base + horas extras).
- Bonificaciones, devengado, impuesto, deducciones y neto a cobrar.
- Firma (columna vacía para firmar en físico).

Al pie se muestra la suma de cada columna y el total neto de la nómina.
"""

from io import BytesIO
from decimal import Decimal
from typing import Optional

from src.dto import RrhhNominaDetalle
from src.utils.pdf_template import PDFTemplate

ESTADOS = {"pre_nomina": "PRE NÓMINA", "nomina": "NÓMINA"}
CERO = Decimal("0.00")


def _fmt(valor: Optional[Decimal]) -> str:
    if valor is None:
        return "0.00"
    return f"{float(valor):,.2f}"


def _fmt_fecha(valor) -> str:
    return valor.strftime("%d/%m/%Y") if valor else "—"


def _fmt_tasa(valor: Optional[Decimal]) -> str:
    if valor is None:
        return "—"
    return f"{float(valor):g}"


def generar_recibo_pdf(
    detalle: RrhhNominaDetalle,
    usuario_actual: str = "",
) -> BytesIO:
    """Genera el PDF del lote de nómina con su detalle por empleado."""
    template = PDFTemplate(
        title=ESTADOS.get(detalle.estado, "NÓMINA"), landscape_mode=True
    )
    template.set_company_header(name="Caguayo")

    template.set_filters(
        {
            "Nómina": f"#{detalle.id} · {detalle.descripcion}",
            "Periodo": (
                f"{detalle.periodo_nombre or '—'} "
                f"({_fmt_fecha(detalle.inicio_periodo)} al "
                f"{_fmt_fecha(detalle.fin_periodo)})"
            ),
            "Moneda": detalle.moneda_nombre or "—",
            "Tasa": _fmt_tasa(detalle.tasa),
            "Impuesto": f"{_fmt_tasa(detalle.porcentaje_impuesto)} %",
            "Empleados": str(len(detalle.empleados)),
        }
    )

    filas = []
    total_a_cobrar = CERO
    total_bonificaciones = CERO
    total_devengado = CERO
    total_impuesto = CERO
    total_deducciones = CERO
    total_neto = CERO

    for empleado in detalle.empleados:
        a_cobrar = (empleado.salario_base or CERO) + (
            empleado.horas_extras or CERO
        )
        total_a_cobrar += a_cobrar
        total_bonificaciones += empleado.bonificaciones or CERO
        total_devengado += empleado.devengado or CERO
        total_impuesto += empleado.impuesto or CERO
        total_deducciones += empleado.deducciones or CERO
        total_neto += empleado.neto_a_cobrar or CERO
        filas.append(
            [
                empleado.empleado_codigo or "—",
                empleado.empleado_nombre or "—",
                _fmt(a_cobrar),
                _fmt(empleado.bonificaciones),
                _fmt(empleado.devengado),
                _fmt(empleado.impuesto),
                _fmt(empleado.deducciones),
                _fmt(empleado.neto_a_cobrar),
                "",
            ]
        )

    if not filas:
        filas = [
            [
                "—",
                "Sin empleados seleccionados",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
            ]
        ]

    template.add_table(
        [
            "CÓDIGO",
            "NOMBRE Y APELLIDOS",
            "A COBRAR",
            "BONIFICACIONES",
            "DEVENGADO",
            "IMPUESTO",
            "DEDUCCIONES",
            "NETO A COBRAR",
            "FIRMA",
        ],
        filas,
        col_widths=[55, 205, 65, 82, 65, 60, 65, 75, 80],
        totals_row=[
            "",
            "TOTAL DE NÓMINA",
            _fmt(total_a_cobrar),
            _fmt(total_bonificaciones),
            _fmt(total_devengado),
            _fmt(total_impuesto),
            _fmt(total_deducciones),
            _fmt(total_neto),
            "",
        ],
        numeric_columns=[2, 3, 4, 5, 6, 7],
        code_columns=[0],
    )

    template.add_summary_line("Total de nómina", _fmt(total_neto))

    template.add_signature_section(created_by=usuario_actual or "—")

    return template.build()
