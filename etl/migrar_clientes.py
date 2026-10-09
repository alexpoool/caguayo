# -*- coding: utf-8 -*-
"""Fase B: `cliente` -> `clientes` + `clientes_persona_juridica` (§8, §9).

La deduplicación se hace contra los códigos que la Fase A ya reservó en
`clientes`: `clientes.codigo` es UNIQUE de forma global y tanto `codigo_exp`
como `codigo` escriben en esa misma columna.
"""
import db
import reglas
from config import (
    DUMP_MARIADB,
    TABLA_CLIENTES,
    TABLA_JURIDICA,
    TAMANO_LOTE,
)
from deduplicacion import deduplicar
from fuente import leer_clientes
from limpieza import no_vacio, texto
from log import Registro

ORIGEN_CLIENTE = "cliente"


def separar_tcp(filas):
    """Regla §11. En el conjunto actual no devuelve ninguna fila."""
    tcp = [f for f in filas if reglas._es_tcp(f)]
    resto = [f for f in filas if not reglas._es_tcp(f)]
    return resto, tcp


def preparar(registro: Registro, codigos_ya_migrados=(), nits_ya_migrados=(),
             ya_en_destino=()):
    """Construye los payloads de clientes jurídicos. No toca la base de datos."""
    filas = []
    for f in leer_clientes(DUMP_MARIADB):
        fila = dict(f)
        fila["_id"] = int(f["id_cliente"])
        filas.append(fila)

    print("  Origen %s: %d filas" % (ORIGEN_CLIENTE, len(filas)))

    sin_codigo = [f for f in filas if not no_vacio(f.get("codigo"))]
    for fila in sin_codigo:
        registro.descarte(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila),
                          "codigo vacio sin fallback", None)
    filas = [f for f in filas if no_vacio(f.get("codigo"))]

    sin_nit = [f for f in filas if not (no_vacio(f.get("nit")) or no_vacio(f.get("codigo")))]
    for fila in sin_nit:
        registro.descarte(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila),
                          "nit vacio sin fallback", None)
    filas = [f for f in filas if no_vacio(f.get("nit")) or no_vacio(f.get("codigo"))]

    filas, tcp = separar_tcp(filas)
    if tcp:
        print("  Detectados como TCP/mipyme: %d (se migran en la Fase C)" % len(tcp))

    filas_nit = [_con_nit(f) for f in filas]

    por_codigo, desc_codigo = deduplicar(
        filas_nit, "codigo", ya_usados=set(codigos_ya_migrados))
    for fila, valor, _, motivo in desc_codigo:
        detalle = "codigo=%s" % valor
        if motivo.startswith("colision"):
            detalle += " (colision con codigo_exp de un artista ya migrado)"
        registro.descarte(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila),
                          "codigo duplicado", detalle)

    por_nit, desc_nit = deduplicar(
        por_codigo, "nit", ya_usados=set(nits_ya_migrados))
    for fila, valor, _, _ in desc_nit:
        registro.descarte(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila),
                          "nit duplicado", "nit=%s" % valor)

    # Como en la Fase A, el descarte de "ya migrado" va después de la
    # deduplicación para no alterar el recuento de duplicados.
    por_nit, ya_hechos = _separar_ya_migrados(registro, por_nit, ya_en_destino)
    if ya_hechos:
        print("  Ya migrados, no se vuelven a proponer: %d" % ya_hechos)

    pares = []
    for fila in por_nit:
        padre, hijo, avisos = reglas._mapeo_cliente(fila)
        for motivo, _, detalle in avisos:
            registro.warning(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila), motivo, detalle)
        pares.append((padre, hijo))

    print("  Filas a migrar: %d" % len(pares))
    return pares, tcp


def _separar_ya_migrados(registro, por_nit, ya_en_destino):
    """Quita lo que ya está en el destino.

    Se compara por `codigo` y por `nit`, que son las dos columnas con las que la
    fila llega a `clientes` y las dos son UNIQUE.
    """
    if not ya_en_destino:
        return por_nit, 0
    quedan = []
    saltadas = 0
    for fila in por_nit:
        codigo = no_vacio(fila.get("codigo"))
        nit = no_vacio(fila.get("nit"))
        if (codigo and codigo in ya_en_destino) or (nit and nit in ya_en_destino):
            registro.descarte(ORIGEN_CLIENTE, fila["_id"], nombre_cliente(fila),
                              "ya migrado", "codigo=%s nit=%s" % (codigo, nit))
            saltadas += 1
            continue
        quedan.append(fila)
    return quedan, saltadas


def _con_nit(fila):
    """Añade el NIT final aplicando el fallback de §8."""
    copia = dict(fila)
    copia["nit"] = no_vacio(fila.get("nit")) or no_vacio(fila.get("codigo"))
    return copia


def nombre_cliente(fila):
    return (texto(fila.get("nombre_empresa")) or None)


def ejecutar(conn, registro: Registro, pares):
    migradas = 0
    for lote in db.lotes(pares, TAMANO_LOTE):
        try:
            db.insertar_padres_hijas(conn, TABLA_CLIENTES, TABLA_JURIDICA, lote, TAMANO_LOTE)
            conn.commit()
            migradas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN_CLIENTE, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase B] lote revertido: %s" % exc)
    return migradas


def cargar_clientes(conn=None, registro=None, dry_run=True,
                    codigos_ya_migrados=(), nits_ya_migrados=()):
    registro = registro or Registro()

    # Lo que ya está en el destino, para que una segunda pasada no vuelva a
    # proponer las mismas 404 filas.
    with db.conexion() as c:
        ya_en_destino = db.clientes_ya_migrados(c)
    print("  Ya en destino: %d CI/código(s)" % len(ya_en_destino))

    pares, tcp = preparar(registro, codigos_ya_migrados, nits_ya_migrados,
                          ya_en_destino=ya_en_destino)

    if dry_run:
        with db.conexion() as c:
            problemas = db.puerta_de_calidad(
                c,
                {TABLA_CLIENTES: [p[0] for p in pares],
                 TABLA_JURIDICA: [p[1] for p in pares]},
                claves_omitidas={TABLA_JURIDICA: {"id_cliente"}},
            )
        print("  Puerta de calidad: %d problema(s)" % len(problemas))
        for problema in problemas[:10]:
            print("    - %s | %s | %s" % problema)
        return 0, registro, pares, tcp

    with db.conexion() as c:
        db.crear_log(c)
        migradas = ejecutar(c, registro, pares)
    return migradas, registro, pares, tcp
