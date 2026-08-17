from typing import Optional

from sqlalchemy import text


async def generar_codigo_anio(db, tabla: str, campo_fecha: str, anio: int) -> str:
    """Genera código secuencial por año. Ej: 2026.001"""
    raw = text(
        f"SELECT COUNT(*) FROM {tabla} WHERE EXTRACT(YEAR FROM {campo_fecha}) = :anio"
    )
    result = await db.exec(raw, params={"anio": anio})
    count = result.one()[0]
    return f"{anio}.{(count + 1):03d}"


async def generar_codigo_con_padre(
    db, prefijo: str, tabla: str, campo_fecha: str, anio: int
) -> str:
    """Genera código con prefijo + secuencial. Ej: 2026.001.001"""
    raw = text(
        f"SELECT COUNT(*) FROM {tabla} WHERE EXTRACT(YEAR FROM {campo_fecha}) = :anio"
    )
    result = await db.exec(raw, params={"anio": anio})
    count = result.one()[0]
    return f"{prefijo}.{(count + 1):03d}"


def generar_codigo(denominacion: str, anio: int, entity_id: int) -> str:
    """Genera código con patrón {denominacion}.{año_2d}.{entity_id}. Ej: OFI.26.5"""
    prefijo = (denominacion or "").strip() or "CAG"
    return f"{prefijo}.{str(anio)[-2:]}.{entity_id}"


def _prefijo(denominacion: Optional[str]) -> str:
    return (denominacion or "").strip() or "CAG"


def generar_codigo_convenio(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código de convenio: {den}.{año_2d}.{secuencia:03d}. Ej: CAG.26.014"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia:03d}"


def generar_codigo_anexo(
    denominacion: str, anio: int, sec_conv: int, sec_anexo: int
) -> str:
    """Código de anexo: {den}.{año_2d}.{sec_conv:03d}.{sec_anexo:03d}.
    Ej: CAG.26.014.002"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{sec_conv:03d}.{sec_anexo:03d}"
    )


def generar_codigo_item_anexo(
    sec_conv: int, sec_anexo: int, codigo_producto: Optional[str] = None, id_producto: int = 0
) -> str:
    """Código de item_anexo: {sec_conv:03d}.{sec_anexo:03d}.{codigo_producto}.
    Si el producto no tiene código, usa id_producto en 3 dígitos.
    Ej: 001.002.01.02.0003"""
    codigo = (codigo_producto or "").strip() or f"{id_producto:03d}"
    return f"{sec_conv:03d}.{sec_anexo:03d}.{codigo}"


def generar_codigo_liquidacion(
    denominacion: str, anio: int, id_cliente: int, secuencia: int
) -> str:
    """Código de liquidación: {den}.{año_2d}.{id_cliente}.{secuencia:03d}.
    El secuencial es global por cliente.
    Ej: CAG.26.1.001"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{id_cliente}.{secuencia:03d}"
    )


def generar_codigo_factura(
    denominacion: str, anio: int, id_contrato: int, secuencia: int
) -> str:
    """Código de factura: {den}.{año_2d}.{id_contrato:03d}.{secuencia:03d}.
    El secuencial es propio de la factura dentro de su contrato.
    Ej: CAG.26.002.001"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{id_contrato:03d}.{secuencia:03d}"
    )


def generar_codigo_item_factura(
    id_contrato: int, sec_factura: int, codigo_producto: Optional[str] = None, id_producto: int = 0
) -> str:
    """Código de item_factura: {id_contrato:03d}.{sec_factura:03d}.{codigo_producto}.
    Si el producto no tiene código, usa id_producto en 3 dígitos.
    Ej: 002.001.PROD-002"""
    codigo = (codigo_producto or "").strip() or f"{id_producto:03d}"
    return f"{id_contrato:03d}.{sec_factura:03d}.{codigo}"


def generar_codigo_venta_efectivo(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código de venta en efectivo: {den}.{año_2d}.{secuencia:03d}.
    El secuencial es global.
    Ej: CAG.26.012"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia:03d}"


def generar_codigo_item_venta_efectivo(
    sec_venta: int, codigo_producto: Optional[str] = None, id_producto: int = 0
) -> str:
    """Código de item_venta_efectivo: {sec_venta:03d}.{codigo_producto}.
    Si el producto no tiene código, usa id_producto en 3 dígitos.
    Ej: 012.PROD-005"""
    codigo = (codigo_producto or "").strip() or f"{id_producto:03d}"
    return f"{sec_venta:03d}.{codigo}"


def generar_codigo_contrato(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código de contrato: {den}.{año_2d}.{secuencia:03d}.
    El secuencial es global.
    Ej: CAG.26.014"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia:03d}"


def generar_codigo_suplemento(
    denominacion: str,
    anio: int,
    id_contrato: int,
    secuencia: int,
) -> str:
    """Código de suplemento: {den}.{año_2d}.{id_contrato:03d}.{secuencia:03d}.
    El secuencial es propio del suplemento dentro de su contrato.
    Ej: CAG.26.008.001"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{id_contrato:03d}.{secuencia:03d}"
    )


def generar_codigo_correlativo(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código correlativo: {den}.{año_2d}.{secuencia:03d}.
    La serie es global (no reinicia por año). Ej: CAG.26.001"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia:03d}"


async def siguiente_secuencia(db, tabla: str, campo: str) -> int:
    """Devuelve el siguiente número de la serie correlativa del campo indicado
    (MAX del último segmento numérico + 1, global, sin filtrar por año o prefijo).
    Ej: con códigos CAG.26.012 y .26.3 devuelve 13"""
    raw = text(
        f"SELECT COALESCE(MAX(NULLIF(SPLIT_PART({campo}, '.', -1), '')::int), 0) "
        f"FROM {tabla} "
        f"WHERE {campo} IS NOT NULL AND {campo} <> ''"
    )
    result = await db.exec(raw)
    return result.one()[0] + 1
