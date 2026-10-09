# -*- coding: utf-8 -*-
"""Fase C: `cliente` (TCP/mipyme) -> `clientes` + `cliente_tcp` (§10, §11).

Las tres reglas de detección de §11 no identifican ninguna fila del conjunto
actual: no hay ningún `nombre_empresa` que contenga 'TCP' o 'Mipyme', ningún
`codigo` que empiece por '50004', y la tabla `cliente` no tiene columna
`registro`, con lo que el segundo criterio es inaplicable. La fase se conserva
por si aparece un lote que sí las cumpla.
"""
import db
import reglas
from config import (
    TABLA_CLIENTES,
    TABLA_TCP,
    TAMANO_LOTE,
)
from deduplicacion import deduplicar
from log import Registro
from migrar_clientes import nombre_cliente

ORIGEN = "cliente (TCP)"


def preparar(registro: Registro, filas_tcp, codigos_ya_migrados=(), nits_ya_migrados=()):
    if not filas_tcp:
        print("  Sin filas TCP/mipyme: la Fase C no tiene nada que migrar (§11).")
        return []

    filas = []
    for f in filas_tcp:
        fila = dict(f)
        fila["_id"] = int(f["id_cliente"])
        fila["nit"] = f.get("nit") or f.get("codigo")
        filas.append(fila)

    filas, desc_nit = deduplicar(filas, "nit", ya_usados=set(nits_ya_migrados))
    for fila, valor, _, _ in desc_nit:
        registro.descarte(ORIGEN, fila["_id"], nombre_cliente(fila), "nit duplicado",
                          "nit=%s" % valor)

    filas, desc_codigo = deduplicar(filas, "codigo", ya_usados=set(codigos_ya_migrados))
    for fila, valor, _, _ in desc_codigo:
        registro.descarte(ORIGEN, fila["_id"], nombre_cliente(fila), "codigo duplicado",
                          "codigo=%s" % valor)

    pares = []
    for fila in filas:
        padre, hijo, avisos = reglas._mapeo_tcp(fila)
        for motivo, _, detalle in avisos:
            registro.warning(ORIGEN, fila["_id"], nombre_cliente(fila), motivo, detalle)
        pares.append((padre, hijo))

    print("  Filas TCP a migrar: %d" % len(pares))
    return pares


def ejecutar(conn, registro: Registro, pares):
    migradas = 0
    for lote in db.lotes(pares, TAMANO_LOTE):
        try:
            db.insertar_padres_hijas(conn, TABLA_CLIENTES, TABLA_TCP, lote, TAMANO_LOTE)
            conn.commit()
            migradas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado", "lote revertido: %s" % exc)
            print("  [Fase C] lote revertido: %s" % exc)
    return migradas


def cargar_tcp(registro=None, dry_run=True, filas_tcp=(),
               codigos_ya_migrados=(), nits_ya_migrados=()):
    registro = registro or Registro()
    pares = preparar(registro, filas_tcp, codigos_ya_migrados, nits_ya_migrados)

    if not pares:
        return 0, registro, pares

    if dry_run:
        with db.conexion() as c:
            problemas = db.puerta_de_calidad(
                c,
                {TABLA_CLIENTES: [p[0] for p in pares],
                 TABLA_TCP: [p[1] for p in pares]},
                claves_omitidas={TABLA_TCP: {"id_cliente"}},
            )
        print("  Puerta de calidad: %d problema(s)" % len(problemas))
        return 0, registro, pares

    with db.conexion() as c:
        db.crear_log(c)
        migradas = ejecutar(c, registro, pares)
    return migradas, registro, pares
