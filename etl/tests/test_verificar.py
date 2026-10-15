# -*- coding: utf-8 -*-
"""El informe de verificación corta sus bloques por posición.

`verificar._consultas` devuelve una lista plana y `verificar` la parte en tres
trozos con `FIN_CONTEO`, `FIN_INTEGRIDAD` y `FIN_REGISTRO`. Es un dato escrito a
mano: cada control nuevo lo descoloca, y un corte mal calculado no da error, sólo
imprime un bloque con el de al lado o deja el último control sin imprimir.

Estos tests no tocan la base: comprueban que los cortes cuadran con la lista.
"""
import ast
import inspect
from pathlib import Path

import verificar

VERIFICAR = Path(verificar.__file__).resolve()


def _controles_declarados():
    """Los elementos de la lista `controles`, leídos del fuente.

    Se lee el AST y no la lista en sí porque `_consultas` necesita una conexión
    viva que aquí no hay.
    """
    arbol = ast.parse(VERIFICAR.read_text(encoding="utf-8"))
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Assign):
            objetivo = nodo.targets[0]
            if (isinstance(objetivo, ast.Name)
                    and objetivo.id == "controles"
                    and isinstance(nodo.value, ast.List)):
                return nodo.value.elts
    raise AssertionError("no se encontró la lista `controles` en verificar.py")


def test_los_cortes_cuadran_con_los_controles():
    total = len(_controles_declarados())

    assert verificar.FIN_CONTEO == 11, (
        "conteos: 4 de clientes + 3 de las fases K y L + 4 de las fases N y O")
    assert verificar.FIN_INTEGRIDAD == 29, (
        "integridad: 9 antiguos + 4 de las fases K y L + 6 de las fases N y O")
    assert verificar.FIN_REGISTRO == total, (
        "el último control se quedaría sin imprimir: la lista tiene %d y "
        "FIN_REGISTRO dice %d" % (total, verificar.FIN_REGISTRO)
    )


def test_cada_bloque_tiene_lo_que_dice_tener():
    total = len(_controles_declarados())

    assert verificar.FIN_CONTEO < verificar.FIN_INTEGRIDAD < verificar.FIN_REGISTRO
    assert verificar.FIN_REGISTRO <= total


def test_el_control_que_hace_fallar_se_busca_por_nombre():
    """Lamigration falla por los ERROR de `migracion_log`, y se buscan por
    etiqueta y no por posición: si el índice se mueve, esto no."""
    fuente = inspect.getsource(verificar.verificar)

    assert "ETIQUETA_ERRORES" in fuente
    assert "controles[15][1]" not in fuente, \
        "el índice fijo es justo lo que este cambio viene a quitar"