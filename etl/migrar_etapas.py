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

Lo que NO se migra y sigue vacío: `certificacion`, `oferta`, `factura_servicio`,
`pago_factura_servicio` y `persona_liquidacion`. El legacy tiene 15 facturas y 35
`items_factura`, pero cuelgan de `factura`, que no cuelga de ninguna etapa.
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


def _solicitudes_legacy():
    """`id_solicitudsc` -> `codigo_solicitudsc` del legacy (puede ser None)."""
    return {texto(f.get("id_solicitudsc")): texto(f.get("codigo_solicitudsc"))
            for f in _leer("solicitud_sc")}


def _id_legacy_por_codigo(codigo_a_id_legacy):
    """`codigo_solicitud` -> `id_solicitudsc`, para enlazar con el legacy.

    Sin el mapa que pasa la Fase N sólo se Known las solicitudes que traían
    código propio. Las 324 que lo Kalimantan_generatoron se quedan fuera, y con
    ellas los contratos que dependían de esas solicitudes: 1.893 contratos y sus
    artistas. Por eso el mapa se pasa de la N a la O en vez de intentar calcular
    aquí qué código le tocó a cada una.
    """
    if codigo_a_id_legacy:
        return dict(codigo_a_id_legacy)
    return {v: k for k, v in _solicitudes_legacy().items() if v}


def _suplementos_legacy():
    """`id_suplemento` -> `id_contrato` del legacy."""
    return {texto(f.get("id_suplemento")): texto(f.get("id_contrato"))
            for f in _leer("suplemento")}


def _contratos_legacy():
    """`codigo_contrato` -> fila del contrato."""
    return {texto(c.get("codigo_contrato")): c for c in _leer("contrato")}


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
    """(id_artista, id_contrato) -> suma de los `neto_pagar` de sus liquidaciones.

    Las 5.392 liquidaciones caen el 100% dentro de algún par de
    `artista_contrato`, así que es el mismo dinero que ve el artista.
    """
    salida = {}
    for l in _leer("artista_liquidacion"):
        clave = (l.get("id_artista"), l.get("id_contrato"))
        salida[clave] = salida.get(clave, rl.decimal_legacy("0")) + rl.decimal_legacy(
            l.get("neto_pagar"))
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
def _solicitud_por_contrato(codigos_contrato, ids_solicitud, codigo_a_id_legacy):
    """id_contrato del legacy -> id_solicitud_servicio.

    Se busca por el código del contrato porque el destino puede haberle puesto
    el id detrás al código cuando chocó con otro contrato (ver `codigo_unico`).
    """
    # El mapa llega como codigo -> id_solicitudsc, y aquí se busca al revés.
    codigo_por_id = {v: k for k, v in codigo_a_id_legacy.items()}
    salida = {}
    for c in _leer("contrato"):
        codigo = texto(c.get("codigo_contrato"))
        id_contrato = texto(c.get("id_contrato"))
        if not (codigo and id_contrato):
            continue
        destino = codigos_contrato.get(codigo)
        if destino is None:
            destino = codigos_contrato.get("%s-%s" % (codigo, id_contrato))
        if destino is None:
            continue
        id_solicitud = ids_solicitud.get(
            codigo_por_id.get(texto(c.get("id_solicitudsc"))))
        if id_solicitud is not None:
            salida[id_contrato] = id_solicitud
    return salida


def _contrato_por_solicitud(ids_solicitud, codigo_a_id_legacy):
    """id_solicitud_servicio -> (id_contrato del legacy, fila del contrato).

    Para las etapas sintéticas: la solicitud no tiene etapas, pero sí puede tener
    contrato, y de él sale el importe. Va al revés de `_solicitud_por_contrato`.

    Se devuelven las dos cosas porque el id del legacy hace falta además para
    decir que esa etapa sintética es la primera de su contrato, que es donde van
    sus artistas.
    """
    codigo_a_id = codigo_a_id_legacy
    # Se busca por id_solicitudsc, y el mapa viene al revés.
    codigo_por_id = {v: k for k, v in codigo_a_id.items()}
    salida = {}
    for c in _leer("contrato"):
        id_solicitud = ids_solicitud.get(
            codigo_por_id.get(texto(c.get("id_solicitudsc"))))
        if id_solicitud is not None:
            salida.setdefault(id_solicitud, (texto(c.get("id_contrato")), c))
    return salida


def _agrupar_etapas(registro, solicitud_por_contrato, supplemented):
    """id_solicitud -> [etapa del legacy], ordenada por fecha de entrega.

    Las que no llegan a ninguna solicitud se descartan con su motivo: sin
    solicitud no hay `id_solicitud_servicio`, que es NOT NULL.
    """
    por_solicitud = {}
    sin_destino = []
    for f in _leer("etapas_cs"):
        base = f.get("id_contrato")
        if base in (None, "", "0"):
            base = supplemented.get(f.get("id_suplemento"))
        id_solicitud = solicitud_por_contrato.get(base) if base else None
        if id_solicitud is None:
            sin_destino.append(f)
            continue
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


def _payload_etapa_real(f, numero, contrato, ids_moneda):
    """Payload de una etapa que sí venía en el legacy."""
    valor, simbolo, avisos = rl.monto_y_moneda(
        f.get("pago_cuc"), f.get("pago_cup"))
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
    return payload, avisos + avisos_fecha


def _payload_etapa_sintetica(contrato, ids_moneda):
    """La etapa única de una solicitud que no tenía ninguna.

    El importe sale del contrato y la fecha de su firma. Ningún contrato tiene
    dos solicitudes sin etapa —comprobado sobre el volcado—, así que repartir el
    importe del contrato no duplica nada.
    """
    valor, simbolo, avisos = rl.monto_y_moneda(
        contrato.get("valor_contratocuc"), contrato.get("valor_contratocup"))
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
    return payload, avisos + avisos_fecha


def preparar_etapas(registro: Registro, codigos_contrato, ids_solicitud,
                    ids_moneda, codigo_a_id_legacy=None,
                    ya_con_etapa=()):
    """Payloads de las etapas, y de dónde sale cada artista.

    Devuelve (etapas, primera_por_contrato, reales_por_etapa):

      * `etapas`: los payloads, en el orden en que se insertarán.
      * `primera_por_contrato`: id_contrato del legacy -> índice en `etapas` de
        su primera etapa, que es donde van sus artistas.
      * `reales_por_etapa`: índice de etapa -> artistas con dato real, que no van
        a la primera sino a la suya.

    `ya_con_etapa` son las solicitudes que ya tienen al menos una etapa en el
    destino. Se saltan enteras: en el legacy cada etapa pertenece a una sola
    solicitud, así que una solicitud con etapas no necesita ninguna más. Sin
    este filtro la segunda pasada volvería a fabricar todas las sintéticas y
    duplicaría 3.730 etapas.
    """
    supplemented = _suplementos_legacy()
    codigo_a_id_legacy = _id_legacy_por_codigo(codigo_a_id_legacy)
    solicitud_por_contrato = _solicitud_por_contrato(
        codigos_contrato, ids_solicitud, codigo_a_id_legacy)
    contrato_por_solicitud = _contrato_por_solicitud(
        ids_solicitud, codigo_a_id_legacy)
    por_solicitud = _agrupar_etapas(registro, solicitud_por_contrato, supplemented)
    contratos = _contratos_legacy()
    por_id_legacy = {texto(c.get("id_contrato")): c for c in contratos.values()}

    etapas = []
    primera_por_contrato = {}
    reales_por_etapa = {}
    supplemented = _suplementos_legacy()
    artistas_reales = _artistas_por_suplemento_con_contrato(supplemented)

    for id_solicitud, filas in sorted(por_solicitud.items()):
        if id_solicitud in ya_con_etapa:
            continue
        for numero, f in enumerate(filas, start=1):
            base = f.get("id_contrato")
            if base in (None, "", "0"):
                base = supplemented.get(f.get("id_suplemento"))
            contrato = por_id_legacy.get(base)
            payload, avisos = _payload_etapa_real(f, numero, contrato, ids_moneda)
            payload["id_solicitud_servicio"] = id_solicitud
            indice = len(etapas)
            etapas.append(payload)

            if base and base != "0":
                # La primera del contrato es la de menor fecha, no la primera que
                # salió: las etapas se agrupan por solicitud, y un contrato puede
                # tener varias.
                clave = fecha_legado(payload["fecha_entrega"]) or ""
                if base not in primera_por_contrato or clave < primera_por_contrato[base][0]:
                    primera_por_contrato[base] = (clave, indice)

            declarados = artistas_reales.get(texto(f.get("id_suplemento")))
            if declarados:
                reales_por_etapa[indice] = declarados

    sin_etapa = [i for i in sorted(ids_solicitud.values())
                if i not in por_solicitud and i not in ya_con_etapa]
    for id_solicitud in sin_etapa:
        encontrado = contrato_por_solicitud.get(id_solicitud)
        id_contrato_legacy, contrato = encontrado if encontrado else (None, {})
        payload, avisos = _payload_etapa_sintetica(contrato, ids_moneda)
        payload["id_solicitud_servicio"] = id_solicitud
        indice = len(etapas)
        etapas.append(payload)
        # La etapa sintética ES la primera de su contrato: es la única que tiene.
        # Si no se registra aquí, los artistas de un contrato sin etapas no
        # encuentran dónde colocarse y se descartan.
        if id_contrato_legacy and id_contrato_legacy != "0":
            clave = fecha_legado(payload["fecha_entrega"]) or ""
            if (id_contrato_legacy not in primera_por_contrato
                    or clave < primera_por_contrato[id_contrato_legacy][0]):
                primera_por_contrato[id_contrato_legacy] = (clave, indice)

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

    Se marcan sólo las **concentradas**, que son las que de verdad son una
    decisión nuestra: los contratos con más de un artista, donde además el
    reporte de realizadores multiplica el valor de la etapa por el número de
    personas. Las que tienen etapa real por suplemento van sin marcar, porque su
    etapa sale de un dato.
    """
    artistas = _artistas_legacy()
    cobros = _cobros()
    liquidado = _liquidado()

    payloads = []
    vistos = set()
    repetidos = []

    def _una(id_artista, id_contrato_legacy, indice_etapa, cuc, cup, concentrado):
        valor, simbolo, avisos = rl.monto_y_moneda(cuc, cup)
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

        # El guard es la clave primaria, `(id_etapa, id_persona)`, y no el par
        # (artista, contrato). Con el otro, un artista que está en el suplemento
        # de un contrato y también en su `artista_contrato` entraba dos veces si
        # su etapa real no era la primera del contrato, que es justo lo que pasa.
        clave = (ids_etapa[indice_etapa], id_persona)
        if clave in vistos:
            repetidos.append((id_artista, id_contrato_legacy, indice_etapa))
            return

        pagado = liquidado.get((id_artista, id_contrato_legacy),
                               rl.decimal_legacy("0"))
        por_cobrar = max(rl.decimal_legacy("0"), valor - pagado)
        payloads.append({
            "id_etapa": ids_etapa[indice_etapa],
            "id_persona": id_persona,
            "cobro": valor,
            "id_moneda": id_moneda,
            "liquidada": por_cobrar == 0,
            "por_cobrar": por_cobrar,
            "asignada_por_migracion": concentrado,
            "motivo_asignacion": MOTIVO_CONCENTRADO if concentrado else None,
        })
        vistos.add(clave)
        for motivo, resumen, detalle in avisos:
            registro.warning(ORIGEN_PERSONAS, id_artista, None, motivo,
                             detalle or resumen)

    # Primero las que tienen etapa real, que es el dato bueno.
    for indice, declarados in sorted(reales_por_etapa.items()):
        for id_artista, id_contrato, cuc, cup in declarados:
            _una(id_artista, id_contrato, indice, cuc, cup, False)

    # Y el resto, a la primera etapa de su contrato.
    artistas_por_contrato = {}
    for id_artista, id_contrato in cobros:
        artistas_por_contrato.setdefault(id_contrato, []).append(id_artista)

    for (id_artista, id_contrato), (cuc, cup) in sorted(
            cobros.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        indice = primera_por_contrato.get(id_contrato)
        if indice is None:
            registro.descarte(ORIGEN_PERSONAS, id_artista, None,
                              "su contrato no tiene etapa",
                              "id_contrato=%s" % id_contrato)
            continue
        concentrado = len(artistas_por_contrato.get(id_contrato, [])) > 1
        _una(id_artista, id_contrato, indice, cuc, cup, concentrado)

    for id_artista, id_contrato, indice in repetidos:
        registro.descarte(ORIGEN_PERSONAS, id_artista, None, "repetido",
                          "id_contrato=%s etapa=%d: ya estaba colocado en esa "
                          "etapa por su suplemento" % (id_contrato, indice))

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


def cargar_etapas(registro=None, dry_run=True, codigo_a_id_legacy=None, diag=None):
    registro = registro or Registro()
    diag = diag or Diagnostico()

    with db.conexion() as conn:
        codigos_contrato = db.codigos_de_contrato(conn)
        ids_solicitud = _ids_solicitud(conn)
        ids_moneda = db.monedas_por_simbolo(conn)
        ids_cliente = db.mapa_codigo_a_cliente(conn)
        ya_con_etapa = _solicitudes_con_etapa(conn)
        # En simulación no se escribe nada, así que no se busca ni se crea el
        # servicio genérico: se simula con el código puesto y sin id, que es lo
        # que se verá si luego la inserción del catálogo falla.
        id_servicio = None if dry_run else _id_servicio_generico(conn, registro)

    print("  Contratos: %d | solicitudes migradas: %d | monedas: %s"
          % (len(codigos_contrato), len(ids_solicitud), ",".join(sorted(ids_moneda))))

    if not codigo_a_id_legacy:
        print("  AVISO: sin el mapa de la Fase N sólo se localizan las solicitudes "
              "con código propio del legacy. Las demás no reciben etapa y sus "
              "contratos se quedan sin artistas.")
    etapas, primera, reales = preparar_etapas(
        registro, codigos_contrato, ids_solicitud, ids_moneda, codigo_a_id_legacy,
        ya_con_etapa)

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