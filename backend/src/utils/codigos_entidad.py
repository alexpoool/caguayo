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
