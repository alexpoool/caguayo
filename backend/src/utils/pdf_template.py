"""
Módulo de plantillas PDF.

Contiene dos enfoques complementarios:

1. **PDFTemplate** – clase ReportLab Platypus para generar reportes
   profesionales (proveedores, existencias, movimientos) con tabla,
   paginación, firmas y sección de notas.

2. **render_invoice_template** – función que renderiza una plantilla
   Jinja2 HTML para facturas (usada por el módulo de facturación).
"""

from io import BytesIO
from typing import Dict, List, Optional
from datetime import datetime

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)


# ═══════════════════════════════════════════════════════════════════════════════
#  PARTE 1 – PDFTemplate (ReportLab Platypus) para reportes
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Color palette ───────────────────────────────────────────────────────────
HEADER_BG = HexColor("#2c3e50")  # Dark blue-gray
HEADER_FG = white
ZEBRA_LIGHT = HexColor("#f8f9fa")  # Very light gray
ZEBRA_DARK = white
BORDER_COLOR = HexColor("#dee2e6")  # Light gray border
NOTE_BORDER = HexColor("#ffc107")  # Amber for note border
NOTE_BG = HexColor("#fffbe6")  # Pale yellow
TITLE_COLOR = HexColor("#2c3e50")
SUBTITLE_COLOR = HexColor("#495057")
MUTED_COLOR = HexColor("#6c757d")
TOTALS_BG = HexColor("#e9ecef")
TOTALS_LINE = HexColor("#2c3e50")
HR_COLOR = HexColor("#dee2e6")


class PDFTemplate:
    """Reusable PDF template for professional report generation.

    Encapsulates company header, filters, pagination, styled tables,
    notes section, and signature block.  Designed to be used by all
    report-generation functions in ``pdf_generator.py``.
    """

    def __init__(self, title: str, landscape_mode: bool = True) -> None:
        self.title = title
        self.landscape_mode = landscape_mode
        self.page_size = landscape(letter) if landscape_mode else letter

        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=self.page_size,
            rightMargin=30,
            leftMargin=30,
            topMargin=50,
            bottomMargin=50,
        )

        self.elements: list = []
        self.styles = self._init_styles()

        # Company header data
        self._company_name = ""
        self._company_nit = ""
        self._company_address = ""
        self._company_phone = ""

        # Applied filters (displayed below the title)
        self._filters: Dict[str, str] = {}

        # Becomes True when at least one table or content is added
        self._has_content = False

    # ── Style initialisation ──────────────────────────────────────────────

    @staticmethod
    def _init_styles() -> dict:
        styles = getSampleStyleSheet()

        styles.add(
            ParagraphStyle(
                "ReportTitle",
                fontName="Helvetica-Bold",
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=4,
                textColor=TITLE_COLOR,
            )
        )
        styles.add(
            ParagraphStyle(
                "CompanyInfo",
                fontName="Helvetica",
                fontSize=9,
                alignment=TA_CENTER,
                spaceAfter=2,
                textColor=SUBTITLE_COLOR,
                leading=12,
            )
        )
        styles.add(
            ParagraphStyle(
                "DateLine",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_CENTER,
                spaceAfter=6,
                textColor=MUTED_COLOR,
            )
        )
        styles.add(
            ParagraphStyle(
                "FilterInfo",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_LEFT,
                spaceAfter=2,
                textColor=MUTED_COLOR,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "NoteHeader",
                fontName="Helvetica-Bold",
                fontSize=10,
                alignment=TA_LEFT,
                spaceBefore=4,
                spaceAfter=4,
                textColor=HexColor("#856404"),
            )
        )
        styles.add(
            ParagraphStyle(
                "NoteText",
                fontName="Helvetica",
                fontSize=9,
                alignment=TA_LEFT,
                spaceAfter=4,
                textColor=HexColor("#856404"),
                leading=13,
                borderPadding=8,
                backColor=NOTE_BG,
            )
        )
        styles.add(
            ParagraphStyle(
                "SignatureText",
                fontName="Helvetica",
                fontSize=9,
                alignment=TA_LEFT,
                spaceAfter=2,
                leading=11,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCell",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_LEFT,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCellNumber",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_RIGHT,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCellCode",
                fontName="Courier",
                fontSize=8,
                alignment=TA_LEFT,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableHeader",
                fontName="Helvetica-Bold",
                fontSize=8,
                alignment=TA_CENTER,
                textColor=HEADER_FG,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "TotalsRow",
                fontName="Helvetica-Bold",
                fontSize=8,
                alignment=TA_RIGHT,
                textColor=TITLE_COLOR,
                leading=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "EmptyState",
                fontName="Helvetica",
                fontSize=11,
                alignment=TA_CENTER,
                textColor=MUTED_COLOR,
                spaceBefore=30,
                spaceAfter=30,
            )
        )
        return styles

    # ── Public configuration methods ──────────────────────────────────────

    def set_company_header(
        self, name: str, nit: str = "", address: str = "", phone: str = ""
    ) -> None:
        """Configure the organisation header shown at the top of every page."""
        self._company_name = name
        self._company_nit = nit
        self._company_address = address
        self._company_phone = phone

    def set_filters(self, filters: Dict[str, str]) -> None:
        """Record the filters applied to this report (displayed below title)."""
        self._filters = filters

    # ── Table ─────────────────────────────────────────────────────────────

    def add_table(
        self,
        headers: List[str],
        data: List[List[str]],
        col_widths: Optional[List[float]] = None,
        totals_row: Optional[List[str]] = None,
        numeric_columns: Optional[List[int]] = None,
        code_columns: Optional[List[int]] = None,
    ) -> None:
        """Add a professionally styled table to the document.

        Parameters
        ----------
        headers:
            Column header labels.
        data:
            Table body – each row is a list of strings.
        col_widths:
            Explicit column widths in points.  When *None* columns are
            distributed evenly across the available page width.
        totals_row:
            Optional final row rendered with a bold totals style.
        numeric_columns:
            Indices of columns that should be right-aligned.  Auto-detected
            from data when *None*.
        code_columns:
            Indices of columns that should use a monospace font.  Auto-detected
            from header keywords when *None*.
        """
        if not data:
            return

        self._has_content = True

        # Detection fallbacks
        if numeric_columns is None:
            numeric_columns = self._detect_numeric_columns(data)
        if code_columns is None:
            code_columns = self._detect_code_columns(headers)

        # Column widths
        available_width = self.page_size[0] - 60  # 30+30 margins
        if col_widths is None:
            col_widths = [available_width / len(headers)] * len(headers)

        # Wrap header cells
        styled_headers = [
            Paragraph(f"<b>{self._escape(h)}</b>", self.styles["TableHeader"])
            for h in headers
        ]

        # Wrap data cells
        styled_data: list = []
        for row in data:
            styled_row: list = []
            for ci, val in enumerate(row):
                safe = self._escape(val)
                if ci in code_columns:
                    style = self.styles["TableCellCode"]
                elif ci in numeric_columns:
                    style = self.styles["TableCellNumber"]
                else:
                    style = self.styles["TableCell"]
                styled_row.append(Paragraph(safe, style))
            styled_data.append(styled_row)

        # Assemble final table grid
        table_data = [styled_headers] + styled_data

        if totals_row:
            styled_totals = [
                Paragraph(f"<b>{self._escape(v)}</b>", self.styles["TotalsRow"])
                for v in totals_row
            ]
            table_data.append(styled_totals)

        num_rows = len(table_data)
        num_cols = len(headers)

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(
            self._build_table_style(num_rows, num_cols, totals_row is not None)
        )

        self.elements.append(table)
        self.elements.append(Spacer(1, 12))

    @staticmethod
    def _detect_numeric_columns(data: List[List[str]]) -> List[int]:
        """Return column indices whose non-empty values look numeric."""
        if not data:
            return []
        numeric: List[int] = []
        for ci in range(len(data[0])):
            checks = 0
            ok = True
            for row in data:
                if ci < len(row) and row[ci].strip():
                    try:
                        float(row[ci].replace(",", "").replace("$", "").strip())
                    except ValueError:
                        ok = False
                        break
                    checks += 1
                    if checks >= 5:
                        break
            if ok and checks > 0:
                numeric.append(ci)
        return numeric

    @staticmethod
    def _detect_code_columns(headers: List[str]) -> List[int]:
        """Return column indices whose header suggests a code field."""
        keywords = {"codigo", "código", "cod", "code", "nit", "ci", "reup"}
        indices: List[int] = []
        for ci, h in enumerate(headers):
            clean = h.lower().strip().replace(" ", "")
            if any(kw in clean for kw in keywords):
                indices.append(ci)
        return indices

    def _build_table_style(
        self, num_rows: int, num_cols: int, has_totals: bool
    ) -> list:
        """Produce the TableStyle command list for a professional table."""
        # Indices
        data_start = 1
        totals_idx = num_rows - 1 if has_totals else -1
        data_end = totals_idx - 1 if has_totals else num_rows - 1

        cmds: list = [
            # ── Header row ──────────────────────────────────────────────
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("LINEBELOW", (0, 0), (-1, 0), 1.5, HexColor("#1a252f")),
            # ── Grid ────────────────────────────────────────────────────
            ("GRID", (0, 0), (-1, num_rows - 1), 0.5, BORDER_COLOR),
            # ── Zebra striping ──────────────────────────────────────────
        ]
        for ri in range(data_start, data_end + 1):
            bg = ZEBRA_LIGHT if ri % 2 == 0 else ZEBRA_DARK
            cmds.append(("BACKGROUND", (0, ri), (-1, ri), bg))

        cmds.extend(
            [
                # ── Cell padding ────────────────────────────────────────────
                ("TOPPADDING", (0, data_start), (-1, data_end), 5),
                ("BOTTOMPADDING", (0, data_start), (-1, data_end), 5),
                ("LEFTPADDING", (0, 0), (-1, num_rows - 1), 6),
                ("RIGHTPADDING", (0, 0), (-1, num_rows - 1), 6),
                # ── Valign ──────────────────────────────────────────────────
                ("VALIGN", (0, 0), (-1, num_rows - 1), "MIDDLE"),
            ]
        )

        if has_totals:
            cmds.extend(
                [
                    ("BACKGROUND", (0, totals_idx), (-1, totals_idx), TOTALS_BG),
                    ("LINEABOVE", (0, totals_idx), (-1, totals_idx), 1.5, TOTALS_LINE),
                    ("FONTNAME", (0, totals_idx), (-1, totals_idx), "Helvetica-Bold"),
                    ("TOPPADDING", (0, totals_idx), (-1, totals_idx), 8),
                    ("BOTTOMPADDING", (0, totals_idx), (-1, totals_idx), 8),
                ]
            )

        return cmds

    # ── Notes / signatures ────────────────────────────────────────────────

    def add_notes_section(self, notes: str) -> None:
        """Append an optional *Observaciones* block."""
        if not notes or not notes.strip():
            return

        self._has_content = True
        self.elements.append(Spacer(1, 10))
        self.elements.append(
            Paragraph("<b>OBSERVACIONES</b>", self.styles["NoteHeader"])
        )

        # Wrap in a bordered mini-table for visual grouping
        note_table = Table(
            [[Paragraph(self._escape(notes), self.styles["NoteText"])]],
            colWidths=[self.page_size[0] - 60],
        )
        note_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, NOTE_BORDER),
                    ("BACKGROUND", (0, 0), (-1, -1), NOTE_BG),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        self.elements.append(note_table)
        self.elements.append(Spacer(1, 8))

    def add_signature_section(
        self,
        created_by: str,
        approved_by: str = "",
        approved_role: str = "",
    ) -> None:
        """Append the signature block at the bottom of the document."""
        self.elements.append(Spacer(1, 24))

        fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sig = self.styles["SignatureText"]
        half = self.page_size[0] / 2 - 40

        sig_data = [
            [
                Paragraph("<b>CONFECCIONADO POR:</b>", sig),
                Paragraph("<b>APROBADO POR:</b>", sig),
            ],
            [
                Paragraph(f"USUARIO: {self._escape(created_by)}", sig),
                Paragraph(f"NOMBRE: {self._escape(approved_by)}", sig),
            ],
            [
                Paragraph("CARGO: ________________", sig),
                Paragraph(f"CARGO: {self._escape(approved_role)}", sig),
            ],
            [
                Paragraph(f"FECHA DE EMISIÓN: {fecha_emision}", sig),
                Paragraph("FECHA: ________________", sig),
            ],
            [
                Paragraph("FIRMA: ________________", sig),
                Paragraph("FIRMA: ________________", sig),
            ],
        ]

        sig_table = Table(sig_data, colWidths=[half, half])
        sig_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        self.elements.append(sig_table)

    # ── Build ─────────────────────────────────────────────────────────────

    def build(self) -> BytesIO:
        """Render the PDF and return the byte buffer."""
        self._build_header()

        if not self._has_content:
            self.elements.append(
                Paragraph(
                    "No se encontraron datos para los criterios seleccionados.",
                    self.styles["EmptyState"],
                )
            )

        self.doc.build(
            self.elements,
            onFirstPage=self._add_page_number,
            onLaterPages=self._add_page_number,
        )
        self.buffer.seek(0)
        return self.buffer

    # ── Internal helpers ──────────────────────────────────────────────────

    def _build_header(self) -> None:
        """Compose the document header (company, title, date, filters)."""
        self.elements.append(Spacer(1, 6))

        # Company block
        if self._company_name:
            self.elements.append(
                Paragraph(
                    f"<b>{self._escape(self._company_name)}</b>",
                    self.styles["CompanyInfo"],
                )
            )
        details = []
        if self._company_nit:
            details.append(f"NIT: {self._escape(self._company_nit)}")
        if self._company_address:
            details.append(self._escape(self._company_address))
        if self._company_phone:
            details.append(f"Tel: {self._escape(self._company_phone)}")
        if details:
            self.elements.append(
                Paragraph("<br/>".join(details), self.styles["CompanyInfo"])
            )
            self.elements.append(Spacer(1, 4))

        # Title
        self.elements.append(
            Paragraph(f"<b>{self._escape(self.title)}</b>", self.styles["ReportTitle"])
        )

        # Date
        fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.elements.append(
            Paragraph(f"Fecha de emisión: {fecha}", self.styles["DateLine"])
        )

        # Filters (inline pipe-separated list)
        if self._filters:
            parts = [
                f"<b>{self._escape(k)}:</b> {self._escape(str(v))}"
                for k, v in self._filters.items()
                if v
            ]
            if parts:
                self.elements.append(
                    Paragraph(" | ".join(parts), self.styles["FilterInfo"])
                )
                self.elements.append(Spacer(1, 4))

        # Horizontal rule
        hr_table = Table(
            [[""]],
            colWidths=[self.page_size[0] - 60],
        )
        hr_table.setStyle(
            TableStyle(
                [
                    ("LINEBELOW", (0, 0), (-1, 0), 1, HR_COLOR),
                    ("TOPPADDING", (0, 0), (-1, 0), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                ]
            )
        )
        self.elements.append(hr_table)
        self.elements.append(Spacer(1, 6))

    def _add_page_number(self, canvas, doc) -> None:
        """Callback drawn at the bottom of each page."""
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED_COLOR)
        canvas.drawCentredString(
            self.page_size[0] / 2,
            15,
            f"Página {canvas.getPageNumber()}",
        )
        canvas.restoreState()

    @staticmethod
    def _escape(text: str) -> str:
        """XML-escape a string for use inside a ReportLab Paragraph."""
        return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ── Convenience: format a quantity with thousand separators ────────────────


def format_quantity(value: object) -> str:
    """Format a numeric value with thousand separators for PDF display.

    Integers are rendered without decimals; floats show two decimal places.
    Non-numeric values are returned as-is (stringified).
    """
    try:
        num = float(str(value).replace(",", ""))
        if num == int(num):
            return f"{int(num):,}"
        return f"{num:,.2f}"
    except (ValueError, TypeError):
        return str(value)


# ═══════════════════════════════════════════════════════════════════════════════
#  PARTE 2 – Plantilla Jinja2 para facturas (HTML → PDF)
# ═══════════════════════════════════════════════════════════════════════════════

PDF_TEMPLATE = """
<doc>
  <body>
    <style>
      body {
        font-family: Helvetica;
        font-size: 10pt;
        margin: 2cm;
      }
      .empresa {
        text-align: center;
        margin-bottom: 20px;
      }
      .factura-titulo {
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
      }
      .datos-factura {
        margin-bottom: 15px;
      }
      .paguese {
        background-color: #f0f0f0;
        padding: 5px;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid black;
        padding: 6px;
        text-align: left;
      }
      th {
        background-color: #ddd;
      }
      .total {
        text-align: right;
        font-weight: bold;
      }
      .firmas {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
      }
    </style>

    <!-- Encabezado empresa -->
    <div class="empresa">
      <b>{{ empresa_raiz }}</b><br/>
      {{ dependencia_factura }}<br/>
      {{ direccion }}<br/>
      {{ municipio }}, {{ provincia }}<br/>
      Teléfono: {{ telefono }}<br/>
      Correo: {{ email }}
    </div>

    <!-- Título Factura -->
    <div class="factura-titulo">FACTURA</div>

    <!-- Datos de la factura -->
    <div class="datos-factura">
      Código: <b>{{ codigo_factura }}</b><br/>
      Fecha: {{ fecha }}<br/>
      Moneda: <b>{{ moneda }}</b>
    </div>

    <!-- A quién pagar -->
    <div class="paguese">
      Paguese a: {{ nombre_empresa_pago }}<br/>
      Código: {{ codigo_empresa_pago }}<br/>
      <b>CUENTA CUP</b><br/>
      Cuenta: {{ cuenta_cup }}<br/>
      NIT: {{ nit_empresa }}<br/>
      <b>BANCO:</b> {{ banco }}<br/>
      Titular: {{ titular_cuenta }}<br/>
      Sucursal: {{ sucursal }}<br/>
      Dirección: {{ direccion_sucursal }}
    </div>

    <!-- Contrato y Cliente -->
    <div>
      Contrato N° {{ numero_contrato }} con el Cliente<br/>
      Nombre: {{ nombre_cliente }}<br/>
      Código: {{ codigo_cliente }} &nbsp;&nbsp; NIT: {{ nit_cliente }}<br/>
      Provincia: {{ provincia_cliente }} &nbsp;&nbsp; Municipio: {{ municipio_cliente }}<br/>
      Dirección: {{ direccion_cliente }}<br/>
      <b>BANCO:</b> {{ banco_cliente }}<br/>
      Titular: {{ titular_cliente }}<br/>
      Sucursal: {{ sucursal_cliente }}<br/>
      Dirección: {{ direccion_sucursal_cliente }}
    </div>

    <!-- Descripción general -->
    <div>
      <b>Descripción:</b> {{ descripcion_general }}
    </div>

    <!-- Tabla de items -->
    <table>
      <tr>
        <th>Código</th>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio</th>
        <th>Importe</th>
      </tr>
      {% for item in items %}
      <tr>
        <td>{{ item.codigo_item }}</td>
        <td>{{ item.descripcion_item }}</td>
        <td>{{ item.cantidad_item }}</td>
        <td>{{ item.precio_item }}</td>
        <td>{{ item.importe_item }}</td>
      </tr>
      {% endfor %}
    </table>

    <!-- Total -->
    <div class="total">
      TOTAL: {{ total_factura }}
    </div>

    <!-- Firmas -->
    <div class="firmas">
      <div>
        Confeccionado por:<br/>
        {{ nombre_confecciona }}<br/>
        Cargo: {{ cargo_confecciona }}<br/>
        Fecha Emisión: {{ fecha_emision }}
      </div>
      <div>
        Recibido por:<br/>
        Nombre: ____________<br/>
        Cargo: ____________<br/>
        Fecha: ____________<br/>
        Firma: ____________
      </div>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      Página 1 de 1
    </div>
  </body>
</doc>
"""


def render_invoice_template(data: dict) -> str:
    """
    Render the invoice template with the provided data

    Args:
        data: Dictionary containing all the template variables

    Returns:
        Rendered HTML string
    """
    from jinja2 import Template  # ty: ignore — Jinja2 lazy import, optional dep

    template = Template(PDF_TEMPLATE)
    return template.render(**data)
