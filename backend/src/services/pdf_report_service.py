from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime, date
from typing import List, Dict, Any

class PdfReportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center
        )
        self.header_style = ParagraphStyle(
            'Header',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.grey
        )

    def _get_header_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        width, height = doc.pagesize
        canvas.drawString(inch, 0.75 * inch, f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        canvas.drawString(width - 2 * inch, 0.75 * inch, f"Página {doc.page}")
        canvas.restoreState()

    def generate_stock_pdf(self, data: List[Dict[str, Any]], filters: Dict[str, Any]) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        elements = []

        # Title
        title = "Reporte de Existencias por Producto"
        if filters.get('dependencia_nombre'):
            title += f"\nDependencia: {filters['dependencia_nombre']}"
        elements.append(Paragraph(title, self.title_style))

        # Data Table
        if not data:
            elements.append(Paragraph("No se encontraron datos para este reporte.", self.styles["Normal"]))
        else:
            table_data = [['Código', 'Producto', 'Categoría', 'Stock']]
            for item in data:
                table_data.append([
                    item.get('codigo', '-'),
                    item.get('nombre', '-'),
                    f"{item.get('categoria', '')} / {item.get('subcategoria', '')}",
                    str(item.get('stock_actual', 0))
                ])

            table = Table(table_data, colWidths=[1.5*inch, 3*inch, 2.5*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # Align product name left
                ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'), # Align stock right
            ]))
            elements.append(table)

        doc.build(elements, onFirstPage=self._get_header_footer, onLaterPages=self._get_header_footer)
        buffer.seek(0)
        return buffer

    def generate_movimientos_pdf(self, data: List[Dict[str, Any]], filters: Dict[str, Any]) -> BytesIO:
        buffer = BytesIO()
        # Use landscape for more columns
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        elements = []

        # Title
        title_text = "Reporte de Movimientos de Inventario"
        subtitles = []
        if filters.get('fecha_inicio') and filters.get('fecha_fin'):
            subtitles.append(f"Desde: {filters['fecha_inicio'].strftime('%d/%m/%Y')} Hasta: {filters['fecha_fin'].strftime('%d/%m/%Y')}")
        if filters.get('dependencia_nombre'):
            subtitles.append(f"Dependencia: {filters['dependencia_nombre']}")
        
        elements.append(Paragraph(title_text, self.title_style))
        for subt in subtitles:
            elements.append(Paragraph(subt, self.styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Data Table
        if not data:
            elements.append(Paragraph("No se encontraron movimientos en el período seleccionado.", self.styles["Normal"]))
        else:
            # Headers
            headers = ['Fecha', 'Producto', 'Tipo', 'Dependencia', 'Obs', 'Cant.']
            table_data = [headers]
            
            for item in data:
                fecha = item.get('fecha')
                if isinstance(fecha, str):
                   pass # already string
                elif isinstance(fecha, datetime):
                   fecha = fecha.strftime('%d/%m/%Y %H:%M')

                cantidad = item.get('cantidad', 0)
                factor = item.get('factor', 1)
                signo = '+' if factor > 0 else ''
                cantidad_str = f"{signo}{cantidad}"

                table_data.append([
                    fecha,
                    item.get('producto', '')[:30], # Truncate long names
                    item.get('tipo', ''),
                    item.get('dependencia', '')[:20],
                    item.get('observacion', '')[:25] if item.get('observacion') else '-',
                    cantidad_str
                ])

            # Col widths for landscape letter (11 inches wide approx)
            # Total width available ~10 inches
            col_widths = [1.2*inch, 3*inch, 1.2*inch, 2*inch, 1.8*inch, 0.8*inch]
            
            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'), # Cantidad right aligned
            ]))
            elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_existencias_pdf(self, data: List[Dict[str, Any]], filters: Dict[str, Any]) -> BytesIO:
        """
        Genera el PDF de Existencias por Producto de Inventario.
        Columnas: CÓDIGO, DESCRIPCIÓN, CANTIDAD.
        Incluye bloque de firmas al final (Confeccionado por / Aprobado por).
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=50
        )
        elements = []

        # --- Estilos personalizados ---
        style_title = ParagraphStyle(
            'ExistTitle',
            parent=self.styles['Heading1'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=4,
            fontName='Helvetica-Bold'
        )
        style_subtitle = ParagraphStyle(
            'ExistSubtitle',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            spaceAfter=2,
            textColor=colors.HexColor('#333333')
        )
        style_normal = ParagraphStyle(
            'ExistNormal',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=12
        )
        style_firma_label = ParagraphStyle(
            'FirmaLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            spaceAfter=2
        )
        style_firma_field = ParagraphStyle(
            'FirmaField',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=1
        )

        # --- Encabezado ---
        elements.append(Paragraph("EXISTENCIAS POR PRODUCTO DE INVENTARIO", style_title))

        dep_nombre = filters.get('dependencia_nombre', 'Todas las dependencias')
        elements.append(Paragraph(f"Dependencia: {dep_nombre}", style_subtitle))

        fecha_corte = filters.get('fecha_corte')
        if fecha_corte:
            if isinstance(fecha_corte, (date, datetime)):
                fecha_str = fecha_corte.strftime('%d/%m/%Y')
            else:
                fecha_str = str(fecha_corte)
            elements.append(Paragraph(f"Fecha de corte: {fecha_str}", style_subtitle))
        else:
            elements.append(Paragraph(f"Fecha de corte: {datetime.now().strftime('%d/%m/%Y')} (actual)", style_subtitle))

        elements.append(Spacer(1, 16))

        # --- Tabla de datos ---
        if not data:
            elements.append(Paragraph(
                "No se encontraron productos con existencia para los filtros seleccionados.",
                style_normal
            ))
        else:
            # Encabezados: CÓDIGO | DESCRIPCIÓN | CANTIDAD
            table_data = [['CÓDIGO', 'DESCRIPCIÓN', 'CANTIDAD']]
            for item in data:
                table_data.append([
                    str(item.get('codigo', '-')),
                    Paragraph(str(item.get('nombre', '-')), style_normal),
                    str(item.get('stock_actual', 0))
                ])

            # Ancho disponible ~7.3 pulgadas (letter 8.5 - márgenes)
            col_widths = [1.5 * inch, 4.3 * inch, 1.5 * inch]

            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            table.setStyle(TableStyle([
                # Encabezado
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

                # Cuerpo
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -1), 6),

                # Alineación por columna
                ('ALIGN', (0, 1), (0, -1), 'CENTER'),   # Código centrado
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),      # Descripción izquierda
                ('ALIGN', (2, 1), (2, -1), 'CENTER'),    # Cantidad centrada
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

                # Bordes
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),
                ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#2C3E50')),

                # Filas alternas
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
            ]))
            elements.append(table)

        elements.append(Spacer(1, 30))

        # --- Bloque de Validación (Firmas) ---
        firma_data = [
            ['Confeccionado por:', '', 'Aprobado por:', ''],
            ['Nombre:', '____________________________', 'Nombre:', '____________________________'],
            ['Cargo:', '____________________________', 'Cargo:', '____________________________'],
            ['Fecha:', '____________________________', 'Fecha:', '____________________________'],
            ['Firma:', '____________________________', 'Firma:', '____________________________'],
        ]

        firma_table = Table(
            firma_data,
            colWidths=[1.0 * inch, 2.5 * inch, 1.0 * inch, 2.5 * inch],
            hAlign='LEFT'
        )
        firma_table.setStyle(TableStyle([
            # Sección títulos "Confeccionado por" / "Aprobado por"
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 14),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 4),

            # Labels en bold
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),

            # Sin bordes visibles para las firmas
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#BDC3C7')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))

        # Envolver en KeepTogether para que no se divida entre páginas
        elements.append(KeepTogether([
            Spacer(1, 10),
            firma_table
        ]))

        def _header_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            width, height = doc.pagesize
            canvas.drawString(40, 28, f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema CAGUAYO")
            canvas.drawRightString(width - 40, 28, f"Página {doc.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)
        buffer.seek(0)
        return buffer
