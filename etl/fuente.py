# -*- coding: utf-8 -*-
"""Lectura del dump MariaDB.

El dump concentra cada tabla en un único `INSERT ... VALUES` con tuplas
separadas por comas. El cuerpo contiene comillas dobles escapadas con
backslash dentro de literales de texto (\\"La Caridad\\"), comillas simples
duplicadas y valores de hasta 24 KB, por lo que no basta con un `split(',')`.

No se interpreta SQL: sólo se extraen las filas de las tablas de interés.
"""
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

_PATRON = re.compile(
    r"INSERT\s+INTO\s+`{tabla}`\s*\((.*?)\)\s*VALUES(.*?);",
    re.S | re.I,
)


def _patron(tabla):
    return re.compile(
        r"INSERT\s+INTO\s+`%s`\s*\((.*?)\)\s*VALUES(.*?);" % tabla, re.S | re.I
    )


def _tokenizar_valores(cuerpo: str):
    """Divide el cuerpo VALUES en tuplas, respetando literales y escapes."""
    tuplas = []
    campos = []
    campo = ""
    profundidad = 0
    en_literal = None
    i = 0
    largo = len(cuerpo)

    while i < largo:
        c = cuerpo[i]

        if en_literal is not None:
            if c == "\\" and i + 1 < largo:
                campo += cuerpo[i + 1]
                i += 2
                continue
            if c == en_literal:
                if i + 1 < largo and cuerpo[i + 1] == en_literal:
                    campo += en_literal
                    i += 2
                    continue
                en_literal = None
                i += 1
                continue
            campo += c
            i += 1
            continue

        if c in "'\"":
            en_literal = c
            i += 1
            continue
        if c == "(":
            profundidad += 1
            if profundidad == 1:
                campo = ""
            i += 1
            continue
        if c == ")":
            profundidad -= 1
            if profundidad == 0:
                campos.append(campo.strip())
                tuplas.append(campos)
                campos = []
                campo = ""
                i += 1
                continue
            campo += c
            i += 1
            continue
        if c == "," and profundidad == 1:
            campos.append(campo.strip())
            campo = ""
            i += 1
            continue
        if c == "," and profundidad == 0:
            i += 1
            continue
        if profundidad > 0:
            campo += c
        i += 1

    return tuplas


def _normalizar(valor: str):
    v = valor.strip()
    if v.upper() == "NULL":
        return None
    if len(v) >= 2 and v[0] == "'" and v[-1] == "'":
        v = v[1:-1]
    return v.strip()


# --- Caché del dump -------------------------------------------------------
#
# Cada fase releía el fichero entero. Con diez fases en cadena eso son veinte
# lecturas de 4,6 MB y unos segundos de más. La caché las deja en una.
#
# Lo que aporta de verdad no es la velocidad (ahorra uno o dos segundos) sino la
# coherencia: antes, si el dump se tocaba a mitad de cadena, cada fase leía una
# versión distinta del mismo fichero. Ahora todas leen la misma.
#
# La clave lleva mtime y tamaño a propósito. Un dump editado, aunque se quite y
# vuelva a poner, invalida la caché solo. Es el peor fallo posible de una caché
# de este tipo: dar por buenos datos de un fichero que ya no es el mismo.
_CACHE_TEXTO: Dict[str, str] = {}
_CACHE_TABLA: Dict[Tuple[str, str], Tuple[List[str], List[Dict[str, Any]]]] = {}


def _clave_fichero(ruta_dump) -> str:
    p = Path(ruta_dump)
    st = p.stat()
    return "%s|%d|%d" % (p.resolve(), st.st_mtime_ns, st.st_size)


def _texto_dump(ruta_dump) -> str:
    clave = _clave_fichero(ruta_dump)
    texto = _CACHE_TEXTO.get(clave)
    if texto is None:
        texto = Path(ruta_dump).read_text(encoding="utf-8", errors="replace")
        _CACHE_TEXTO[clave] = texto
    return texto


def limpiar_cache() -> None:
    """Vacía la caché. Sólo hace falta si alguien cambia el dump con el
    intérprete ya abierto; en una ejecución normal no se usa."""
    _CACHE_TEXTO.clear()
    _CACHE_TABLA.clear()


def leer_tabla(ruta_dump, tabla: str):
    """Devuelve (columnas, filas) de una tabla del dump.

    Las filas mal formadas (número de campos distinto) se descartan y se
    informa por stderr para que no pasen inadvertidas.

    Siempre devuelve copias. Los valores de un `INSERT` de SQL son `str` o
    `None`, así que copia superficial basta, y todas las fases que mutan una
    fila ya copian por su cuenta. La copia es para que el próximo que escriba
    código sin saber de esta caché no la corrompa en silencio.
    """
    ruta = _clave_fichero(ruta_dump)
    clave = (ruta, tabla.lower())
    if clave in _CACHE_TABLA:
        columnas, filas = _CACHE_TABLA[clave]
        return columnas, [dict(f) for f in filas]

    texto = _texto_dump(ruta_dump)
    columnas = None
    filas = []
    descartadas = 0

    for coincidencia in _patron(tabla).finditer(texto):
        if columnas is None:
            columnas = [c.strip().strip("`") for c in coincidencia.group(1).split(",")]
        for tupla in _tokenizar_valores(coincidencia.group(2)):
            if len(tupla) != len(columnas):
                descartadas += 1
                continue
            filas.append({c: _normalizar(v) for c, v in zip(columnas, tupla)})

    if columnas is None:
        raise KeyError(f"La tabla '{tabla}' no aparece en {ruta_dump}")

    if descartadas:
        print(f"  [fuente] {tabla}: {descartadas} fila(s) descartadas por nº de campos")

    _CACHE_TABLA[clave] = (columnas, filas)
    return columnas, [dict(f) for f in filas]


def leer_artistas(ruta_dump):
    _, filas = leer_tabla(ruta_dump, "artista")
    return sorted(filas, key=lambda f: int(f["id_artista"]))


def leer_clientes(ruta_dump):
    _, filas = leer_tabla(ruta_dump, "cliente")
    return sorted(filas, key=lambda f: int(f["id_cliente"]))


def leer_catalogo(rutas, tabla):
    """Lee un catálogo de una o varias bases legacy y lo devuelve unificado.

    Los catálogos no están todos en la misma base: `caguayo_comercial` no tiene
    ninguna fila de tipo_convenio y `caguayo` es la que aporta los tipos de
    contrato que le faltan a la otra.

    Cada fila se anota con la base de la que salió en la clave `_origen`, y se
    descartan las que no traen nombre: en el legacy hay ids sueltos sin texto,
    que no aportan nada a un catálogo.

    No se deduplica aquí a propósito. Que dos filas signifiquen lo mismo depende
    del catálogo, y la comparación tiene que hacerse contra lo que ya hay en
    PostgreSQL, no entre las bases. Lo hace migrar_catalogo.py.
    """
    filas = []
    vistas = 0
    for ruta in rutas:
        _, propias = leer_tabla(ruta, tabla)
        vistas += len(propias)
        for fila in propias:
            nombre = (fila.get("nombre_tc") or "").strip()
            if not nombre:
                continue
            filas.append({
                "_origen": Path(ruta).name,
                "nombre": nombre,
                "descripcion": (fila.get("descripcion_tc") or "").strip() or None,
            })
    if not filas:
        raise KeyError(
            "La tabla '%s' no tiene filas con nombre en %s"
            % (tabla, [Path(r).name for r in rutas])
        )
    print("  [fuente] %s: %d fila(s) leída(s)" % (tabla, vistas))
    return filas
