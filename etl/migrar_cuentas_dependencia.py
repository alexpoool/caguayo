# -*- coding: utf-8 -*-
"""Fase G: cuentas bancarias de la dependencia.

El legacy guarda la cuenta de la empresa en `empresa`: `cuenta_mn` y
`cuenta_cuc`, más `direccion` y `nombre_empresa`, que sirven como titular.
`banco`, `sucursal` y `licencia_bancariacuc` no están en esta versión del
dump, así que el banco lleva marcador y el resto queda NULL.

La dependencia de destino se localiza por nombre exacto: `empresa` se llama
`Caguayo S.A` y en `dependencia` hay una fila con ese mismo nombre. Los dumps
de 2025-2026 traen una `empresa` distinta — la de una TCP, con banco BPA —
que no se migra aquí porque no es la misma entidad.
"""
import db
from config import (
    DUMP_MARIADB,
    TABLA_CUENTA_DEP,
    TAMANO_LOTE,
)
from fuente import leer_tabla
from limpieza import limpiar_numero_cuenta, no_vacio, texto
from log import Registro
from migrar_cuentas import BANCO_DESCONOCIDO

ORIGEN = "empresa (cuenta dependencia)"

CAMPOS_CUENTA = ("cuenta_mn", "cuenta_cuc")

LARGO_TITULAR = 150
LARGO_DIRECCION = 255

COLUMNAS = (
    "id_dependencia", "id_moneda", "titular", "banco",
    "sucursal", "numero_cuenta", "direccion",
)

NO_VACIAS = ("id_dependencia", "titular", "banco", "numero_cuenta", "direccion")


def preparar(registro: Registro, id_dependencia, pares_existentes=()):
    """Construye los payloads de `cuenta_dependencias`. No escribe nada."""
    _, filas = leer_tabla(DUMP_MARIADB, "empresa")
    print("  Filas de 'empresa' en el origen: %d" % len(filas))

    payloads = []
    ya_cargadas = set(pares_existentes)
    vistas = set()

    for empresa in filas:
        nombre = texto(empresa.get("nombre_empresa"))
        direccion = texto(empresa.get("direccion"))

        if not nombre:
            registro.descarte(ORIGEN, 0, None, "empresa sin nombre", None)
            continue

        for campo in CAMPOS_CUENTA:
            numero, original = limpiar_numero_cuenta(empresa.get(campo))
            if not numero:
                continue

            clave = (id_dependencia, numero)
            if clave in ya_cargadas or clave in vistas:
                registro.warning(ORIGEN, 0, nombre, "cuenta ya presente",
                                 "%s=%r omitida por idempotencia" % (campo, original))
                continue
            vistas.add(clave)

            if original != numero:
                registro.warning(ORIGEN, 0, nombre, "numero de cuenta normalizado",
                                 "valor original=%r conservados sólo los dígitos=%r"
                                 % (original, numero))

            registro.warning(ORIGEN, 0, nombre, "cuenta heredada de 'empresa'",
                             "%s=%r para la dependencia '%s'"
                             % (campo, original, nombre))

            payloads.append({
                "id_dependencia": id_dependencia,
                "id_moneda": None,
                "titular": nombre[:LARGO_TITULAR],
                "banco": BANCO_DESCONOCIDO,
                "sucursal": None,
                "numero_cuenta": numero,
                "direccion": (direccion or BANCO_DESCONOCIDO)[:LARGO_DIRECCION],
            })

    print("  Dependencia destino: %s" % id_dependencia)
    print("  Cuentas a insertar: %d" % len(payloads))
    return payloads


def ejecutar(conn, registro: Registro, payloads):
    migradas = 0
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            migradas += db.insertar_cuentas_dependencia(conn, lote)
            conn.commit()
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase G] lote revertido: %s" % exc)
    return migradas


def cargar_cuentas_dependencia(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        nombres = db.nombres_dependencias(conn)
        existentes = db.pares_existentes_cuenta_dep(conn)

    _, filas = leer_tabla(DUMP_MARIADB, "empresa")
    nombre_origen = texto(filas[0].get("nombre_empresa")) if filas else None
    id_dependencia = nombres.get(nombre_origen)

    if id_dependencia is None:
        registro.error(ORIGEN, 0, nombre_origen, "dependencia no encontrada",
                       "no hay en 'dependencia' una fila llamada %r; nombres: %s"
                       % (nombre_origen, sorted(nombres)))
        print("  No existe la dependencia %r en el destino. Habrá que crearla."
              % nombre_origen)
        return 0, registro, []

    payloads = preparar(registro, id_dependencia, existentes)

    filas_payload = [{c: p[c] for c in COLUMNAS} for p in payloads]
    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(
            conn, {TABLA_CUENTA_DEP: filas_payload},
            no_vacias={TABLA_CUENTA_DEP: NO_VACIAS},
        )
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if problemas:
        print("  No se inserta nada: la puerta de calidad encontró problemas.")
        return 0, registro, payloads

    if dry_run:
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        migradas = ejecutar(conn, registro, payloads)
    return migradas, registro, payloads