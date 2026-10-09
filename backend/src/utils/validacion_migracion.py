# -*- coding: utf-8 -*-
"""Validación del marcaje de datos migrados.

`clientes.valido` es False cuando el registro entró con algún campo corregido
para poder migrarse. `campo` dice cuál hay que arreglar y `razon` por qué.

Cuando alguien corrige el campo en el formulario de edición, la marca se
retira sola: basta con que el valor haya cambiado y sea ahora válido.
"""
import re
from typing import Callable, Dict, Optional

from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

LARGO_CI = 11


def _ci_valido(valor: Optional[str]) -> bool:
    return bool(valor) and bool(re.fullmatch(r"\d{%d}" % LARGO_CI, valor.strip()))


def _no_vacio(valor: Optional[str]) -> bool:
    return bool(valor and valor.strip())


REGLAS: Dict[str, Callable[[Optional[str]], bool]] = {
    "carnet_identidad": _ci_valido,
    "nit": _no_vacio,
    "codigo": _no_vacio,
}

# Dónde vive cada campo corregible. `carnet_identidad` no está en `clientes`.
ORIGEN_CAMPO: Dict[str, str] = {
    "carnet_identidad": "clientes_persona_natural",
    "nit": "clientes",
    "codigo": "clientes",
}


async def valor_actual(db: AsyncSession, cliente_id: int, campo: str) -> Optional[str]:
    """Valor actual del campo marcado, leído antes de que se reescriba la fila."""
    tabla = ORIGEN_CAMPO.get(campo)
    if not tabla:
        return None
    consulta = "SELECT {c} FROM {t} WHERE id_cliente = :id".format(c=campo, t=tabla)
    resultado = await db.execute(text(consulta), {"id": cliente_id})
    valor = resultado.scalar()
    return None if valor is None else str(valor)


def correccion_valida(campo: Optional[str], antes: Optional[str], despues: Optional[str]) -> bool:
    """True si el campo cambió y su nuevo valor cumple la regla."""
    if not campo:
        return False
    regla = REGLAS.get(campo)
    if regla is None:
        return False
    if antes == despues:
        return False
    return bool(regla(despues))
