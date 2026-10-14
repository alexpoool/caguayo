"""Cálculos de evaluaciones (Fase 8).

Funciones puras, sin acceso a BD ni a FastAPI, para que sean testables de
forma aislada, al estilo de los dominios de las fases anteriores.

Dos promedios conviven y **no son intercambiables**:

- **Criterios** (puntualidad, productividad, trabajo en equipo, calidad): cada
  uno es una FK a `calificaciones`, cuyo `valor` va de 1 a 5. El promedio se
  calcula **al leer** (no está persistido en la tabla `evaluaciones`), igual
  que la tardanza de la Fase 4.
- **Objetivos/metas**: sus `valoracion` van de 1 a 5, pero
  `evaluaciones.promedio_objetivos` los guarda ya convertidos a una escala
  **0–100** (por eso `valoracion / 5 × 100`). Sí está persistido, porque el
  CHECK de BD exige el rango 0–100 y conviene consultarlo sin recorrer los
  hijos. Se recalcula en cada cambio de un objetivo o meta.

Los promedios ignoran los campos sin valor (`None`): una evaluación sin ningún
criterio puntuado no tiene promedio (`None`), y una con dos de cuatro criterios
usa solo esos dos.
"""

from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Optional

# Mismo orden que los CHECK de la tabla `evaluaciones`.
TIPOS_EVALUACION = ("formal", "autoevaluacion", "parcial", "final")
ESTADOS_EVALUACION = ("borrador", "finalizada")

# Los 4 criterios son columnas FK fijas en `evaluaciones`.
CRITERIOS = ("puntualidad", "productividad", "trabajo_equipo", "calidad")

# Etiquetas legibles para la UI y el radar.
CRITERIOS_ETIQUETA = {
    "puntualidad": "Puntualidad",
    "productividad": "Productividad",
    "trabajo_equipo": "Trabajo en equipo",
    "calidad": "Calidad",
}

ESCALA_CRITERIOS = 5  # `calificaciones.valor` va de 1 a 5.
ESCALA_OBJETIVOS = 100  # `promedio_objetivos` se guarda en 0–100.


def redondear(valor: Decimal) -> Decimal:
    """Redondea a 2 decimales con medio hacia arriba (el criterio del módulo)."""
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def validar_fechas(inicio, fin) -> Optional[str]:
    """Mensaje de error si el periodo no está ordenado; `None` si es válido."""
    if fin < inicio:
        return "El fin del periodo debe ser posterior o igual al inicio"
    return None


def puede_editar(estado: str) -> bool:
    """Solo una evaluación en `borrador` admite cambios."""
    return estado == "borrador"


def promedio_criterios(valores: Iterable[Optional[int]]) -> Optional[Decimal]:
    """Promedio de los criterios puntuados (1–5), ignorando los vacíos.

    Devuelve `None` si ningún criterio está puntuado todavía. Se calcula al
    leer: no se persiste en `evaluaciones`.
    """
    puntuados = [Decimal(v) for v in valores if v is not None]
    if not puntuados:
        return None
    return redondear(sum(puntuados) / Decimal(len(puntuados)))


def promedio_objetivos(valoraciones: Iterable[Optional[int]]) -> Optional[Decimal]:
    """Promedio de las valoraciones de objetivos y metas convertido a 0–100.

    Cada valoración es 1–5, así que el resultado es `media / 5 × 100`. Devuelve
    `None` si no hay ninguna valoración todavía (el campo queda nulo en la BD).
    """
    valoradas = [Decimal(v) for v in valoraciones if v is not None]
    if not valoradas:
        return None
    media = sum(valoradas) / Decimal(len(valoradas))
    return redondear(media * Decimal(ESCALA_OBJETIVOS) / Decimal(ESCALA_CRITERIOS))


def escala_a_100(valoracion: Optional[int]) -> Optional[Decimal]:
    """Convierte una valoración 1–5 suelta a la escala 0–100 del promedio."""
    if valoracion is None:
        return None
    return redondear(
        Decimal(valoracion) * Decimal(ESCALA_OBJETIVOS) / Decimal(ESCALA_CRITERIOS)
    )


__all__ = [
    "TIPOS_EVALUACION",
    "ESTADOS_EVALUACION",
    "CRITERIOS",
    "CRITERIOS_ETIQUETA",
    "ESCALA_CRITERIOS",
    "ESCALA_OBJETIVOS",
    "redondear",
    "validar_fechas",
    "puede_editar",
    "promedio_criterios",
    "promedio_objetivos",
    "escala_a_100",
]
