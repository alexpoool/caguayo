from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from io import BytesIO
from datetime import datetime
from typing import Any, List


class PdfReportService:
    """Genera PDFs idénticos al modelo de referencia."""

    # Ancho útil por orientación (letter = 8.5 × 11 in; margen 0.5 in)
    PORTRAIT_WIDTH = 7.5  # 8.5 − 0.5×2
    LANDSCAPE_WIDTH = 10.0  # 11  − 0.5×2
    MARGIN = 36  # 0.5 in = 36 pt

    def __init__(self):
        self.styles = getSampleStyleSheet()
        # ── Colores exactos del modelo ────────────────────────
        self.color_header_bg = colors.HexColor("#DDEBF7")  # Azul claro cuadro empresa
        self.color_table_header = colors.HexColor(
            "#D9E1F2"
        )  # Gris azulado encabezado tabla
        self.color_box_border = colors.HexColor(
            "#8DB4E2"
        )  # Borde suave del cuadro azul

        # ── Estilos de texto (Helvetica, tamaños 8 / 16 pt) ──
        self.style_title = ParagraphStyle(
            "ReportTitle",
            parent=self.styles["Normal"],
            fontSize=16,
            fontName="Helvetica-Bold",
            leading=20,
            alignment=TA_LEFT,
        )
        self.style_label = ParagraphStyle(
            "Label",
            parent=self.styles["Normal"],
            fontSize=8,
            fontName="Helvetica",
            leading=10,
        )
        self.style_cell = ParagraphStyle(
            "Cell",
            parent=self.styles["Normal"],
            fontSize=8,
            fontName="Helvetica",
            leading=10,
        )
        self.style_cell_center = ParagraphStyle(
            "CellCenter",
            parent=self.styles["Normal"],
            fontSize=8,
            fontName="Helvetica",
            leading=10,
            alignment=TA_CENTER,
        )
        self.style_header_cell = ParagraphStyle(
            "HeaderCell",
            parent=self.styles["Normal"],
            fontSize=8,
            fontName="Helvetica-Bold",
            leading=10,
            alignment=TA_CENTER,
        )

    # ─── Encabezado estándar ──────────────────────────────────
    def _crear_encabezado_estandar(
        self,
        titulo: str,
        info_empresa: dict,
        lineas_extra_izq: List[str],
        page_width: float,
    ):
        """
        Título a la izquierda + cuadro azul (#DDEBF7) en la esquina
        superior derecha, alineado con el título.
        """
        width_der = 2.8  # pulgadas para el cuadro azul
        width_izq = page_width - width_der

        # ── Columna izquierda: título + líneas informativas ──
        left_parts: List[List[Any]] = [[Paragraph(titulo, self.style_title)]]
        for linea in lineas_extra_izq:
            left_parts.append([Paragraph(linea, self.style_label)])

        t_izq = Table(left_parts, colWidths=[width_izq * inch])
        t_izq.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )

        # ── Columna derecha: cuadro azul con datos de empresa ─
        info_rows: List[List[Any]] = [
            [
                Paragraph(
                    f"<b>EMPRESA:</b> {info_empresa.get('empresa', '')}",
                    self.style_label,
                )
            ],
            [
                Paragraph(
                    f"<b>DEPENDENCIA:</b> {info_empresa.get('dependencia', '')}",
                    self.style_label,
                )
            ],
            [
                Paragraph(
                    f"<b>DIRECCIÓN:</b> {info_empresa.get('direccion', '')}",
                    self.style_label,
                )
            ],
        ]
        t_der = Table(info_rows, colWidths=[width_der * inch])
        t_der.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self.color_header_bg),
                    ("BOX", (0, 0), (-1, -1), 0.5, self.color_box_border),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, self.color_box_border),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )

        # ── Tabla contenedora — título │ cuadro azul ──────────
        wrapper = Table(
            [[t_izq, t_der]],
            colWidths=[width_izq * inch, width_der * inch],
        )
        wrapper.setStyle(
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
        return wrapper

    # ─── Bloque de firmas ─────────────────────────────────────
    def _crear_bloque_firmas(self, page_width: float):
        """
        Tabla de 2 columnas: CONFECCIONADO POR / APROBADO POR.
        Solo Cargo, Fecha y Firma (sin campo Nombre).
        """
        col_w = (page_width / 2) * inch
        line = "_" * 30

        data: List[List[Any]] = [
            [
                Paragraph("<b>CONFECCIONADO POR:</b>", self.style_label),
                Paragraph("<b>APROBADO POR:</b>", self.style_label),
            ],
            [
                Paragraph(f"Cargo: {line}", self.style_label),
                Paragraph(f"Cargo: {line}", self.style_label),
            ],
            [
                Paragraph(f"Fecha: {line}", self.style_label),
                Paragraph(f"Fecha: {line}", self.style_label),
            ],
            [
                Paragraph(f"Firma: {line}", self.style_label),
                Paragraph(f"Firma: {line}", self.style_label),
            ],
        ]
        t = Table(data, colWidths=[col_w, col_w])
        t.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, 0),
                        20,
                    ),  # Separación superior del bloque
                    ("TOPPADDING", (0, 1), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return t

    # ─── Estilo base reutilizable para tablas de datos ────────
    def _table_style_base(self) -> list:
        return [
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), self.color_table_header),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]

    # ═══════════════════════════════════════════════════════════
    #  Existencias en Inventario  — Portrait (letter)
    # ═══════════════════════════════════════════════════════════
    def generate_existencias_pdf(self, data: List[dict], filters: dict):
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=self.MARGIN,
            rightMargin=self.MARGIN,
            topMargin=self.MARGIN,
            bottomMargin=self.MARGIN,
        )
        elements: List[Any] = []

        info = {
            "empresa": filters.get("empresa", ""),
            "dependencia": filters.get("dependencia", ""),
            "direccion": filters.get("direccion", ""),
        }
        fecha = f"FECHA: {datetime.now().strftime('%d/%m/%Y')}"

        elements.append(
            self._crear_encabezado_estandar(
                "EXISTENCIAS EN INVENTARIO",
                info,
                [fecha],
                self.PORTRAIT_WIDTH,
            )
        )
        elements.append(Spacer(1, 20))

        # ── Tabla de datos ────────────────────────────────────
        table_data: List[List[Any]] = [
            [
                Paragraph("<b>CÓDIGO</b>", self.style_header_cell),
                Paragraph("<b>DESCRIPCIÓN</b>", self.style_header_cell),
                Paragraph("<b>CANTIDAD</b>", self.style_header_cell),
            ]
        ]
        for item in data:
            table_data.append(
                [
                    Paragraph(str(item.get("codigo", "")), self.style_cell_center),
                    Paragraph(str(item.get("descripcion", "")), self.style_cell),
                    Paragraph(str(item.get("cantidad", 0)), self.style_cell_center),
                ]
            )

        t = Table(
            table_data, colWidths=[1.5 * inch, 4.5 * inch, 1.5 * inch], repeatRows=1
        )
        style = self._table_style_base() + [
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ]
        t.setStyle(TableStyle(style))
        elements.append(t)

        elements.append(Spacer(1, 40))
        elements.append(self._crear_bloque_firmas(self.PORTRAIT_WIDTH))

        doc.build(elements)
        return buffer.getvalue()

    # ═══════════════════════════════════════════════════════════
    #  Movimientos por Dependencia  — Landscape (letter)
    # ═══════════════════════════════════════════════════════════
    def generate_movimientos_dependencia_pdf(self, data: List[dict], filters: dict):
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            leftMargin=self.MARGIN,
            rightMargin=self.MARGIN,
            topMargin=self.MARGIN,
            bottomMargin=self.MARGIN,
        )
        elements: List[Any] = []

        info = {
            "empresa": filters.get("empresa", ""),
            "dependencia": filters.get("dependencia", ""),
            "direccion": filters.get("direccion", ""),
        }
        rango = [
            f"DESDE: {filters.get('desde', '')}",
            f"HASTA: {filters.get('hasta', '')}",
        ]

        elements.append(
            self._crear_encabezado_estandar(
                "MOVIMIENTOS DE INVENTARIO",
                info,
                rango,
                self.LANDSCAPE_WIDTH,
            )
        )
        elements.append(Spacer(1, 15))

        # ── Tabla de datos (7 columnas) ───────────────────────
        headers = [
            "FECHA",
            "CÓDIGO",
            "SALDO INICIAL",
            "TIPO",
            "DESCRIPCIÓN",
            "CANTIDAD",
            "SALDO FINAL",
        ]
        table_data: List[List[Any]] = [
            [Paragraph(f"<b>{h}</b>", self.style_header_cell) for h in headers]
        ]
        for row in data:
            table_data.append(
                [
                    Paragraph(str(row.get("fecha", "")), self.style_cell_center),
                    Paragraph(str(row.get("codigo", "")), self.style_cell_center),
                    Paragraph(str(row.get("saldo_inicial", 0)), self.style_cell_center),
                    Paragraph(str(row.get("tipo", "")), self.style_cell_center),
                    Paragraph(str(row.get("descripcion", "")), self.style_cell),
                    Paragraph(str(row.get("cantidad", 0)), self.style_cell_center),
                    Paragraph(str(row.get("saldo_final", 0)), self.style_cell_center),
                ]
            )

        col_widths = [
            1.0 * inch,
            2.0 * inch,
            1.1 * inch,
            0.9 * inch,
            2.4 * inch,
            1.0 * inch,
            1.1 * inch,
        ]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        style = self._table_style_base() + [
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (4, 1), (4, -1), "LEFT"),  # Descripción → izquierda
        ]
        t.setStyle(TableStyle(style))
        elements.append(t)

        elements.append(Spacer(1, 30))
        elements.append(self._crear_bloque_firmas(self.LANDSCAPE_WIDTH))

        doc.build(elements)
        return buffer.getvalue()

    # ═══════════════════════════════════════════════════════════
    #  Movimientos por Producto / Kardex  — Landscape (letter)
    # ═══════════════════════════════════════════════════════════
    def generate_movimientos_producto_pdf(self, data: List[dict], filters: dict):
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            leftMargin=self.MARGIN,
            rightMargin=self.MARGIN,
            topMargin=self.MARGIN,
            bottomMargin=self.MARGIN,
        )
        elements: List[Any] = []

        info = {
            "empresa": filters.get("empresa", ""),
            "dependencia": filters.get("dependencia", ""),
            "direccion": filters.get("direccion", ""),
        }
        extras = [
            f"PRODUCTO: {filters.get('producto_nombre', '')}",
            f"CÓDIGO: {filters.get('producto_codigo', '')}",
            f"DESDE: {filters.get('desde', '')}  HASTA: {filters.get('hasta', '')}",
        ]

        elements.append(
            self._crear_encabezado_estandar(
                "MOVIMIENTOS DE INVENTARIO",
                info,
                extras,
                self.LANDSCAPE_WIDTH,
            )
        )
        elements.append(Spacer(1, 15))

        # ── Tabla de datos (6 columnas) ───────────────────────
        headers = [
            "FECHA",
            "SALDO INICIAL",
            "TIPO",
            "DESCRIPCIÓN",
            "CANTIDAD",
            "SALDO FINAL",
        ]
        table_data: List[List[Any]] = [
            [Paragraph(f"<b>{h}</b>", self.style_header_cell) for h in headers]
        ]
        for row in data:
            table_data.append(
                [
                    Paragraph(str(row.get("fecha", "")), self.style_cell_center),
                    Paragraph(str(row.get("saldo_inicial", 0)), self.style_cell_center),
                    Paragraph(str(row.get("tipo", "")), self.style_cell_center),
                    Paragraph(str(row.get("descripcion", "")), self.style_cell),
                    Paragraph(str(row.get("cantidad", 0)), self.style_cell_center),
                    Paragraph(str(row.get("saldo_final", 0)), self.style_cell_center),
                ]
            )

        col_widths = [
            1.2 * inch,
            1.5 * inch,
            1.0 * inch,
            3.7 * inch,
            1.2 * inch,
            1.4 * inch,
        ]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        style = self._table_style_base() + [
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (3, 1), (3, -1), "LEFT"),  # Descripción → izquierda
        ]
        t.setStyle(TableStyle(style))
        elements.append(t)

        elements.append(Spacer(1, 30))
        elements.append(self._crear_bloque_firmas(self.LANDSCAPE_WIDTH))

        doc.build(elements)
        return buffer.getvalue()
