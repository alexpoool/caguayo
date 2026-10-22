"""Recibo de nómina en PDF (Fase 6 v2).

El recibo del lote reutiliza `PDFTemplate` (el mismo motor ReportLab Platypus
del resto de exportaciones del sistema) y lista a todos los empleados con sus
importes, más los totales y los pagos registrados por empleado.
"""

from io import BytesIO
from decimal import Decimal
from typing import Optional

from src.utils.pdf_template import PDFTemplate
from src.dto import RrhhNominaDetalle

ESTADOS = {"pre_nomina": "Pre-nómina", "nomina": "Nómina"}


def _fmt(valor: Optional[Decimal]) -> str:
    if valor is None:
        return "0.00"
    return f"{float(valor):,.2f}"


def generar_recibo_pdf(
    detalle: RrhhNominaDetalle,
    usuario_actual: str = "",
) -> BytesIO:
    """Genera el PDF del lote de nómina con su detalle por empleado."""
    template = PDFTemplate(title="RECIBO DE NÓMINA", landscape_mode=True)
    template.set_company_header(name="Caguayo")

    template.set_filters(
        {
            "Nómina": f"#{detalle.id} · {detalle.descripcion}",
            "Periodo": (
                f"{detalle.periodo_nombre or '—'} "
                f"({detalle.inicio_periodo} al {detalle.fin_periodo})"
            ),
            "Estado": ESTADOS.get(detalle.estado, detalle.estado),
            "Moneda": detalle.moneda_nombre or "—",
        }
    )

    filas = [
        [
            empleado.empleado_nombre or "—",
            _fmt(empleado.salario_base),
            _fmt(empleado.horas_extras),
            _fmt(empleado.bonificaciones),
            _fmt(empleado.devengado),
            _fmt(empleado.impuesto),
            _fmt(empleado.deducciones),
            _fmt(empleado.neto_a_cobrar),
        ]
        for empleado in detalle.empleados
    ]
    if not filas:
        filas = [["Sin empleados seleccionados", "", "", "", "", "", "", ""]]

    template.add_table(
        [
            "EMPLEADO",
            "SALARIO BASE",
            "EXTRAS",
            "BONIFICACIONES",
            "DEVENGADO",
            "IMPUESTO",
            "DEDUCCIONES",
            "NETO A COBRAR",
        ],
        filas,
        numeric_columns=[1, 2, 3, 4, 5, 6, 7],
    )

    template.add_table(
        ["TOTALES", "IMPORTE"],
        [
            ["Total devengado", _fmt(detalle.total_devengado)],
            ["Total deducciones", _fmt(detalle.total_deducciones)],
            ["Neto total", _fmt(detalle.total_neto)],
        ],
        numeric_columns=[1],
    )

    pagados = [
        empleado
        for empleado in detalle.empleados
        if empleado.fecha_pago is not None and empleado.monto is not None
    ]
    if pagados:
        filas_pagos = [
            [
                empleado.empleado_nombre or "—",
                empleado.fecha_pago.isoformat(),
                empleado.metodo_nombre or str(empleado.metodo_id or ""),
                empleado.referencia or "—",
                _fmt(empleado.monto),
            ]
            for empleado in pagados
        ]
        filas_pagos.append(["Total pagado", "", "", "", _fmt(detalle.total_pagado)])
        template.add_table(
            ["EMPLEADO", "FECHA", "MÉTODO", "REFERENCIA", "MONTO"],
            filas_pagos,
            numeric_columns=[4],
        )

    template.add_signature_section(created_by=usuario_actual or "—")

    return template.build()
