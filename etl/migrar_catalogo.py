# -*- coding: utf-8 -*-
"""Fase I: catálogo de tipo_contrato.

No se había migrado. En PostgreSQL había cinco tipos de contrato, sembrados a
mano y sin relación con el legacy: no coincidía ni uno solo con los del dump.

El legacy los guarda por id, pero el id no se transporta: el catálogo se une por
NOMBRE normalizado y el id lo asigna PostgreSQL. Así "Compra-Venta" y "compra
venta" se reconocen como el mismo tipo y no aparece un duplicado por el guion.

Lo que ya existe en PostgreSQL no se toca ni se renombra: se añade lo que
falta. `tipo_contrato` no lo usa ningún contrato todavía (la tabla `contrato`
está vacía).

`tipo_convenio` no entra aquí: `caguayo_comercial` no tiene esa tabla. En
PostgreSQL quedan los dos valores de la semilla, y sólo `COMPRA VENTA` está en
uso, con un convenio apuntando. Si algún día hace falta otro tipo, se añade a
mano; ver config.CATALOGOS.
"""
import unicodedata

import db
from config import (
    CATALOGOS,
    TAMANO_LOTE,
    TABLA_TIPO_CONTRATO,
)
from fuente import leer_catalogo
from limpieza import texto
from log import Registro

ORIGEN = "catalogo (tipo_contrato)"

LARGO_NOMBRE = 100

# Cómo se busca un catálogo ya cargado. La clave es la que devuelve
# db.nombres_catalogo: minúsculas y sin acentos, para que "Compra-Venta" y
# "compra venta" se reconozcan como el mismo tipo.
_TABLAS = {
    "tipo_contrato": TABLA_TIPO_CONTRATO,
}


def _clave(nombre):
    """Clave de comparación: minúsculas, sin acentos y sin puntuación.

    Se parece a la normalización de la Fase H pero no es la misma función: allí
    el nombre iba a ser el contenido de la fila, aquí es sólo la clave con la
    que se busca si la fila ya existe. El nombre que se inserta conserva su
    escritura original.
    """
    t = unicodedata.normalize("NFKD", texto(nombre) or "")
    t = t.encode("ascii", "ignore").decode()
    return " ".join(
        "".join(c if c.isalnum() or c.isspace() else " " for c in t.lower()).split()
    )


def _nombre_limpio(nombre):
    """Lo que se guarda en `nombre`: sin espacios de sobra y sin cortar en seco."""
    limpio = " ".join((texto(nombre) or "").split())
    return (limpio[:LARGO_NOMBRE]).strip()


def preparar(existentes, esquema):
    """Arma las filas a insertar. No escribe nada.

    `existentes` mapea cada tabla a su conjunto de claves ya presentes en
    PostgreSQL, para no volver a insertar lo que ya está.
    """
    a_insertar = {}

    for tabla, rutas in CATALOGOS:
        destino = _TABLAS[tabla]

        # Aquí no se perdona un dump que falte. Es el único origen, y si no está
        # la Fase I no tiene nada que migrar: que reviente con el nombre del
        # fichero, no que se salte en silencio.
        #
        # La clave se calcula con la MISMA función para lo que ya está en
        # PostgreSQL y para lo que viene del legacy. Si cada lado se
        # normalizara por su cuenta, un "Compra-Venta" ya cargado y el mismo
        # nombre del legacy caerían en claves distintas por el guion.
        ya = {_clave(n) for n in existentes.get(destino, set())}
        filas = leer_catalogo(rutas, tabla)
        # Sólo se rellenan las columnas que la tabla tenga de verdad.
        # `tipo_contrato` no tiene `activo` (sólo lo tiene
        # especialidades_artisticas), y agregar una columna nueva a un catálogo
        # que ya está en uso queda fuera de esta fase.
        columnas = [c for c in ("nombre", "descripcion", "activo")
                    if c in esquema.get(destino, ())]

        vistas = set()
        nuevas = []
        repetidas = 0
        for fila in filas:
            clave = _clave(fila["nombre"])
            if not clave:
                continue
            if clave in vistas:
                # El mismo concepto dos veces dentro del propio legacy.
                repetidas += 1
                continue
            vistas.add(clave)
            if clave in ya:
                continue
            nueva = {"_origen": fila["_origen"]}
            nueva["nombre"] = _nombre_limpio(fila["nombre"])
            if "descripcion" in columnas:
                nueva["descripcion"] = fila["descripcion"]
            if "activo" in columnas:
                nueva["activo"] = True
            nuevas.append(nueva)

        a_insertar[destino] = {"columnas": columnas, "filas": nuevas}
        print("  %-14s legacy: %2d fila(s) | ya en PostgreSQL: %2d | a insertar: %2d"
              % (tabla, len(filas), len(vistas) - len(nuevas), len(nuevas)))
        if repetidas:
            print("  %-14s repetidas dentro del legacy y descartadas: %d"
                  % ("", repetidas))
        for fila in nuevas:
            print("      + %-52s  (de %s)"
                  % (fila["nombre"][:52], fila["_origen"]))

    return a_insertar


def ejecutar(conn, a_insertar):
    """Inserta lo que falte. Devuelve {tabla: filas_insertadas}."""
    from psycopg2.extras import execute_values

    insertadas = {}
    for destino, bloque in a_insertar.items():
        nuevas = bloque["filas"]
        if not nuevas:
            insertadas[destino] = 0
            continue
        columnas = tuple(bloque["columnas"])
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO {t} ({c}) VALUES %s".format(
                    t=destino, c=", ".join(columnas)),
                [tuple(f[c] for c in columnas) for f in nuevas],
                page_size=TAMANO_LOTE,
            )
        conn.commit()
        insertadas[destino] = len(nuevas)
    return insertadas


def cargar_catalogo(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        existentes = {
            TABLA_TIPO_CONTRATO: db.nombres_catalogo(conn, TABLA_TIPO_CONTRATO),
        }
        esquema = {
            TABLA_TIPO_CONTRATO: db.columnas(conn, TABLA_TIPO_CONTRATO),
        }
    print("  Ya en PostgreSQL -> tipo_contrato: %d"
          % len(existentes[TABLA_TIPO_CONTRATO]))

    a_insertar = preparar(existentes, esquema)
    total_nuevas = sum(len(b["filas"]) for b in a_insertar.values())

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(
            conn,
            {t: b["filas"] for t, b in a_insertar.items()},
            no_vacias={t: ("nombre",) for t in a_insertar},
        )
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d fila(s) a insertar" % total_nuevas)
        return 0, registro, a_insertar

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, a_insertar)
        for destino, cuantas in insertadas.items():
            with db.conexion() as c2, c2.cursor() as cur:
                cur.execute("SELECT count(*) FROM {t}".format(t=destino))
                print("  %-16s insertadas: %2d | en la tabla ahora: %d"
                      % (destino, cuantas, cur.fetchone()[0]))

    print("  Total insertado: %d fila(s)" % sum(insertadas.values()))
    return sum(insertadas.values()), registro, a_insertar
