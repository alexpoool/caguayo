"""Infraestructura de mensajería de Caguayo.

El paquete mantiene separados los contratos del dominio y los adaptadores
de infraestructura (Kafka, llama.cpp, etc.) para poder ejecutar el backend
sin levantar todos los servicios durante el desarrollo.
"""

from .contracts import (
    MessageChannel,
    MessageEvent,
    MessageEventType,
    MessagePayload,
)

__all__ = [
    "MessageChannel",
    "MessageEvent",
    "MessageEventType",
    "MessagePayload",
]
