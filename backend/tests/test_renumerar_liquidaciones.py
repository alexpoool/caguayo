"""Tests del plan de renumeración posterior al ETL.

No tocan la base: comprueban que los códigos del legacy mandan sobre la PK de
la app y que la serie sigue en el número siguiente.
"""

import importlib.util
from pathlib import Path

_SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "renumerar_liquidaciones_post_etl.py"
)
_spec = importlib.util.spec_from_file_location("renumerar_liquidaciones", _SCRIPT)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)


def test_plan_proyectos_continua_el_legacy():
    filas = [
        (1, "FT.26.115", 2026),
        (4363, "FT.26.4363", 2026),
    ]

    assert _mod._plan_proyectos(filas, {2026: 115}) == [
        (4363, "FT.26.4363", "FT.26.116"),
    ]


def test_plan_proyectos_no_toca_los_codigos_del_etl():
    filas = [
        (1, "FT.26.115", 2026),
        (2, "FT.26.115-1043", 2026),
    ]

    assert _mod._plan_proyectos(filas, {2026: 115}) == []


def test_plan_proyectos_es_idempotente():
    filas = [
        (1, "FT.26.115", 2026),
        (4363, "FT.26.116", 2026),
    ]

    assert _mod._plan_proyectos(filas, {2026: 115}) == [
        (4363, "FT.26.116", "FT.26.116"),
    ]


def test_plan_compras_continua_el_legacy_global():
    filas = [
        (1, "LEG-115-5662", 2026, 5),
        (2, "CAG.26.5.001", 2026, 5),
        (3, "CAG.26.6.001", 2026, 6),
    ]

    assert _mod._plan_compras(filas) == [
        (2, "CAG.26.5.001", "CAG.26.5.116"),
        (3, "CAG.26.6.001", "CAG.26.6.117"),
    ]


def test_plan_compras_no_toca_las_filas_del_etl():
    filas = [
        (1, "LEG-115-5662", 2026, 5),
        (2, "LEG-114-5661", 2025, 5),
    ]

    assert _mod._plan_compras(filas) == []
