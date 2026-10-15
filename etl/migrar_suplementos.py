# -*- coding: utf-8 -*-
"""Fase M: `suplemento` -> `suplemento`.

Un suplemento amplía un contrato sin rehacerlo: cambia el objeto o el precio.
En el legacy son 48 filas y cuelgan de sólo 14 contratos distintos, así que
cinco son huérfanas —cuatro con `id_contrato = 0` y una con un id que no existe
en `contrato`— y se descartan con su motivo.

Depende de la Fase L: el `id_contrato` del destino lo asigna PostgreSQL, así que
aquí no se puede resolver hasta que los contratos estén insertados. Por eso va
detrás de la L, y avisa si no encuentra ninguno.

El suplemento no trae el código de su contrato, así que se llega a él por el
código que la Fase L le calculó: el `codigo_contrato` del legacy si no chocó, o
ese mismo con el id detrás si sí. De ahí el segundo intento en
`_resolver_contrato`.

El estado, la moneda y la fecha se resuelven con las reglas de `reglas_legacy`,
las mismas que usa la L y la K.
"""
import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TABLA_SUPLEMENTO,
    TAMANO_LOTE,
)
from limpieza import no_vacio, texto
from log import Registro

ORIGEN = "suplemento"


def _codigos_legacy_contratos():
    """`id_contrato` del legacy -> `codigo_contrato` del legacy."""
    from fuente import leer_tabla

    _, contratos = leer_tabla(DUMP_MARIADB, "contrato")
    return {texto(f.get("id_contrato")): texto(f.get("codigo_contrato"))
            for f in contratos}


def _resolver_contrato(id_contrato_legacy, codigos_legacy, por_codigo):
    """`id_contrato` del legacy -> `id_contrato` del destino, o None.

    Se intenta el código tal cual y después con el id detrás, que es como lo
    guarda la Fase L cuando el del legacy ya lo tenía otro contrato.
    """
    codigo_legacy = codigos_legacy.get(id_contrato_legacy)
    if not codigo_legacy:
        return None
    if codigo_legacy in por_codigo:
        return por_codigo[codigo_legacy]
    con_id = "%s-%s" % (codigo_legacy, id_contrato_legacy)
    return por_codigo.get(con_id)


def _fechas_por_contrato(codigos_legacy, por_codigo):
    """Contrato del destino -> fechas ISO de los suplementos de ese contrato.

    Es el respaldo para una fila sin fecha. Hoy no lo usa ninguna —`suplemento.fecha`
    no trae ni un 0000-00-00— pero el día que llegue uno, el respaldo tiene que
    ser de otro suplemento del MISMO contrato, no una fecha suelta.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "suplemento")
    por_contrato = {}
    for s in filas:
        id_contrato = _resolver_contrato(
            texto(s.get("id_contrato")), codigos_legacy, por_codigo)
        fecha = texto(s.get("fecha"))
        if id_contrato and fecha and not fecha.startswith("0000"):
            por_contrato.setdefault(id_contrato, []).append(fecha[:10])
    return por_contrato


def preparar(registro: Registro, por_codigo, estados, ids_moneda,
             codigos_existentes=()):
    """Arma los payloads. No escribe nada en la base."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "suplemento")
    codigos_legacy = _codigos_legacy_contratos()
    fechas_por_contrato = _fechas_por_contrato(codigos_legacy, por_codigo)

    previos = set(codigos_existentes)
    ya_usados = set(codigos_existentes)
    payloads = []

    for f in filas:
        id_legacy = texto(f.get("id_suplemento"))
        nombre = no_vacio(f.get("nombre_suplemento"))
        if not nombre:
            registro.descarte(ORIGEN, id_legacy, None, "nombre vacio",
                              "codigo_suplemento=%r" % f.get("codigo_suplemento"))
            continue

        id_contrato_legacy = texto(f.get("id_contrato"))
        id_contrato = _resolver_contrato(id_contrato_legacy, codigos_legacy, por_codigo)
        if id_contrato is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "contrato no migrado",
                              "id_contrato=%s" % id_contrato_legacy)
            continue

        avisos = []

        fecha_sup, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha"), fechas_por_contrato.get(id_contrato, []))
        avisos += avisos_fecha

        id_estado, avisos_estado = rl.estado_legacy(f.get("id_estadosuplemento"), estados)
        avisos += avisos_estado

        monto, simbolo, avisos_moneda = rl.monto_y_moneda(
            f.get("valor_suplementocuc"), f.get("valor_suplementocup"))
        id_moneda = ids_moneda.get(simbolo)
        if id_moneda is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "moneda ausente en el destino",
                              "simbolo=%s" % simbolo)
            continue
        avisos += avisos_moneda

        codigo = rl.codigo_legado(f.get("codigo_suplemento"), id_legacy)
        if codigo in previos:
            registro.descarte(ORIGEN, id_legacy, nombre, "ya migrado",
                              "codigo=%s" % codigo)
            continue
        ya_usados.add(codigo)

        payloads.append({
            "codigo": codigo,
            "id_contrato": id_contrato,
            "nombre": nombre,
            "id_estado": id_estado,
            "fecha": fecha_sup,
            "fecha_vigencia": fecha_sup,
            "monto": monto,
            "documento": no_vacio(f.get("documento")),
        })

        for motivo, resumen, detalle in avisos:
            registro.warning(ORIGEN, id_legacy, nombre, motivo, detalle or resumen)

    print("  Filas a migrar: %d" % len(payloads))
    return payloads


def ejecutar(conn, registro: Registro, payloads):
    """Inserta por lotes. Cada lote es una transacción."""
    from psycopg2.extras import execute_values

    insertadas = 0
    columnas = list(payloads[0].keys()) if payloads else []
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    "INSERT INTO {t} ({c}) VALUES %s".format(
                        t=TABLA_SUPLEMENTO, c=", ".join(columnas)),
                    [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE,
                )
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase M] lote revertido: %s" % exc)
    return insertadas


def cargar_suplementos(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        por_codigo = db.codigos_de_contrato(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        estados = db.estados_contrato(conn)
        codigos_existentes = db.valores_existentes(conn, TABLA_SUPLEMENTO, "codigo")

    print("  Contratos migrados: %d | monedas: %s | estados: %d | ya migrados: %d"
          % (len(por_codigo), ",".join(sorted(ids_moneda)),
             len(estados), len(codigos_existentes)))
    if not por_codigo:
        print("  AVISO: no hay ningún contrato en PostgreSQL. La Fase M necesita "
              "a la L: sin contratos no hay a qué colgar un suplemento.")

    payloads = preparar(registro, por_codigo, estados, ids_moneda, codigos_existentes)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {TABLA_SUPLEMENTO: payloads})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d suplemento(s)" % len(payloads))
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
    print("  Suplementos insertados: %d" % insertadas)
    return insertadas, registro, payloads