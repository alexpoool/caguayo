"""Cálculos de evaluaciones (Fase 8 v2 — objetivos ponderados).

Funciones puras, sin acceso a BD ni a FastAPI, para que sean testables de
forma aislada, al estilo de los dominios de las fases anteriores.

La evaluación se compone **solo de objetivos** seleccionados en
`evaluaciones_objetivos`. Su nota es el **promedio ponderado** (también
llamado *media ponderada*):

    promedio = Σ(estrellas × peso) / Σ(pesos)

- **Estrellas**: 0–5 en todas partes (antes eran 0–10).
- **Peso**: el del objetivo (`objetivos.peso`, copiado a la fila al
  seleccionarlo y editable en la evaluación); un peso mayor hace que el
  objetivo pese más en el promedio.
- Solo entran las filas **puntuadas** (`resultado` con valor): una
  evaluación con tres objetivos seleccionados y uno puntuado promedia solo
  ese; si ninguno está puntuado no hay promedio (`None`).
- El resultado se redondea a 2 decimales (medio hacia arriba) y se guarda
  en `evaluaciones.promedio_objetivos` (CHECK 0–5 en BD).
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Optional

TIPOS_EVALUACION = ("formal", "autoevaluacion", "parcial", "final")
ESTADOS_EVALUACION = ("borrador", "finalizada")

# Las estrellas de los objetivos van de 0 a 5 (en la fila de
# `evaluaciones_objetivos.resultado`, con CHECK en BD).
ESTRELLAS_MAX = 5


def redondear(valor: Decimal) -> Decimal:
    """Redondea a 2 decimales con medio hacia arriba (el criterio del módulo)."""
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def validar_fechas(inicio, fin) -> Optional[str]:
    """Mensaje de error si el periodo no está ordenado; `None` si es válido."""
    if fin < inicio:
        return "El fin del periodo debe ser posterior o igual al inicio"
    return None


def solapa_fechas(
    ini_a: Optional[date],
    fin_a: Optional[date],
    ini_b: Optional[date],
    fin_b: Optional[date],
) -> bool:
    """True si los rangos [ini, fin] se solapan; un extremo sin fecha cuenta
    como abierto (defensivo: el periodo de los objetivos ya es obligatorio)."""
    if ini_a and fin_b and ini_a > fin_b:
        return False
    if ini_b and fin_a and ini_b > fin_a:
        return False
    return True


def promedio_ponderado(
    filas: Iterable[tuple],
) -> Optional[Decimal]:
    """Promedio ponderado de las filas puntuadas: Σ(estrellas × peso) / Σ(pesos).

    `filas` es un iterable de pares `(resultado, peso)` (las filas de
    `evaluaciones_objetivos`); las de `resultado` nulo no aportan ni pesan.
    Devuelve `None` si ninguna fila está puntuada (el campo queda nulo en la
    BD) y redondea a 2 decimales (HALF_UP), dentro del rango 0–5.
    """
    puntuadas = [
        (Decimal(resultado), Decimal(peso))
        for resultado, peso in filas
        if resultado is not None
    ]
    if not puntuadas:
        return None
    total_peso = sum((p for _, p in puntuadas), Decimal("0"))
    if total_peso <= 0:
        return None
    numerador = sum((resultado * peso for resultado, peso in puntuadas), Decimal("0"))
    return redondear(numerador / total_peso)


__all__ = [
    "TIPOS_EVALUACION",
    "ESTADOS_EVALUACION",
    "ESTRELLAS_MAX",
    "redondear",
    "validar_fechas",
    "solapa_fechas",
    "promedio_ponderado",
]
