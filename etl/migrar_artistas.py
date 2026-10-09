# -*- coding: utf-8 -*-
"""Fase A: `artista` -> `clientes` + `clientes_persona_natural` (§6, §7)."""
import db
import reglas
from config import (
    DUMP_MARIADB,
    TABLA_CLIENTES,
    TABLA_NATURAL,
    TAMANO_LOTE,
)
from deduplicacion import deduplicar, valores_de
from fuente import leer_artistas
from limpieza import nombre_completo, no_vacio
from log import Registro

ORIGEN = "artista"


def preparar(registro, ya_migrados=None):
    """Construye los payloads y registra descartes. No toca la base de datos.

    `ya_migrados` es un conjunto con los CI y los códigos que ya están en el
    destino, para no volver a proponer filas ya migradas. Sin esto, relanzar la
    fase entera intentaba insertar las 796 de nuevo.
    """
    ya_migrados = ya_migrados or set()
    filas = []
    for f in leer_artistas(DUMP_MARIADB):
        fila = dict(f)
        fila["_id"] = int(f["id_artista"])
        filas.append(fila)

    print("  Origen %s: %d filas" % (ORIGEN, len(filas)))

    validas = []
    for fila in filas:
        motivo, detalle = reglas.validar_ci(fila)
        if motivo:
            registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila), motivo, detalle)
            continue
        validas.append(fila)

    print("  CI inválidos descartados: %d" % (len(filas) - len(validas)))

    por_ci, desc_ci = deduplicar(validas, "ci")
    for fila, valor, _, _ in desc_ci:
        registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila), "CI duplicado", "ci=%s" % valor)

    por_codigo, desc_codigo = deduplicar(por_ci, "codigo_exp")
    for fila, valor, _, _ in desc_codigo:
        registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila),
                          "codigo_exp duplicado", "codigo_exp=%s" % valor)

    # El descarte de "ya migrado" va DESPUÉS de la deduplicación, no antes.
    # Si fuera antes, las filas que el legacy duplica se contarían dos veces y
    # el recuento de descartes cambiaría respecto a una migración en frío.
    por_codigo, ya_hechas = _separar_ya_migrados(registro, por_codigo, ya_migrados)
    if ya_hechas:
        print("  Ya migrados, no se vuelven a proponer: %d" % ya_hechas)

    pares = []
    for fila in por_codigo:
        padre, hijo, avisos = reglas._mapeo_artista(fila)
        for motivo, _, detalle in avisos:
            registro.warning(ORIGEN, fila["_id"], nombre_completo(fila), motivo, detalle)
        pares.append((padre, hijo))

    print("  Filas a migrar: %d" % len(pares))
    print("  Códigos ocupados (los usa la Fase B): %d" % len(valores_de(por_codigo, "codigo_exp")))

    return pares


def _separar_ya_migrados(registro, por_codigo, ya_migrados):
    """Quita de `por_codigo` lo que ya está en el destino.

    Se compara por las dos claves con las que la fila llega a `clientes`: el
    CI va a `nit` y a `carnet_identidad`, y `codigo_exp` va a `codigo`. Con una
    sola bastaría, pero las dos avisan de casos en los que el destino se cargó
    por una vía y no por la otra.
    """
    if not ya_migrados:
        return por_codigo, 0

    quedan = []
    saltadas = 0
    for fila in por_codigo:
        ci = no_vacio(fila.get("ci"))
        codigo = no_vacio(fila.get("codigo_exp"))
        if (ci and ci in ya_migrados) or (codigo and codigo in ya_migrados):
            registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila), "ya migrado",
                              "ci=%s codigo_exp=%s" % (ci, codigo))
            saltadas += 1
            continue
        quedan.append(fila)
    return quedan, saltadas


def ejecutar(conn, registro: Registro, pares):
    """Inserta por lotes. Devuelve el número de filas migradas."""
    migradas = 0
    for lote in db.lotes(pares, TAMANO_LOTE):
        try:
            db.insertar_padres_hijas(conn, TABLA_CLIENTES, TABLA_NATURAL, lote, TAMANO_LOTE)
            conn.commit()
            migradas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase A] lote revertido: %s" % exc)
    return migradas


def cargar_artistas(conn=None, registro=None, dry_run=True):
    registro = registro or Registro()

    # Lo que ya está en el destino, para no volver a proponerlo. Sin esto, una
    # segunda pasada pedía las 796 filas de nuevo: la fase no miraba la base.
    with db.conexion() as c:
        ya_migrados = db.clientes_ya_migrados(c)
    print("  Ya en destino: %d CI/código(s)" % len(ya_migrados))

    pares = preparar(registro, ya_migrados=ya_migrados)

    if dry_run:
        with db.conexion() as c:
            problemas = db.puerta_de_calidad(
                c,
                {TABLA_CLIENTES: [p[0] for p in pares],
                 TABLA_NATURAL: [p[1] for p in pares]},
                claves_omitidas={TABLA_NATURAL: {"id_cliente"}},
            )
        print("  Puerta de calidad: %d problema(s)" % len(problemas))
        for problema in problemas[:10]:
            print("    - %s | %s | %s" % problema)
        return 0, registro, pares

    with db.conexion() as c:
        db.crear_log(c)
        migradas = ejecutar(c, registro, pares)
    return migradas, registro, pares
