"""Cálculos de asistencia (Fase 4).

Funciones puras, sin acceso a BD ni a FastAPI, para que sean testables de
forma aislada. Se ocupan de tres magnitudes que luego consumen el servicio y
los reportes:

- **tardanza**: si la hora de entrada es posterior al horario de inicio.
- **horas trabajadas**: tiempo transcurrido entre entrada y salida.
- **horas extras**: la parte de las horas trabajadas que supera las pactadas.

Convenciones:
- Todo se calcula en minutos enteros para evitar redondeos de `timedelta`.
- Las horas extras **no se descuentan ni compensan automáticamente**: la
  Fase 6 (nómina) decidirá si las paga. Aquí solo se calculan.
- Un empleado con `tipo_asistencia='LIBRE'` no tiene horario pactado, así que
  no se le calcula tardanza ni extras.
"""

from datetime import date, time, timedelta
from typing import Optional

# Estados del catálogo de asistencia (mismo orden que el CHECK de BD).
ESTADOS_ASISTENCIA = (
    "presente",
    "ausente",
    "tardanza",
    "permiso",
    "vacaciones",
    "feriado",
    "incapacidad",
)

# Estados que implican presencia física y por tanto tienen horas.
ESTADOS_CON_HORAS = ("presente", "tardanza")


def minutos(hora: time) -> int:
    """Convierte una hora del día a minutos desde medianoche."""
    return hora.hour * 60 + hora.minute


def duracion_minutos(entrada: time, salida: time) -> int:
    """Minutos entre dos horas del día. Si la salida es menor, se asume que
    el turno cruza la medianoche y se suma un día completo."""
    inicio = minutos(entrada)
    fin = minutos(salida)
    if fin < inicio:
        fin += 24 * 60
    return fin - inicio


def horas_a_minutos(horas: Optional[int]) -> Optional[int]:
    """Convierte las horas pactadas del empleado a minutos."""
    if horas is None:
        return None
    return horas * 60


def calcular_tardanza(
    hora_entrada: Optional[time],
    horario_inicio: Optional[time],
) -> int:
    """Minutos de retraso respecto al horario de inicio.

    Devuelve 0 si no hay retraso, si no hay entrada o si no hay horario
    pactado (empleado con asistencia LIBRE).
    """
    if hora_entrada is None or horario_inicio is None:
        return 0
    retraso = minutos(hora_entrada) - minutos(horario_inicio)
    return retraso if retraso > 0 else 0


def calcular_horas_trabajadas(
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
) -> int:
    """Minutos trabajados entre entrada y salida.

    Devuelve 0 si falta cualquiera de las dos horas.
    """
    if hora_entrada is None or hora_salida is None:
        return 0
    return duracion_minutos(hora_entrada, hora_salida)


def calcular_horas_extras(
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
    horas_a_trabajar: Optional[int],
) -> int:
    """Minutos trabajados por encima de las horas pactadas.

    Devuelve 0 si no hay horas pactadas (no se puede saber qué es extra) o si
    faltan las horas de entrada o salida.
    """
    trabajadas = calcular_horas_trabajadas(hora_entrada, hora_salida)
    pactadas = horas_a_minutos(horas_a_trabajar)
    if pactadas is None:
        return 0
    extra = trabajadas - pactadas
    return extra if extra > 0 else 0


def es_tardanza(
    hora_entrada: Optional[time],
    horario_inicio: Optional[time],
) -> bool:
    """Si el empleado llegó tarde (con retraso mayor que cero)."""
    return calcular_tardanza(hora_entrada, horario_inicio) > 0


def estado_derivado(
    hora_entrada: Optional[time],
    horario_inicio: Optional[time],
) -> str:
    """Estado sugerido para una marcación con hora de entrada.

    Si el empleado llegó tarde se sugiere `tardanza`, y `presente` en caso
    contrario. No se aplica si no hay entrada.
    """
    if hora_entrada is None:
        return "ausente"
    return "tardanza" if es_tardanza(hora_entrada, horario_inicio) else "presente"


def requiere_horas(estado: str) -> bool:
    """Si un estado exige hora de entrada (según el CHECK de BD)."""
    return estado in ESTADOS_CON_HORAS


def validar_marcacion(
    estado: str,
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
) -> Optional[str]:
    """Devuelve un mensaje de error si la marcación es inconsistente, o None
    si es válida. Replica los CHECKs de la tabla `asistencia`."""
    if estado not in ESTADOS_ASISTENCIA:
        return (
            f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_ASISTENCIA)}"
        )
    if requiere_horas(estado) and hora_entrada is None:
        return f"El estado «{estado}» requiere hora de entrada"
    if hora_entrada is not None and hora_salida is not None and hora_salida <= hora_entrada:
        return "La hora de salida debe ser posterior a la de entrada"
    return None


def resumen_jornada(
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
    horario_inicio: Optional[time],
    horas_a_trabajar: Optional[int],
) -> dict:
    """Resumen de una jornada en un solo diccionario, para el listado."""
    return {
        "tardanza_minutos": calcular_tardanza(hora_entrada, horario_inicio),
        "horas_trabajadas_minutos": calcular_horas_trabajadas(hora_entrada, hora_salida),
        "horas_extras_minutos": calcular_horas_extras(
            hora_entrada, hora_salida, horas_a_trabajar
        ),
    }


def minutos_a_horas_minutos(minutos_totales: int) -> str:
    """Formatea minutos como `H:MM` para mostrar en pantalla y reportes."""
    signo = "-" if minutos_totales < 0 else ""
    total = abs(minutos_totales)
    return f"{signo}{total // 60}:{total % 60:02d}"


def rango_fechas(inicio: date, fin: date) -> list[date]:
    """Lista de fechas inclusive entre `inicio` y `fin` (para calendarios)."""
    if fin < inicio:
        return []
    dias = (fin - inicio).days
    return [inicio + timedelta(days=i) for i in range(dias + 1)]
