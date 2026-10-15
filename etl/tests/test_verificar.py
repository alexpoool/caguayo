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

import pytest

import verificar

VERIFICAR = Path(verificar.__file__).resolve()


def _controles_declarados():
    """Los elementos de la lista `controles`, leídos del fuente.

    Se lee el AST y no la lista en sí porque `_consultas` necesita una conexión
    viva que aquí no hay.
    """
    return _lista_controles()


def _lista_controles():
    arbol = ast.parse(VERIFICAR.read_text(encoding="utf-8"))
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Assign):
            objetivo = nodo.targets[0]
            if (isinstance(objetivo, ast.Name)
                    and objetivo.id == "controles"
                    and isinstance(nodo.value, ast.List)):
                return nodo.value.elts
    raise AssertionError("no se encontró la lista `controles` en verificar.py")


def _etiquetas():
    """La primera constante de cada tupla de la lista `controles`."""
    etiquetas = []
    for elemento in _lista_controles():
        if isinstance(elemento, ast.Tuple) and elemento.elts:
            primero = elemento.elts[0]
            if isinstance(primero, ast.Constant):
                etiquetas.append(primero.value)
    return etiquetas


def test_los_cortes_cuadran_con_los_controles():
    total = len(_controles_declarados())

    assert verificar.FIN_CONTEO == 11, (
        "conteos: 4 de clientes + 3 de las fases K y L + 4 de las fases N y O")
    assert verificar.FIN_INTEGRIDAD == 32, (
        "integridad: 9 antiguos + 4 de las fases K y L + 9 de las fases N y O"
        " (codigo_proyecto, servicio generico y codigo_extendido al final)")
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


@pytest.mark.parametrize("etiqueta", [
    "solicitud_servicio: codigo_proyecto inconsistente",
    "servicios: servicio generico GEN inconsistente",
    "tareas_etapa: codigo_extendido inconsistente con su servicio",
])
def test_los_controles_nuevos_se_declaran_y_pueden_fallar(etiqueta):
    """Un control que sale siempre en OK no sirve de nada.

    `verificar` sólo marca FALLA si el valor no es cero **y** la etiqueta
    contiene una de las palabras del disparador (`verificar.py:184`). Por eso
    estas tres lo llevan en la etiqueta: es lo que las hace comprobables."""
    assert etiqueta in _etiquetas(), "el control no está declarado"
    assert "inconsistente" in etiqueta, "sin la palabra no puede fallar"