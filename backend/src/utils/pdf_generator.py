from io import BytesIO
from typing import Any, Dict, List, Optional

from src.utils.pdf_template import PDFTemplate, format_quantity


# ═══════════════════════════════════════════════════════════════════════════════
#  PROVEEDORES POR DEPENDENCIA
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_proveedores_dependencia(
    proveedores: List[Dict[str, Any]],
    dependencia_info: Dict[str, Any],
    tipo_entidad: str,
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con listado de proveedores filtrado por dependencia."""
    template = PDFTemplate(title="REPORTE DE PROVEEDORES", landscape_mode=True)
    template.set_company_header(
        name="Caguayo",
        nit="",
        address=dependencia_info.get("direccion", ""),
        phone="",
    )

    filters: Dict[str, str] = {
        "Dependencia": dependencia_info.get("nombre", ""),
        "Tipo Entidad": tipo_entidad,
    }
    template.set_filters(filters)

    # ── Build table data ──────────────────────────────────────────────────
    if tipo_entidad == "NATURAL":
        headers = [
            "CÓDIGO",
            "CI",
            "NOMBRE Y APELLIDOS",
            "DIRECCIÓN",
            "MUNICIPIO",
            "VIGENCIA",
        ]
        data = [
            [
                p.get("codigo", ""),
                p.get("carnet_identidad", ""),
                p.get("nombre", ""),
                p.get("direccion", ""),
                p.get("municipio", ""),
                str(p.get("vigencia", "")),
            ]
            for p in proveedores
        ]
        code_cols = [0, 1]
        num_cols: List[int] = []

    elif tipo_entidad == "TCP":
        headers = ["CÓDIGO", "NOMBRE Y APELLIDOS", "DIRECCIÓN"]
        data = [
            [p.get("codigo", ""), p.get("nombre", ""), p.get("direccion", "")]
            for p in proveedores
        ]
        code_cols = [0]
        num_cols = []

    elif tipo_entidad == "JURIDICA":
        headers = ["CÓDIGO", "NIT", "NOMBRE", "DIRECCIÓN", "MUNICIPIO"]
        data = [
            [
                p.get("codigo", ""),
                p.get("codigo_reup", ""),
                p.get("nombre", ""),
                p.get("direccion", ""),
                p.get("municipio", ""),
            ]
            for p in proveedores
        ]
        code_cols = [0, 1]
        num_cols = []

    else:  # Fallback default
        headers = ["CÓDIGO", "NOMBRE", "DIRECCIÓN"]
        data = [
            [p.get("codigo", ""), p.get("nombre", ""), p.get("direccion", "")]
            for p in proveedores
        ]
        code_cols = [0]
        num_cols = []

    template.add_table(headers, data, code_columns=code_cols, numeric_columns=num_cols)

    # ── Optional notes ────────────────────────────────────────────────────
    if notas:
        template.add_notes_section(notas)

    # ── Signatures ────────────────────────────────────────────────────────
    template.add_signature_section(
        created_by=usuario_actual,
        approved_by=aprobado_por_nombre,
        approved_role=aprobado_por_cargo,
    )

    return template.build()


# ═══════════════════════════════════════════════════════════════════════════════
#  EXISTENCIAS
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_existencias(
    existencias: List[Dict[str, Any]],
    dependencia_info: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con el listado de existencias en inventario."""
    template = PDFTemplate(title="EXISTENCIAS EN INVENTARIO", landscape_mode=True)
    template.set_company_header(
        name="Caguayo",
        nit="",
        address=dependencia_info.get("direccion", ""),
        phone="",
    )
    template.set_filters(
        {
            "Dependencia": dependencia_info.get("nombre", ""),
        }
    )

    headers = ["CÓDIGO", "DESCRIPCIÓN", "CANTIDAD"]
    data = [
        [
            str(e.get("codigo", "")),
            str(e.get("descripcion", "")),
            format_quantity(e.get("cantidad", 0)),
        ]
        for e in existencias
    ]

    template.add_table(
        headers,
        data,
        code_columns=[0],
        numeric_columns=[2],
    )

    if notas:
        template.add_notes_section(notas)

    template.add_signature_section(
        created_by=usuario_actual,
        approved_by=aprobado_por_nombre,
        approved_role=aprobado_por_cargo,
    )

    return template.build()


# ═══════════════════════════════════════════════════════════════════════════════
#  MOVIMIENTOS POR DEPENDENCIA
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_movimientos_dependencia(
    movimientos: List[Dict[str, Any]],
    dependencia_info: Dict[str, Any],
    fecha_inicio: Any,
    fecha_fin: Any,
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con movimientos de inventario agrupados por dependencia."""
    template = PDFTemplate(title="MOVIMIENTOS DE INVENTARIO", landscape_mode=True)
    template.set_company_header(
        name="Caguayo",
        nit="",
        address=dependencia_info.get("direccion", ""),
        phone="",
    )
    template.set_filters(
        {
            "Dependencia": dependencia_info.get("nombre", ""),
            "Período": f"{fecha_inicio} al {fecha_fin}",
        }
    )

    headers = ["FECHA", "OPERACIÓN", "PRODUCTO", "TIPO", "CANTIDAD"]
    data = [
        [
            str(m.get("fecha", "")),
            str(m.get("operacion", "")),
            str(m.get("producto", "")),
            str(m.get("tipo", "")),
            format_quantity(m.get("cantidad", 0)),
        ]
        for m in movimientos
    ]

    template.add_table(
        headers,
        data,
        numeric_columns=[4],
    )

    if notas:
        template.add_notes_section(notas)

    template.add_signature_section(
        created_by=usuario_actual,
        approved_by=aprobado_por_nombre,
        approved_role=aprobado_por_cargo,
    )

    return template.build()


# ═══════════════════════════════════════════════════════════════════════════════
#  MOVIMIENTOS POR PRODUCTO
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_movimientos_producto(
    movimientos: List[Dict[str, Any]],
    producto_info: Dict[str, Any],
    dependencia_info: Dict[str, Any],
    fecha_inicio: Any,
    fecha_fin: Any,
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con movimientos de un producto específico."""
    template = PDFTemplate(title="MOVIMIENTOS DE PRODUCTO", landscape_mode=True)
    template.set_company_header(
        name="Caguayo",
        nit="",
        address=dependencia_info.get("direccion", ""),
        phone="",
    )
    template.set_filters(
        {
            "Dependencia": dependencia_info.get("nombre", ""),
            "Producto": f"{producto_info.get('nombre', '')} ({producto_info.get('codigo', '')})",
            "Período": f"{fecha_inicio} al {fecha_fin}",
        }
    )

    headers = ["FECHA", "OPERACIÓN", "TIPO", "CANTIDAD"]
    data = [
        [
            str(m.get("fecha", "")),
            str(m.get("operacion", "")),
            str(m.get("tipo", "")),
            format_quantity(m.get("cantidad", 0)),
        ]
        for m in movimientos
    ]

    template.add_table(
        headers,
        data,
        numeric_columns=[3],
    )

    if notas:
        template.add_notes_section(notas)

    template.add_signature_section(
        created_by=usuario_actual,
        approved_by=aprobado_por_nombre,
        approved_role=aprobado_por_cargo,
    )

    return template.build()
