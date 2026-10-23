# -*- coding: utf-8 -*-
"""Paso 0b: deja `clientes` con el cliente de rescate `SIN-CLIENTE`.

Hay contratos y solicitudes del legacy que no se pueden colgar de su cliente
real: unos apuntan a un cliente que el legacy deduplicó (se recupera por NIT en
las Fases L y N) y otros no tienen cliente en absoluto (los contratos con
`id_solicitudsc=0` y las solicitudes con `id_cliente=0`). El destino,
`contrato.id_cliente` es NOT NULL y con FK a `clientes`, así que sin una fila a
la que apuntar esas filas se descartarían.

Este paso crea ese cliente una sola vez, marcado con `valido=False` para que la
aplicación lo muestre como "a revisar" y no se confunda con una ficha real. Las
fases L y N lo resuelven por su código (`SIN-CLIENTE`) contra el mapa del
destino, igual que cualquier otro cliente; no hay un id fijo.

Se escribe sólo con `--commit`, como `migrar_monedas.sembrar_monedas`.
"""
import db
from config import TABLA_CLIENTES
from log import Registro

ORIGEN = "cliente"

#: Código del cliente pivote. No colisiona con ningún `codigo` ni `codigo_exp`
#: del legacy (allí los códigos son numéricos o `LEG-{id}`).
CODIGO = "SIN-CLIENTE"

#: NIT del pivote. `clientes.nit` es UNIQUE y NOT NULL: el valor tiene que ser
#: irrepetible y no parecerse a un NIT real, para que nadie lo tome por uno.
NIT = "SIN-CLIENTE"

#: (nombre, tipo_persona, tipo_relacion, estado). `nombre` es NOT NULL, igual
#: que `tipo_relacion` y `estado`; el resto de campos del pivote se rellenan en
#: el INSERT.
NOMBRE = "Cliente sin identificar (migracion)"


def _id_pivote(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id_cliente FROM {t} WHERE codigo = %s".format(t=TABLA_CLIENTES),
            (CODIGO,),
        )
        fila = cur.fetchone()
        return fila[0] if fila else None


def asegurar_pivote(registro=None, dry_run=True):
    """Deja el cliente pivote en `clientes` y devuelve su `id_cliente`.

    Idempotente: si ya está, no lo toca. En simulación se inserta dentro de una
    transacción que se revierte al final, para devolver un id real (con el que
    las Fases L y N arman sus payloads) sin dejar rastro en la base: el
    `--commit` no escribe y la simulación tampoco.
    """
    registro = registro or Registro()

    with db.conexion() as conn:
        id_pivote = _id_pivote(conn)
        if id_pivote is not None:
            print("  Cliente pivote %r ya presente (id_cliente=%d)"
                  % (CODIGO, id_pivote))
            return id_pivote

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO {t} (nombre, tipo_persona, nit, codigo, direccion,"
                " tipo_relacion, estado, fecha_registro, valido, campo, razon)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, FALSE,"
                " %s, %s)"
                " ON CONFLICT (codigo) DO NOTHING"
                " RETURNING id_cliente".format(t=TABLA_CLIENTES),
                (NOMBRE, "JURIDICA", NIT, CODIGO, "-", "CLIENTE", "ACTIVO",
                 "cliente", "contrato/solicitud del legacy sin cliente migrado"),
            )
            fila = cur.fetchone()
            id_pivote = fila[0] if fila else None

        if dry_run:
            conn.rollback()
            print("  SIMULACIÓN: se crearía el cliente pivote %r (id_cliente=%s)"
                  % (CODIGO, id_pivote))
            return id_pivote

        conn.commit()

    registro.warning(
        ORIGEN, id_pivote, NOMBRE, "cliente pivote creado",
        "destino de los contratos y solicitudes sin cliente migrado")
    print("  Cliente pivote creado: %r (id_cliente=%s)" % (CODIGO, id_pivote))
    return id_pivote
