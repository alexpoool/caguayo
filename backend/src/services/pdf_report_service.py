from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.enums import TA_LEFT
from io import BytesIO
from datetime import datetime

class PdfReportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        # Colores exactos del modelo
        self.color_header_bg = colors.HexColor('#DDEBF7')  # Azul claro del cuadro
        self.color_table_header = colors.HexColor('#D9E1F2') # Gris azulado encabezado tabla
        
        # Estilos de texto optimizados
        self.style_title = ParagraphStyle(
            'ReportTitle',
            parent=self.styles['Normal'],
            fontSize=16,
            fontName='Helvetica-Bold',
            leading=18,
            alignment=TA_LEFT
        )
        self.style_label_header = ParagraphStyle(
            'LabelHeader',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            leading=11
        )
        self.style_table_cell = ParagraphStyle(
            'TableCell',
            parent=self.styles['Normal'],
            fontSize=8,
            fontName='Helvetica',
            leading=10
        )

    def _crear_encabezado_estandar(self, titulo, info_empresa, lineas_extra_izq, width_izq=4.5, width_der=2.5):
        """
        Crea el encabezado con título a la izquierda y cuadro azul a la derecha.
        """
        # Columna Izquierda: Título y Fechas
        content_izq = [[Paragraph(titulo, self.style_title)]]
        for linea in lineas_extra_izq:
            content_izq.append([Paragraph(linea, self.style_label_header)])
        
        t_izq = Table(content_izq, colWidths=[width_izq * inch])
        t_izq.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)]))

        # Columna Derecha: Cuadro Azul (Empresa/Dependencia)
        info_data = [
            [Paragraph(f"<b>EMPRESA:</b> {info_empresa.get('empresa', '')}", self.style_label_header)],
            [Paragraph(f"<b>DEPENDENCIA:</b> {info_empresa.get('dependencia', '')}", self.style_label_header)],
            [Paragraph(f"<b>DIRECCIÓN:</b> {info_empresa.get('direccion', '')}", self.style_label_header)]
        ]
        t_der = Table(info_data, colWidths=[width_der * inch])
        t_der.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), self.color_header_bg),
            ('BOX', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))

        return Table([[t_izq, t_der]], colWidths=[(width_izq + 0.3) * inch, width_der * inch])

    def _crear_bloque_firmas(self, width=7.5):
        """Crea la sección de firmas exactamente como el modelo (sin etiquetas extra)."""
        col_w = (width / 2) * inch
        data = [
            [Paragraph("<b>CONFECCIONADO POR:</b>", self.style_label_header), Paragraph("<b>APROBADO POR:</b>", self.style_label_header)],
            [Paragraph("CARGO:", self.style_label_header), Paragraph("CARGO:", self.style_label_header)],
            [Paragraph("FECHA DE EMISIÓN:", self.style_label_header), Paragraph("FECHA:", self.style_label_header)],
            [Paragraph("FIRMA:", self.style_label_header), Paragraph("FIRMA:", self.style_label_header)],
        ]
        t = Table(data, colWidths=[col_w, col_w])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        return t

    def generate_existencias_pdf(self, data, filters):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, margin=40)
        elements = []

        # Encabezado
        info = {'empresa': filters.get('empresa'), 'dependencia': filters.get('dependencia'), 'direccion': filters.get('direccion')}
        fecha = f"FECHA: {datetime.now().strftime('%d/%m/%Y')}"
        elements.append(self._crear_encabezado_estandar("EXISTENCIAS EN INVENTARIO", info, [fecha]))
        elements.append(Spacer(1, 20))

        # Tabla (3 columnas: Código, Descripción, Cantidad)
        table_data = [[Paragraph('<b>CÓDIGO</b>', self.style_table_cell), 
                       Paragraph('<b>DESCRIPCIÓN</b>', self.style_table_cell), 
                       Paragraph('<b>CANTIDAD</b>', self.style_table_cell)]]
        
        for item in data:
            table_data.append([item.get('codigo'), Paragraph(item.get('descripcion'), self.style_table_cell), item.get('cantidad')])

        t = Table(table_data, colWidths=[1.5*inch, 4.5*inch, 1.0*inch])
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (-1,0), self.color_table_header),
            ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 40))
        elements.append(self._crear_bloque_firmas(7.0))
        
        doc.build(elements)
        return buffer.getvalue()

    def generate_movimientos_dependencia_pdf(self, data, filters):
        buffer = BytesIO()
        # Landscape para 7 columnas
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), margin=30)
        elements = []

        info = {'empresa': filters.get('empresa'), 'dependencia': filters.get('dependencia'), 'direccion': filters.get('direccion')}
        rango = [f"DESDE: {filters.get('desde')}", f"HASTA: {filters.get('hasta')}"]
        
        elements.append(self._crear_encabezado_estandar("MOVIMIENTOS DE INVENTARIO", info, rango, width_izq=6.5, width_der=3.0))
        elements.append(Spacer(1, 15))

        # Tabla (7 columnas según modelo)
        headers = ['FECHA', 'CÓDIGO', 'SALDO INICIAL', 'TIPO', 'DESCRIPCIÓN', 'CANTIDAD', 'SALDO FINAL']
        table_data = [[Paragraph(f"<b>{h}</b>", self.style_table_cell) for h in headers]]
        
        for row in data:
            table_data.append([
                row.get('fecha'), row.get('codigo'), row.get('saldo_inicial'),
                row.get('tipo'), Paragraph(row.get('descripcion'), self.style_table_cell),
                row.get('cantidad'), row.get('saldo_final')
            ])

        t = Table(table_data, colWidths=[0.9*inch, 1.1*inch, 1.1*inch, 0.8*inch, 3.5*inch, 1.0*inch, 1.1*inch])
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (-1,0), self.color_table_header),
            ('FONTSIZE', (0,0), (-1,-1), 7),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (4,1), (4,-1), 'LEFT'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 30))
        elements.append(self._crear_bloque_firmas(10.0))
        
        doc.build(elements)
        return buffer.getvalue()

    def generate_movimientos_producto_pdf(self, data, filters):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), margin=30)
        elements = []

        info = {'empresa': filters.get('empresa'), 'dependencia': filters.get('dependencia'), 'direccion': filters.get('direccion')}
        # Este reporte lleva Producto y Código a la izquierda según el PDF
        extras = [
            f"PRODUCTO: {filters.get('producto_nombre')}",
            f"CÓDIGO: {filters.get('producto_codigo')}",
            f"DESDE: {filters.get('desde')}  HASTA: {filters.get('hasta')}"
        ]
        
        elements.append(self._crear_encabezado_estandar("MOVIMIENTOS DE INVENTARIO", info, extras, width_izq=6.5, width_der=3.0))
        elements.append(Spacer(1, 15))

        # Tabla (6 columnas: Quita código porque ya está arriba)
        headers = ['FECHA', 'SALDO INICIAL', 'TIPO', 'DESCRIPCIÓN', 'CANTIDAD', 'SALDO FINAL']
        table_data = [[Paragraph(f"<b>{h}</b>", self.style_table_cell) for h in headers]]
        
        for row in data:
            table_data.append([
                row.get('fecha'), row.get('saldo_inicial'), row.get('tipo'),
                Paragraph(row.get('descripcion'), self.style_table_cell),
                row.get('cantidad'), row.get('saldo_final')
            ])

        t = Table(table_data, colWidths=[1.2*inch, 1.5*inch, 1.0*inch, 4.0*inch, 1.2*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (-1,0), self.color_table_header),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 30))
        elements.append(self._crear_bloque_firmas(10.0))
        
        doc.build(elements)
        return buffer.getvalue()