"""Exportación de la DJ-08 a PDF con ReportLab (Platypus).

Replica el formulario oficial de 4 páginas: encabezado + instrucciones
(pág. 1), Secciones A-E (pág. 2), Secciones F-H (pág. 3) y Sección I +
observaciones + firma (pág. 4).
"""

import io
from decimal import Decimal
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from src.dto.dj08_dto import DJ08Calculado

C_GRIS = colors.HexColor("#F2F2F2")
C_GRIS_FUERTE = colors.HexColor("#D9D9D9")
C_GRIS_TOTAL = colors.HexColor("#A6A6A6")

ZERO = Decimal("0")


def _fmt(v: Optional[Decimal]) -> str:
    """Formatea importes como el formulario: 1,234,567.89 (vacío si None)."""
    if v is None:
        return ""
    return f"{float(v):,.2f}"


def _p(texto: str, size: float = 8.5, bold: bool = False, align: str = "LEFT") -> Paragraph:
    style = ParagraphStyle(
        "celda",
        fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,
        leading=size * 1.25,
        alignment={"LEFT": 0, "CENTER": 1, "RIGHT": 2}[align],
    )
    return Paragraph(texto, style)


def _titulo(texto: str, size: float = 12) -> Paragraph:
    return _p(texto, size=size, bold=True, align="CENTER")


def _estilos_tabla(n: int, grises=(), total=()) -> TableStyle:
    est = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), C_GRIS),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]
    for i in grises:
        est.append(("BACKGROUND", (0, i), (-1, i), C_GRIS_FUERTE))
    for i in total:
        est.append(("BACKGROUND", (0, i), (-1, i), C_GRIS_TOTAL))
    return TableStyle(est)


def _pie_pagina(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(2 * cm, 1 * cm, "DJ-08 · Impuesto sobre Ingresos Personales – CUP")
    canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Página {doc.page}")
    canvas.restoreState()


def _encabezado(d: DJ08Calculado) -> List:
    e = d.entrada
    elementos = [
        _titulo("DECLARACIÓN JURADA", 14),
        _titulo("IMPUESTO SOBRE INGRESOS PERSONALES - PESOS CUP", 11),
        Spacer(1, 0.3 * cm),
    ]
    cab = Table(
        [
            [
                _p("Año fiscal", bold=True),
                _p(str(e.ano_fiscal), align="CENTER"),
                _p("NIT", bold=True),
                _p(d.nit, align="CENTER"),
            ],
            [
                _p("Nombre (s) y apellidos:", bold=True),
                _p(d.nombre),
                _p("Carné de identidad", bold=True),
                _p(""),
            ],
            [
                _p("Dirección según Carné de identidad", bold=True),
                _p(d.direccion),
                _p("Zona Postal", bold=True),
                _p(d.codigo_postal, align="CENTER"),
            ],
            [
                _p("Referencia", bold=True),
                _p(f"{d.municipio}   {d.provincia}"),
                _p("Teléfono", bold=True),
                _p(d.telefono, align="CENTER"),
            ],
            [
                _p("Correo Electrónico", bold=True),
                _p(d.email),
                _p("Opera en su municipio", bold=True),
                _p(
                    f"SI: {'X' if e.opera_en_municipio else ''}  "
                    f"NO: {'X' if not e.opera_en_municipio else ''}",
                    align="CENTER",
                ),
            ],
            [
                _p("Municipio donde opera", bold=True),
                _p(e.municipio_donde_opera or ""),
                _p("Código del Banco", bold=True),
                _p(e.codigo_banco or "", align="CENTER"),
            ],
            [
                _p("Código del tributo", bold=True),
                _p(e.codigo_tributo or ""),
                _p("TOTAL A PAGAR", bold=True),
                _p(_fmt(d.total_pagar), align="CENTER", bold=True),
            ],
        ],
        colWidths=[4.2 * cm, 5.6 * cm, 3.4 * cm, 4.3 * cm],
    )
    cab.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (0, -1), C_GRIS),
                ("BACKGROUND", (2, 0), (2, -1), C_GRIS),
            ]
        )
    )
    elementos.append(cab)
    return elementos


def _seccion_a(d: DJ08Calculado) -> List:
    datos = [
        [
            _p("Código - Nombre", bold=True, align="CENTER"),
            _p("Desde", bold=True, align="CENTER"),
            _p("Hasta", bold=True, align="CENTER"),
            _p("Ingresos Obtenidos", bold=True, align="CENTER"),
            _p("Gastos Deducibles", bold=True, align="CENTER"),
            _p("Fila", bold=True, align="CENTER"),
        ]
    ]
    for i in range(9):
        if i < len(d.actividades):
            a = d.actividades[i]
            fila = [
                f"{a.codigo} - {a.nombre}",
                a.fecha_inicio.strftime("%d/%m/%Y"),
                a.fecha_fin.strftime("%d/%m/%Y"),
                _fmt(a.ingresos),
                _fmt(a.gastos),
            ]
        else:
            fila = ["", "", "", _fmt(ZERO), _fmt(ZERO)]
        datos.append(
            [
                _p(fila[0]),
                _p(fila[1], align="CENTER"),
                _p(fila[2], align="CENTER"),
                _p(fila[3], align="RIGHT"),
                _p(fila[4], align="RIGHT"),
                _p(str(1 + i), align="CENTER"),
            ]
        )
    datos.append(
        [
            _p("Total", bold=True),
            "",
            "",
            _p(_fmt(d.total_ingresos), bold=True, align="RIGHT"),
            _p(_fmt(d.total_gastos), bold=True, align="RIGHT"),
            _p("10", bold=True, align="CENTER"),
        ]
    )
    t = Table(datos, colWidths=[6.2 * cm, 2.4 * cm, 2.4 * cm, 3 * cm, 2.6 * cm, 1 * cm])
    t.setStyle(_estilos_tabla(len(datos), total=(len(datos) - 1,)))
    return [
        _titulo("Sección A - Ingresos Obtenidos y Gastos Deducibles por actividad", 10.5),
        Spacer(1, 0.15 * cm),
        t,
        Spacer(1, 0.4 * cm),
    ]


def _tabla_conceptos(titulo: str, filas: List, fila_inicio: int) -> List:
    """Tabla genérica Concepto | Importe | Fila (Secciones B-E)."""
    datos = [
        [
            _p("Concepto", bold=True, align="CENTER"),
            _p("Importe", bold=True, align="CENTER"),
            _p("Fila", bold=True, align="CENTER"),
        ]
    ]
    grises = []
    total = []
    for i, (concepto, importe, num, fuerte) in enumerate(filas, start=1):
        if fuerte:
            grises.append(i)
        if num in (20, 26, 36):
            total.append(i)
        datos.append(
            [
                _p(concepto, bold=fuerte),
                _p(_fmt(importe), align="RIGHT", bold=fuerte),
                _p(str(num), align="CENTER"),
            ]
        )
    t = Table(datos, colWidths=[11.5 * cm, 4.5 * cm, 1.6 * cm])
    t.setStyle(_estilos_tabla(len(datos), grises=grises, total=total))
    return [_titulo(titulo, 10.5), Spacer(1, 0.15 * cm), t, Spacer(1, 0.4 * cm)]


def _secciones_b_c_d_e(d: DJ08Calculado) -> List:
    e = d.entrada
    elementos = []
    elementos += _tabla_conceptos(
        "Sección B - Determinación de la Base Imponible",
        [
            ("Ingresos obtenidos (Sección A, fila 10)", d.total_ingresos, 11, False),
            ("(-) Mínimo Exento Autorizado", e.minimo_exento, 12, False),
            ("(-) Gastos deducibles (Sección A, fila 10)", d.total_gastos, 13, False),
            ("(-) Total de tributos pagados (Sección F, fila 44)", d.total_tributos, 14, False),
            ("(-) Contribución para restauración y preservación", e.contribucion_restauracion, 15, False),
            ("(-) Pagos por arrendamiento de bienes a entidades estatales", e.pagos_arrendamiento, 16, False),
            ("(-) Importe exonerados por arrendamiento por reparaciones", e.importe_exonerado_reparaciones, 17, False),
            ("(-) Otros descuentos autorizados", e.otros_descuentos, 18, False),
            ("(-) Bonificación según aprobación del MFP", e.bonificacion_mfp, 19, False),
            ("Base Imponible (pasa a Sección G, fila 21)", d.base_imponible, 20, True),
        ],
        11,
    )
    elementos += _tabla_conceptos(
        "Sección C - Determinación del impuesto a pagar",
        [
            ("Impuesto a pagar según escala (Sección G, fila 55)", d.impuesto_escala, 21, False),
            ("(-) Total de cuotas mensuales pagadas por el Titular", e.cuotas_mensuales, 22, False),
            ("(-) Otros pagos anticipados o Créditos del ejercicio anterior", e.otros_pagos_anticipados, 23, False),
            ("(-) Total de retenciones", e.total_retenciones, 24, False),
            ("(-) Bonificaciones autorizadas", e.bonificaciones_autorizadas, 25, False),
            ("Impuesto a pagar (filas 21-22-23-24-25, si > 0)", d.impuesto_pagar, 26, True),
            ("Total a Devolver (si resultado negativo, TCP = 0)", d.total_devolver, 27, False),
        ],
        21,
    )
    elementos += _tabla_conceptos(
        "Sección D - Declaración Jurada Rectificada",
        [
            ("Impuesto a pagar según Declaración Rectificada", e.impuesto_declaracion_rectificada, 28, False),
            ("(-) Pago del impuesto realizado en la Declaración anterior", e.pago_declaracion_anterior, 29, False),
            ("Diferencia Impuesto a Pagar (si fila 28 > fila 29)", d.diferencia_pagar, 30, False),
            ("Diferencia a devolver (si fila 28 < fila 29)", d.diferencia_devolver, 31, False),
        ],
        28,
    )
    elementos += _tabla_conceptos(
        "Sección E - Total a Pagar",
        [
            (
                "IMPUESTO A PAGAR (viene de filas 26 o 30)",
                d.impuesto_pagar
                if e.impuesto_declaracion_rectificada == 0
                else d.diferencia_pagar,
                32,
                False,
            ),
            ("(-) Bonificaciones (5% por pronto pago)", e.bonificacion_pronto_pago, 33, False),
            ("(-) Impuesto pagado en DJ presentadas en el año fiscal", e.impuesto_pagado_dj_ano, 34, False),
            ("(+) Recargo por mora (si se paga fuera de fecha)", e.recargo_mora, 35, False),
            ("TOTAL A PAGAR (fila 32 - 33 - 34 + 35)", d.total_pagar, 36, True),
        ],
        32,
    )
    return elementos


def _secciones_f_g_h(d: DJ08Calculado) -> List:
    elementos = []
    # Sección F
    datos_f = [
        [
            _p("Nombre del Tributo", bold=True, align="CENTER"),
            _p("Importe Total pagado", bold=True, align="CENTER"),
            _p("Fila", bold=True, align="CENTER"),
        ]
    ]
    nombres_fijos = [
        "Impuesto sobre las Ventas y/o Servicio",
        "Impuesto por la Utilización de la Fuerza de Trabajo",
        "Impuesto sobre Documentos",
        "Tasa por la Radicación de Anuncios y Propaganda Comercial",
        "Contribución Especial a la Seguridad Social",
        "Contribución a la Seguridad Social 14%",
        "Otros Tributos",
    ]
    importes_por_nombre = {t.nombre.strip().lower(): t.importe for t in d.tributos}
    for i, nombre in enumerate(nombres_fijos):
        importe = importes_por_nombre.get(nombre.lower(), ZERO)
        datos_f.append(
            [
                _p(nombre),
                _p(_fmt(importe), align="RIGHT"),
                _p(str(37 + i), align="CENTER"),
            ]
        )
    datos_f.append(
        [
            _p("Total de tributos pagados", bold=True),
            _p(_fmt(d.total_tributos), bold=True, align="RIGHT"),
            _p("44", bold=True, align="CENTER"),
        ]
    )
    tf = Table(datos_f, colWidths=[11.5 * cm, 4.5 * cm, 1.6 * cm])
    tf.setStyle(_estilos_tabla(len(datos_f), total=(len(datos_f) - 1,)))
    elementos += [
        _titulo("Sección F - Total de Tributos Pagados Asociados a la Actividad", 10.5),
        Spacer(1, 0.1 * cm),
        tf,
        Spacer(1, 0.25 * cm),
    ]

    # Sección G
    datos_g = [
        [
            _p("Exceso de", bold=True, align="CENTER"),
            _p("Hasta", bold=True, align="CENTER"),
            _p("Base Imponible", bold=True, align="CENTER"),
            _p("Tipo %", bold=True, align="CENTER"),
            _p("Importe", bold=True, align="CENTER"),
            _p("Fila", bold=True, align="CENTER"),
        ]
    ]
    for f in d.escala:
        datos_g.append(
            [
                _p(_fmt(f.desde), align="RIGHT"),
                _p(_fmt(f.hasta) if f.hasta is not None else "", align="RIGHT"),
                _p(_fmt(f.base_imponible), align="RIGHT"),
                _p(str(f.tipo), align="CENTER"),
                _p(_fmt(f.importe), align="RIGHT"),
                _p(str(f.fila), align="CENTER"),
            ]
        )
    datos_g.append(
        [
            _p("Total", bold=True),
            "",
            _p(_fmt(d.escala_total_base), bold=True, align="RIGHT"),
            "",
            _p(_fmt(d.escala_total_importe), bold=True, align="RIGHT"),
            _p("55", bold=True, align="CENTER"),
        ]
    )
    tg = Table(
        datos_g, colWidths=[3.2 * cm, 3.2 * cm, 3.6 * cm, 1.8 * cm, 3.4 * cm, 1.4 * cm]
    )
    tg.setStyle(_estilos_tabla(len(datos_g), total=(len(datos_g) - 1,)))
    elementos += [
        _titulo("Sección G - Determinación del impuesto según escala progresiva", 10.5),
        _p("Escala progresiva ingresos personales – TCP – PESOS - CUP", size=8, align="CENTER"),
        Spacer(1, 0.1 * cm),
        tg,
        Spacer(1, 0.25 * cm),
    ]

    # Sección H (en blanco: se llena manualmente en la ONAT)
    datos_h = [
        [
            _p("Empresa", bold=True, align="CENTER"),
            _p("Valor del contrato", bold=True, align="CENTER"),
            _p("Participación %", bold=True, align="CENTER"),
            _p("Importe", bold=True, align="CENTER"),
            _p("Fila", bold=True, align="CENTER"),
        ]
    ]
    for i in range(8):
        datos_h.append(["", "", "", "", _p(str(56 + i), align="CENTER")])
    datos_h.append([_p("Total", bold=True), "", "", _p(_fmt(ZERO), align="RIGHT"), _p("67", align="CENTER")])
    th = Table(datos_h, colWidths=[5.5 * cm, 3.5 * cm, 3 * cm, 3.5 * cm, 1.4 * cm])
    th.setStyle(_estilos_tabla(len(datos_h), total=(len(datos_h) - 1,)))
    elementos += [
        _titulo("Sección H - Sector de la Cultura", 10.5),
        Spacer(1, 0.15 * cm),
        th,
    ]
    return elementos


def _pagina_final(d: DJ08Calculado) -> List:
    e = d.entrada
    elementos = [
        _titulo(
            "Sección I - TRABAJADORES CONTRATADOS (Los TCP sólo pueden tener 3 empleados)",
            10.5,
        ),
        Spacer(1, 0.15 * cm),
        Table(
            [
                [
                    _p(
                        "Código Actividad / Nombres y Apellidos / Desde / Hasta / "
                        "Municipio / NIT / Importe anual salario — se llena manualmente "
                        "(filas 69-87)",
                        size=7.5,
                    )
                ]
            ],
            colWidths=[17.6 * cm],
        ),
        Spacer(1, 0.6 * cm),
        _titulo("OBSERVACIONES", 10.5),
        Table(
            [[Paragraph(e.observaciones or "", ParagraphStyle("obs", fontSize=9, leading=14))]],
            colWidths=[17.6 * cm],
            rowHeights=[3 * cm],
        ),
        Spacer(1, 0.5 * cm),
        _p(
            "DECLARO BAJO JURAMENTO LA VERACIDAD DE LOS DATOS CONSIGNADOS EN LA PRESENTE, "
            "aceptando que: de detectarse por la Administración Tributaria el ocultamiento, "
            "la falsedad o la alteración de la información contenida en la misma, puedo ser "
            "sancionado, según lo previsto en el inciso j) del artículo 119, Capítulo VIII "
            "Del Régimen Sancionador, del Decreto No. 308 de fecha 31 de octubre de 2012, "
            "REGLAMENTO DE LAS NORMAS GENERALES Y DE LOS PROCEDIMIENTOS TRIBUTARIOS o puedo "
            "ser procesado, según lo establecido en materia de EVASIÓN FISCAL en el CÓDIGO PENAL.",
            size=7.5,
        ),
        Spacer(1, 0.6 * cm),
    ]
    fecha = e.fecha_declaracion
    dia = fecha.strftime("%d") if fecha else ""
    mes = fecha.strftime("%m") if fecha else ""
    ano = fecha.strftime("%Y") if fecha else ""
    firmas = Table(
        [
            [_p("Día"), _p("Mes"), _p("Año"), _p("Firma del Contribuyente")],
            [_p(dia, align="CENTER"), _p(mes, align="CENTER"), _p(ano, align="CENTER"), ""],
        ],
        colWidths=[1.5 * cm, 1.5 * cm, 1.5 * cm, 13 * cm],
    )
    firmas.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (2, -1), 0.5, colors.black),
                ("LINEBELOW", (3, 1), (3, 1), 0.5, colors.black),
                ("TOPPADDING", (0, 1), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ]
        )
    )
    elementos.append(firmas)
    return elementos


def exportar_dj08_pdf(d: DJ08Calculado) -> bytes:
    """Genera el PDF de 4 páginas de la DJ-08."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.7 * cm,
        rightMargin=1.7 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.6 * cm,
        title="DJ-08 Declaración Jurada",
    )
    historia = []
    historia += _encabezado(d)
    historia.append(PageBreak())
    historia += _seccion_a(d)
    historia += _secciones_b_c_d_e(d)
    historia.append(PageBreak())
    historia += _secciones_f_g_h(d)
    historia.append(PageBreak())
    historia += _pagina_final(d)
    doc.build(historia, onFirstPage=_pie_pagina, onLaterPages=_pie_pagina)
    return buf.getvalue()
