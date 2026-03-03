from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from io import BytesIO
from datetime import datetime
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
