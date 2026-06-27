from io import BytesIO
from typing import Any, Dict, List

from reportlab.platypus import Paragraph

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


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 1: REGISTRO DE CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_clientes(
    clientes: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con el registro de clientes."""
    template = PDFTemplate(
        title="REGISTRO DE CLIENTES", landscape_mode=False
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")
    template.set_filters({})

    headers = ["No.", "NOMBRE", "REEUP", "NIT", "DIRECCIÓN"]
    data = []
    for idx, c in enumerate(clientes, start=1):
        data.append(
            [
                str(idx),
                str(c.get("nombre", "")),
                str(c.get("reeup", "")),
                str(c.get("nit", "")),
                str(c.get("direccion", "")),
            ]
        )

    template.add_table(
        headers,
        data,
        code_columns=[0, 2, 3],
        numeric_columns=[],
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
#  REPORTE 2: REGISTRO DE PROYECTOS / CONTRATOS
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_proyectos(
    proyectos: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con el registro de proyectos/contratos."""
    template = PDFTemplate(
        title="REGISTRO DE PROYECTOS / CONTRATOS", landscape_mode=False
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")

    filters: Dict[str, str] = {}
    if meta.get("fecha_inicio"):
        filters["Fecha inicio"] = str(meta["fecha_inicio"])
    if meta.get("fecha_fin"):
        filters["Fecha fin"] = str(meta["fecha_fin"])
    if filters:
        template.set_filters(filters)

    headers = ["No.", "CÓDIGO", "PROYECTO", "CLIENTE", "FECHA", "VALOR", "MONEDA"]
    data = []
    for idx, p in enumerate(proyectos, start=1):
        data.append(
            [
                str(idx),
                str(p.get("codigo", "")),
                str(p.get("nombre", "")),
                str(p.get("cliente", "")),
                str(p.get("fecha", "")),
                format_quantity(p.get("valor", 0)),
                str(p.get("moneda", "")),
            ]
        )

    template.add_table(
        headers,
        data,
        code_columns=[0, 1],
        numeric_columns=[5],
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
#  REPORTE 3: REGISTRO DE CREADORES
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_creadores(
    creadores: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con el registro de creadores, agrupado por municipio."""
    template = PDFTemplate(
        title="REGISTRO DE CREADORES", landscape_mode=False
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")
    template.set_filters({})

    headers = ["No.", "CI", "NOMBRE Y APELLIDOS", "DIRECCIÓN", "REGISTRO", "CÓDIGO", "VIGENCIA"]
    all_data: List[List[str]] = []

    # Agrupar por municipio
    grupos: Dict[str, List[Dict]] = {}
    for c in creadores:
        mun = c.get("municipio", "") or "(Sin municipio)"
        if mun not in grupos:
            grupos[mun] = []
        grupos[mun].append(c)

    consecutivo = 1
    for municipio in sorted(grupos.keys()):
        items = grupos[municipio]
        all_data.append(
            ["", "", f"--- {municipio.upper()} ---", "", "", "", ""]
        )
        for c in items:
            all_data.append(
                [
                    str(consecutivo),
                    str(c.get("carnet_identidad", "")),
                    str(c.get("nombre_completo", "")),
                    str(c.get("direccion", "")),
                    str(c.get("numero_registro", "")),
                    str(c.get("codigo", "")),
                    str(c.get("vigencia", "")),
                ]
            )
            consecutivo += 1

    template.add_table(
        headers,
        all_data,
        code_columns=[0, 1, 5],
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
#  REPORTE 4: INFORME DE DESEMPEÑO
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_desempeno(
    items: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con informe de desempeño, agrupado por creador."""
    template = PDFTemplate(
        title="INFORME DE DESEMPEÑO - PROYECTOS POR CREADOR",
        landscape_mode=True,
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")

    filters: Dict[str, str] = {}
    if meta.get("fecha_inicio"):
        filters["Fecha inicio"] = str(meta["fecha_inicio"])
    if meta.get("fecha_fin"):
        filters["Fecha fin"] = str(meta["fecha_fin"])
    if filters:
        template.set_filters(filters)

    headers = [
        "No.",
        "CREADOR",
        "PROYECTO",
        "ETAPA",
        "VALOR ETAPA",
        "COBRO",
        "POR COBRAR",
        "FECHA PAGO",
        "ESTADO",
    ]
    all_data: List[List[str]] = []

    totales_persona = meta.get("totales_por_persona", {})
    gran_cobro = meta.get("gran_total_cobro", 0)
    gran_valor = meta.get("gran_total_valor", 0)

    # Agrupar por persona
    persona_groups: Dict[str, List[Dict]] = {}
    for it in items:
        key = it.get("persona_nombre", "Sin nombre")
        if key not in persona_groups:
            persona_groups[key] = []
        persona_groups[key].append(it)

    consecutivo = 1
    for persona_nombre in sorted(persona_groups.keys()):
        persona_items = persona_groups[persona_nombre]
        for it in persona_items:
            all_data.append(
                [
                    str(consecutivo),
                    str(persona_nombre),
                    str(it.get("codigo_proyecto", "")),
                    str(it.get("nombre_etapa", "") or f"Etapa {it.get('numero_etapa', '')}"),
                    format_quantity(it.get("etapa_valor", 0)),
                    format_quantity(it.get("cobro", 0)),
                    format_quantity(it.get("por_cobrar", 0)),
                    str(it.get("fecha_pago", "") or ""),
                    "Pagada" if it.get("pagada") else "Pendiente",
                ]
            )
            consecutivo += 1

        # Subtotales por persona
        tp = totales_persona.get(persona_nombre, {})
        all_data.append(
            [
                "",
                f"** SUBTOTAL {persona_nombre} **",
                "",
                "",
                format_quantity(tp.get("total_valor", 0)),
                format_quantity(tp.get("total_cobro", 0)),
                "",
                "",
                "",
            ]
        )

    # Gran total
    all_data.append(
        [
            "",
            "** GRAN TOTAL **",
            "",
            "",
            format_quantity(gran_valor),
            format_quantity(gran_cobro),
            "",
            "",
            "",
        ]
    )

    template.add_table(
        headers,
        all_data,
        numeric_columns=[4, 5, 6],
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
#  REPORTE 5: INGRESOS Y RETENCIONES (ONAT)
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_onat(
    items: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con ingresos y retenciones de artistas (ONAT)."""
    template = PDFTemplate(
        title="INGRESOS Y RETENCIONES DE ARTISTAS (ONAT)",
        landscape_mode=True,
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")

    filters: Dict[str, str] = {}
    if meta.get("fecha_inicio"):
        filters["Fecha inicio"] = str(meta["fecha_inicio"])
    if meta.get("fecha_fin"):
        filters["Fecha fin"] = str(meta["fecha_fin"])
    if filters:
        template.set_filters(filters)

    headers = [
        "No.",
        "CREADOR",
        "CI / NIT",
        "REGISTRO",
        "FECHA",
        "MONEDA",
        "IMPORTE",
        "DEVENGADO",
        "% CAGUAYO",
        "CAGUAYO",
        "TRIBUTARIO",
        "TRIB. MT",
        "COM. BANC.",
        "GTO EMP.",
        "NETO",
    ]
    data: List[List[str]] = []
    for idx, it in enumerate(items, start=1):
        data.append(
            [
                str(idx),
                str(it.get("persona_nombre", "")),
                str(it.get("carnet_identidad", "") or it.get("nit", "")),
                str(it.get("numero_registro", "")),
                str(it.get("fecha_emision", "")),
                str(it.get("moneda", "")),
                format_quantity(it.get("importe", 0)),
                format_quantity(it.get("devengado", 0)),
                f"{it.get('porcentaje_caguayo', 0):.0f}%",
                format_quantity(it.get("importe_caguayo", 0)),
                f"{it.get('tributario', 0):.0f}%",
                format_quantity(it.get("tributario_monto", 0)),
                format_quantity(it.get("comision_bancaria", 0)),
                format_quantity(it.get("gasto_empresa", 0)),
                format_quantity(it.get("neto_pagar", 0)),
            ]
        )

    # Fila de totales
    totales = meta.get("totales", {})
    totals_row = [
        "",
        "TOTALES",
        "",
        "",
        "",
        "",
        format_quantity(totales.get("total_importe", 0)),
        format_quantity(totales.get("total_devengado", 0)),
        "",
        format_quantity(totales.get("total_importe_caguayo", 0)),
        "",
        format_quantity(totales.get("total_tributario_monto", 0)),
        format_quantity(totales.get("total_comision_bancaria", 0)),
        format_quantity(totales.get("total_gasto_empresa", 0)),
        format_quantity(totales.get("total_neto_pagar", 0)),
    ]

    template.add_table(
        headers,
        data,
        code_columns=[0, 2, 3],
        numeric_columns=[6, 7, 9, 11, 12, 13, 14],
        totals_row=totals_row,
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
#  REPORTE 6: RETRIBUCIÓN POR ESCALA DE INGRESOS (MINCULT)
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_mincult(
    items: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con distribución por escala de ingresos (MINCULT)."""
    template = PDFTemplate(
        title="RETRIBUCIÓN POR ESCALA DE INGRESOS (MINCULT)",
        landscape_mode=False,
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")

    filters: Dict[str, str] = {}
    if meta.get("fecha_inicio"):
        filters["Fecha inicio"] = str(meta["fecha_inicio"])
    if meta.get("fecha_fin"):
        filters["Fecha fin"] = str(meta["fecha_fin"])
    if filters:
        template.set_filters(filters)

    headers = [
        "No.",
        "ESCALA DE INGRESOS",
        "CANT. LIQUIDACIONES",
        "TOTAL DEVENGADO",
        "CANT. ARTISTAS",
    ]
    data: List[List[str]] = []
    for idx, it in enumerate(items, start=1):
        data.append(
            [
                str(idx),
                str(it.get("bracket", "")),
                str(it.get("cantidad", 0)),
                format_quantity(it.get("total_devengado", 0)),
                str(it.get("cantidad_artistas", 0)),
            ]
        )

    totals_row = [
        "",
        "TOTAL",
        str(meta.get("total_liquidaciones", 0)),
        format_quantity(meta.get("total_devengado_general", 0)),
        "",
    ]

    template.add_table(
        headers,
        data,
        numeric_columns=[2, 3, 4],
        totals_row=totals_row,
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
#  REPORTE 7: RESUMEN DE LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


def generar_pdf_liquidaciones(
    items: List[Dict[str, Any]],
    meta: Dict[str, Any],
    usuario_actual: str,
    aprobado_por_nombre: str = "",
    aprobado_por_cargo: str = "",
    notas: str = "",
) -> BytesIO:
    """Genera PDF con resumen de liquidaciones."""
    template = PDFTemplate(
        title="RESUMEN DE LIQUIDACIONES",
        landscape_mode=True,
    )
    template.set_company_header(name="Caguayo", nit="", address="", phone="")

    filters: Dict[str, str] = {}
    if meta.get("fecha_inicio"):
        filters["Fecha inicio"] = str(meta["fecha_inicio"])
    if meta.get("fecha_fin"):
        filters["Fecha fin"] = str(meta["fecha_fin"])
    if filters:
        template.set_filters(filters)

    # ── Primera tabla: Cabecera de liquidaciones ──────────────────────────
    headers = [
        "No.",
        "CÓDIGO",
        "CLIENTE",
        "FECHA",
        "MONEDA",
        "DEVENGADO",
        "TRIB. MT",
        "COM. BANC.",
        "GTO EMP.",
        "NETO PAGAR",
    ]
    data: List[List[str]] = []
    for idx, it in enumerate(items, start=1):
        data.append(
            [
                str(idx),
                str(it.get("codigo", "")),
                str(it.get("cliente_nombre", "")),
                str(it.get("fecha_emision", "")),
                str(it.get("moneda", "")),
                format_quantity(it.get("devengado", 0)),
                format_quantity(it.get("tributario_monto", 0)),
                format_quantity(it.get("comision_bancaria", 0)),
                format_quantity(it.get("gasto_empresa", 0)),
                format_quantity(it.get("neto_pagar", 0)),
            ]
        )

    totales = meta.get("totales", {})
    totals_row = [
        "",
        "TOTALES",
        "",
        "",
        "",
        format_quantity(totales.get("total_devengado", 0)),
        format_quantity(totales.get("total_tributario_monto", 0)),
        format_quantity(totales.get("total_comision_bancaria", 0)),
        format_quantity(totales.get("total_gasto_empresa", 0)),
        format_quantity(totales.get("total_neto_pagar", 0)),
    ]

    template.add_table(
        headers,
        data,
        code_columns=[0, 1],
        numeric_columns=[5, 6, 7, 8, 9],
        totals_row=totals_row,
    )

    # ── Segunda sección: productos por liquidación ────────────────────────
    if any(it.get("productos") for it in items):
        template.elements.append(
            Paragraph(
                "<b>PRODUCTOS ASOCIADOS</b>",
                template.styles["NoteHeader"],
            )
        )
        prod_headers = ["LIQ. CÓDIGO", "PRODUCTO", "CANTIDAD", "PRECIO"]
        prod_data: List[List[str]] = []
        for it in items:
            for prod in it.get("productos", []):
                prod_data.append(
                    [
                        str(it.get("codigo", "")),
                        str(prod.get("nombre", "")),
                        str(prod.get("cantidad", 0)),
                        format_quantity(prod.get("precio", 0)),
                    ]
                )
        if prod_data:
            template.add_table(
                prod_headers,
                prod_data,
                code_columns=[0, 1],
                numeric_columns=[2, 3],
            )

    if notas:
        template.add_notes_section(notas)

    template.add_signature_section(
        created_by=usuario_actual,
        approved_by=aprobado_por_nombre,
        approved_role=aprobado_por_cargo,
    )

    return template.build()
