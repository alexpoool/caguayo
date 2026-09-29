"""Exportación de la Ficha de Costo a PDF con ReportLab (Platypus).

Genera un documento con tres secciones equivalentes a las hojas del
documento base: Ficha (filas 1-15 con firmas), Materiales (desagregación
de insumos) y Mano de obra (gasto de salario por operación).
Replica textos, colores y jerarquía del documento oficial.
"""

import io
from decimal import Decimal
from typing import Optional

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

from src.models import FichaCosto

# ── Colores del documento base ──
C_GRIS_FUERTE = colors.HexColor("#D9D9D9")   # filas fuertes de Ficha
C_GRIS_DATO = colors.HexColor("#F2F2F2")     # filas de datos Materiales/MO
C_GRIS_TOTAL = colors.HexColor("#A6A6A6")    # TOTAL de Mano de obra
C_ROJO = colors.HexColor("#FF0000")          # títulos destacados de Materiales

_MONEY = "#,##0.00"
_MONEY4 = "#,##0.0000"


def _fmt(v, fmt=_MONEY) -> str:
    if v is None:
        return ""
    x = float(v)
    if fmt == _MONEY:
        s = f"{x:,.2f}"
    else:
        s = f"{x:,.4f}"
    return s


def _p(texto: str, fuente: str = "Times-Roman", size: float = 9, bold: bool = False,
       align: str = "LEFT", color=None):
    nombre = "Times-Bold" if bold else fuente
    style = ParagraphStyle(
        "celda", fontName=nombre, fontSize=size, leading=size * 1.2,
        alignment={"LEFT": 0, "CENTER": 1, "RIGHT": 2}[align],
        textColor=color or colors.black,
    )
    return Paragraph(texto, style)


def _estilo_filas(n_filas: int, inicio_enc: int = 0, filas_fuertes=(), filas_total=()) -> list:
    estilos = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    if inicio_enc:
        estilos += [("BACKGROUND", (0, inicio_enc), (-1, inicio_enc), C_GRIS_DATO)]
    for i in filas_fuertes:
        estilos += [("BACKGROUND", (0, i), (-1, i), C_GRIS_FUERTE)]
    for i in filas_total:
        estilos += [("BACKGROUND", (0, i), (-1, i), C_GRIS_TOTAL)]
    return estilos


def _seccion_ficha(f: FichaCosto, producto_nombre: str, elaborado, aprobado, fecha_aprob) -> list:
    elementos = []
    elementos.append(Paragraph("FICHA DE PRECIO DE SERVICIOS",
                               ParagraphStyle("t", fontName="Times-Bold", fontSize=14,
                                              alignment=1, spaceAfter=2)))
    elementos.append(Paragraph(f"Ficha No.:{f.numero_ficha}",
                               ParagraphStyle("f", fontName="Times-Roman", fontSize=10,
                                              alignment=2, spaceAfter=8)))

    info = Table(
        [
            [_p(" Producto o Servicio:", bold=True), producto_nombre, ""],
            [_p("Código Prod. O Serv.", bold=True), f.producto.codigo if f.producto else "",
             _p("UM: UNO", bold=True)],
            [_p("Nivel de Producción", bold=True), _fmt(f.nivel_produccion), ""],
        ],
        colWidths=[5 * cm, 9 * cm, 3 * cm],
    )
    info.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("SPAN", (1, 0), (2, 0)),
        ("SPAN", (1, 2), (2, 2)),
    ]))
    elementos += [info, Spacer(1, 0.3 * cm)]

    encabezado = [
        _p("Conceptos", bold=True),
        _p("Fila", bold=True, align="CENTER"),
        _p("", bold=True),
        _p("Costo Nuevo", bold=True, align="CENTER"),
    ]
    filas = [
        ("Gasto Material", 1, f.gasto_material, True),
        ("    De ello: Insumos (Materias primas y materiales)", "1.1", f.total_insumos, False),
        ("        Combustible y Lubricantes", "1.2", f.gasto_combustible, False),
        ("        Energía", "1.3", f.gasto_energia, False),
        ("        Agua", "1.4", f.gasto_agua, False),
        ("Salario Directo o retribución directa", 2, f.salario_total, True),
        ("        Salario", "2.1", f.salario_directo, False),
        ("        Vacaciones", "2.1.1", f.vacaciones, False),
        (" Otros Gastos Directos", 3, f.otros_gastos_directos, True),
        ("Gastos asociados a la producción", 4, f.gastos_asociados, True),
        ("        De ellos Salario", "4.1", f.gastos_asociados, False),
        ("COSTO TOTAL ( 1+2+3+4)", 5, f.costo_total, True),
        ("Gastos Generales y de Administración", 6, f.gastos_generales, True),
        ("        De ellos Salario", "6.1", 0, False),
        (" Gastos de Distribución y Venta", 7, f.gastos_distribucion, True),
        ("        De ellos Salario", "7.1", 0, False),
        (" Gastos Financieros", 8, f.gastos_financieros, True),
        (" Gastos por financiamiento entregado por la OSDE", 9, f.gasto_osde, True),
        ("Tributos", 10, f.gastos_tributarios + f.impuesto_ventas, True),
        ("    Gastos Tributarios (Contribución a la Seguridad Social e Impuesto sobre la Utilización de la Fuerza de Trabajo. Otros autorizados)", "10.1", f.gastos_tributarios, False),
        ("    Otros pagos Tributarios", "10.2", f.impuesto_ventas, False),
        ("TOTAL DE GASTOS (suma de las filas 6, 7, 8, 9 y 10)", 11, f.total_gastos, True),
        ("TOTAL DE COSTOS Y GASTOS (5+11)", 12, f.total_costos_gastos, True),
        ("Utilidad 13", 13, f.utilidad, True),
        ("PRECIO O TARIFA 14", 14, f.precio_tarifa, True),
        ("PRECIO O TARIFA UNITARIO AJUSTADO 15", 15, f.precio_unitario_ajustado, True),
    ]
    datos = [encabezado]
    fuertes = []
    for i, (texto, num, valor, fuerte) in enumerate(filas, start=1):
        if fuerte:
            fuertes.append(i)
        datos.append([
            _p(texto, bold=fuerte),
            _p(str(num), bold=fuerte, align="CENTER"),
            _p("", bold=fuerte),
            _p(_fmt(valor), bold=fuerte, align="RIGHT"),
        ])

    t = Table(datos, colWidths=[10.2 * cm, 1.5 * cm, 2.6 * cm, 3.2 * cm], repeatRows=1)
    t.setStyle(TableStyle(_estilo_filas(len(datos), 0, filas_fuertes=fuertes)))
    elementos += [t, Spacer(1, 0.25 * cm)]

    _put_line = Paragraph("Datos sobre precios de referencia",
                          ParagraphStyle("d", fontName="Times-Roman", fontSize=9, spaceAfter=10))
    elementos.append(_put_line)

    firmas = Table(
        [
            [_p(" Elaborado por:"), elaborado or "", _p("Firma:"), _p("Fecha:")],
            [_p(" Aprobado por:"), aprobado or "", _p("Firma:"),
             fecha_aprob or ""],
        ],
        colWidths=[3.2 * cm, 6.5 * cm, 4 * cm, 3.8 * cm],
    )
    firmas.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LINEBELOW", (1, 0), (1, -1), 0.5, colors.black),
        ("LINEBELOW", (2, 0), (2, -1), 0.5, colors.black),
        ("LINEBELOW", (3, 0), (3, -1), 0.5, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
    ]))
    elementos.append(firmas)
    return elementos


def _seccion_materiales(f: FichaCosto, elaborado, aprobado) -> list:
    elementos = [Paragraph("DESAGREGACIÓN DE LOS INSUMOS FUNDAMENTALES",
                           ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=12,
                                          alignment=1, spaceAfter=8))]

    rojo = ParagraphStyle("rojo", fontName="Helvetica", fontSize=8, textColor=C_ROJO)
    info = Table(
        [
            ["CÓDIGO DEL PRODUCTO:", f.id_producto, "DESCRIPCIÓN DEL PROD.:", f.producto.nombre if f.producto else ""],
            ["UNIDAD DE MEDIDA:", "UNO", "CANTIDADES FÍSICAS:", _fmt(f.nivel_produccion)],
        ],
        colWidths=[4 * cm, 3 * cm, 4.5 * cm, 6.5 * cm],
    )
    info.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), C_GRIS_DATO),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elementos += [info, Spacer(1, 0.3 * cm)]

    num_row = [_p(str(i), bold=True, align="CENTER") for i in range(1, 8)]
    num_row[6] = _p("7 (5X6)", bold=True, align="CENTER")
    titulos = [
        _p("CÓDIGO", bold=True, align="CENTER"),
        _p("PRODUCTOS", bold=True, align="CENTER", color=C_ROJO),
        _p("UM", bold=True, align="CENTER"),
        _p("COSTO BASE", bold=True, align="CENTER"),
        _p("NORMA DE CONSUMO", bold=True, align="CENTER"),
        _p("PRECIO UNITARIO", bold=True, align="CENTER"),
        _p("COSTO PROPUESTO", bold=True, align="CENTER", color=C_ROJO),
    ]
    datos = [num_row, titulos]
    for ins in f.insumos:
        datos.append([
            ins.codigo or "",
            ins.nombre,
            ins.um or "",
            "",
            _fmt(ins.norma_consumo),
            _fmt(ins.precio_unitario),
            _fmt(ins.costo),
        ])
    fila_total = len(datos)
    datos.append(["", _p("TOTAL DE INSUMOS", bold=True), "", "", "", "",
                  _p(_fmt(f.total_insumos), bold=True, align="RIGHT")])
    datos.append(["", _p("TOTAL", bold=True), "", "", "", "",
                  _p(_fmt(f.total_insumos), bold=True, align="RIGHT")])

    t = Table(datos, colWidths=[2.2 * cm, 6.5 * cm, 1.4 * cm, 2 * cm, 2.4 * cm, 2.4 * cm, 2.6 * cm],
              repeatRows=2)
    t.setStyle(TableStyle(
        _estilo_filas(len(datos))
        + [("BACKGROUND", (0, 2), (-1, fila_total - 1), C_GRIS_DATO),
           ("BACKGROUND", (0, fila_total), (-1, -1), C_GRIS_DATO)]
    ))
    elementos += [t, Spacer(1, 0.6 * cm)]

    pie = Table(
        [[f"Elaborado por: {elaborado or ''}"], [""], [f"Aprobado por: {aprobado or ''}"]],
        colWidths=[17.5 * cm],
    )
    pie.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 8)]))
    elementos.append(pie)
    return elementos


def _seccion_mano_obra(f: FichaCosto, elaborado, aprobado) -> list:
    elementos = [Paragraph(
        "GASTO DE SALARIO DE LOS OBREROS DE LA PRODUCCIÓN O LOS SERVICIOS",
        ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=11, alignment=1, spaceAfter=8))]

    info = Table(
        [
            ["Entidad:", "", f"Código: {f.id_producto}"],
            ["Descripción del producto o servicio:", f.producto.nombre if f.producto else "", ""],
            ["Cantidad de U.F. a producir:", _fmt(f.nivel_produccion), "UM: UNO"],
        ],
        colWidths=[5.5 * cm, 9 * cm, 4 * cm],
    )
    info.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), C_GRIS_DATO),
        ("SPAN", (1, 1), (1, 1)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elementos += [info, Spacer(1, 0.3 * cm)]

    encabezado = [
        _p("Descripción de las operaciones (1)", align="CENTER"),
        _p("Cantidad de trabajadores por operación (3)", align="CENTER"),
        _p("Categoría ocupacional (4)", align="CENTER"),
        _p("Salario/hora por categoría (6)", align="CENTER"),
        _p("Norma de tiempo en horas (8)", align="CENTER"),
        _p("Gasto de Salario del costo propuesto (9)", align="CENTER"),
    ]
    datos = [encabezado]
    for mo in f.mano_obra:
        datos.append([
            "",
            "1",
            mo.categoria,
            _fmt(mo.tarifa_horaria, _MONEY4),
            _fmt(mo.norma_tiempo),
            _fmt(mo.gasto_salario, _MONEY4),
        ])
    fila_total = len(datos)
    datos.append([
        _p("TOTAL", bold=True), "",
        "",
        "",
        "",
        _p(_fmt(sum(m.gasto_salario for m in f.mano_obra), _MONEY4), bold=True, align="RIGHT"),
    ])

    t = Table(datos, colWidths=[3.6 * cm, 2.4 * cm, 4.6 * cm, 2.6 * cm, 2.2 * cm, 2.6 * cm],
              repeatRows=1)
    t.setStyle(TableStyle(
        _estilo_filas(len(datos))
        + [("BACKGROUND", (0, 1), (-1, fila_total - 1), C_GRIS_DATO),
           ("BACKGROUND", (0, fila_total), (-1, fila_total), C_GRIS_TOTAL)]
    ))
    elementos += [t, Spacer(1, 0.6 * cm)]

    firmas = Table(
        [
            ["Confeccionado por:", elaborado or "", "FIRMA:", ""],
            ["Aprobado por:", aprobado or "", "FIRMA:", ""],
        ],
        colWidths=[3.5 * cm, 6 * cm, 2.5 * cm, 5.5 * cm],
    )
    firmas.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("LINEBELOW", (1, 0), (1, -1), 0.5, colors.black),
        ("LINEBELOW", (3, 0), (3, -1), 0.5, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
    ]))
    elementos.append(firmas)
    return elementos


def exportar_ficha_pdf(
    ficha: FichaCosto,
    producto_nombre: str,
    elaborado_por: Optional[str] = None,
    aprobado_por: Optional[str] = None,
    fecha_aprobacion=None,
) -> bytes:
    """Genera el PDF de la ficha (Ficha + Materiales + Mano de obra)."""
    elaborado = elaborado_por if elaborado_por is not None else ficha.elaborado_por
    aprobado = aprobado_por if aprobado_por is not None else ficha.aprobado_por
    fecha = fecha_aprobacion.strftime("%d/%m/%Y") if fecha_aprobacion else ""

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.4 * cm, bottomMargin=1.4 * cm,
        title=f"FICHA DE PRECIO DE SERVICIOS No.{ficha.numero_ficha}",
    )
    doc.addPageTemplates  # noqa: B018 (SimpleDocTemplate maneja los saltos)

    historia = []
    historia += _seccion_ficha(ficha, producto_nombre, elaborado, aprobado, fecha)
    historia.append(PageBreak())
    historia += _seccion_materiales(ficha, elaborado, aprobado)
    historia.append(PageBreak())
    historia += _seccion_mano_obra(ficha, elaborado, aprobado)
    doc.build(historia)
    return buf.getvalue()
