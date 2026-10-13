"""Recibo de nómina en PDF (Fase 6).

Reutiliza `PDFTemplate` (el mismo motor ReportLab Platypus del resto de
exportaciones del sistema) para mantener la estética monocromática y el bloque
de firmas.

El recibo de una sola persona es un documento de dos columnas concepto/importe,
más el bloque de pagos si ya se registró alguno.
"""

from io import BytesIO
from decimal import Decimal
from typing import Optional

from src.utils.pdf_template import PDFTemplate
from src.dto import RrhhNominaDetalle


def _fmt(valor: Optional[Decimal]) -> str:
    if valor is None:
        return "0.00"
    return f"{float(valor):,.2f}"


def generar_recibo_pdf(
    detalle: RrhhNominaDetalle,
    usuario_actual: str = "",
) -> BytesIO:
    """Genera el PDF del recibo de una nómina concreta."""
    template = PDFTemplate(title="RECIBO DE NÓMINA", landscape_mode=False)
    template.set_company_header(name="Caguayo")

    periodo = f"{detalle.inicio_periodo} al {detalle.fin_periodo}"
    template.set_filters(
        {
            "Empleado": f"{detalle.empleado_nombre or ''} ({detalle.empleado_codigo or 's/código'})",
            "Periodo": periodo,
            "Estado": detalle.estado.capitalize(),
        }
    )

    # ── Devengado ────────────────────────────────────────────────────────
    devengado = [
        ["Salario base", _fmt(detalle.salario_base)],
        ["Horas extras", _fmt(detalle.horas_extras)],
    ]
    template.add_table(
        ["CONCEPTO", "IMPORTE"],
        devengado,
        numeric_columns=[1],
    )

    # ── Bonificaciones ───────────────────────────────────────────────────
    if detalle.bonificaciones_aplicadas:
        filas = []
        for b in detalle.bonificaciones_aplicadas:
            concepto = b.tipo_nombre or "Bonificación"
            if b.es_porcentaje and b.valor_original is not None:
                concepto = f"{concepto} ({b.valor_original}%)"
            filas.append([concepto, _fmt(b.monto_aplicado)])
        filas.append(["Total bonificaciones", _fmt(detalle.bonificaciones)])
        template.add_table(
            ["BONIFICACIONES", "IMPORTE"],
            filas,
            numeric_columns=[1],
        )

    # ── Deducciones ──────────────────────────────────────────────────────
    if detalle.deducciones_aplicadas:
        filas = []
        for d in detalle.deducciones_aplicadas:
            concepto = d.tipo_nombre or "Deducción"
            if d.es_porcentaje and d.valor_original is not None:
                concepto = f"{concepto} ({d.valor_original}%)"
            filas.append([concepto, f"-{_fmt(d.monto_aplicado)}"])
        filas.append(["Total deducciones", f"-{_fmt(detalle.deducciones)}"])
        template.add_table(
            ["DEDUCCIONES", "IMPORTE"],
            filas,
            numeric_columns=[1],
        )

    # ── Neto ─────────────────────────────────────────────────────────────
    template.add_table(
        ["SALARIO NETO", "IMPORTE"],
        [["Neto a pagar", _fmt(detalle.salario_neto)]],
        numeric_columns=[1],
    )

    # ── Pagos ────────────────────────────────────────────────────────────
    if detalle.pagos:
        filas = [
            [
                p.fecha_pago.isoformat(),
                p.metodo_nombre or str(p.metodo_id),
                p.referencia or "—",
                _fmt(p.monto),
            ]
            for p in detalle.pagos
        ]
        filas.append(["Total pagado", "", "", _fmt(detalle.total_pagado)])
        template.add_table(
            ["FECHA", "MÉTODO", "REFERENCIA", "MONTO"],
            filas,
            numeric_columns=[3],
        )

    template.add_signature_section(created_by=usuario_actual or "—")

    return template.build()
