# -*- coding: utf-8 -*-
"""Fase P: `artista_liquidacion` -> `persona_liquidacion`.

La Fase K lleva las liquidaciones del legacy a `liquidacion`, que es el módulo de
**compra**: el pago a un artista como proveedor. Esta fase lleva las **mismas
4.362 filas** a `persona_liquidacion`, que es el módulo de **proyecto**: el pago
a un realizador por **una etapa**. Son dos vistas del mismo hecho histórico, y
sin esta fase la pantalla `/proyectos/liquidaciones` sale vacía aunque haya años
de pagos registrados.

## En qué etapa va cada liquidación

Es el problema central, y es el mismo que ya tuvo `persona_etapa`. El legacy no
lo guarda: `artista_liquidacion` apunta a `id_contrato`, no a `id_etapa`, y la
tabla que lo ataría, `pago`, tiene 0 filas y ni siquiera se exporta. Se coloca
por esta escalera, y la regla que aplican cada una se cuenta al terminar:

  a. Una etapa de ese contrato donde la Fase O ya colgó a ese realizador. Si está
     en varias —la O la descuenta del total liquidado en cada una, y sólo se ve
     en las que tenían cobro para cubrirlo—, va a la que sí lo tiene. Es la
     decisión de la Fase O y se reutiliza tal cual: si el realizador ya aparece
     en una etapa, su liquidación se cuelga de ahí y las dos pantallas cuadran.
  b. Una etapa del mismo contrato **que ya tenga realizadores**, la primera.
  c. La **primera etapa** del contrato, que es la de entrega más antigua.

Las tres apuntan a una etapa real de un contrato migrado, así que ninguna inventa
una fila. Cuando el contrato no existe en el destino —o no tiene ninguna etapa—
la liquidación no tiene dónde ir y se descarta con su motivo.

## Lo que se decide aquí y no se deduce

`importe` se lleva el `neto_pagar` del legacy, no su `importe` bruto. No es por
capricho del dato, sino por coherencia: `persona_etapa.liquidada` y `por_cobrar` no
son un dato propio sino una caché que la aplicación recalcula desde
`persona_liquidacion` en cada confirmación o edición, sumando el `importe` de
las filas confirmadas (`servicio_repo.py:358-371`). La Fase O calculó esa caché
con `neto_pagar` porque la tabla estaba vacía; poner aquí el bruto haría que
`por_cobrar` se moviera solo en la próxima edición de cada liquidación. Con
`importe = neto_pagar` el recálculo reproduce exactamente lo que la Fase O dejó.

`confirmado` va en True: son pagos hechos. `id_pago` queda en NULL porque
`pago_factura_servicio` no se migra —no hay facturas de etapa que paguen— y es
NULLABLE. El legacy no trae ese vínculo.

`numero` sale con el patrón de `generar_codigo` (`CAG.AA.id`), no con el
`numero_liquidacion` del legacy: aquel sólo tiene 903 valores distintos en 4.362
filas y no puede ser clave. El id del legacy sí lo es, y es estable.

## Lo que no tiene destino, dicho aquí para que no se busque después

  · **El contrato de la liquidación.** `importe` no lo tiene ni `persona_liquidacion`
    ni `liquidacion`: va por `id_etapa` -> `id_solicitud_servicio`. Como la etapa
    se elige por las reglas de arriba, no hay forma de volver al contrato
    exacto que el legacy anotó, y por eso hay 19 liquidaciones descartadas.
  · **`porcientoempresa`**: no es un porcentaje sino un importe —llega a 387,44—,
    y la columna `porciento_empresa` del destino es un porcentaje. Ponerlo ahí
    mostraría "387,44 %". Se deja en 0.
  · **`id_tipoconcepto`**: el destino no tiene catálogo de conceptos, sólo el
    número, y los ids no viajan. El nombre que sí trae el catálogo del legacy se
    guarda al principio de `observacion`, que el legacy no usa.
  · **`importe_caguayo` y `tributario_monto`**: son columnas que la aplicación
    deriva de las anteriores; el legacy no las guarda. Van en 0 y se recalculan
    solas en la primera edición.
"""
import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TABLA_LIQUIDACION_PERSONA,
    TAMANO_LOTE,
)
from decimal import Decimal
from limpieza import texto
from log import Registro

#: La misma tabla del legacy que la Fase K lee: el log dice de dónde viene la
#: fila, no qué fase la usó, y las dos salen de aquí.
ORIGEN = "artista_liquidacion"

#: Lo que se anota en `observacion` cuando el legacy trae concepto, porque el
#: destino no tiene dónde guardarlo con su nombre.
PREFIJO_CONCEPTO = "Concepto: "

#: Prefijo del código, el mismo que usa la aplicación cuando no hay
#: denominación: `generar_codigo` cae en "CAG" (`codigos_entidad.py:30`).
PREFIJO_CODIGO = "CAG"

#: Sin nombre en el catálogo. Las 150 filas con `id_tipoconcepto = 0` no tienen
#: ninguna entrada, y "Otros" dice la verdad en vez de colarles el concepto
#: mayoritario como si fuera suyo. Es el mismo criterio que aplica la Fase K.
CONCEPTO_POR_DEFECTO = "Otros"


# --------------------------------------------------------------------------
# Lecturas del volcado
# --------------------------------------------------------------------------
def _leer(tabla):
    from fuente import leer_tabla

    return leer_tabla(DUMP_MARIADB, tabla)[1]


def _artistas_por_codigo():
    """`artista.id_artista` -> `codigo_exp`, la clave con la que la Fase A los
    migró a `clientes.codigo`."""
    from fuente import leer_artistas

    return {f["id_artista"]: (texto(f.get("codigo_exp")) or None)
            for f in leer_artistas(DUMP_MARIADB)}


def _tipos_concepto():
    """`id_tipoconcepto` -> nombre, desde el catálogo del propio dump."""
    salida = {}
    for f in _leer("tipo_concepto"):
        id_legacy = texto(f.get("id_tipoconcepto"))
        nombre = texto(f.get("nombre_tipoconcepto"))
        if id_legacy and nombre:
            salida[id_legacy] = nombre
    return salida


def _contratos_legacy():
    """id_contrato del legacy -> (codigo_contrato, id_contrato).

    El código es lo que empareja con el contrato ya migrado: los ids no se
    transportan y el destino le asigna el suyo detrás (ver `db.codigos_de_contrato`).
    """
    salida = {}
    for c in _leer("contrato"):
        id_legacy = texto(c.get("id_contrato"))
        if id_legacy:
            salida[id_legacy] = (texto(c.get("codigo_contrato")), id_legacy)
    return salida


def _fechas_por_artista(filas):
    """artista -> fechas ISO de SUS liquidaciones.

    Para las filas que vienen con '0000-00-00' la fecha de respaldo sale de otra
    liquidación del mismo artista, no de una fecha global inventada.
    """
    from limpieza import fecha as fecha_legado

    por_artista = {}
    for f in filas:
        fecha = fecha_legado(f.get("fecha_emision"))
        if fecha:
            por_artista.setdefault(f["id_artista"], []).append(fecha)
    return por_artista


def _dinero(valor, defecto="0.00"):
    """El importe del legacy con la precisión de la columna del destino.

    `neto_pagar` es `decimal(10,2)` en el legacy, pero el volcado trae filas con
    más decimales de los que la columna admite —`4100.2001953125`—. Sin
    recortar, cada fila se redondea al insertar y la suma que queda guardada ya
    no es la que calculó Python; como la Fase O suma para obtener `por_cobrar`,
    aquí se recorta a la misma precisión para que las dos mitades den el mismo
    número y el control de coherencia no falle por céntimos.
    """
    return rl.decimal_legacy(valor, defecto).quantize(Decimal("0.01"))


# --------------------------------------------------------------------------
# El destino
# --------------------------------------------------------------------------
def _etapas_por_contrato(conn):
    """id_contrato del destino -> [id_etapa] en el orden en que las puso la O.

    `etapas` cuelga de `solicitud_servicio`, y el contrato cuelga de la
    solicitud, así que el camino es ese y no hay columna directa. El orden es el
    de la Fase O —entrega más antigua primero, con los NULL al final— para que
    "la primera etapa" signifique lo mismo aquí y allí.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT s.id_contrato, e.id_etapa"
            "  FROM etapas e"
            "  JOIN solicitud_servicio s"
            "    ON s.id_solicitud_servicio = e.id_solicitud_servicio"
            " WHERE s.id_contrato IS NOT NULL"
            " ORDER BY s.id_contrato, (e.fecha_entrega IS NULL), e.fecha_entrega,"
            "          (e.numero_etapa IS NULL), e.numero_etapa, e.id_etapa"
        )
        salida = {}
        for id_contrato, id_etapa in cur.fetchall():
            salida.setdefault(id_contrato, []).append(id_etapa)
    return salida


def _personas_por_etapa(conn):
    """(id_etapa, id_persona) -> (cobro, por_cobrar) de cada fila de la Fase O."""
    with conn.cursor() as cur:
        cur.execute("SELECT id_etapa, id_persona, cobro, por_cobrar"
                    " FROM persona_etapa")
        return {(e, p): (c, pc) for e, p, c, pc in cur.fetchall()}


def _etapa_para(etapas_del_contrato, personas, id_persona):
    """La etapa de esta liquidación, y con qué regla se eligió.

    Devuelve (id_etapa, regla) o (None, None) si el contrato no tiene etapas.

    Cuando la persona está en varias etapas del mismo contrato hay que elegir una,
    y no da igual cuál: la Fase O descuenta el total liquidado del contrato en
    *cada* fila que crea para el par, así que el dinero se movió en todas pero
    sólo se ve en las que tenían `cobro` para cubrirlo. Va a esa. Ponerla en otra
    dejaría a la elegida con el `por_cobrar` ya descontado y sin ninguna
    liquidación detrás, que es justo lo que el control de coherencia marca.
    """
    if not etapas_del_contrato:
        return None, None

    donde = [e for e in etapas_del_contrato if (e, id_persona) in personas]
    if donde:
        for e in donde:
            cobro, por_cobrar = personas[(e, id_persona)]
            if cobro is not None and por_cobrar is not None and por_cobrar < cobro:
                return e, "etapa donde se descontó"
        return donde[0], "primera etapa con la persona"

    con_personas = {etapa for (etapa, _) in personas}
    for e in etapas_del_contrato:
        if e in con_personas:
            return e, "etapa con realizadores"

    return etapas_del_contrato[0], "primera etapa del contrato"


def _numero(fecha, id_legado):
    """`CAG.AA.<id_liquidacion del legacy>`, el patrón de `generar_codigo`.

    El año sale de la fecha de la liquidación y no del reloj como hace la
    aplicación (`servicio_service.py:875`): este número es la clave con la que la
    fase se reconoce a sí misma en la segunda pasada, y si dependiera de la fecha
    de ejecución, reejecutarla en otro año no reconocería lo que escribió la vez
    anterior y duplicaría las 4.362 filas.

    El id del legacy es único —4.362 de 4.362— y estable, que es justo lo que le
    faltaba a `numero_liquidacion`: 903 valores distintos para las mismas 4.362
    filas, 7 de ellas negativas.
    """
    anio = str(getattr(fecha, "year", None) or str(fecha or "")[:4])
    if not anio.isdigit():
        anio = "00"
    return "%s.%s.%s" % (PREFIJO_CODIGO, anio[-2:], id_legado)


# --------------------------------------------------------------------------
# Preparación
# --------------------------------------------------------------------------
def preparar(registro: Registro, codigos_cliente, codigos_contrato,
             etapas_por_contrato, personas, ids_moneda, numeros_existentes=()):
    """Arma los payloads. No escribe nada en la base.

    `personas` es `(id_etapa, id_persona) -> (cobro, por_cobrar)`, lo que dejó
    la Fase O; `etapas_por_contrato` es `id_contrato -> [id_etapa]` en orden.
    """
    filas = _leer("artista_liquidacion")
    codigos_artista = _artistas_por_codigo()
    conceptos = _tipos_concepto()
    contratos = _contratos_legacy()
    fechas_por_artista = _fechas_por_artista(filas)

    ya_usados = set(numeros_existentes)
    payloads = []
    reglas = {}

    for f in filas:
        id_legacy = texto(f.get("id_liquidacion"))
        codigo_artista = codigos_artista.get(f.get("id_artista"))
        nombre = codigo_artista
        fecha_emision, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha_emision"), fechas_por_artista.get(f.get("id_artista"), []))
        fecha_liquidacion, avisos_liq = rl.fecha_con_respaldo(
            f.get("fecha_liquidacion"), fechas_por_artista.get(f.get("id_artista"), []))
        numero = _numero(fecha_emision, id_legacy)

        if numero in ya_usados:
            registro.descarte(ORIGEN, id_legacy, nombre, "ya migrada",
                              "numero=%s" % numero)
            continue
        ya_usados.add(numero)

        id_persona = codigos_cliente.get(codigo_artista)
        if id_persona is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "artista no migrado",
                              "id_artista=%s codigo_exp=%r"
                              % (f.get("id_artista"), codigo_artista))
            continue

        id_contrato_legacy = texto(f.get("id_contrato"))
        codigo_contrato = contratos.get(id_contrato_legacy)
        if codigo_contrato is None:
            registro.descarte(
                ORIGEN, id_legacy, nombre, "contrato inexistente en el legacy",
                "id_contrato=%s: el legacy apunta a un contrato que no existe, "
                "sin contrato no hay solicitud y sin solicitud no hay etapa"
                % id_contrato_legacy)
            continue

        codigo, id_legacy_contrato = codigo_contrato
        id_contrato = codigos_contrato.get(codigo)
        if id_contrato is None:
            # El destino le pone el id detrás al código cuando choca con otro
            # contrato; es el mismo apaño que hace la Fase O.
            id_contrato = codigos_contrato.get("%s-%s" % (codigo, id_legacy_contrato))
        if id_contrato is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "contrato no migrado",
                              "codigo_contrato=%r id_contrato=%s"
                              % (codigo, id_legacy_contrato))
            continue

        id_etapa, regla = _etapa_para(etapas_por_contrato.get(id_contrato, []),
                                      personas, id_persona)
        if id_etapa is None:
            registro.descarte(
                ORIGEN, id_legacy, nombre, "contrato sin etapas",
                "id_contrato=%s (destino %s): hay etapas de su solicitud o no hay "
                "ninguna a la que colgar la liquidación"
                % (id_legacy_contrato, id_contrato))
            continue
        reglas[regla] = reglas.get(regla, 0) + 1

        simbolo, avisos_moneda = rl.simbolo_destino(f.get("moneda"))
        id_moneda_destino = ids_moneda.get(simbolo)
        if id_moneda_destino is None:
            registro.descarte(ORIGEN, id_legacy, nombre,
                              "moneda ausente en el destino",
                              "simbolo=%s" % simbolo)
            continue

        concepto = conceptos.get(texto(f.get("id_tipoconcepto")))
        if concepto is None:
            concepto = CONCEPTO_POR_DEFECTO
        observacion = texto(f.get("observacion")) or (PREFIJO_CONCEPTO + concepto)

        neto = _dinero(f.get("neto_pagar"))
        payload = {
            "numero": numero,
            "id_etapa": id_etapa,
            "id_persona": id_persona,
            "fecha_emision": fecha_emision,
            "fecha_liquidacion": fecha_liquidacion,
            "descripcion": texto(f.get("descripcion")),
            "id_moneda": id_moneda_destino,
            # El legacy usa el mismo criterio que la Fase K: con número de
            # cheque se considera que el pago fue por cheque.
            "tipo_pago": "CHEQUE" if texto(f.get("cheque")) else "TRANSFERENCIA",
            "importe": neto,
            "porcentaje_caguayo": _dinero(f.get("porcientocaguayo"), "10.00"),
            "importe_caguayo": _dinero("0.00"),
            "porciento_gestion": _dinero("0.00"),
            "porciento_empresa": _dinero("0.00"),
            "devengado": _dinero(f.get("devengado")),
            "tributario": _dinero(f.get("tributario")),
            "tributario_monto": _dinero("0.00"),
            "comision_bancaria": _dinero(f.get("comision_bancaria")),
            "comision_admin_obra": _dinero("0.00"),
            "neto_pagar": neto,
            "id_tipo_concepto": None,
            # El `factura` del legacy es el número de factura del pago. Aquí sí
            # hay columna donde guardarlo; en `liquidacion` (Fase K) no la había
            # y se perdió.
            "doc_pago_liquidacion": texto(f.get("factura")) or None,
            "gasto_empresa": _dinero("0.00"),
            "observacion": observacion,
            "confirmado": True,
            "id_pago": None,
        }
        payloads.append(payload)

        for motivo, resumen, detalle in (avisos_fecha + avisos_liq + avisos_moneda):
            registro.warning(ORIGEN, id_legacy, nombre, motivo, detalle or resumen)

    print("  Filas a migrar: %d" % len(payloads))
    for regla, total in sorted(reglas.items(), key=lambda kv: -kv[1]):
        print("    etapa elegida por %-28s %5d" % (regla + ":", total))
    return payloads


# --------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------
def ejecutar(conn, registro, payloads):
    """Inserta por lotes. Cada lote es una transacción: si falla, se revierte
    sólo ese y la fase sigue con el siguiente."""
    from psycopg2.extras import execute_values

    if not payloads:
        return 0

    insertadas = 0
    columnas = list(payloads[0].keys())
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    "INSERT INTO {t} ({c}) VALUES %s".format(
                        t=TABLA_LIQUIDACION_PERSONA, c=", ".join(columnas)),
                    [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE,
                )
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase P] lote revertido: %s" % exc)
    return insertadas


def cargar_liquidaciones_etapa(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        codigos_cliente = db.mapa_codigo_a_cliente(conn)
        codigos_contrato = db.codigos_de_contrato(conn)
        etapas_por_contrato = _etapas_por_contrato(conn)
        personas_de_etapa = _personas_por_etapa(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        numeros_existentes = db.valores_existentes(conn, TABLA_LIQUIDACION_PERSONA,
                                                    "numero")

    print("  Clientes en destino: %d | contratos: %d | contratos con etapas: %d"
          " | monedas: %s | liquidaciones ya: %d"
          % (len(codigos_cliente), len(codigos_contrato), len(etapas_por_contrato),
             ",".join(sorted(ids_moneda)), len(numeros_existentes)))
    if not etapas_por_contrato:
        print("  AVISO: no hay ninguna etapa en el destino. Esta fase necesita la "
              "Fase O: las liquidaciones cuelgan de una etapa y sin ella no hay "
              "dónde colocarlas.")

    payloads = preparar(registro, codigos_cliente, codigos_contrato,
                        etapas_por_contrato, personas_de_etapa, ids_moneda,
                        numeros_existentes)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(
            conn, {TABLA_LIQUIDACION_PERSONA: payloads},
            no_vacias={TABLA_LIQUIDACION_PERSONA: ("numero",)})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d liquidación(es) de etapa" % len(payloads))
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
    print("  Liquidaciones de etapa insertadas: %d" % insertadas)
    return insertadas, registro, payloads
