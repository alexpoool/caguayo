# -*- coding: utf-8 -*-
"""Fase H: especialidades del artista y su enlace al cliente.

`artista.especialidad` se había descartado en la migración inicial, pero el
destino ya tenía la tabla `especialidades_artisticas` y ningún campo que la
relacionara con el artista. Aquí se recupera.

Los valores del legacy vienen sucios: 326 textos distintos donde hay menos
conceptos. Se normalizan quitando acentos, unificando mayúsculas y
convirtiendo la puntuación en espacios:

    'Artes Plásticas' · 'Artes plasticas' · 'Artes-Plásticas'  ->  artes plasticas
    'Ceramica' · 'Cerámica' · 'Céramica'                       ->  ceramica

No se separan los valores compuestos ("escultura y ceramica", "talla
madera"): muchos contienen "/" o " y " sin ser dos disciplinas, y partirlos
sería inventar especialidades que el artista no tiene. Cada artista queda
enlazado a una sola especialidad.
"""
import re
import unicodedata

import db
from config import (
    DUMP_MARIADB,
    TABLA_ESPECIALIDAD,
    TAMANO_LOTE,
)
from fuente import leer_artistas
from limpieza import no_vacio, texto
from log import Registro

ORIGEN = "artista (especialidad)"

LARGO_NOMBRE = 100

# Une etiquetas que son la misma especialidad escritas de otra forma.
#
# No es una heurística difusa: es una lista cerrada y revisada a mano. Cada
# entrada es el mismo concepto con otro plural, en femenino, o con un error de
# tipeo. Todas las 239 specialties migradas están en uso, así que dejar dos
# filas para "artes plasticas" y "artes plastica" parte el grupo en dos y
# ningún filtro por especialidad los devuelve juntos.
#
# Lo que NO se fusiona, y por qué:
#
#   ceramica / ceramista     学科 y quien la hace, no son la misma fila
#   escultura / escultor      ídem
#   pintura / pintor          ídem
#
# Ni los valores compuestos ("miscelanea madera mnarmol herreria"): son texto
# libre con errores, pero partirlos sería inventar especialidades que el
# artista no declara.
#
# La clave es el canónico y el valor el alias, ambos ya normalizados.
FUSIONES = {
    "artes plastica": "artes plasticas",
    "a plastica": "artes plasticas",
    "miscelaneas": "miscelanea",
    "miscelania": "miscelanea",
    "escultora": "escultor",
    "disenadora": "disenador",
    "grabados": "grabado",
    "metales y vidrios": "metales y vidrio",
}


def fusionar(nombre):
    """Devuelve el nombre canónico tras aplicar FUSIONES."""
    destino = FUSIONES.get(nombre)
    return destino if destino else nombre


def normalizar(valor):
    """Minúsculas, sin acentos y sin puntuación. Colapsa variantes reales."""
    t = unicodedata.normalize("NFKD", texto(valor) or "")
    t = t.encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def _nombre_legible(valor):
    """El texto tal como venía, para `descripcion`."""
    t = re.sub(r"\s+", " ", texto(valor) or "").strip()
    return t[:200] or None


DIGITOS_FASE_D = 10


def _artistas_migrados(por_ci, por_codigo, ficha):
    """id_cliente de la ficha, o None si no llegó a la base.

    El CI es la vía fiable. Sólo se recurre a `codigo` para los artistas de la
    Fase D, que son los únicos cuyo CI se rellenó con ceros a la izquierda: su
    CI de 10 dígitos pasó a ser de 11 y ya no coincide con el origen.

    El fallback no puede ser general. `codigo_exp` está repetido entre artistas
    distintos, así que usarlo para cualquier CI no encontrado enlazaría la
    especialidad de un artista descartado al cliente del artista homónimo que sí
    se migró.
    """
    ci = texto(ficha.get("ci"))
    if ci in por_ci:
        return por_ci[ci]

    digitos = re.sub(r"\D", "", ci or "")
    if len(digitos) != DIGITOS_FASE_D:
        return None

    codigo = texto(ficha.get("codigo_exp"))
    if codigo in por_codigo:
        return por_codigo[codigo]
    registro = texto(ficha.get("registro"))
    if registro in por_codigo:
        return por_codigo[registro]
    return None


def preparar(registro: Registro, por_ci, por_codigo,
             especialidades_cargadas=None, ya_enlazados=None):
    """Construye el catálogo y los enlaces. No escribe nada."""
    especialidades_cargadas = especialidades_cargadas or {}
    ya_enlazados = ya_enlazados or {}

    artistas = leer_artistas(DUMP_MARIADB)
    print("  Artistas en el origen: %d" % len(artistas))

    # Si una corrida anterior dejó filas con el nombre de un alias, el catálogo
    # quedaría con la especialidad partida en dos. No se reparan en silencio:
    # el operador tiene que resetear la Fase H y volver a cargar.
    obsoletas = sorted(set(FUSIONES) & set(especialidades_cargadas))
    if obsoletas:
        print("  AVISO: hay %d especialidad(es) cargadas con un nombre que ahora"
              " es alias: %s" % (len(obsoletas), ", ".join(obsoletas)))
        print("          Resetea la Fase H para que se fusionen al recargar.")

    catalogo = {}          # nombre normalizado -> dict de la especialidad
    enlaces = []           # (id_cliente, nombre normalizado)
    sin_encontrar = 0
    sin_especialidad = 0
    ya_hechos = 0
    fusionados = 0

    for ficha in artistas:
        if not texto(ficha.get("especialidad")):
            sin_especialidad += 1
            continue

        id_cliente = _artistas_migrados(por_ci, por_codigo, ficha)
        if id_cliente is None:
            sin_encontrar += 1
            continue

        original = normalizar(ficha["especialidad"])
        if not original:
            sin_especialidad += 1
            continue

        nombre = fusionar(original)
        if nombre != original:
            fusionados += 1

        if nombre not in catalogo:
            catalogo[nombre] = {
                "nombre": nombre[:LARGO_NOMBRE],
                "descripcion": None,
                "categoria": None,
                "activo": True,
                "_variantes": set(),
            }
        catalogo[nombre]["_variantes"].add(texto(ficha["especialidad"]))

        if id_cliente in ya_enlazados:
            ya_hechos += 1
            continue
        enlaces.append((id_cliente, nombre, int(ficha["id_artista"])))

    # Varias fichas del legacy pueden acabar en el mismo cliente (el mismo
    # artista repetido). Como cada cliente guarda una sola especialidad, se
    # conserva la de la ficha de menor id, igual que en el resto de la
    # migración, y se avisa cuando las especialidades no coinciden.
    por_cliente = {}
    conflictos = 0
    for id_cliente, nombre, id_origen in enlaces:
        actual = por_cliente.get(id_cliente)
        if actual is None:
            por_cliente[id_cliente] = (nombre, id_origen)
        elif nombre != actual[0]:
            conflictos += 1
            gana, gana_id = (actual if actual[1] <= id_origen else (nombre, id_origen))
            por_cliente[id_cliente] = (gana, gana_id)
            registro.warning(
                ORIGEN, id_origen, None,
                "especialidades contradictorias para el mismo cliente",
                "id_cliente=%s: %r (ficha %s) frente a %r (ficha %s); "
                "se conserva %r" % (id_cliente, actual[0], actual[1],
                                    nombre, id_origen, gana))
        elif id_origen < actual[1]:
            por_cliente[id_cliente] = (nombre, id_origen)

    # El nombre del catálogo va normalizado (minúsculas, sin acentos), así que
    # la escritura original del legacy se guarda en la descripción: es la única
    # parte del dato que conserva cómo lo escribió el artista.
    for esp in catalogo.values():
        propias = [v for v in esp["_variantes"]
                   if normalizar(v) == esp["nombre"]]
        esp["descripcion"] = _nombre_legible(
            propias[0] if propias else sorted(esp["_variantes"])[0])

    enlaces = [(id_cliente, nombre)
               for id_cliente, (nombre, _id_origen) in sorted(por_cliente.items())]

    nuevas = [
        {k: v for k, v in esp.items() if k != "_variantes"}
        for esp in catalogo.values()
        if esp["nombre"] not in especialidades_cargadas
    ]

    print("  Catálogo: %d especialidades en total" % len(catalogo))
    print("  Nuevas a insertar:  %d" % len(nuevas))
    print("  Etiquetas fusionadas: %d (%d artistas)"
          % (len(FUSIONES), fusionados))
    print("  Artistas a enlazar: %d" % len(enlaces))
    print("  Ya enlazados:       %d" % ya_hechos)
    print("  Sin especialidad:   %d" % sin_especialidad)
    print("  Fichas colapsadas en un mismo cliente: %d" % conflictos)
    if sin_encontrar:
        print("  Artistas del origen que no están en la base: %d" % sin_encontrar)

    variantes = sum(len(esp["_variantes"]) - 1 for esp in catalogo.values())
    print("  Variantes fundidas por la normalización: %d" % variantes)

    return nuevas, enlaces, catalogo


def ejecutar(conn, registro: Registro, nuevas, enlaces, catalogo):
    """Inserta el catálogo y enlaza a los artistas. Devuelve (catálogo, enlaces)."""
    from psycopg2.extras import execute_values

    mapeo = {}
    if nuevas:
        columnas = ("nombre", "descripcion", "categoria", "activo")
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO {t} ({c}) VALUES %s".format(
                    t=TABLA_ESPECIALIDAD, c=", ".join(columnas)),
                [tuple(esp[c] for c in columnas) for esp in nuevas],
                page_size=TAMANO_LOTE,
            )
        conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT id_especialidad, lower(nombre) FROM {t}".format(
            t=TABLA_ESPECIALIDAD))
        mapeo.update({f[1]: f[0] for f in cur.fetchall()})

    actualizados = 0
    for lote in db.lotes(enlaces, TAMANO_LOTE):
        filas = [(mapeo.get(nombre), id_cliente)
                 for id_cliente, nombre in lote]
        filas = [f for f in filas if f[0] is not None]
        if not filas:
            continue
        try:
            with conn.cursor() as cur:
                cur.executemany(
                    "UPDATE clientes_persona_natural SET id_especialidad = %s"
                    " WHERE id_cliente = %s",
                    filas,
                )
            conn.commit()
            actualizados += len(filas)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase H] lote revertido: %s" % exc)

    return len(mapeo), actualizados


def cargar_especialidades(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        por_ci, por_codigo = db.artistas_migrados(conn)
        cargadas = db.especialidades_existentes(conn)
        enlazados = db.ids_especialidad_de_artistas(conn)
    print("  Naturales migrados: %d | especialidades ya cargadas: %d | ya enlazados: %d"
          % (len(por_ci), len(cargadas), len(enlazados)))

    nuevas, enlaces, catalogo = preparar(
        registro, por_ci, por_codigo, cargadas, enlazados)

    if dry_run:
        with db.conexion() as conn:
            problemas = db.puerta_de_calidad(
                conn, {TABLA_ESPECIALIDAD: nuevas},
                no_vacias={TABLA_ESPECIALIDAD: ("nombre",)},
            )
        print("  Puerta de calidad: %d problema(s)" % len(problemas))
        for problema in problemas[:10]:
            print("    - %s | %s | %s" % problema)
        return 0, registro, nuevas, enlaces

    with db.conexion() as conn:
        db.crear_log(conn)
        total, actualizados = ejecutar(conn, registro, nuevas, enlaces, catalogo)

    print("  Especialidades en el catálogo: %d" % total)
    print("  Artistas enlazados:            %d" % actualizados)
    return actualizados, registro, nuevas, enlaces