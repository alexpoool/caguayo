# -*- coding: utf-8 -*-
"""Fase O: `etapas_cs` -> `etapas`, con su tarea y sus realizadores.

Tres cosas en un módulo porque las tres cuelgan de la misma etapa, y el id de la
etapa no existe hasta que se insertan las etapas.

1. **etapas.** Las 2.047 reales de `etapas_cs` y 1.865 sintéticas para las
   solicitudes que no tienen ninguna. `etapas.id_solicitud_servicio` es NOT NULL
   y en el legacy no existe: la etapa cuelga de `id_contrato` o `id_suplemento`,
   así que se llega a la solicitud por el camino inverso al de la Fase L.

2. **tareas.** Una por etapa, 3.912, todas sintéticas: el legacy no guarda
   ninguna línea de trabajo por etapa. Lo que había —`items` e `items_factura`,
   46 filas— cuelga de ofertas y facturas que no se relacionan con las etapas.
   Ojo con `concepto`: `tareas_etapa` NO tiene esa columna; el texto de una tarea
   sale del catálogo `servicios` por `id_servicio`, así que aquí se copia
   `nombre_etapa` a `concepto_modificado`, que sí es texto libre.

3. **personas.** De `artista_contrato`, el único sitio que dice a quién se le
   cobra en cada contrato (4.543 filas). **No dice en qué etapa**: la tabla que
   lo ataría, `pago`, tiene `id_etapa` y 0 filas, y se han revisado las 52 tablas
   del legacy. Por eso los artistas del contrato van a su PRIMERA etapa —la de
   `fecha_entrega` más antigua, que es donde el legacy nombra "100% a la firma"—,
   y se marcan con `asignada_por_migracion` para que la pantalla avise. Sólo 18
   etapas tienen artista real, vía `artista_suplemento`.

Lo que NO se migra aquí y sigue vacío: `certificacion`, `oferta`,
`factura_servicio` y `pago_factura_servicio`. El legacy tiene 15 facturas y 35
`items_factura`, pero cuelgan de `factura`, que no cuelga de ninguna etapa.
`persona_liquidacion` la migra la Fase P, que lee estas etapas y estos
realizadores y cuelga de ellos las liquidaciones del legacy.
"""
import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TAMANO_LOTE,
)
from diagnostico import Diagnostico, revisar_etapas
from limpieza import fecha as fecha_legado
from limpieza import no_vacio, texto
from log import Registro

ORIGEN = "etapas_cs"
ORIGEN_PERSONAS = "artista_contrato"

TABLA_ETAPA = "etapas"
TABLA_TAREA = "tareas_etapa"
TABLA_PERSONA = "persona_etapa"
TABLA_SOLICITUD = "solicitud_servicio"
TABLA_CONTRATO = "contrato"
TABLA_SERVICIO = "servicios"

LARGO_NOMBRE_ETAPA = 150
NOMBRE_ETAPA_SINTETICA = "Etapa única"

MOTIVO_CONCENTRADO = (
    "El legacy no guarda en qué etapa va cada artista: su tabla para eso, pago, "
    "tiene 0 filas. Los del contrato se pusieron en su primera etapa, que es la "
    "de entrega más antigua."
)


# --------------------------------------------------------------------------
# Lecturas del dump
# --------------------------------------------------------------------------
def _leer(tabla):
    from fuente import leer_tabla

    return leer_tabla(DUMP_MARIADB, tabla)[1]


def _suplementos_legacy():
    """`id_suplemento` -> `id_contrato` del legacy."""
    return {texto(f.get("id_suplemento")): texto(f.get("id_contrato"))
            for f in _leer("suplemento")}


def _artistas_legacy():
    """`id_artista` -> `codigo_exp`, que es la clave con la que la Fase A los
    migrated a `clientes.codigo`."""
    return {a["id_artista"]: (texto(a.get("codigo_exp")) or None)
            for a in _leer("artista")}


def _cobros():
    """(id_artista, id_contrato) -> (cobro_cuc, cobro_cup)."""
    salida = {}
    for a in _leer("artista_contrato"):
        salida[(a.get("id_artista"), a.get("id_contrato"))] = (
            rl.decimal_legacy(a.get("cobro_cuc")),
            rl.decimal_legacy(a.get("cobro_cup")),
        )
    return salida


def _liquidado():
    """(id_artista, id_contrato) y moneda -> suma de los `neto_pagar`.

    Se separa por moneda porque `artista_liquidacion` la trae en su propia
    columna y `por_cobrar` se calcula moneda a moneda: restarle a un cobro en CUP
    el total liquidado, que mezcla CUP y CUC, lo dejaría descuadrado.

    Las 5.392 liquidaciones caen el 100% dentro de algún par de
    `artista_contrato`, así que es el mismo dinero que ve el artista.
    """
    salida = {}
    for liq in _leer("artista_liquidacion"):
        simbolo, _ = rl.simbolo_destino(liq.get("moneda"))
        clave = (liq.get("id_artista"), liq.get("id_contrato"), simbolo)
        salida[clave] = salida.get(clave, rl.decimal_legacy("0")) + rl.decimal_legacy(
            liq.get("neto_pagar"))
    return salida


def _artistas_por_suplemento():
    """`id_suplemento` -> [(id_artista, cobro_cuc, cobro_cup)].

    Las etapas cuyo suplemento tiene artistas declarados: el único camino con
    dato real de a qué etapa va un artista. Se descartan los `id_suplemento` a 0,
    que no son un suplemento.
    """
    salida = {}
    for a in _leer("artista_suplemento"):
        suplemento = texto(a.get("id_suplemento"))
        if not suplemento or suplemento == "0":
            continue
        salida.setdefault(suplemento, []).append(
            (a.get("id_artista"), rl.decimal_legacy(a.get("cobro_cuc")),
             rl.decimal_legacy(a.get("cobro_cup"))))
    return salida


def _artistas_por_suplemento_con_contrato(supplemented):
    """`id_suplemento` -> [(id_artista, id_contrato, cobro_cuc, cobro_cup)].

    Con el contrato resuelto, que es lo que hace falta para no volver a colocar
    al mismo artista en la primera etapa: sin esto, uno que ya tiene su etapa
    real se pondría dos veces y la pareja (etapa, persona) quedaría repetida,
    que el servicio rechaza (`servicio_service.py:298`).
    """
    salida = {}
    for a in _leer("artista_suplemento"):
        suplemento = texto(a.get("id_suplemento"))
        if not suplemento or suplemento == "0":
            continue
        id_contrato = supplemented.get(suplemento)
        if not id_contrato or id_contrato == "0":
            continue
        salida.setdefault(suplemento, []).append(
            (a.get("id_artista"), id_contrato,
             rl.decimal_legacy(a.get("cobro_cuc")),
             rl.decimal_legacy(a.get("cobro_cup"))))
    return salida


# --------------------------------------------------------------------------
# Etapas
# --------------------------------------------------------------------------
def _contrato_legacy_por_id():
    """`id_contrato` del legacy -> fila del contrato."""
    return {texto(c.get("id_contrato")): c for c in _leer("contrato")}


def _contrato_destino(conn):
    """`contrato.codigo` -> (`id_contrato`, símbolo de su moneda)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT c.codigo, c.id_contrato, m.simbolo"
            "  FROM contrato c JOIN moneda m ON m.id_moneda = c.id_moneda"
            " WHERE c.codigo IS NOT NULL")
        return {cod: (i, (s or "").strip().upper())
                for cod, i, s in cur.fetchall() if cod}


def _solicitudes_del_destino(conn):
    """`id_solicitud_servicio` -> `id_contrato` (sólo las ya enlazadas)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id_solicitud_servicio, id_contrato"
                    "  FROM %s WHERE id_contrato IS NOT NULL" % TABLA_SOLICITUD)
        return {s: c for s, c in cur.fetchall()}


def _contrato_destino_por_legacy(conn):
    """`id_contrato` del legacy -> {símbolo: `id_contrato` del destino}.

    De los códigos que puede tener una copia —el limpio y el que lleva el id,
    por si chocó con otro contrato— se queda con el primero que exista y que no
    esté ya reclamado por otro contrato, recorriendo el volcado en su orden. La
    Fase L le da el código limpio al primer contrato que lo usa y el del id a los
    siguientes, así que este reparto devuelve cada copia a su contrato de verdad.
    Sin la reserva, dos contratos con el mismo `codigo_contrato` se pisaban: la
    copia de uno se quedaba con el contrato destino del otro y su persona caía en
    una etapa distinta de la que esperaba su liquidación.
    """
    codigos = _contrato_destino(conn)
    reclamados = set()
    salida = {}
    for id_legacy, c in _contrato_legacy_por_id().items():
        # La Fase L guarda el código del contrato con el prefijo `FT.`
        # (`migrar_contratos.preparar`): aquí hay que buscar las copias con el
        # mismo prefijo, o ningún candidato existe y realizadores y
        # liquidaciones quedan sin destino.
        base = "FT.%s" % (texto(c.get("codigo_contrato")) or "LEG-%s" % id_legacy)
        candidatos = rl.copias_de_contrato(
            base, id_legacy, c.get("valor_contratocuc"), c.get("valor_contratocup"))
        por_simbolo = {}
        for _, cand in candidatos:
            if cand not in codigos:
                continue
            id_dest, simbolo = codigos[cand]
            if id_dest in reclamados or simbolo in por_simbolo:
                continue
            por_simbolo[simbolo] = id_dest
        for id_dest in por_simbolo.values():
            reclamados.add(id_dest)
        if por_simbolo:
            salida[id_legacy] = por_simbolo
    return salida


def contratos_por_moneda(conn):
    """`id_contrato` del legacy -> {símbolo: `id_contrato` del destino}.

    Un contrato con una sola moneda tiene una entrada; uno que la Fase L partió
    por tener las dos tiene dos, CUP y CUC. Sirve para que una liquidación
    encuentre la copia del contrato que le corresponde por moneda.
    """
    return _contrato_destino_por_legacy(conn)


def _solicitud_por_contrato(conn):
    """Devuelve (solicitud_por_contrato, contrato_por_solicitud).

    · `solicitud_por_contrato`: id_contrato legacy -> {símbolo: id_solicitud}.
      Una entrada por moneda: el contrato partido tiene CUP y CUC.
    · `contrato_por_solicitud`: id_solicitud -> (id_contrato legacy, fila,
      símbolo), para las etapas sintéticas.
    """
    contratos = _contrato_legacy_por_id()
    por_legacy = _contrato_destino_por_legacy(conn)

    # id_contrato del destino -> (id_contrato legacy, fila, símbolo)
    destino_a_legacy = {}
    for id_legacy, simbolos in por_legacy.items():
        c = contratos[id_legacy]
        for simbolo, id_dest in simbolos.items():
            destino_a_legacy[id_dest] = (id_legacy, c, simbolo)

    solicitud_por_contrato = {}
    contrato_por_solicitud = {}
    for id_solicitud, id_dest in _solicitudes_del_destino(conn).items():
        par = destino_a_legacy.get(id_dest)
        if not par:
            continue
        id_legacy, c, simbolo = par
        solicitud_por_contrato.setdefault(id_legacy, {})[simbolo] = id_solicitud
        contrato_por_solicitud[id_solicitud] = (id_legacy, c, simbolo)
    return solicitud_por_contrato, contrato_por_solicitud


def _agrupar_etapas(registro, solicitud_por_contrato, supplemented):
    """id_solicitud -> [etapa del legacy], ordenada por fecha de entrega.

    Un contrato que la Fase L partió en dos por tener las dos monedas tiene dos
    solicitudes —una por moneda—, así que cada etapa suya entra en las **dos**:
    es la copia que deja completo el árbol de cada proyecto (CUP y CUC). Las de
    un contrato de una sola moneda entran sólo en la suya.

    Las que no llegan a ninguna solicitud se descartan con su motivo: sin
    solicitud no hay `id_solicitud_servicio`, que es NOT NULL.
    """
    por_solicitud = {}
    sin_destino = []
    for f in _leer("etapas_cs"):
        base = f.get("id_contrato")
        if base in (None, "", "0"):
            base = supplemented.get(f.get("id_suplemento"))
        copias = solicitud_por_contrato.get(base) if base else None
        if not copias:
            sin_destino.append(f)
            continue
        for id_solicitud in copias.values():
            por_solicitud.setdefault(id_solicitud, []).append(f)

    for f in sin_destino:
        registro.descarte(
            ORIGEN, texto(f.get("id_etapa")), no_vacio(f.get("nombre_etapa")),
            "sin solicitud",
            "id_contrato=%s id_suplemento=%s: el complemento no llega a un "
            "contrato y sin contrato no hay id_solicitudsc con el que llegar a "
            "la solicitud" % (f.get("id_contrato"), f.get("id_suplemento")))

    for lista in por_solicitud.values():
        lista.sort(key=lambda f: (fecha_legado(f.get("fecha_entrega"))
                                  or rl.FECHA_SIN_RESPALDO,
                                  int(f.get("id_etapa") or 0)))
    return por_solicitud


def _monto_de_etapa(f, simbolo):
    """El importe de la etapa en la moneda de su copia.

    El legacy guarda las dos columnas (`pago_cuc` y `pago_cup`) y cada copia se
    queda con la suya: la CUP con `pago_cup` y la CUC con `pago_cuc`. Un contrato
    de una sola moneda sólo genera una copia, así que sólo se lee una columna.
    """
    col = "pago_cup" if simbolo == "CUP" else "pago_cuc"
    return rl.decimal_legacy(f.get(col))


def _payload_etapa_real(f, numero, contrato, ids_moneda, simbolo):
    """Payload de una etapa que sí venía en el legacy, en la moneda `simbolo`."""
    valor = _monto_de_etapa(f, simbolo)
    fecha_contrato = fecha_legado(contrato.get("fecha")) if contrato else None
    fecha_entrega, avisos_fecha = rl.fecha_con_respaldo(
        f.get("fecha_entrega"), [fecha_contrato] if fecha_contrato else [])

    # `fecha_pago` es NULLABLE y viene a cero en 1.908 de 2.058 etapas. Se deja
    # a NULL en vez de inventar un cobro: el reporte no podrá fechar esos pagos,
    # que es mejor que fecharlos mal.
    fecha_pago = fecha_legado(f.get("fecha_pago"))

    nombre = (no_vacio(f.get("nombre_etapa"))
              or (no_vacio(contrato.get("nombre_contrato")) if contrato else None))
    payload = {
        "id_solicitud_servicio": None,  # lo pone quien agrupa
        "numero_etapa": numero,
        "nombre_etapa": (nombre or NOMBRE_ETAPA_SINTETICA)[:LARGO_NOMBRE_ETAPA],
        "fecha_entrega": fecha_entrega,
        "fecha_pago": fecha_pago,
        "descripcion": no_vacio(f.get("descripcion_detallada")),
        "valor": valor,
        "id_moneda": ids_moneda.get(simbolo),
        "pagada": (texto(f.get("pagada_cup")) or "").strip().lower() == "si",
        "tipo_etapa": "TAREAS",
    }
    return payload, avisos_fecha


def _payload_etapa_sintetica(contrato, ids_moneda, simbolo):
    """La etapa única de una solicitud que no tenía ninguna, en su moneda.

    El importe sale del contrato y la fecha de su firma. Ningún contrato tiene
    dos solicitudes sin etapa —comprobado sobre el volcado—, así que repartir el
    importe del contrato no duplica nada.
    """
    col = "valor_contratocup" if simbolo == "CUP" else "valor_contratocuc"
    valor = rl.decimal_legacy(contrato.get(col))
    fecha, avisos_fecha = rl.fecha_con_respaldo(contrato.get("fecha"), [])
    payload = {
        "id_solicitud_servicio": None,
        "numero_etapa": 1,
        "nombre_etapa": (no_vacio(contrato.get("nombre_contrato"))
                         or NOMBRE_ETAPA_SINTETICA)[:LARGO_NOMBRE_ETAPA],
        "fecha_entrega": fecha,
        "fecha_pago": None,
        "descripcion": None,
        "valor": valor,
        "id_moneda": ids_moneda.get(simbolo),
        "pagada": False,
        "tipo_etapa": "TAREAS",
    }
    return payload, avisos_fecha


def preparar_etapas(registro, solicitud_por_contrato, contrato_por_solicitud,
                    solicitud_ids, ids_moneda, ya_con_etapa=()):
    """Payloads de las etapas, y de dónde sale cada artista.

    Devuelve (etapas, primera_por_contrato, reales_por_etapa):

      * `etapas`: los payloads, en el orden en que se insertarán.
      * `primera_por_contrato`: (id_contrato del legacy, símbolo) -> índice en
        `etapas` de su primera etapa, que es donde van sus artistas. La clave
        lleva la moneda porque un contrato partido en dos tiene una primera
        etapa por cada proyecto.
      * `reales_por_etapa`: índice de etapa -> artistas con dato real, que no van
        a la primera sino a la suya.

    `solicitud_por_contrato` es id_contrato del legacy -> {símbolo: id_solicitud}
    y `contrato_por_solicitud` es id_solicitud -> (id_contrato legacy, fila,
    símbolo); los arma `_solicitud_por_contrato` leyendo el destino, que ya tiene
    los contratos partidos y sus dos solicitudes. `solicitud_ids` son todas las
    solicitudes migradas, para las que no tengan contrato.

    `ya_con_etapa` son las solicitudes que ya tienen al menos una etapa en el
    destino. Se saltan enteras: en el legacy cada etapa pertenece a una sola
    solicitud, así que una solicitud con etapas no necesita ninguna más. Sin
    este filtro la segunda pasada volvería a fabricar todas las sintéticas y
    duplicaría 3.730 etapas.
    """
    supplemented = _suplementos_legacy()
    por_solicitud = _agrupar_etapas(registro, solicitud_por_contrato, supplemented)
    por_id_legacy = _contrato_legacy_por_id()
    simbolo_de_solicitud = {s: simbolo
                            for s, (_, _, simbolo) in contrato_por_solicitud.items()}

    etapas = []
    primera_por_contrato = {}
    reales_por_etapa = {}
    artistas_reales = _artistas_por_suplemento_con_contrato(supplemented)

    def _primera(base, simbolo, clave, indice):
        actual = primera_por_contrato.get((base, simbolo))
        if actual is None or clave < actual[0]:
            primera_por_contrato[(base, simbolo)] = (clave, indice)

    for id_solicitud, filas in sorted(por_solicitud.items()):
        if id_solicitud in ya_con_etapa:
            continue
        simbolo = simbolo_de_solicitud.get(id_solicitud, "CUC")
        for numero, f in enumerate(filas, start=1):
            base = f.get("id_contrato")
            if base in (None, "", "0"):
                base = supplemented.get(f.get("id_suplemento"))
            contrato = por_id_legacy.get(base)
            payload, avisos = _payload_etapa_real(f, numero, contrato, ids_moneda,
                                                  simbolo)
            payload["id_solicitud_servicio"] = id_solicitud
            indice = len(etapas)
            etapas.append(payload)

            if base and base != "0":
                # La primera del contrato es la de menor fecha, no la primera que
                # salió: las etapas se agrupan por solicitud, y un contrato puede
                # tener varias.
                _primera(base, simbolo, fecha_legado(payload["fecha_entrega"]) or "",
                         indice)

            declarados = artistas_reales.get(texto(f.get("id_suplemento")))
            if declarados:
                # Cada copia lleva sólo los artistas de SU moneda. El contrato que
                # cuenta es el de la etapa (`base`), no el del suplemento: cuando
                # el legacy deja la etapa colgando de un contrato distinto al del
                # suplemento, descontar el liquidado del suplemento descuadra el
                # `por_cobrar` de esa etapa frente al que recalcula la aplicación,
                # que siempre mira el contrato del proyecto de la etapa.
                reales_por_etapa[indice] = [
                    (a, base, rl.decimal_legacy(cup if simbolo == "CUP" else cuc), simbolo)
                    for a, _c, cuc, cup in declarados]

    sin_etapa = [i for i in sorted(solicitud_ids)
                 if i not in por_solicitud and i not in ya_con_etapa]
    for id_solicitud in sin_etapa:
        encontrado = contrato_por_solicitud.get(id_solicitud)
        if encontrado:
            id_contrato_legacy, contrato, simbolo = encontrado
        else:
            id_contrato_legacy, contrato, simbolo = None, {}, "CUC"
        payload, avisos = _payload_etapa_sintetica(contrato, ids_moneda, simbolo)
        payload["id_solicitud_servicio"] = id_solicitud
        indice = len(etapas)
        etapas.append(payload)
        # La etapa sintética ES la primera de su contrato: es la única que tiene.
        # Si no se registra aquí, los artistas de un contrato sin etapas no
        # encuentran dónde colocarse y se descartan.
        if id_contrato_legacy and id_contrato_legacy != "0":
            _primera(id_contrato_legacy, simbolo,
                     fecha_legado(payload["fecha_entrega"]) or "", indice)

    primera_por_contrato = {c: v[1] for c, v in primera_por_contrato.items()}

    print("  Etapas a migrar: %d | reales: %d | sintéticas: %d"
          % (len(etapas), len(etapas) - len(sin_etapa), len(sin_etapa)))
    print("  Contratos con artista real por suplemento: %d"
          % len(reales_por_etapa))
    return etapas, primera_por_contrato, reales_por_etapa


# --------------------------------------------------------------------------
# Tareas y personas
# --------------------------------------------------------------------------
CODIGO_GENERICO = "GEN"
CONCEPTO_GENERICO = "Servicio generico (asignado por la migracion)"


def _id_servicio_generico(conn, registro: Registro):
    """Devuelve el `id_servicio` de la fila `GEN`, creándola si no existe.

    El legacy no trae catálogo de servicios —sólo `tipo_concepto`, que es otra
    cosa— y los `nombre_etapa` son 2.568 textos libres. Sin una fila de catálogo
    no hay código que copiar a `tareas_etapa.codigo_extendido`, y la columna se
    vería como `N/A` en las 3.757 tareas (`TareasEtapaPage.tsx:346`).

    Una sola fila para todas: `codigo_servicio` es UNIQUE, así que un segundo
    `GEN` revienta. Se busca antes de insertar, que es lo que hace idempotente la
    fase. Devuelve `None` si la inserción falla, y entonces las tareas salen con
    el código en NULL: es preferible dejar la columna vacía a inventar el
    servicio.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT id_servicio FROM %s WHERE codigo_servicio = %%s"
                    % TABLA_SERVICIO, (CODIGO_GENERICO,))
        fila = cur.fetchone()
        if fila:
            return fila[0]

    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO %s (codigo_servicio, concepto, precio,"
                " observaciones) VALUES (%%s, %%s, 0, %%s) RETURNING id_servicio"
                % TABLA_SERVICIO,
                (CODIGO_GENERICO, CONCEPTO_GENERICO,
                 "Generado por la migracion del legacy. No corresponde a un"
                 " servicio real del catalogo."))
            id_servicio = cur.fetchone()[0]
        conn.commit()
    except Exception as exc:
        conn.rollback()
        registro.error(TABLA_SERVICIO, 0, CODIGO_GENERICO,
                       "servicio generico no creado", str(exc))
        print("  [Fase O] no se pudo crear el servicio %s: %s"
              % (CODIGO_GENERICO, exc))
        return None

    print("  Servicio generico %s creado con id %d" % (CODIGO_GENERICO, id_servicio))
    return id_servicio


def preparar_tareas(etapas, id_servicio):
    """Una tarea por etapa, con el texto de la etapa y su importe.

    Todas apuntan al servicio genérico: el legacy no tiene catálogo de servicios,
    así que no hay con qué emparejarlas una a una. Es lo mismo que hará
    `TareaEtapaService.create` (`:261-264`) cuando alguien elija un servicio
    desde la pantalla, y no cambia lo que se muestra: los PDF y las facturas sacan
    el concepto de `concepto_modificado`, que sigue siendo el nombre de la etapa.

    Si no hay servicio genérico (`id_servicio` es None), `codigo_extendido` queda
    en NULL en vez de apuntar a un servicio que no existe.
    """
    return [{
        "id_etapa": e["id_etapa"],
        "id_servicio": id_servicio,
        "codigo_extendido": CODIGO_GENERICO if id_servicio else None,
        "concepto_modificado": e["nombre_etapa"],
        "unidad_medida": None,
        "cantidad": rl.decimal_legacy("1"),
        "precio_ajustado": e["valor"],
        "id_moneda": e["id_moneda"],
        "observaciones_ajustadas": None,
        "facturada": False,
    } for e in etapas]


def preparar_personas(registro: Registro, etapas, ids_etapa,
                      primera_por_contrato, reales_por_etapa,
                      ids_cliente, ids_moneda, mostrar=True):
    """Payloads de `persona_etapa`, con su `liquidada` y su `por_cobrar`.

    La fórmula es la del propio sistema (`servicio_service.py:1108-1115`):
    `por_cobrar = max(0, cobro - liquidado)`. Con eso, una liquidación que se
    cargue después recalcula lo mismo y no hay nada que reconciliar.

    `primera_por_contrato` va con la clave (id_contrato del legacy, símbolo), así
    que un contrato que la Fase L partió en dos recibe un realizador por moneda:
    cada uno va a la primera etapa de SU proyecto, con el cobro de su columna
    (`cobro_cup` o `cobro_cuc`).

    Se marcan sólo las **concentradas**, que son las que de verdad son una
    decisión nuestra: los contratos con más de un artista, donde además el
    reporte de realizadores multiplica el valor de la etapa por el número de
    personas. Las que tienen etapa real por suplemento van sin marcar, porque su
    etapa sale de un dato.
    """
    artistas = _artistas_legacy()
    cobros = _cobros()
    liquidado = _liquidado()

    simbolos_por_contrato = {}
    for (id_contrato, simbolo) in primera_por_contrato:
        simbolos_por_contrato.setdefault(id_contrato, []).append(simbolo)

    filas_por_clave = {}
    pagado_por_clave = {}
    artistas_por_clave = {}
    repetidos = []

    def _una(id_artista, id_contrato_legacy, indice_etapa, valor, simbolo,
             concentrado):
        # La etapa pudo no insertarse (lote revuelto): sin su id no hay a quién
        # colgar el realizador, así que se descarta en vez de inventarlo.
        if indice_etapa not in ids_etapa:
            registro.descarte(ORIGEN_PERSONAS, id_artista, None,
                              "etapa no insertada",
                              "indice=%d" % indice_etapa)
            return
        id_moneda = ids_moneda.get(simbolo)
        if id_moneda is None:
            registro.descarte(ORIGEN_PERSONAS, id_artista, None,
                              "moneda ausente en el destino",
                              "simbolo=%s" % simbolo)
            return
        id_persona = ids_cliente.get(artistas.get(id_artista))
        if id_persona is None:
            registro.descarte(ORIGEN_PERSONAS, id_artista, None,
                              "artista no migrado",
                              "codigo_exp=%r" % artistas.get(id_artista))
            return

        # La clave es la primaria, `(id_etapa, id_persona, id_moneda)`, y no el
        # par (artista, contrato). Dos artistas del legacy que se deduplicaron a
        # la misma persona comparten fila: sus cobros y sus liquidados se suman,
        # que es lo que la Fase P hace con sus liquidaciones. Un mismo artista
        # repetido —por el suplemento y por su contrato— sí es un duplicado y no
        # se cuenta dos veces.
        clave = (ids_etapa[indice_etapa], id_persona, id_moneda)
        pagado = liquidado.get((id_artista, id_contrato_legacy, simbolo),
                               rl.decimal_legacy("0"))
        if clave in filas_por_clave:
            if id_artista in artistas_por_clave[clave]:
                repetidos.append((id_artista, id_contrato_legacy, indice_etapa))
                return
            fila = filas_por_clave[clave]
            fila["cobro"] += valor
            pagado_por_clave[clave] += pagado
            fila["por_cobrar"] = max(rl.decimal_legacy("0"),
                                     fila["cobro"] - pagado_por_clave[clave])
            fila["liquidada"] = fila["por_cobrar"] == 0
            if concentrado and not fila["asignada_por_migracion"]:
                fila["asignada_por_migracion"] = True
                fila["motivo_asignacion"] = MOTIVO_CONCENTRADO
            artistas_por_clave[clave].add(id_artista)
            return

        por_cobrar = max(rl.decimal_legacy("0"), valor - pagado)
        filas_por_clave[clave] = {
            "id_etapa": ids_etapa[indice_etapa],
            "id_persona": id_persona,
            "cobro": valor,
            "id_moneda": id_moneda,
            "liquidada": por_cobrar == 0,
            "por_cobrar": por_cobrar,
            "asignada_por_migracion": concentrado,
            "motivo_asignacion": MOTIVO_CONCENTRADO if concentrado else None,
        }
        pagado_por_clave[clave] = pagado
        artistas_por_clave[clave] = {id_artista}

    # Primero las que tienen etapa real, que es el dato bueno.
    for indice, declarados in sorted(reales_por_etapa.items()):
        for id_artista, id_contrato, valor, simbolo in declarados:
            _una(id_artista, id_contrato, indice, valor, simbolo, False)

    # Y el resto, a la primera etapa de su contrato, en cada una de sus monedas.
    artistas_por_contrato = {}
    for id_artista, id_contrato in cobros:
        artistas_por_contrato.setdefault(id_contrato, []).append(id_artista)

    for (id_artista, id_contrato), (cuc, cup) in sorted(
            cobros.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        simbolos = simbolos_por_contrato.get(id_contrato)
        if not simbolos:
            registro.descarte(ORIGEN_PERSONAS, id_artista, None,
                              "su contrato no tiene etapa",
                              "id_contrato=%s" % id_contrato)
            continue
        concentrado = len(artistas_por_contrato.get(id_contrato, [])) > 1
        for simbolo in simbolos:
            indice = primera_por_contrato[(id_contrato, simbolo)]
            valor = cup if simbolo == "CUP" else cuc
            _una(id_artista, id_contrato, indice, valor, simbolo, concentrado)

    for id_artista, id_contrato, indice in repetidos:
        registro.descarte(ORIGEN_PERSONAS, id_artista, None, "repetido",
                          "id_contrato=%s etapa=%d: ya estaba colocado en esa "
                          "etapa por su suplemento" % (id_contrato, indice))

    payloads = list(filas_por_clave.values())
    if mostrar:
        print("  Personas a migrar: %d | marcadas como concentradas: %d"
              % (len(payloads),
                 sum(1 for p in payloads if p["asignada_por_migracion"])))
    return payloads


# --------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------
def _insertar_padres(conn, registro, tabla, payloads):
    """Inserta las etapas y devuelve `{indice_del_payload: id_etapa}`.

    Es un mapa y no una lista porque un lote revuelto no devuelve sus ids, y con
    una lista los que vengan después quedarían corridos un lote entero: la tarea
    y el realizador colgarían de la etapa equivocada sin ningún error. Con el
    índice de por medio, un lote fallido sólo deja sin colgar sus propias filas.
    """
    from psycopg2.extras import execute_values

    if not payloads:
        return {}

    columnas = list(payloads[0].keys())
    sql = "INSERT INTO {t} ({c}) VALUES %s RETURNING id_etapa".format(
        t=tabla, c=", ".join(columnas))

    ids = {}
    for lote in db.lotes(list(enumerate(payloads)), TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                filas = execute_values(
                    cur, sql, [tuple(f[c] for c in columnas) for _, f in lote],
                    page_size=TAMANO_LOTE, fetch=True)
            conn.commit()
            for (indice, _), devuelto in zip(lote, filas):
                ids[indice] = devuelto[0]
        except Exception as exc:
            conn.rollback()
            registro.error(tabla, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase O] %s: lote revertido: %s" % (tabla, exc))
    return ids


def ejecutar(conn, registro, tabla, payloads, clave_retorno=None):
    """Inserta por lotes. Cada lote es una transacción."""
    from psycopg2.extras import execute_values

    if not payloads:
        return 0

    insertadas = 0
    columnas = list(payloads[0].keys())
    returning = " RETURNING %s" % clave_retorno if clave_retorno else ""
    sql = "INSERT INTO {t} ({c}) VALUES %s{r}".format(
        t=tabla, c=", ".join(columnas), r=returning)

    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                execute_values(
                    cur, sql, [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE)
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(tabla, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase O] %s: lote revertido: %s" % (tabla, exc))
    return insertadas


def _ids_solicitud(conn):
    """codigo_solicitud -> id_solicitud_servicio.

    El orden de las columnas importa y ya costó una ejecución entera: invertido,
    el mapa sale {id: codigo}, ninguna solicitud se encuentra y todas las etapas
    se fabricarían como sintéticas con un código donde va un entero.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT codigo_solicitud, id_solicitud_servicio FROM %s"
                    " WHERE codigo_solicitud IS NOT NULL" % TABLA_SOLICITUD)
        return {codigo: id_sol for codigo, id_sol in cur.fetchall() if codigo}


def _solicitudes_con_etapa(conn):
    """Las `id_solicitud_servicio` que ya tienen al menos una etapa.

    Es lo que hace idempotente la fase: una solicitud con etapas no vuelve a
    receber ninguna, ni real ni sintética.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT id_solicitud_servicio FROM %s"
                    % TABLA_ETAPA)
        return {i for (i,) in cur.fetchall() if i}


def cargar_etapas(registro=None, dry_run=True, diag=None):
    registro = registro or Registro()
    diag = diag or Diagnostico()

    with db.conexion() as conn:
        ids_solicitud = _ids_solicitud(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        ids_cliente = db.mapa_codigo_a_cliente(conn)
        ya_con_etapa = _solicitudes_con_etapa(conn)
        # Los mapas salen del destino, que ya tiene los contratos partidos y sus
        # dos solicitudes: no hace falta que la Fase N pase nada.
        solicitud_por_contrato, contrato_por_solicitud = _solicitud_por_contrato(conn)
        # En simulación no se escribe nada, así que no se busca ni se crea el
        # servicio genérico: se simula con el código puesto y sin id, que es lo
        # que se verá si luego la inserción del catálogo falla.
        id_servicio = None if dry_run else _id_servicio_generico(conn, registro)

    print("  Solicitudes migradas: %d | con contrato: %d | monedas: %s"
          % (len(ids_solicitud), len(contrato_por_solicitud),
             ",".join(sorted(ids_moneda))))

    if not contrato_por_solicitud:
        print("  AVISO: no hay ninguna solicitud con contrato en el destino. La "
              "Fase N tiene que correr antes: sin solicitud no hay etapa.")
    etapas, primera, reales = preparar_etapas(
        registro, solicitud_por_contrato, contrato_por_solicitud,
        set(ids_solicitud.values()), ids_moneda, ya_con_etapa)

    if not etapas:
        print("  Ninguna etapa que migrar: %d solicitud(es) ya tienen etapa."
              % len(ya_con_etapa))
        return 0, registro, [], [], [], diag

    # Preparación previa para la puerta de calidad, antes de insertar: aquí no hay
    # ids de etapa, así que se inventan negativos y distintos uno de otro. Con un 0
    # compartido, el guard de duplicados (id_etapa, id_persona) colapsaba las 4.352
    # personas a 507 y, además, sus descartes se sumaban dos veces al registro.
    ids_previas = {i: -i - 1 for i in range(len(etapas))}
    etapas_con_id = [dict(e, id_etapa=ids_previas[i])
                     for i, e in enumerate(etapas)]
    tareas = preparar_tareas(etapas_con_id, id_servicio)
    personas_previas = preparar_personas(Registro(), etapas, ids_previas, primera,
                                        reales, ids_cliente, ids_moneda,
                                        mostrar=False)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {
            TABLA_ETAPA: etapas_con_id,
            TABLA_TAREA: tareas,
            TABLA_PERSONA: personas_previas,
        })
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        revisar_etapas(diag, etapas, ids_previas, tareas, personas_previas,
                       ids_cliente)
        print("  SIMULACIÓN: %d etapa(s), %d tarea(s), %d persona(s). Los ids de "
              "etapa no existen hasta insertar."
              % (len(etapas), len(tareas), len(personas_previas)))
        return 0, registro, etapas, tareas, personas_previas, diag

    with db.conexion() as conn:
        db.crear_log(conn)
        ids_etapa = _insertar_padres(conn, registro, TABLA_ETAPA, etapas)

    # Sólo las etapas con id: un lote revuelto deja fuera a las suyas y sus tareas
    # y realizadores se cuelgan de las que sí entraron.
    etapas_con_id = [dict(e, id_etapa=ids_etapa[i])
                     for i, e in enumerate(etapas) if i in ids_etapa]
    tareas = preparar_tareas(etapas_con_id, id_servicio)
    personas = preparar_personas(registro, etapas, ids_etapa, primera, reales,
                                 ids_cliente, ids_moneda)

    with db.conexion() as conn:
        n_tareas = ejecutar(conn, registro, TABLA_TAREA, tareas)
        n_personas = ejecutar(conn, registro, TABLA_PERSONA, personas)

    marcadas = sum(1 for p in personas if p["asignada_por_migracion"])
    print("  Etapas: %d | tareas: %d | personas: %d (%d marcadas como concentradas)"
          % (len(etapas), n_tareas, n_personas, marcadas))
    revisar_etapas(diag, etapas, ids_etapa, tareas, personas, ids_cliente)
    return len(etapas), registro, etapas, tareas, personas, diag