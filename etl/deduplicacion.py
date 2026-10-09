# -*- coding: utf-8 -*-
"""Deduplicación (regla §12).

Conserva siempre el registro con el identificador menor: las listas deben
llegar ordenadas de forma ascendente por su identificador, así que la primera
aparición de un valor es ya la que se conserva.

`clientes.nit` y `clientes.codigo` son UNIQUE por separado y artistas y
clientes escriben en la misma tabla, de modo que las fases posteriores reciben
los valores ya aceptados mediante `ya_usados`.
"""
from limpieza import no_vacio


def deduplicar(filas, columna, ya_usados=None):
    """Divide las filas en (conservadas, descartadas).

    Las descartadas son tuplas (fila, valor_duplicado, id_conservado, motivo).
    """
    ya_usados = set(ya_usados or ())
    conservadas = []
    descartadas = []
    vistos = {}

    for fila in filas:
        valor = no_vacio(fila.get(columna))
        if valor is None:
            conservadas.append(fila)
            continue

        if valor in ya_usados:
            descartadas.append((fila, valor, None, "colision con valor ya migrado"))
            continue

        if valor in vistos:
            descartadas.append((fila, valor, vistos[valor], "duplicado"))
            continue

        vistos[valor] = fila["_id"]
        conservadas.append(fila)

    return conservadas, descartadas


def valores_de(filas, columna):
    """Conjunto de valores no vacíos de una columna en un conjunto de filas."""
    return {no_vacio(f.get(columna)) for f in filas} - {None}
