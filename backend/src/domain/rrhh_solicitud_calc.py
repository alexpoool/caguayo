"""Reglas puras de solicitudes de vacaciones y permisos (Fase 7).

Funciones sin acceso a BD ni a FastAPI, para que sean testables de forma
aislada, al estilo de los dominios de las fases anteriores.

Convenciones de solapamiento: dos periodos **se solapan** si comparten al
menos un día (el final de uno coincide con el inicio del otro cuenta como
solape, porque un empleado no puede estar a la vez de vacaciones y de permiso
el mismo día). El rango es inclusivo en ambos extremos.
"""

from datetime import date, timedelta
from typing import Iterable, Optional

# Mismo orden que los CHECK de la tabla `solicitudes`.
TIPOS_SOLICITUD = ("vacaciones", "permiso")
ESTADOS_SOLICITUD = ("pendiente", "aprobada", "rechazada", "cancelada")


def validar_fechas(fecha_inicio: date, fecha_fin: date) -> Optional[str]:
    """Devuelve el mensaje de error si las fechas no forman un rango válido.

    `None` significa que el rango es válido.
    """
    if fecha_fin < fecha_inicio:
        return "La fecha de fin debe ser posterior o igual a la de inicio"
    return None


def dias_solicitados(fecha_inicio: date, fecha_fin: date) -> int:
    """Días naturales que cubre la solicitud, incluyendo ambos extremos.

    Un rango de un solo día devuelve 1. Un rango inválido (fin < inicio)
    devuelve 0, que es el valor neutro para los contadores.
    """
    if fecha_fin < fecha_inicio:
        return 0
    return (fecha_fin - fecha_inicio).days + 1


def periodos_solapan(
    inicio_a: date, fin_a: date, inicio_b: date, fin_b: date
) -> bool:
    """¿Comparten al menos un día los dos rangos inclusivos?"""
    return inicio_a <= fin_b and inicio_b <= fin_a


def buscar_solapamiento(
    fecha_inicio: date,
    fecha_fin: date,
    existentes: Iterable,
    excluir_id: Optional[int] = None,
):
    """Primera solicitud existente que se solapa con el rango dado.

    `existentes` es un iterable de objetos con `id`, `fecha_inicio` y
    `fecha_fin` (por ejemplo, las solicitudes `aprobadas` del empleado). El
    `excluir_id` permite ignorar una solicitud concreta —útil al revalidar el
    solapamiento justo antes de aprobar la propia—.
    """
    for solicitud in existentes:
        if excluir_id is not None and solicitud.id == excluir_id:
            continue
        if periodos_solapan(
            fecha_inicio, fecha_fin, solicitud.fecha_inicio, solicitud.fecha_fin
        ):
            return solicitud
    return None


def puede_transicionar(estado_actual: str, estado_destino: str) -> bool:
    """Transiciones válidas del ciclo de vida de una solicitud.

    - `pendiente` puede ir a `aprobada`, `rechazada` o `cancelada`.
    - `aprobada`, `rechazada` y `cancelada` son estados finales: no cambian.
    """
    if estado_actual != "pendiente":
        return False
    return estado_destino in ("aprobada", "rechazada", "cancelada")


def hoy() -> date:
    """Fecha de hoy (envolvente para inyectar otra en los tests si hiciera falta)."""
    return date.today() + timedelta(days=0)


__all__ = [
    "TIPOS_SOLICITUD",
    "ESTADOS_SOLICITUD",
    "validar_fechas",
    "dias_solicitados",
    "periodos_solapan",
    "buscar_solapamiento",
    "puede_transicionar",
    "hoy",
]
