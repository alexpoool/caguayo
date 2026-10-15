# -*- coding: utf-8 -*-
"""Fase L: `contrato` -> `contrato`.

El legacy no guarda el cliente en el contrato. Lo que guarda es
`id_solicitudsc`, y el cliente está en `solicitud_sc.id_cliente`: por eso esa
tabla se exporta aunque no se migre. `id_oferta` es un callejón —3.389 de 3.396
contratos lo tienen a 0 y `oferta` sólo tiene 7 filas— y no se usa.

El `id_cliente` del destino se resuelve por `codigo`, no por id: los ids de las
dos bases no significan lo mismo. El código es el `cliente.codigo` del legacy,
o `LEG-{id_cliente}` si vino vacío, que es la misma regla que aplica la Fase B
(ver `migrar_clientes._codigo_de_rescate`). Sin ese mismo nombre, los cuatro
clientes que el legacy guardó sin código no se encontrarían.

Del contrato se migra la cabecera. `factura` cuelga de `contrato` en el destino
pero no se migra, así que no hay facturas apuntando a estos contratos: la Fase L
deja el árbol de facturas vacío y no toca los importes de la liquidaciones, que
son los que se están pagando.

Lo que el legacy guarda y aquí no va:

  · `id_solicitudsc` y `id_oferta`: son de la base vieja y no tienen equivalente.
  · `numero`: el destino numera por su cuenta (`recodificar_cod_contrato_supl`).
  · `id_solicitudsc` apunta a la solicitud que lo originó, y las solicitudes no
    se migran.
"""
import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TABLA_CONTRATO,
    TAMANO_LOTE,
)
from limpieza import no_vacio, texto
from log import Registro
from migrar_catalogo import _clave

ORIGEN = "contrato"


def _clientes_legacy():
    """`id_cliente` del legacy -> el código con el que está en PostgreSQL."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "cliente")
    salida = {}
    for f in filas:
        id_legacy = texto(f.get("id_cliente"))
        if not id_legacy:
            continue
        salida[id_legacy] = no_vacio(f.get("codigo")) or "LEG-%s" % id_legacy
    return salida


def _solicitudes():
    """`id_solicitudsc` -> `id_cliente` del legacy.

    Sólo se usa para los contratos: la tabla no se migra.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "solicitud_sc")
    return {texto(f.get("id_solicitudsc")): texto(f.get("id_cliente")) for f in filas}


def _tipos_legacy():
    """`id_tipocontrato` del legacy -> nombre del tipo."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "tipo_contrato")
    salida = {}
    for f in filas:
        id_legacy = texto(f.get("id_tc"))
        nombre = texto(f.get("nombre_tc"))
        if id_legacy and nombre:
            salida[id_legacy] = nombre
    return salida


def _tipo_mas_usado(filas):
    """El tipo de contrato más frecuente, para los que vienen con id 0.

    No se escribe a mano: se cuenta sobre el propio dump, porque un id 0 no es
    "sin tipo" sino "tipo desconocido", y lo más probable es que sea el que se
    usaba para todo.
    """
    conteo = {}
    for f in filas:
        id_legacy = texto(f.get("id_tipocontrato"))
        if id_legacy and id_legacy != "0":
            conteo[id_legacy] = conteo.get(id_legacy, 0) + 1
    if not conteo:
        return None
    return max(conteo, key=lambda k: (conteo[k], k))


def _fechas_por_cliente(filas, solicitudes):
    """cliente del legacy -> fechas ISO de SUS contratos."""
    por_cliente = {}
    for f in filas:
        fecha = no_vacio(f.get("fecha"))
        if not fecha or fecha.startswith("0000"):
            continue
        id_cliente = solicitudes.get(texto(f.get("id_solicitudsc")))
        if id_cliente:
            por_cliente.setdefault(id_cliente, []).append(fecha[:10])
    return por_cliente


def preparar(registro: Registro, codigos_cliente, ids_moneda, estados,
             tipos_destino, columnas_destino, codigos_existentes=()):
    """Arma los payloads. No escribe nada en la base."""
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "contrato")
    codigos_legacy = _clientes_legacy()
    solicitudes = _solicitudes()
    tipos_legacy = _tipos_legacy()
    tipo_defecto = _tipo_mas_usado(filas)
    fechas_por_cliente = _fechas_por_cliente(filas, solicitudes)
    lleva_texto = "texto_contrato" in columnas_destino

    # El destino se lee por clave normalizada, igual que hacía la Fase I, para
    # que "Compra-Venta" del legacy y "compra venta" ya cargado sean el mismo.
    tipos = {_clave(n): i for n, i in tipos_destino.items()}
    id_tipo_defecto = tipos.get(_clave(tipos_legacy.get(tipo_defecto) or ""))

    previos = set(codigos_existentes)
    ya_usados = set(codigos_existentes)
    payloads = []

    for f in filas:
        id_legacy = texto(f.get("id_contrato"))
        nombre = no_vacio(f.get("nombre_contrato"))
        if not nombre:
            # `nombre` es NOT NULL. No hay ninguno en el dump, pero si lo hubiera
            # el motivo tiene que salir escrito: un descarte silencioso aquí sería
            # un contrato que nadie sabe por qué no está.
            registro.descarte(ORIGEN, id_legacy, None, "nombre vacio",
                              "codigo_contrato=%r" % f.get("codigo_contrato"))
            continue

        id_solicitud = texto(f.get("id_solicitudsc"))
        if not id_solicitud or id_solicitud == "0":
            registro.descarte(ORIGEN, id_legacy, nombre, "sin solicitud",
                              "id_solicitudsc=%s" % (id_solicitud or "vacio"))
            continue
        id_cliente_legacy = solicitudes.get(id_solicitud)
        if id_cliente_legacy is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "solicitud no encontrada",
                              "id_solicitudsc=%s" % id_solicitud)
            continue
        if id_cliente_legacy == "0":
            registro.descarte(ORIGEN, id_legacy, nombre, "solicitud sin cliente",
                              "id_solicitudsc=%s" % id_solicitud)
            continue
        codigo_cliente = codigos_legacy.get(id_cliente_legacy)
        id_cliente = codigos_cliente.get(codigo_cliente) if codigo_cliente else None
        if id_cliente is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "cliente no migrado",
                              "id_cliente legacy=%s codigo=%r"
                              % (id_cliente_legacy, codigo_cliente))
            continue

        avisos = []

        fecha_contrato, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha"), fechas_por_cliente.get(id_cliente_legacy, []))
        avisos += avisos_fecha

        id_tipo, avisos_tipo = _tipo_destino(
            f.get("id_tipocontrato"), tipos_legacy, tipos, id_tipo_defecto)
        avisos += avisos_tipo

        id_estado, avisos_estado = rl.estado_legacy(f.get("id_estadocontrato"), estados)
        avisos += avisos_estado

        monto, simbolo, avisos_moneda = rl.monto_y_moneda(
            f.get("valor_contratocuc"), f.get("valor_contratocup"))
        id_moneda = ids_moneda.get(simbolo)
        if id_moneda is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "moneda ausente en el destino",
                              "simbolo=%s" % simbolo)
            continue
        avisos += avisos_moneda

        codigo, choca = rl.codigo_unico(f.get("codigo_contrato"), id_legacy, ya_usados)
        if choca:
            avisos.append(("codigo duplicado en el legacy",
                           "se anade el id: %s" % codigo,
                           "otro contrato del legacy ya usa %s"
                           % (texto(f.get("codigo_contrato")))))

        ya_migrado = rl.codigo_previo(f.get("codigo_contrato"), id_legacy, previos)
        if ya_migrado:
            registro.descarte(ORIGEN, id_legacy, nombre, "ya migrado",
                              "codigo=%s" % ya_migrado)
            continue
        ya_usados.add(codigo)

        payload = {
            "codigo": codigo,
            "id_cliente": id_cliente,
            "nombre": nombre,
            "id_estado": id_estado,
            "id_tipo_contrato": id_tipo,
            "id_moneda": id_moneda,
            "fecha": fecha_contrato,
            "vigencia": fecha_contrato,
            "monto": monto,
            "documento_final": no_vacio(f.get("documento")),
            # `proforma` del destino es el NÚMERO de proforma de la aplicación,
            # no el texto del contrato. El texto va en su propia columna.
            "proforma": None,
        }
        if lleva_texto:
            payload["texto_contrato"] = no_vacio(f.get("proforma"))

        payloads.append(payload)

        for motivo, resumen, detalle in avisos:
            registro.warning(ORIGEN, id_legacy, nombre, motivo, detalle or resumen)

    print("  Filas a migrar: %d" % len(payloads))
    return payloads


def _tipo_destino(id_tipocontrato, tipos_legacy, tipos, id_tipo_defecto):
    """`id_tipocontrato` del legacy -> `id_tipo_contrato` del destino.

    Por el NOMBRE del tipo, nunca por el id: los ids de las dos bases no
    significan lo mismo y el catálogo lo subió la Fase I con su propia serie.

    Un 0 va al tipo más usado, con aviso: `id_tipo_contrato` es NOT NULL y
    dejar fuera 82 contratos por un 0 sería peor que suponer cuál era.
    """
    clave = texto(id_tipocontrato) or "0"
    nombre = tipos_legacy.get(clave)

    if nombre is None:
        if id_tipo_defecto is None:
            raise RuntimeError(
                "no hay ningún tipo de contrato en el destino ni en el legacy; "
                "la Fase I tiene que correr antes que la L"
            )
        return id_tipo_defecto, [(
            "tipo %s sin equivalencia" % clave,
            "se asume el tipo mas usado",
            None,
        )]

    id_destino = tipos.get(_clave(nombre))
    if id_destino is None:
        if id_tipo_defecto is None:
            raise RuntimeError(
                "el destino no tiene el tipo %r del legacy; la Fase I tiene que "
                "correr antes que la L" % nombre
            )
        return id_tipo_defecto, [(
            "tipo %r no esta en PostgreSQL" % nombre,
            "se asume el tipo mas usado",
            None,
        )]
    return id_destino, []


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
                        t=TABLA_CONTRATO, c=", ".join(columnas)),
                    [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE,
                )
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase L] lote revertido: %s" % exc)
    return insertadas


def cargar_contratos(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        codigos_cliente = db.mapa_codigo_a_cliente(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        estados = db.estados_contrato(conn)
        tipos_destino = db.tipos_contrato(conn)
        columnas_destino = db.columnas(conn, TABLA_CONTRATO)
        codigos_existentes = db.valores_existentes(conn, TABLA_CONTRATO, "codigo")

    print("  Clientes: %d | monedas: %s | estados: %d | tipos: %d | ya migrados: %d"
          % (len(codigos_cliente), ",".join(sorted(ids_moneda)),
             len(estados), len(tipos_destino), len(codigos_existentes)))

    payloads = preparar(registro, codigos_cliente, ids_moneda, estados,
                        tipos_destino, columnas_destino, codigos_existentes)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {TABLA_CONTRATO: payloads})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d contrato(s)" % len(payloads))
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
    print("  Contratos insertados: %d" % insertadas)
    return insertadas, registro, payloads