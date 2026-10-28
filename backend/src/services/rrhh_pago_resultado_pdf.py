"""Pago por resultado en PDF.

Genera el documento imprimible del lote con el mismo estilo que la nómina:

- Encabezado con logo, título centrado y datos básicos del lote.
- Tabla por empleado: código, nombre y apellidos, puntuación, coeficiente,
  devengado, impuesto, neto a cobrar y firma.
- Totales por columna, total neto y bloque de firmas.

Los importes y coeficientes ya vienen calculados en el DTO de detalle.
"""

from io import BytesIO

from src.dto import RrhhPagoResultadoRead
from src.services.rrhh_nomina_pdf import _fmt, _fmt_rango, _fmt_tasa
from src.utils.pdf_template import PDFTemplate

CERO = 0.0


def _fmt_coeficiente(valor) -> str:
    if valor is None:
        return "0.0000"
    return f"{float(valor):,.4f}"


def generar_documento_pdf(
    detalle: RrhhPagoResultadoRead,
    usuario_actual: str = "",
) -> BytesIO:
    """Genera el PDF del lote de pago por resultado."""
    template = PDFTemplate(
        title="PAGO POR RESULTADO",
        landscape_mode=True,
        title_centered=True,
    )
    template.set_company_header(name="Caguayo")

    template.add_info_grid(
        [
            [("Descripción", detalle.descripcion or "—")],
            [
                ("Periodo", detalle.periodo_nombre or "—"),
                (
                    "Fecha",
                    _fmt_rango(detalle.inicio_periodo, detalle.fin_periodo),
                ),
            ],
            [
                ("Monto", _fmt(detalle.monto)),
                ("Impuesto", f"{_fmt_tasa(detalle.porcentaje_impuesto)} %"),
            ],
        ]
    )

    filas = []
    total_devengado = CERO
    total_impuesto = CERO
    total_neto = CERO

    for empleado in detalle.empleados:
        total_devengado += float(empleado.devengado or 0)
        total_impuesto += float(empleado.impuesto or 0)
        total_neto += float(empleado.neto_a_cobrar or 0)
        filas.append(
            [
                empleado.empleado_codigo or "—",
                empleado.empleado_nombre or "—",
                _fmt_coeficiente(empleado.puntuacion),
                _fmt_coeficiente(empleado.coeficiente),
                _fmt(empleado.devengado),
                _fmt(empleado.impuesto),
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
            ]
        ]

    template.add_table(
        [
            "CÓDIGO",
            "NOMBRE Y APELLIDOS",
            "PUNTUACIÓN",
            "COEFICIENTE",
            "DEVENGADO",
            "IMPUESTO",
            "NETO A COBRAR",
            "FIRMA",
        ],
        filas,
        col_widths=[60, 215, 70, 70, 80, 70, 85, 102],
        totals_row=[
            "",
            "TOTAL",
            "",
            "",
            _fmt(total_devengado),
            _fmt(total_impuesto),
            _fmt(total_neto),
            "",
        ],
        numeric_columns=[2, 3, 4, 5, 6],
        code_columns=[0],
    )

    template.add_signature_section(created_by=usuario_actual or "—")

    return template.build()
