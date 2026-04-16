from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime

def generar_pdf_proveedores_dependencia(proveedores, dependencia_info, tipo_entidad, usuario_actual, aprobado_por_nombre="", aprobado_por_cargo=""):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    # Header
    empresa_nombre = "EMPRESA: Caguayo" # Placeholder
    dependencia_nombre = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"
    dependencia_direccion = f"DIRECCIÓN: {dependencia_info.get('direccion', '')}"
    
    header_text = f"<b>CREADORES REPRESENTADOS</b><br/>{empresa_nombre}<br/>{dependencia_nombre}<br/>{dependencia_direccion}"
    elements.append(Paragraph(header_text, styles['Normal']))
    elements.append(Spacer(1, 20))

    if not proveedores:
        elements.append(Paragraph("No se encontraron proveedores.", styles['Normal']))
    else:
        # Group by Province if needed, here we'll assume it's pre-grouped or we output a single table
        # For simplicity, generating a single table for now. Can be expanded based on specific requirements.

        if tipo_entidad == 'NATURAL':
            headers = ["CI", "NOMBRE Y APELLIDOS", "DIRECCIÓN", "MUNICIPIO", "VIGENCIA"]
            data = [headers]
            for p in proveedores:
                data.append([
                    p.get('carnet_identidad', ''),
                    p.get('nombre', ''),
                    p.get('direccion', ''),
                    p.get('municipio', ''),
                    str(p.get('vigencia', ''))
                ])
        elif tipo_entidad == 'TCP':
             headers = ["NOMBRE Y APELLIDOS", "DIRECCIÓN"]
             data = [headers]
             for p in proveedores:
                 data.append([
                     p.get('nombre', ''),
                     p.get('direccion', '')
                 ])
        elif tipo_entidad == 'JURIDICA':
             headers = ["NIT", "NOMBRE", "DIRECCIÓN", "MUNICIPIO"]
             data = [headers]
             for p in proveedores:
                 data.append([
                     p.get('codigo_reup', ''),
                     p.get('nombre', ''),
                     p.get('direccion', ''),
                     p.get('municipio', '')
                 ])
        else: # Default/Fallback
             headers = ["NOMBRE", "DIRECCIÓN"]
             data = [headers]
             for p in proveedores:
                 data.append([
                     p.get('nombre', ''),
                     p.get('direccion', '')
                 ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    elements.append(Spacer(1, 40))

    # Signatures
    fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [f"USUARIO: {usuario_actual}", f"NOMBRE: {aprobado_por_nombre}"],
        ["CARGO: ", f"CARGO: {aprobado_por_cargo}"],
        [f"FECHA DE EMISIÓN: {fecha_emision}", "FECHA:"],
        ["FIRMA:", "FIRMA:"]
    ]
    firma_table = Table(firma_data, colWidths=[300, 300])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
    ]))
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generar_pdf_existencias(existencias, dependencia_info, usuario_actual, aprobado_por_nombre="", aprobado_por_cargo=""):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    # Header
    empresa_nombre = "EMPRESA: Caguayo"
    dependencia_nombre = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"
    
    header_text = f"<b>EXISTENCIAS EN INVENTARIO</b><br/>{empresa_nombre}<br/>{dependencia_nombre}"
    elements.append(Paragraph(header_text, styles['Normal']))
    elements.append(Spacer(1, 20))

    if not existencias:
        elements.append(Paragraph("No se encontraron existencias.", styles['Normal']))
    else:
        headers = ["CÓDIGO", "DESCRIPCIÓN", "CANTIDAD"]
        data = [headers]
        for e in existencias:
            data.append([
                str(e.get('codigo', '')),
                str(e.get('descripcion', '')),
                str(e.get('cantidad', ''))
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    elements.append(Spacer(1, 40))

    # Signatures
    fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [f"USUARIO: {usuario_actual}", f"NOMBRE: {aprobado_por_nombre}"],
        ["CARGO: ", f"CARGO: {aprobado_por_cargo}"],
        [f"FECHA DE EMISIÓN: {fecha_emision}", "FECHA:"],
        ["FIRMA:", "FIRMA:"]
    ]
    firma_table = Table(firma_data, colWidths=[300, 300])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
    ]))
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generar_pdf_movimientos_dependencia(movimientos, dependencia_info, fecha_inicio, fecha_fin, usuario_actual, aprobado_por_nombre="", aprobado_por_cargo=""):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    # Header
    empresa_nombre = "EMPRESA: Caguayo"
    dependencia_nombre = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"
    
    header_text = f"<b>MOVIMIENTOS DE INVENTARIO</b><br/>{empresa_nombre}<br/>{dependencia_nombre}<br/>PERÍODO: {fecha_inicio} al {fecha_fin}"
    elements.append(Paragraph(header_text, styles['Normal']))
    elements.append(Spacer(1, 20))

    if not movimientos:
        elements.append(Paragraph("No se encontraron movimientos.", styles['Normal']))
    else:
        headers = ["FECHA", "OPERACIÓN", "PRODUCTO", "TIPO", "CANTIDAD"]
        data = [headers]
        for m in movimientos:
            data.append([
                str(m.get('fecha', '')),
                str(m.get('operacion', '')),
                str(m.get('producto', '')),
                str(m.get('tipo', '')),
                str(m.get('cantidad', ''))
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    elements.append(Spacer(1, 40))

    # Signatures
    fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [f"USUARIO: {usuario_actual}", f"NOMBRE: {aprobado_por_nombre}"],
        ["CARGO: ", f"CARGO: {aprobado_por_cargo}"],
        [f"FECHA DE EMISIÓN: {fecha_emision}", "FECHA:"],
        ["FIRMA:", "FIRMA:"]
    ]
    firma_table = Table(firma_data, colWidths=[300, 300])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
    ]))
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generar_pdf_movimientos_producto(movimientos, producto_info, dependencia_info, fecha_inicio, fecha_fin, usuario_actual, aprobado_por_nombre="", aprobado_por_cargo=""):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    # Header
    empresa_nombre = "EMPRESA: Caguayo"
    dependencia_nombre = f"DEPENDENCIA: {dependencia_info.get('nombre', '')}"
    producto_str = f"PRODUCTO: {producto_info.get('descripcion', '')} ({producto_info.get('codigo', '')})"
    
    header_text = f"<b>MOVIMIENTOS DE PRODUCTO</b><br/>{empresa_nombre}<br/>{dependencia_nombre}<br/>{producto_str}<br/>PERÍODO: {fecha_inicio} al {fecha_fin}"
    elements.append(Paragraph(header_text, styles['Normal']))
    elements.append(Spacer(1, 20))

    if not movimientos:
        elements.append(Paragraph("No se encontraron movimientos.", styles['Normal']))
    else:
        headers = ["FECHA", "OPERACIÓN", "TIPO", "CANTIDAD"]
        data = [headers]
        for m in movimientos:
            data.append([
                str(m.get('fecha', '')),
                str(m.get('operacion', '')),
                str(m.get('tipo', '')),
                str(m.get('cantidad', ''))
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    elements.append(Spacer(1, 40))

    # Signatures
    fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    firma_data = [
        ["CONFECIONADO POR:", "APROBADO POR:"],
        [f"USUARIO: {usuario_actual}", f"NOMBRE: {aprobado_por_nombre}"],
        ["CARGO: ", f"CARGO: {aprobado_por_cargo}"],
        [f"FECHA DE EMISIÓN: {fecha_emision}", "FECHA:"],
        ["FIRMA:", "FIRMA:"]
    ]
    firma_table = Table(firma_data, colWidths=[300, 300])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
    ]))
    elements.append(firma_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
