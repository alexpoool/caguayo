"""
Módulo de plantillas PDF.

Contiene PDFTemplate – clase ReportLab Platypus para generar reportes
profesionales (proveedores, existencias, movimientos) con tabla,
paginación, firmas y sección de notas, optimizada para bajo consumo
de tinta (estética monocromática y minimalista).
"""

from io import BytesIO
from typing import Dict, List, Optional
from datetime import datetime

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.colors import white, black
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

# ─── Color palette (monochrome, ink-saving) ────────────────────────────
HEADER_BG = white           # white background for table header
HEADER_FG = black           # black text for header
ZEBRA_LIGHT = white         # no zebra → all rows white
ZEBRA_DARK = white          # no zebra
BORDER_COLOR = black        # black borders
NOTE_BORDER = black         # black border for notes
NOTE_BG = white             # white background for notes
TITLE_COLOR = black         # titles in black
SUBTITLE_COLOR = black      # subtitles in black
MUTED_COLOR = black         # secondary text also black
TOTALS_BG = white           # white background for totals row
TOTALS_LINE = black         # totals line in black
HR_COLOR = black            # horizontal rule in black


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
            rightMargin=20,
            leftMargin=20,
            topMargin=30,
            bottomMargin=25,
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
                fontSize=12,
                alignment=TA_CENTER,
                spaceAfter=2,
                textColor=TITLE_COLOR,
            )
        )
        styles.add(
            ParagraphStyle(
                "CompanyInfo",
                fontName="Helvetica",
                fontSize=7,
                alignment=TA_CENTER,
                spaceAfter=2,
                textColor=SUBTITLE_COLOR,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "DateLine",
                fontName="Helvetica",
                fontSize=7,
                alignment=TA_CENTER,
                spaceAfter=3,
                textColor=MUTED_COLOR,
            )
        )
        styles.add(
            ParagraphStyle(
                "FilterInfo",
                fontName="Helvetica",
                fontSize=7,
                alignment=TA_LEFT,
                spaceAfter=2,
                textColor=MUTED_COLOR,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "NoteHeader",
                fontName="Helvetica-Bold",
                fontSize=9,
                alignment=TA_LEFT,
                spaceBefore=4,
                spaceAfter=4,
                textColor=black,
            )
        )
        styles.add(
            ParagraphStyle(
                "NoteText",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_LEFT,
                spaceAfter=4,
                textColor=black,
                leading=11,
                borderPadding=8,
            )
        )
        styles.add(
            ParagraphStyle(
                "SignatureText",
                fontName="Helvetica",
                fontSize=8,
                alignment=TA_LEFT,
                spaceAfter=2,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCell",
                fontName="Helvetica",
                fontSize=7,
                alignment=TA_LEFT,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCellNumber",
                fontName="Helvetica",
                fontSize=7,
                alignment=TA_RIGHT,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableCellCode",
                fontName="Courier",
                fontSize=7,
                alignment=TA_LEFT,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "TableHeader",
                fontName="Helvetica-Bold",
                fontSize=7,
                alignment=TA_CENTER,
                textColor=HEADER_FG,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "TotalsRow",
                fontName="Helvetica-Bold",
                fontSize=7,
                alignment=TA_RIGHT,
                textColor=TITLE_COLOR,
                leading=9,
            )
        )
        styles.add(
            ParagraphStyle(
                "EmptyState",
                fontName="Helvetica",
                fontSize=9,
                alignment=TA_CENTER,
                textColor=MUTED_COLOR,
                spaceBefore=15,
                spaceAfter=15,
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
        available_width = self.page_size[0] - 40  # 20+20 margins
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
        self.elements.append(Spacer(1, 6))

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
            ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
            ("TOPPADDING", (0, 0), (-1, 0), 5),
            ("LINEBELOW", (0, 0), (-1, 0), 1.5, black),
            # ── Grid ────────────────────────────────────────────────────
            ("GRID", (0, 0), (-1, num_rows - 1), 0.3, BORDER_COLOR),
            # ── Zebra striping ──────────────────────────────────────────
        ]
        for ri in range(data_start, data_end + 1):
            bg = ZEBRA_LIGHT if ri % 2 == 0 else ZEBRA_DARK
            cmds.append(("BACKGROUND", (0, ri), (-1, ri), bg))

        cmds.extend(
            [
                # ── Cell padding ────────────────────────────────────────────
                ("TOPPADDING", (0, data_start), (-1, data_end), 3),
                ("BOTTOMPADDING", (0, data_start), (-1, data_end), 3),
                ("LEFTPADDING", (0, 0), (-1, num_rows - 1), 4),
                ("RIGHTPADDING", (0, 0), (-1, num_rows - 1), 4),
                # ── Valign ──────────────────────────────────────────────────
                ("VALIGN", (0, 0), (-1, num_rows - 1), "MIDDLE"),
            ]
        )

        if has_totals:
            cmds.extend(
                [
                    ("BACKGROUND", (0, totals_idx), (-1, totals_idx), TOTALS_BG),
                    ("LINEABOVE", (0, totals_idx), (-1, totals_idx), 1, TOTALS_LINE),
                    ("FONTNAME", (0, totals_idx), (-1, totals_idx), "Helvetica-Bold"),
                    ("TOPPADDING", (0, totals_idx), (-1, totals_idx), 5),
                    ("BOTTOMPADDING", (0, totals_idx), (-1, totals_idx), 5),
                ]
            )

        return cmds

    # ── Notes / signatures ────────────────────────────────────────────────

    def add_notes_section(self, notes: str) -> None:
        """Append an optional *Observaciones* block."""
        if not notes or not notes.strip():
            return

        self._has_content = True
        self.elements.append(Spacer(1, 6))
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
                    ("BOX", (0, 0), (-1, -1), 0.3, black),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        self.elements.append(note_table)
        self.elements.append(Spacer(1, 4))

    def add_signature_section(
        self,
        created_by: str,
        approved_by: str = "",
        approved_role: str = "",
    ) -> None:
        """Append the signature block at the bottom of the document."""
        self.elements.append(Spacer(1, 16))

        fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sig = self.styles["SignatureText"]
        half = self.page_size[0] / 2 - 30

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
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
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
        self.elements.append(Spacer(1, 3))

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
            self.elements.append(Spacer(1, 2))

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
                self.elements.append(Spacer(1, 2))

        # Horizontal rule
        hr_table = Table(
            [[""]],
            colWidths=[self.page_size[0] - 60],
        )
        hr_table.setStyle(
            TableStyle(
                [
                    ("LINEBELOW", (0, 0), (-1, 0), 1, black),
                    ("TOPPADDING", (0, 0), (-1, 0), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                ]
            )
        )
        self.elements.append(hr_table)
        self.elements.append(Spacer(1, 3))

    def _add_page_number(self, canvas, doc) -> None:
        """Callback drawn at the bottom of each page."""
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(black)
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

