# -*- coding: utf-8 -*-
"""Fase K: `artista_liquidacion` -> `liquidacion`.

El legacy guarda una liquidación por fila, con el artista al que se le paga y el
contrato del que sale. Aquí entra sólo la cabecera: las líneas de producto y la
factura que la liquidan viven en tablas del legacy que no se exportan, así que
`id_factura` se queda en NULL.

Lo que no tiene destino y se pierde, dicho aquí para que no se busque después:

  · `descripcion`: hasta 2.000 caracteres con el detalle de la liquidación. La
    creó `add_liquidacion_tables` pero el modelo actual no la expone, así que
    sólo se rellena si la base viva tiene la columna (se comprueba con
    db.columnas, no se supone).
  · `porcientoempresa`: no es un porcentaje sino un importe —llega a 3.206.710—,
    y `liquidacion` no tiene columna para él.
  · `factura` (un varchar con el número del legacy) e `id_contrato`: el destino
    numera las facturas con su propia serie y el contrato va por `id_anexo`.

Las dos monedas del legacy se traducen en `reglas_legacy.monto_y_moneda`: CUP se
migra como CUP y CUC como USD, porque el destino no tiene CUC y no hay tipo de
cambio con el que convertirlo.
"""
import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TABLA_LIQUIDACION,
    TAMANO_LOTE,
)
from limpieza import fecha as fecha_legado
from limpieza import texto
from log import Registro

ORIGEN = "artista_liquidacion"

#: Lo que se pone en `tipo_concepto` cuando el legacy no tiene concepto. Las
#: 150 filas con `id_tipoconcepto = 0` no tienen ninguna entrada en el catálogo,
#: y la columna es NOT NULL: "Otros" dice la verdad, en lugar de colarles el
#: concepto mayoritario ("Por representación", 5.112 filas) como si fuera suyo.
CONCEPTO_POR_DEFECTO = "Otros"


def _artista_por_codigo():
    """`artista.id_artista` -> `codigo_exp`, la clave con la que la Fase A los
    migrated a `clientes.codigo`.

    Se reconstruye desde el propio dump en vez de leerlo de PostgreSQL porque la
    Fase A copia el `codigo_exp` tal cual: es lo mismo, pero sin depender de que
    la Fase A ya haya corrido contra esta base.
    """
    from fuente import leer_artistas

    filas = leer_artistas(DUMP_MARIADB)
    return {f["id_artista"]: (texto(f.get("codigo_exp")) or None) for f in filas}


def _tipos_concepto():
    """`id_tipoconcepto` -> nombre, desde el catálogo del propio dump."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "tipo_concepto")
    salida = {}
    for f in filas:
        id_legacy = texto(f.get("id_tipoconcepto"))
        nombre = texto(f.get("nombre_tipoconcepto"))
        if id_legacy and nombre:
            salida[id_legacy] = nombre
    return salida


def _fechas_por_artista(filas):
    """artista -> fechas ISO de SUS liquidaciones.

    Para las 8 filas que vienen con '0000-00-00': la fecha de respaldo sale de
    otra liquidación del mismo artista, no de una fecha global inventada.
    """
    por_artista = {}
    for f in filas:
        fecha = fecha_legado(f.get("fecha_emision"))
        if fecha:
            por_artista.setdefault(f["id_artista"], []).append(fecha)
    return por_artista


def _nombre(artistas, id_artista):
    return artistas.get(id_artista)


def preparar(registro: Registro, codigos_cliente, ids_moneda, columnas_destino,
             codigos_existentes=()):
    """Arma los payloads. No escribe nada en la base."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "artista_liquidacion")
    codigos_artista = _artista_por_codigo()
    conceptos = _tipos_concepto()
    fechas_por_artista = _fechas_por_artista(filas)
    lleva_descripcion = "descripcion" in columnas_destino
    lleva_concepto = "tipo_concepto" in columnas_destino

    ya_usados = set(codigos_existentes)
    payloads = []

    for f in filas:
        id_legacy = texto(f.get("id_liquidacion"))
        codigo = rl.codigo_legado(f.get("numero_liquidacion"), id_legacy)
        nombre = _nombre(codigos_artista, f.get("id_artista"))

        id_cliente = codigos_cliente.get(codigos_artista.get(f.get("id_artista")))
        if id_cliente is None:
            registro.descarte(ORIGEN, id_legacy, nombre,
                              "artista no migrado",
                              "id_artista=%s codigo_exp=%r"
                              % (f.get("id_artista"), codigos_artista.get(f.get("id_artista"))))
            continue

        fecha_emision, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha_emision"), fechas_por_artista.get(f.get("id_artista"), []))
        fecha_liquidacion, avisos_liq = rl.fecha_con_respaldo(
            f.get("fecha_liquidacion"), fechas_por_artista.get(f.get("id_artista"), []))
        if fecha_emision is None:
            registro.descarte(ORIGEN, id_legacy, nombre,
                              "sin fecha y sin respaldo",
                              "id_artista=%s no tiene ninguna otra liquidacion"
                              % f.get("id_artista"))
            continue

        simbolo, avisos_moneda = rl.simbolo_destino(f.get("moneda"))
        id_moneda = ids_moneda.get(simbolo)
        if id_moneda is None:
            registro.descarte(ORIGEN, id_legacy, nombre,
                              "moneda ausente en el destino",
                              "simbolo=%s" % simbolo)
            continue

        concepto = conceptos.get(texto(f.get("id_tipoconcepto")))
        if concepto is None:
            concepto = CONCEPTO_POR_DEFECTO
            avisos_concepto = [("concepto %s sin nombre en el catalogo"
                                % (texto(f.get("id_tipoconcepto")) or "vacio"),
                                "se asume %s" % CONCEPTO_POR_DEFECTO, None)]
        else:
            avisos_concepto = []

        observaciones = texto(f.get("observacion"))
        payload = {
            "codigo": codigo,
            "id_cliente": id_cliente,
            "id_moneda": id_moneda,
            "liquidada": texto(f.get("liquidada")).lower() in ("si", "sí", "true", "1"),
            "fecha_emision": fecha_emision,
            "fecha_liquidacion": fecha_liquidacion,
            "observaciones": observaciones,
            "devengado": rl.decimal_legacy(f.get("devengado")),
            "tributario": rl.decimal_legacy(f.get("tributario")),
            "comision_bancaria": rl.decimal_legacy(f.get("comision_bancaria")),
            "neto_pagar": rl.decimal_legacy(f.get("neto_pagar")),
            "importe": rl.decimal_legacy(f.get("importe")),
            "gasto_empresa": rl.decimal_legacy("0.00"),
            "porcentaje_caguayo": rl.decimal_legacy(f.get("porcientocaguayo"), "10.00"),
            "importe_caguayo": rl.decimal_legacy("0.00"),
            "tributario_monto": rl.decimal_legacy("0.00"),
            "tipo_pago": "CHEQUE" if texto(f.get("cheque")) else "TRANSFERENCIA",
        }
        if lleva_descripcion:
            descripcion = texto(f.get("descripcion"))
            if descripcion:
                payload["descripcion"] = descripcion
        if lleva_concepto:
            # `add_liquidacion_tables` creó esta columna como NOT NULL sin
            # default y el modelo actual ya no la expone. Si la base viva la
            # tiene, hay que llenarla o el INSERT revienta; si no, se ignora.
            payload["tipo_concepto"] = concepto

        if codigo in ya_usados:
            registro.descarte(ORIGEN, id_legacy, nombre, "ya migrada",
                              "codigo=%s" % codigo)
            continue
        ya_usados.add(codigo)
        payloads.append(payload)

        for motivo, resumen, detalle in (avisos_fecha + avisos_liq + avisos_moneda
                                         + avisos_concepto):
            registro.warning(ORIGEN, id_legacy, nombre, motivo, detalle or resumen)

    print("  Filas a migrar: %d" % len(payloads))
    return payloads


def _columnas(conn, payloads):
    """Las columnas comunes a todos los payloads, en el orden del primero."""
    if not payloads:
        return []
    return list(payloads[0].keys())


def ejecutar(conn, registro: Registro, payloads):
    """Inserta por lotes. Cada lote es una transacción: si falla, se revierte
    sólo ese y la fase sigue con el siguiente."""
    from psycopg2.extras import execute_values

    insertadas = 0
    columnas = _columnas(conn, payloads)
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    "INSERT INTO {t} ({c}) VALUES %s".format(
                        t=TABLA_LIQUIDACION, c=", ".join(columnas)),
                    [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE,
                )
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase K] lote revertido: %s" % exc)
    return insertadas


def cargar_liquidaciones(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        codigos_cliente = db.mapa_codigo_a_cliente(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        columnas_destino = db.columnas(conn, TABLA_LIQUIDACION)
        codigos_existentes = db.valores_existentes(conn, TABLA_LIQUIDACION, "codigo")

    print("  Clientes en destino: %d | monedas: %s | liquidaciones ya: %d"
          % (len(codigos_cliente), ",".join(sorted(ids_moneda)), len(codigos_existentes)))

    payloads = preparar(registro, codigos_cliente, ids_moneda, columnas_destino,
                        codigos_existentes)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {TABLA_LIQUIDACION: payloads})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d liquidación(es)" % len(payloads))
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
    print("  Liquidaciones insertadas: %d" % insertadas)
    return insertadas, registro, payloads