"""Exportación de la Ficha de Costo a Excel con openpyxl.

Replica la estructura y los colores del documento oficial
'FICHA DE PRECIO DE SERVICIOS': hojas Ficha, Materiales, Mano de obra,
Gastos, TARIFA y PRODUCTOS, con los textos, celdas, rellenos y fuentes
del documento base.
"""

import io
from datetime import date
from decimal import Decimal
from typing import List, Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from src.models import FichaCosto

# ── Fuentes del documento base ──
F_TNR = Font(name="Times New Roman", size=12)
F_TNR_B = Font(name="Times New Roman", size=12, bold=True)
F_AR = Font(name="Arial", size=10)
F_AR_B = Font(name="Arial", size=10, bold=True)
F_AR_RED = Font(name="Arial", size=10, color="FFFF0000")

# ── Rellenos (equivalentes a theme0 con tint del original) ──
_WHITE = PatternFill("solid", fgColor="FFFFFFFF")   # theme0 tint 0.00
_GRAY15 = PatternFill("solid", fgColor="FFD9D9D9")  # theme0 tint -0.15 (filas fuertes Ficha)
_GRAY05 = PatternFill("solid", fgColor="FFF2F2F2")  # theme0 tint -0.05 (datos Materiales/MO)
_GRAY35 = PatternFill("solid", fgColor="FFA6A6A6")  # theme0 tint -0.35 (TOTAL Mano de obra)

_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
_WRAP = Alignment(vertical="center", wrap_text=True)

_MONEY = "#,##0.00"
_MONEY4 = "#,##0.0000"
_COEF = "0.00000000000000"


def _put(ws, coord, value, font=F_AR, fill=None, fmt=None, align=None):
    c = ws[coord]
    if value is not None:
        c.value = float(value) if isinstance(value, Decimal) else value
    c.font = font
    if fill:
        c.fill = fill
    if fmt:
        c.number_format = fmt
    if align:
        c.alignment = align
    return c


def _putf(ws, coord, value, fmt=_MONEY):
    """Celda numérica con formato y fuente por hoja (se ajusta el font luego)."""
    c = ws[coord]
    if value is not None:
        c.value = float(value) if isinstance(value, Decimal) else value
    c.number_format = fmt
    return c


def _apply_font(ws, font, cells):
    for coord in cells:
        c = ws[coord]
        c.font = font


# Filas fuertes de la hoja Ficha (1, 5, 12, 14, 15)
_FUERTES = (8, 19, 30, 32, 33)


def _hoja_ficha(ws, f: FichaCosto, producto_nombre: str, elaborado, aprobado, fecha_aprob):
    ws.font = F_TNR  # fuente por defecto de la hoja
    for r in ("A1:A3", "B1:D3", "E1:F3", "B4:F4") + tuple(
        f"A{i}:C{i}" for i in range(8, 34)
    ):
        ws.merge_cells(r)

    # Encabezado
    _put(ws, "B1", "FICHA DE PRECIO DE SERVICIOS", font=F_TNR_B, fill=_WHITE, align=_CENTER)
    _put(ws, "E1", f"Ficha No.:{f.numero_ficha}", font=F_TNR, fill=_WHITE, align=_CENTER)

    _put(ws, "A4", " Producto o Servicio:", font=F_TNR_B, fill=_WHITE)
    ws["B4"] = producto_nombre
    _put(ws, "A5", "Código Prod. O Serv.", font=F_TNR_B, fill=_WHITE)
    _put(ws, "A6", f.producto.codigo if f.producto else "", font=F_TNR, fill=_WHITE)
    _put(ws, "B5", "UM", font=F_TNR_B, fill=_WHITE)
    _put(ws, "B6", "UNO", font=F_TNR, fill=_WHITE)
    _put(ws, "C5", "Nivel de Producción", font=F_TNR_B, fill=_WHITE)
    _putf(ws, "C6", f.nivel_produccion)
    ws["C6"].font = F_TNR

    # Fila 7: títulos de la tabla
    _put(ws, "A7", "Conceptos", font=F_TNR_B, fill=_WHITE)
    _put(ws, "D7", "Fila", font=F_TNR_B, fill=_WHITE, align=_CENTER)
    _put(ws, "E7", "Costo base", font=F_TNR_B, fill=_WHITE, align=_CENTER)
    _put(ws, "F7", "Costo Nuevo", font=F_TNR_B, fill=_WHITE, align=_CENTER)

    filas = [
        (8, "Gasto Material", 1, f.gasto_material),
        (9, "De ello: Insumos (Materias primas y materiales)", "1.1", f.total_insumos),
        (10, "            Combustible y Lubricantes", "1.2", f.gasto_combustible),
        (11, "            Energía", "1.3", f.gasto_energia),
        (12, "            Agua", "1.4", f.gasto_agua),
        (13, "Salario Directo o retribución directa", 2, f.salario_total),
        (14, "              Salario", "2.1", f.salario_directo),
        (15, "             Vacaciones", "2.1.1", f.vacaciones),
        (16, " Otros Gastos Directos", 3, f.otros_gastos_directos),
        (17, "Gastos asociados a la producción", 4, f.gastos_asociados),
        (18, "            De ellos Salario", "4.1", f.gastos_asociados),
        (19, "COSTO TOTAL ( 1+2+3+4)", 5, f.costo_total),
        (20, "Gastos Generales y de Administración", 6, f.gastos_generales),
        (21, "            De ellos Salario", "6.1", 0),
        (22, " Gastos de Distribución y Venta", 7, f.gastos_distribucion),
        (23, "            De ellos Salario", "7.1", 0),
        (24, " Gastos Financieros", 8, f.gastos_financieros),
        (25, " Gastos por financiamiento entregado por la OSDE", 9, f.gasto_osde),
        (26, "Tributos", 10, f.gastos_tributarios + f.impuesto_ventas),
        (27, "Gastos Tributarios (Contribución a la Seguridad Social e Impuesto sobre la Utilización de la Fuerza de Trabajo. Otros autorizados)", "10.1", f.gastos_tributarios),
        (28, "Otros pagos Tributarios", "10.2", f.impuesto_ventas),
        (29, "TOTAL DE GASTOS (suma de las filas 6, 7, 8, 9 y 10)", 11, f.total_gastos),
        (30, "TOTAL DE COSTOS Y GASTOS (5+11)", 12, f.total_costos_gastos),
        (31, "Utilidad 13", 13, f.utilidad),
        (32, "PRECIO O TARIFA 14", 14, f.precio_tarifa),
        (33, "PRECIO O TARIFA UNITARIO AJUSTADO 15", 15, f.precio_unitario_ajustado),
    ]
    for fila, texto, num, valor in filas:
        fuerte = fila in _FUERTES
        font = F_TNR_B if fuerte else F_TNR
        fill = _GRAY15 if fuerte else _WHITE
        _put(ws, f"A{fila}", texto, font=font, fill=fill)
        _put(ws, f"D{fila}", num, font=font, fill=fill, align=_CENTER)
        _putf(ws, f"F{fila}", valor)
        ws[f"F{fila}"].font = font
        ws[f"F{fila}"].fill = fill

    # Datos sobre precios de referencia + firmas
    _put(ws, "A34", "Datos sobre precios de referencia", font=F_TNR, fill=_WHITE)
    _put(ws, "D34", 16, font=F_TNR, fill=_WHITE, align=_CENTER)
    _put(ws, "A35", " Elaborado por:", font=F_TNR, fill=_WHITE)
    ws["B35"] = elaborado or None
    ws["B35"].font = F_TNR
    _put(ws, "D35", "Firma", font=F_TNR, fill=_WHITE)
    _put(ws, "F35", "Fecha", font=F_TNR, fill=_WHITE)
    _put(ws, "A36", " Aprobado por:", font=F_TNR, fill=_WHITE)
    ws["B36"] = aprobado or None
    ws["B36"].font = F_TNR
    _put(ws, "D36", "Firma", font=F_TNR, fill=_WHITE)
    if fecha_aprob:
        _put(ws, "F36", fecha_aprob, font=F_TNR, fill=_WHITE)
        ws["F36"].number_format = "DD/MM/YYYY"

    ws.column_dimensions["A"].width = 40
    for col in ("B", "C"):
        ws.column_dimensions[col].width = 14
    ws.column_dimensions["D"].width = 8
    ws.column_dimensions["E"].width = 14
    ws.column_dimensions["F"].width = 16


def _hoja_materiales(ws, f: FichaCosto, elaborado, aprobado):
    ws.font = F_AR
    ws.merge_cells("A1:G1")
    _put(ws, "A1", "DESAGREGACIÓN DE LOS INSUMOS FUNDAMENTALES", font=F_AR_B, align=_CENTER)
    ws["A2"] = "CÓDIGO DEL PRODUCTO:"
    ws["A2"].font = F_AR_B
    ws["B2"] = f.id_producto
    ws["B2"].font = F_AR
    ws["D2"] = "DESCRIPCIÓN DEL PROD.:"
    ws["D2"].font = F_AR_B
    ws["E2"] = f.producto.nombre if f.producto else ""
    ws["E2"].font = F_AR
    ws["A3"] = "UNIDAD DE MEDIDA:"
    ws["A3"].font = F_AR_B
    ws["B3"] = "UNO"
    ws["B3"].font = F_AR
    ws["D3"] = "CANTIDADES FÍSICAS:"
    ws["D3"].font = F_AR_B
    ws["E3"] = float(f.nivel_produccion)
    ws["E3"].font = F_AR

    # Fila 5: numeración; fila 6: títulos (PRODUCTOS y COSTO PROPUESTO en rojo)
    for col, v in zip("ABCDEFG", ["1", "2", "3", "4", "5", "6", "7 (5X6)"]):
        _put(ws, f"{col}5", v, font=F_AR_B, align=_CENTER)
    titulos6 = ["CÓDIGO", "PRODUCTOS", "UM", "COSTO\nBASE", "NORMA\nDE\nCONSUMO", "PRECIO\nUNITARIO", "COSTO PROPUESTO"]
    for col, v in zip("ABCDEFG", titulos6):
        font = F_AR_RED if col in ("B", "G") else F_AR
        _put(ws, f"{col}6", v, font=font, fill=_GRAY05, align=_CENTER)

    fila = 7
    for i in f.insumos:
        for col in "ABCDEFG":
            ws[f"{col}{fila}"].fill = _GRAY05
        ws[f"A{fila}"] = i.codigo or None
        ws[f"A{fila}"].font = F_AR
        ws[f"B{fila}"] = i.nombre
        ws[f"B{fila}"].font = F_AR
        ws[f"C{fila}"] = i.um
        ws[f"C{fila}"].font = F_AR
        ws[f"E{fila}"] = float(i.norma_consumo)
        ws[f"E{fila}"].font = F_AR
        ws[f"F{fila}"] = float(i.precio_unitario)
        ws[f"F{fila}"].font = F_AR
        ws[f"G{fila}"] = float(i.costo)
        ws[f"G{fila}"].font = F_AR
        ws[f"G{fila}"].number_format = _MONEY
        fila += 1

    ws[f"F{fila + 1}"] = 7.17
    ws[f"F{fila + 1}"].font = F_AR
    ws[f"B{fila + 2}"] = "TOTAL DE INSUMOS"
    ws[f"B{fila + 2}"].font = F_AR_B
    ws[f"G{fila + 2}"] = float(f.total_insumos)
    ws[f"G{fila + 2}"].font = F_AR_B
    ws[f"B{fila + 3}"] = "TOTAL"
    ws[f"B{fila + 3}"].font = F_AR_B
    ws[f"G{fila + 3}"] = float(f.total_insumos)
    ws[f"G{fila + 3}"].font = F_AR_B
    ws[f"A{fila + 5}"] = f"Elaborado por: {elaborado or ''}"
    ws[f"A{fila + 5}"].font = F_AR
    ws[f"A{fila + 7}"] = f"Aprobado por: {aprobado or ''}"
    ws[f"A{fila + 7}"].font = F_AR

    for col, wdt in zip("ABCDEFG", [12, 40, 8, 10, 10, 12, 14]):
        ws.column_dimensions[col].width = wdt


def _hoja_mano_obra(ws, f: FichaCosto, elaborado, aprobado):
    ws.font = F_AR
    ws.merge_cells("A1:I1")
    _put(ws, "A1", "GASTO DE SALARIO DE LOS OBREROS DE LA PRODUCCIÓN O LOS SERVICIOS",
         font=F_AR_B, fill=_WHITE, align=_CENTER)
    for rng in ("A2:D2", "E2:I2", "A3:B3", "C3:G3"):
        ws.merge_cells(rng)
    for coord in ("A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2", "I2"):
        ws[coord].fill = _GRAY05
    ws["A2"] = "Entidad:"
    ws["A2"].font = F_AR_B
    ws["A3"] = "Descripción del producto o servicio:"
    ws["A3"].font = F_AR_B
    ws["C3"] = f.producto.nombre if f.producto else ""
    ws["C3"].font = F_AR
    ws["H3"] = "Código:"
    ws["H3"].font = F_AR_B
    ws["I3"] = f.id_producto
    ws["I3"].font = F_AR
    for coord in ("A4", "H4"):
        ws[coord].font = F_AR_B
    ws["A4"] = "Cantidad de U.F. a producir:"
    ws["C4"] = float(f.nivel_produccion)
    ws["C4"].font = F_AR
    ws["H4"] = "UM:"
    ws["I4"] = "UNO"
    ws["I4"].font = F_AR

    titulos = [
        "Descripción\nde las operaciones", "Gasto\nde salario\ndel Costo\nBase",
        "Cantidad\nde trabajadores\npor operación\no actividad", "Categoría\nocupacional",
        "Grupo\nescala", "Salario/hora\npor categoría\ny grupo\n(pesos y\nctvos)",
        "Pagos\nadicionales\n(por hora)", "Norma\nde\ntiempo\n(en horas)",
        "Gasto\nde Salario del\ncosto propuesto\n(pesos y ctvos)",
    ]
    for col, v in zip("ABCDEFGHI", titulos):
        _put(ws, f"{col}5", v, font=F_AR, fill=_WHITE, align=_CENTER)
    for col, v in zip("ABCDEFGHI", ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)", "(9)"]):
        _put(ws, f"{col}6", v, font=F_AR, fill=_WHITE, align=_CENTER)

    fila = 7
    for mo in f.mano_obra:
        for col in "ABCDEFGHI":
            ws[f"{col}{fila}"].fill = _GRAY05
        ws[f"D{fila}"] = mo.categoria
        ws[f"D{fila}"].font = F_AR
        ws[f"F{fila}"] = float(mo.tarifa_horaria)
        ws[f"F{fila}"].font = F_AR
        ws[f"H{fila}"] = float(mo.norma_tiempo)
        ws[f"H{fila}"].font = F_AR
        ws[f"I{fila}"] = float(mo.gasto_salario)
        ws[f"I{fila}"].font = F_AR
        ws[f"I{fila}"].number_format = _MONEY4
        fila += 1

    # TOTAL: gris más marcado y negrita
    for col in "ABCDEFGHI":
        ws[f"{col}{fila}"].fill = _GRAY35
    ws[f"A{fila}"] = "TOTAL"
    ws[f"A{fila}"].font = F_AR_B
    ws[f"I{fila}"] = float(sum(m.gasto_salario for m in f.mano_obra))
    ws[f"I{fila}"].font = F_AR_B
    ws[f"I{fila}"].number_format = _MONEY4

    fila += 2
    ws[f"A{fila}"] = "Confeccionado por:"
    ws[f"A{fila}"].font = F_AR_B
    ws[f"D{fila}"] = "FIRMA:"
    ws[f"D{fila}"].font = F_AR_B
    fila += 1
    ws[f"A{fila}"] = f"Nombre y apellidos: {elaborado or ''}"
    ws[f"A{fila}"].font = F_AR
    fila += 1
    ws[f"A{fila}"] = "Aprobado por:"
    ws[f"A{fila}"].font = F_AR_B
    ws[f"D{fila}"] = "FIRMA:"
    ws[f"D{fila}"].font = F_AR_B
    fila += 1
    ws[f"A{fila}"] = f"Nombre y apellidos: {aprobado or ''}"
    ws[f"A{fila}"].font = F_AR

    for col, wdt in zip("ABCDEFGHI", [26, 10, 10, 24, 8, 12, 10, 10, 12]):
        ws.column_dimensions[col].width = wdt


def _hoja_gastos(ws, f: FichaCosto):
    ws.font = F_AR
    _put(ws, "A3", "Coeficientes aplicados a la ficha", font=F_AR_B, fill=_WHITE)
    pares = [
        ("Energía (% insumos)", f.pct_energia),
        ("Agua (% insumos)", f.pct_agua),
        ("Otros gastos directos (% insumos)", f.pct_otros_gastos_directos),
        ("Vacaciones (% salario)", f.pct_vacaciones),
        ("Coef. Gastos Asociados Prod.", f.coef_gastos_asociados),
        ("Coeficiente Gastos Generales Admon", f.coef_gastos_generales),
        ("Coeficiente Gastos Distribución y V", f.coef_gastos_distribucion),
        ("Coef. Gastos Financieros (%)", f.coef_gastos_financieros),
        ("Seguridad Social (%)", f.pct_seguridad_social),
        ("Impuesto Fuerza de Trabajo (%)", f.pct_fuerza_trabajo),
        ("Utilidad (%)", f.pct_utilidad),
        ("Impuesto s/ Ventas (%)", f.pct_impuesto_ventas),
    ]
    fila = 4
    for nombre, valor in pares:
        ws[f"A{fila}"] = nombre
        ws[f"A{fila}"].font = F_AR
        ws[f"B{fila}"] = float(valor)
        ws[f"B{fila}"].font = F_AR
        ws[f"B{fila}"].number_format = _COEF
        fila += 1
    ws.column_dimensions["A"].width = 40
    ws.column_dimensions["B"].width = 20


def _hoja_tarifa(ws, tarifas: list):
    ws.font = F_AR
    for col, v in zip("ABCD", ["CATEGORIA", "SALARIO MENSUAL", "HORAS MENSUALES", "TARIFA HORARIA"]):
        _put(ws, f"{col}1", v, font=F_AR_B, align=_CENTER)
    fila = 2
    for t in tarifas:
        ws[f"A{fila}"] = t.categoria
        ws[f"A{fila}"].font = F_AR
        ws[f"D{fila}"] = float(t.tarifa_horaria)
        ws[f"D{fila}"].font = F_AR
        ws[f"D{fila}"].number_format = _MONEY4
        fila += 1
    for col, wdt in zip("ABCD", [30, 16, 16, 14]):
        ws.column_dimensions[col].width = wdt


def _hoja_productos(ws, productos: list):
    ws.font = F_AR
    for col, v in zip("ABCD", ["Codigo", "Descripción", "UM", "Precio"]):
        _put(ws, f"{col}1", v, font=F_AR_B, align=_CENTER)
    fila = 2
    for p in productos:
        ws[f"A{fila}"] = p.codigo
        ws[f"A{fila}"].font = F_AR
        ws[f"B{fila}"] = p.nombre
        ws[f"B{fila}"].font = F_AR
        ws[f"C{fila}"] = "UNO"
        ws[f"C{fila}"].font = F_AR
        ws[f"D{fila}"] = float(p.precio_venta or 0)
        ws[f"D{fila}"].font = F_AR
        fila += 1
    for col, wdt in zip("ABCD", [12, 50, 8, 12]):
        ws.column_dimensions[col].width = wdt


def exportar_ficha_excel(
    ficha: FichaCosto,
    producto_nombre: str,
    tarifas: list,
    productos: list,
    elaborado_por: Optional[str] = None,
    aprobado_por: Optional[str] = None,
    fecha_aprobacion: Optional[date] = None,
) -> bytes:
    """Genera el libro completo y devuelve los bytes del .xlsx.

    Los datos de firmas pueden ser provistos en el momento de la exportación;
    si no, se usan los guardados en la ficha.
    """
    elaborado = elaborado_por if elaborado_por is not None else ficha.elaborado_por
    aprobado = aprobado_por if aprobado_por is not None else ficha.aprobado_por
    fecha_aprob = fecha_aprobacion if fecha_aprobacion is not None else ficha.fecha_aprobacion

    wb = Workbook()
    ws_ficha = wb.active
    ws_ficha.title = "Ficha"
    _hoja_ficha(ws_ficha, ficha, producto_nombre, elaborado, aprobado, fecha_aprob)
    _hoja_materiales(wb.create_sheet("Materiales"), ficha, elaborado, aprobado)
    _hoja_mano_obra(wb.create_sheet("Mano de obra"), ficha, elaborado, aprobado)
    _hoja_gastos(wb.create_sheet("Gastos"), ficha)
    _hoja_tarifa(wb.create_sheet("TARIFA"), tarifas)
    _hoja_productos(wb.create_sheet("PRODUCTOS"), productos)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
