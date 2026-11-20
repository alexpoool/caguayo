import re
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
    prefijo = (denominacion or "").strip() or "FT"
    return f"{prefijo}.{str(anio)[-2:]}.{entity_id}"


def _prefijo(denominacion: Optional[str]) -> str:
    return (denominacion or "").strip() or "FT"


def generar_codigo_convenio(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código de convenio: {den}.{año_2d}.{secuencia:03d}. Ej: FT.26.014"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia:03d}"


def generar_codigo_anexo(
    denominacion: str, anio: int, sec_conv: int, sec_anexo: int
) -> str:
    """Código de anexo: {den}.{año_2d}.{sec_conv:03d}.{sec_anexo:03d}.
    Ej: FT.26.014.002"""
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
    El secuencial es global por año y continúa la serie del legacy.
    Ej: FT.26.1.116"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{id_cliente}.{secuencia:03d}"
    )


def generar_numero_liquidacion_persona(
    denominacion: Optional[str], anio: int, secuencia: int
) -> str:
    """Número de liquidación de proyecto: {den}.{año_2d}.{secuencia}.
    Sin padding, igual que los números del legacy. Ej: FT.26.116"""
    return f"{_prefijo(denominacion)}.{str(anio)[-2:]}.{secuencia}"


def generar_codigo_factura(
    denominacion: str,
    anio: int,
    id_contrato: int,
    secuencia: int,
    tipo: str = "FACTURA",
) -> str:
    """Código de factura: {den}.{año_2d}.{id_contrato:03d}.{secuencia:03d}.

    Las pre-facturas usan la serie PFT; las facturas, el prefijo de la
    denominación (FT). El secuencial es propio del tipo dentro del contrato.
    Ej: FT.26.002.001 / PFT.26.002.001
    """
    if (tipo or "").strip().upper() == "PREFACTURA":
        prefijo = "PFT"
    else:
        prefijo = _prefijo(denominacion)
    return (
        f"{prefijo}.{str(anio)[-2:]}."
        f"{id_contrato:03d}.{secuencia:03d}"
    )


def generar_codigo_oferta_tienda(
    anio: int, id_contrato: int, secuencia: int
) -> str:
    """Código de oferta de tienda: OFT.{año_2d}.{id_contrato:03d}.{secuencia:03d}.
    El secuencial es propio de la oferta dentro de su contrato.
    Ej: OFT.26.002.001"""
    return (
        f"OFT.{str(anio)[-2:]}."
        f"{id_contrato:03d}.{secuencia:03d}"
    )


def generar_codigo_item_oferta_tienda(
    id_contrato: int, sec_oferta: int, codigo_producto: Optional[str] = None, id_producto: int = 0
) -> str:
    """Código de item_oferta_tienda: {id_contrato:03d}.{sec_oferta:03d}.{codigo_producto}.
    Si el producto no tiene código, usa id_producto en 3 dígitos.
    Ej: 002.001.PROD-002"""
    codigo = (codigo_producto or "").strip() or f"{id_producto:03d}"
    return f"{id_contrato:03d}.{sec_oferta:03d}.{codigo}"


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
    Ej: FT.26.012"""
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
    """Código de contrato: {den}.{año}.{secuencia:03d}.
    El secuencial es por año.
    Ej: FT.2026.046"""
    return f"{_prefijo(denominacion)}.{anio}.{secuencia:03d}"


def generar_codigo_suplemento(
    denominacion: str,
    anio: int,
    id_contrato: int,
    secuencia: int,
) -> str:
    """Código de suplemento: {den}.{año_2d}.{id_contrato:03d}.{secuencia:03d}.
    El secuencial es propio del suplemento dentro de su contrato.
    Ej: FT.26.008.001"""
    return (
        f"{_prefijo(denominacion)}.{str(anio)[-2:]}."
        f"{id_contrato:03d}.{secuencia:03d}"
    )


def generar_codigo_correlativo(
    denominacion: str, anio: int, secuencia: int
) -> str:
    """Código correlativo: {den}.{año}.{secuencia:03d}.
    El secuencial es por año. Ej: FT.2026.001"""
    return f"{_prefijo(denominacion)}.{anio}.{secuencia:03d}"


async def siguiente_secuencia(db, tabla: str, campo: str) -> int:
    """Devuelve el siguiente número de la serie correlativa del campo indicado
    (MAX del último segmento numérico + 1, global, sin filtrar por año o prefijo).
    Ej: con códigos FT.26.012 y .26.3 devuelve 13"""
    raw = text(
        f"SELECT COALESCE(MAX(seg::int), 0) "
        f"FROM ("
        f"SELECT NULLIF(SPLIT_PART({campo}, '.', -1), '') AS seg "
        f"FROM {tabla} "
        f"WHERE {campo} IS NOT NULL AND {campo} <> ''"
        f") s WHERE seg ~ '^[0-9]+$'"
    )
    result = await db.exec(raw)
    return result.one()[0] + 1


async def siguiente_secuencia_anio(
    db, tabla: str, campo: str, anio: int
) -> int:
    """Siguiente número de la serie de un año concreto.

    Acepta el prefijo de copia por moneda (`1.`/`2.`), un segmento de mes
    opcional (`.MM`) y el sufijo `-id` de los códigos legacy duplicados.
    Ignora los códigos de otros años y los que no son numéricos.
    Ej: con FT.2026.045, 1.FT.2026.045 y FT.2026.045-123 devuelve 46.
    """
    patron = (
        rf"^(?:[0-9]+\.)?[^.]+\.{anio}"
        rf"(?:\.[0-9]{{2}})?\.([0-9]+)(?:-[0-9]+)?$"
    )
    raw = text(
        f"SELECT COALESCE(MAX((regexp_match({campo}, :patron))[1]::int), 0) + 1 "
        f"FROM {tabla} "
        f"WHERE {campo} ~ :patron"
    )
    result = await db.exec(raw, params={"patron": patron})
    return result.one()[0]


#: `LEG-<numero_liquidacion>-<id_legacy>`: el número visible es el primero.
#: El ETL sólo omite el número cuando el legacy viene vacío y deja `LEG-<id>`;
#: ese caso no aporta un número visible y no debe contar para la serie.
_RE_LEG = re.compile(r"^LEG-(-?\d+)-(-?\d+)$")
#: Sufijo `-id` que el ETL pone a los números legacy repetidos.
_RE_SUFIJO_ID = re.compile(r"-\d+$")


def secuencia_de_codigo(codigo: Optional[str]) -> Optional[int]:
    """Número visible de una liquidación, sin importar el formato.

    Acepta los códigos que deja el ETL y los que genera la aplicación:

      · `LEG-115-5662`      -> 115
      · `LEG--238-1043`     -> None (negativo)
      · `LEG-5662`          -> None (el legacy no traía número; 5662 es su id)
      · `FT.26.115`         -> 115
      · `FT.26.115-1043`    -> 115 (el `-1043` es el id del legacy)
      · `CAG.26.5.115`      -> 115
      · `1.CAG.26.5.115`    -> 115 (copia por moneda)

    Devuelve None cuando no hay un número positivo reconocible.
    """
    if not codigo:
        return None

    valor = codigo.strip()
    if not valor:
        return None

    coincidencia = _RE_LEG.match(valor)
    if coincidencia:
        numero = int(coincidencia.group(1))
        return numero if numero > 0 else None

    ultimo = valor.rsplit(".", 1)[-1].strip()
    ultimo = _RE_SUFIJO_ID.sub("", ultimo)
    if not ultimo.isdigit():
        return None

    numero = int(ultimo)
    return numero if numero > 0 else None


async def bloquear_secuencia_liquidacion(
    db, tabla: str, campo: str, anio: int
) -> None:
    """Toma el lock de transacción de la serie (tabla, campo, año).

    La app y los scripts de mantenimiento deben usar la misma clave para que
    una renumeración no se cruce con un alta. El lock se libera al hacer commit.
    """
    clave = f"liquidacion:{tabla}:{campo}:{anio}"
    await db.exec(
        text("SELECT pg_advisory_xact_lock(hashtext(:clave))"),
        params={"clave": clave},
    )


async def siguiente_secuencia_liquidacion(
    db, tabla: str, campo: str, anio: int
) -> int:
    """Siguiente número visible de las liquidaciones de un año.

    Continúa la serie que dejó la migración: con `LEG-115-5662` devuelve 116.
    No reinicia por cliente ni usa la PK; es global por año, como el
    `numero_liquidacion` del legacy.

    Toma un lock de transacción por (tabla, año) para que dos altas
    simultáneas no lean la misma secuencia. El lock se libera al hacer commit,
    así que la lectura y el INSERT deben ocurrir en la misma transacción.
    """
    for identificador in (tabla, campo):
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", identificador):
            raise ValueError("identificador SQL inválido: %r" % identificador)

    await bloquear_secuencia_liquidacion(db, tabla, campo, anio)

    raw = text(
        f"SELECT {campo} FROM {tabla} "
        "WHERE EXTRACT(YEAR FROM fecha_emision) = :anio "
        f"AND {campo} IS NOT NULL AND {campo} <> ''"
    )
    result = await db.exec(raw, params={"anio": anio})

    secuencias = [
        secuencia
        for (codigo,) in result.all()
        if (secuencia := secuencia_de_codigo(codigo)) is not None
    ]
    return max(secuencias, default=0) + 1
