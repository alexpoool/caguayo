"""Cálculos de evaluaciones (Fase 8).

Funciones puras, sin acceso a BD ni a FastAPI, para que sean testables de
forma aislada, al estilo de los dominios de las fases anteriores.

Dos promedios conviven y **no son intercambiables**:

- **Criterios** (puntualidad, productividad, trabajo en equipo, calidad): cada
  uno se puntúa con **10 estrellas** sobre una escala del catálogo
  `calificaciones` (una por evaluación; el `valor` de la entrada es el último
  número de la escala: 5, 10 o 100). El valor en escala = estrellas/10 ×
  escala y el promedio se calcula **al leer** (no está persistido en la tabla
  `evaluaciones`), igual que la tardanza de la Fase 4.
- **Objetivos/metas**: sus `valoracion` van de 1 a 5, pero
  `evaluaciones.promedio_objetivos` los guarda ya convertidos a una escala
  **0–100** (por eso `valoracion / 5 × 100`). Sí está persistido, porque el
  CHECK de BD exige el rango 0–100 y conviene consultarlo sin recorrer los
  hijos. Se recalcula en cada cambio de un objetivo o meta.

Los promedios ignoran los campos sin valor (`None`): una evaluación sin ningún
criterio puntuado no tiene promedio (`None`), y una con dos de cuatro criterios
usa solo esos dos.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Optional

# Mismo orden que los CHECK de la tabla `evaluaciones`.
TIPOS_EVALUACION = ("formal", "autoevaluacion", "parcial", "final")
ESTADOS_EVALUACION = ("borrador", "finalizada")

# Los 4 criterios son columnas fijas en `evaluaciones`
# (`{criterio}_estrellas`, 0–10; None = sin puntuar).
CRITERIOS = ("puntualidad", "productividad", "trabajo_equipo", "calidad")

# Etiquetas legibles para la UI y el radar.
CRITERIOS_ETIQUETA = {
    "puntualidad": "Puntualidad",
    "productividad": "Productividad",
    "trabajo_equipo": "Trabajo en equipo",
    "calidad": "Calidad",
}

# Los criterios se puntúan siempre con 10 estrellas; la escala elegida
# (5, 10 o 100, del catálogo `calificaciones`) solo cambia el valor final.
ESTRELLAS_MAX = 10

# Valoración de las metas (1–5, con CHECK en BD): convierte a 0–100 en los
# promedios de objetivos. No confundir con la escala de criterios.
ESCALA_METAS = 5
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


def valor_en_escala(estrellas: Optional[int], escala: Optional[int]) -> Optional[Decimal]:
    """Estrellas (0–10) convertidas a la escala elegida: estrellas/10 × escala.

    Devuelve `None` si no hay puntuación o no hay escala; el servicio la
    usa para el radar y para el promedio.
    """
    if estrellas is None or not escala:
        return None
    return redondear(Decimal(estrellas) * Decimal(escala) / Decimal(ESTRELLAS_MAX))


def promedio_criterios(valores: Iterable[Optional[Decimal | int]]) -> Optional[Decimal]:
    """Promedio de los criterios puntuados, ignorando los vacíos.

    Los valores llegan ya convertidos a la escala elegida (`valor_en_escala`).
    Devuelve `None` si ningún criterio está puntuado todavía. Se calcula al
    leer: no se persiste en `evaluaciones`.
    """
    puntuados = [Decimal(v) for v in valores if v is not None]
    if not puntuados:
        return None
    return redondear(sum(puntuados) / Decimal(len(puntuados)))


def promedio_objetivos(
    resultados: Iterable[Optional[Decimal | int]]
) -> Optional[Decimal]:
    """Promedio de los `resultado_objetivo` (1–5) convertido a 0–100.

    Cada resultado es la media de las valoraciones de las metas de su
    objetivo, así que el promedio es `media / 5 × 100`. Devuelve `None` si
    ningún objetivo está puntuado todavía (el campo queda nulo en la BD).
    """
    puntuados = [Decimal(v) for v in resultados if v is not None]
    if not puntuados:
        return None
    media = sum(puntuados) / Decimal(len(puntuados))
    return redondear(media * Decimal(ESCALA_OBJETIVOS) / Decimal(ESCALA_METAS))


def escala_a_100(valoracion: Optional[Decimal | int]) -> Optional[Decimal]:
    """Convierte una valoración 1–5 suelta a la escala 0–100 del promedio."""
    if valoracion is None:
        return None
    return redondear(
        Decimal(valoracion) * Decimal(ESCALA_OBJETIVOS) / Decimal(ESCALA_METAS)
    )


def solapa_fechas(
    ini_a: Optional[date],
    fin_a: Optional[date],
    ini_b: Optional[date],
    fin_b: Optional[date],
) -> bool:
    """True si los rangos [ini, fin] se solapan; un extremo sin fecha cuenta
    como abierto (un objetivo sin fechas siempre está en alcance)."""
    if ini_a and fin_b and ini_a > fin_b:
        return False
    if ini_b and fin_a and ini_b > fin_a:
        return False
    return True


__all__ = [
    "TIPOS_EVALUACION",
    "ESTADOS_EVALUACION",
    "CRITERIOS",
    "CRITERIOS_ETIQUETA",
    "ESTRELLAS_MAX",
    "ESCALA_METAS",
    "ESCALA_OBJETIVOS",
    "redondear",
    "validar_fechas",
    "puede_editar",
    "valor_en_escala",
    "promedio_criterios",
    "promedio_objetivos",
    "escala_a_100",
    "solapa_fechas",
]
