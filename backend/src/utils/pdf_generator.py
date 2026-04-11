from io import BytesIO
from datetime import datetime, date
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def _fmt_fecha(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    return str(value)


def _build_header(
    *,
    styles,
    titulo: str,
    dependencia_info: dict,
    extra_left_lines: list[str] | None = None,
) -> list:
    """Header similar al layout de /docs: datos a la izquierda y título a la derecha."""
    empresa = "EMPRESA:"  # en los PDFs de /docs aparece como placeholder
    dependencia = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"
    direccion = f"DIRECCIÓN: {dependencia_info.get('direccion', '')}"
    left_lines = [empresa, dependencia, direccion]
    if extra_left_lines:
        left_lines.extend(extra_left_lines)

    left = "<br/>".join(left_lines)
    right = f"<b>{titulo}</b>"

    header_table = Table(
        [[Paragraph(left, styles["Normal"]), Paragraph(right, styles["Normal"])]],
        colWidths=[330, 330],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    return [header_table, Spacer(1, 12)]


def _build_firmas(
    *,
    usuario_nombre: str,
    usuario_cargo: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
) -> Table:
    fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [usuario_nombre or "", aprobado_por_nombre or ""],
        [f"CARGO: {usuario_cargo or ''}", f"CARGO: {aprobado_por_cargo or ''}"],
        [f"FECHA DE EMISIÓN: {fecha_emision}", "FECHA:"],
        ["FIRMA:", "FIRMA:"],
    ]
    firma_table = Table(firma_data, colWidths=[300, 300])
    firma_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return firma_table


def generar_pdf_proveedores_dependencia(
    proveedores,
    dependencia_info,
    tipo_entidad,
    usuario_actual,
    usuario_cargo="",
    aprobado_por_nombre="",
    aprobado_por_cargo="",
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []
    styles = getSampleStyleSheet()

    elements.extend(
        _build_header(
            styles=styles,
            titulo="CREADORES REPRESENTADOS",
            dependencia_info=dependencia_info,
        )
    )

    if not proveedores:
        elements.append(Paragraph("No se encontraron proveedores.", styles["Normal"]))
    else:
        headers = [
            "CI",
            "NIT",
            "NOMBRE Y APELLIDOS",
            "DIRECCIÓN",
            "MUNICIPIO",
            "PROVINCIA",
            "VIGENCIA",
        ]
        data = [headers]
        for p in proveedores:
            data.append(
                [
                    p.get("ci", ""),
                    p.get("nit", ""),
                    p.get("nombre", ""),
                    p.get("direccion", ""),
                    p.get("municipio", ""),
                    p.get("provincia", ""),
                    _fmt_fecha(p.get("vigencia")),
                ]
            )

        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 40))

    elements.append(
        _build_firmas(
            usuario_nombre=usuario_actual,
            usuario_cargo=usuario_cargo,
            aprobado_por_nombre=aprobado_por_nombre,
            aprobado_por_cargo=aprobado_por_cargo,
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_pdf_existencias(
    existencias,
    dependencia_info,
    usuario_actual,
    usuario_cargo="",
    aprobado_por_nombre="",
    aprobado_por_cargo="",
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []
    styles = getSampleStyleSheet()

    elements.extend(
        _build_header(
            styles=styles,
            titulo="EXISTENCIAS EN INVENTARIO",
            dependencia_info=dependencia_info,
            extra_left_lines=[f"FECHA: {_fmt_fecha(date.today())}"],
        )
    )

    if not existencias:
        elements.append(Paragraph("No se encontraron existencias.", styles["Normal"]))
    else:
        headers = ["CÓDIGO", "DESCRIPCIÓN", "CANTIDAD"]
        data = [headers]
        for e in existencias:
            data.append(
                [
                    str(e.get("codigo", "")),
                    str(e.get("descripcion", "")),
                    str(e.get("cantidad", "")),
                ]
            )

        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 40))

    elements.append(
        _build_firmas(
            usuario_nombre=usuario_actual,
            usuario_cargo=usuario_cargo,
            aprobado_por_nombre=aprobado_por_nombre,
            aprobado_por_cargo=aprobado_por_cargo,
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_pdf_movimientos_dependencia(
    movimientos,
    dependencia_info,
    fecha_inicio,
    fecha_fin,
    usuario_actual,
    usuario_cargo="",
    aprobado_por_nombre="",
    aprobado_por_cargo="",
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []
    styles = getSampleStyleSheet()

    elements.extend(
        _build_header(
            styles=styles,
            titulo="MOVIMIENTOS DE INVENTARIO",
            dependencia_info=dependencia_info,
            extra_left_lines=[
                f"DESDE: {_fmt_fecha(fecha_inicio)}",
                f"HASTA: {_fmt_fecha(fecha_fin)}",
            ],
        )
    )

    if not movimientos:
        elements.append(Paragraph("No se encontraron movimientos.", styles["Normal"]))
    else:
        headers = [
            "FECHA",
            "CÓDIGO",
            "SALDO INICIAL",
            "TIPO",
            "DESCRIPCIÓN",
            "CANTIDAD",
            "SALDO FINAL",
        ]
        data = [headers]
        for m in movimientos:
            data.append(
                [
                    _fmt_fecha(m.get("fecha")),
                    str(m.get("codigo", "")),
                    str(m.get("saldo_inicial", "")),
                    str(m.get("tipo", "")),
                    str(m.get("descripcion", "")),
                    str(m.get("cantidad", "")),
                    str(m.get("saldo_final", "")),
                ]
            )

        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 40))

    elements.append(
        _build_firmas(
            usuario_nombre=usuario_actual,
            usuario_cargo=usuario_cargo,
            aprobado_por_nombre=aprobado_por_nombre,
            aprobado_por_cargo=aprobado_por_cargo,
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_pdf_movimientos_producto(
    movimientos,
    producto_info,
    dependencia_info,
    fecha_inicio,
    fecha_fin,
    usuario_actual,
    usuario_cargo="",
    aprobado_por_nombre="",
    aprobado_por_cargo="",
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []
    styles = getSampleStyleSheet()

    producto_str = f"PRODUCTO: {producto_info.get('descripcion', '')}"
    producto_codigo = f"CÓDIGO: {producto_info.get('codigo', '')}"
    elements.extend(
        _build_header(
            styles=styles,
            titulo="MOVIMIENTOS DE INVENTARIO",
            dependencia_info=dependencia_info,
            extra_left_lines=[
                producto_str,
                producto_codigo,
                f"DESDE: {_fmt_fecha(fecha_inicio)}",
                f"HASTA: {_fmt_fecha(fecha_fin)}",
            ],
        )
    )

    if not movimientos:
        elements.append(Paragraph("No se encontraron movimientos.", styles["Normal"]))
    else:
        headers = [
            "FECHA",
            "SALDO INICIAL",
            "TIPO",
            "DESCRIPCIÓN",
            "CANTIDAD",
            "SALDO FINAL",
        ]
        data = [headers]
        for m in movimientos:
            data.append(
                [
                    _fmt_fecha(m.get("fecha")),
                    str(m.get("saldo_inicial", "")),
                    str(m.get("tipo", "")),
                    str(m.get("descripcion", "")),
                    str(m.get("cantidad", "")),
                    str(m.get("saldo_final", "")),
                ]
            )

        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 40))

    elements.append(
        _build_firmas(
            usuario_nombre=usuario_actual,
            usuario_cargo=usuario_cargo,
            aprobado_por_nombre=aprobado_por_nombre,
            aprobado_por_cargo=aprobado_por_cargo,
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_pdf_liquidacion(
    liquidacion_data,
    items,
    dependencia_info,
    usuario_actual,
    aprobado_por_nombre="",
    aprobado_por_cargo="",
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []
    styles = getSampleStyleSheet()

    # Header
    empresa_nombre = "EMPRESA: Caguayo"
    dependencia_nombre = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"

    header_text = (
        f"<b>LIQUIDACIÓN DE PAGO</b><br/>{empresa_nombre}<br/>{dependencia_nombre}"
    )
    elements.append(Paragraph(header_text, styles["Normal"]))
    elements.append(Spacer(1, 10))

    # Liquidation details
    detail_text = f"""
    <b>CÓDIGO:</b> {liquidacion_data["codigo"]}<br/>
    <b>FECHA EMISIÓN:</b> {liquidacion_data["fecha_emision"]}<br/>
    <b>CLIENTE:</b> {liquidacion_data["cliente_nombre"]} (ID: {liquidacion_data["cliente_id"]})<br/>
    <b>MONEDA:</b> {liquidacion_data["moneda_nombre"]} ({liquidacion_data["moneda_simbolo"]})<br/>
    <b>TIPO PAGO:</b> {liquidacion_data["tipo_pago"]}
    """
    elements.append(Paragraph(detail_text, styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Items Table
    if not items:
        elements.append(
            Paragraph("No hay productos en esta liquidación.", styles["Normal"])
        )
    else:
        headers = ["CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO UNIT.", "TOTAL"]
        data = [headers]
        for item in items:
            data.append(
                [
                    item["codigo"],
                    item["nombre"],
                    str(item["cantidad"]),
                    f"{item['precio']:.2f}",
                    f"{item['total']:.2f}",
                ]
            )

        table = Table(data, colWidths=[80, 220, 50, 80, 80])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (1, 1), (1, -1), "LEFT"),  # Descripion left aligned
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 20))

    # Financial Summary
    summary_data = [
        ["IMPORTE BRUTO:", f"{liquidacion_data['importe']:.2f}"],
        ["(-) GASTO EMPRESA:", f"{liquidacion_data['gasto_empresa']:.2f}"],
        ["(-) COMISIÓN BANCARIA:", f"{liquidacion_data['comision_bancaria']:.2f}"],
        ["(=) DEVENGADO:", f"{liquidacion_data['devengado']:.2f}"],
        ["(-) TRIBUTARIO:", f"{liquidacion_data['tributario']:.2f}"],
        ["(=) NETO A PAGAR:", f"<b>{liquidacion_data['neto_pagar']:.2f}</b>"],
    ]
    summary_table = Table(summary_data, colWidths=[150, 100])
    summary_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
            ]
        )
    )

    # Wrap in another table to push it to the right
    wrapper_table = Table([[Spacer(1, 1), summary_table]], colWidths=[300, 250])
    elements.append(wrapper_table)

    if liquidacion_data["observaciones"]:
        elements.append(Spacer(1, 10))
        elements.append(
            Paragraph(
                f"<b>OBSERVACIONES:</b> {liquidacion_data['observaciones']}",
                styles["Normal"],
            )
        )

    elements.append(Spacer(1, 40))

    # Signatures
    fecha_emision_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [f"USUARIO: {usuario_actual}", f"NOMBRE: {aprobado_por_nombre}"],
        ["CARGO: ", f"CARGO: {aprobado_por_cargo}"],
        [f"FECHA: {fecha_emision_dt}", "FECHA:"],
        ["FIRMA:", "FIRMA:"],
    ]
    firma_table = Table(firma_data, colWidths=[250, 250])
    firma_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_pdf_alertas_reposicion(
    data: Dict[str, Any],
    usuario: Any = None,
    usuario_cargo: str = "",
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    styles = getSampleStyleSheet()
    elements: list = []

    dependencia_info = {"nombre": "Consolidado", "direccion": ""}

    elements.extend(
        _build_header(
            styles=styles,
            titulo="ALERTAS DE REPOSICIÓN DE STOCK",
            dependencia_info=dependencia_info,
            extra_left_lines=[f"FECHA: {date.today().strftime('%Y-%m-%d')}"],
        )
    )

    alertas = data.get("alertas", [])

    if not alertas:
        elements.append(
            Paragraph(
                "No hay productos por debajo de su punto de pedido.", styles["Normal"]
            )
        )
    else:
        headers = [
            "CÓDIGO",
            "PRODUCTO",
            "CAT.",
            "ABC",
            "STOCK",
            "ROP",
            "MÍN.",
            "DÍAS(LT)",
            "DIF.",
        ]
        table_data = [headers]
        for a in alertas:
            table_data.append(
                [
                    str(a.get("codigo", "")),
                    str(a.get("nombre", "")),
                    str(a.get("subcategoria", "")),
                    str(a.get("clasificacion_abc", "")),
                    str(a.get("stock_actual", "")),
                    str(a.get("punto_pedido", "")),
                    str(a.get("stock_minimo", "")),
                    str(a.get("lead_time_dias", "")),
                    str(a.get("diferencia", "")),
                ]
            )

        table = Table(
            table_data, colWidths=[60, 200, 100, 40, 50, 40, 50, 60, 40], repeatRows=1
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("TEXTCOLOR", (-1, 1), (-1, -1), colors.red),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 30))
    firma_table = _build_firmas(
        usuario_nombre=usuario.nombre if usuario and hasattr(usuario, "nombre") else "",
        usuario_cargo=usuario_cargo,
        aprobado_por_nombre=aprobado_por_nombre,
        aprobado_por_cargo=aprobado_por_cargo,
    )
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
