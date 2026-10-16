# -*- coding: utf-8 -*-
"""Reglas que comparten las fases K, L y M: liquidaciones, contratos y suplementos.

Las tres arrastran el mismo bloque heredado del legacy y se encuentran con los
mismos cuatro huecos: un importe que viene partido en dos monedas, un catálogo
de estados que no es el del destino, fechas que el legacy no guardó y códigos
que se repiten. Eso vive aquí y no duplicado en cada módulo: si mañana se
cambia una regla, cambia para las tres.

`reglas.py` es de artistas y clientes. Esto es del bloque de documentos
comerciales, que es otra cosa.
"""
from decimal import Decimal, InvalidOperation

from limpieza import fecha, no_vacio, texto


# --------------------------------------------------------------------------
# Importes
# --------------------------------------------------------------------------
def decimal_legacy(valor, defecto="0.00"):
    """Un `decimal(10,2)` del legacy como Decimal de dos decimales.

    Lo que venga vacío, o sea un texto que no es un número, vale el defecto.
    Dejar el texto y que lo caste PostgreSQL sería más corto, pero el `''` de
    una cadena vacía lo rechaza una columna numérica, y la decisión de qué
    hacer está mejor escrita una vez que repartida en tres fases.
    """
    v = no_vacio(valor)
    if v is None:
        return Decimal(defecto)
    try:
        return Decimal(v)
    except (InvalidOperation, ValueError):
        return Decimal(defecto)


#: Prefijo que separa las dos copias de un registro con las dos monedas: CUP va
#: primero (1.) y CUC después (2.). Sin las dos monedas no hay prefijo.
PREFIJO_MONEDA = {
    "CUP": "1",
    "CUC": "2",
}


def importes_por_moneda(cuc, cup):
    """El legacy guarda DOS importes; el destino tiene una sola moneda por fila.

    En vez de elegir una y perder la otra, se devuelve una entrada por moneda
    presente, CUP primero (para que su copia lleve el prefijo 1) y CUC después.
    El contrato, la etapa y el realizador se parten en dos filas más abajo, una
    por entrada, y ningún importe se pierde.

    El destino tiene CUC (lo siembra el paso 0 de la migración, migrar_monedas),
    así que no hay que traducirlo: se conserva la moneda del legacy.

      · sólo CUP   -> [(cup, CUP)]
      · sólo CUC   -> [(cuc, CUC)]
      · las dos    -> [(cup, CUP), (cuc, CUC)]
      · ninguna    -> [(0.00, CUC)], con aviso

    Devuelve (importes, avisos), con los avisos como (motivo, resumen, detalle).
    """
    avisos = []
    valor_cuc = decimal_legacy(cuc)
    valor_cup = decimal_legacy(cup)

    importes = []
    if valor_cup != 0:
        importes.append((valor_cup, "CUP"))
    if valor_cuc != 0:
        importes.append((valor_cuc, "CUC"))
    if not importes:
        avisos.append(("sin importe en el legacy", "0.00 en CUC", None))
        importes.append((valor_cuc, "CUC"))

    return importes, avisos


def codigo_de_copia(codigo, simbolo, hay_dos):
    """El código de una copia: `1.{codigo}` o `2.{codigo}` si hay dos monedas.

    Con una sola moneda se deja el código tal cual; sólo cuando el registro se
    parte hace falta desambiguar las dos mitades en la interfaz, y el prefijo lo
    dice a simple vista (CUP = 1, CUC = 2).
    """
    if not hay_dos:
        return codigo
    return "%s.%s" % (PREFIJO_MONEDA[simbolo], codigo)


def copias_de_contrato(base, id_legacy, cuc, cup):
    """Los códigos que puede tener cada copia de un contrato, con su símbolo.

    Con las dos monedas son cuatro —`1.base`/`2.base` y, por si el código chocó
    con otro contrato, `1.base-id`/`2.base-id`—; con una sola son dos (`base` y
    `base-id`). El símbolo va en None cuando el contrato no se partió: lo pone
    quien lee el destino, que es el único que sabe en qué moneda quedó.
    """
    if decimal_legacy(cuc) != 0 and decimal_legacy(cup) != 0:
        fuera = []
        for simbolo in ("CUP", "CUC"):
            prefijo = PREFIJO_MONEDA[simbolo]
            fuera.append((simbolo, "%s.%s" % (prefijo, base)))
            fuera.append((simbolo, "%s.%s-%s" % (prefijo, base, id_legacy)))
        return fuera
    return [(None, base), (None, "%s-%s" % (base, id_legacy))]


#: Moneda del legacy -> símbolo en el destino.
#:
#: Para las tablas que traen la moneda en su propia columna (`artista_liquidacion`
#: tiene `moneda varchar(3)` con 'CUC' o 'CUP'), que es un caso distinto al de
#: arriba: aquí no hay dos importes que elegir, hay uno y la fila declara en cuál
#: está. CUC existe en el destino (lo siembra el paso 0 de la migración), así que
#: se conserva tal cual.
MAPA_MONEDA = {
    "CUP": "CUP",
    "CUC": "CUC",
}


def simbolo_destino(moneda_legado, default="USD"):
    """La moneda de la fila, traducida al símbolo del destino.

    Devuelve (símbolo, avisos). Una moneda que no está en el mapa cae en
    `default` con aviso: el destino no tiene un sitio donde ponerla y dejar la
    fila fuera por eso sería peor que migrarla diciéndolo.
    """
    clave = (texto(moneda_legado) or "").strip().upper()
    avisos = []
    simbolo = MAPA_MONEDA.get(clave)
    if simbolo is None:
        simbolo = default
        avisos.append((
            "moneda %r sin equivalencia" % clave,
            "se asume %s" % default,
            None,
        ))
    return simbolo, avisos


# --------------------------------------------------------------------------
# Estados
# --------------------------------------------------------------------------
#: `estado_cs` del legacy -> nombre en `estado_contrato` del destino.
#: Los ids NO se transportan: el 2 del legacy es "Terminado" y el 2 del destino
#: es otra cosa. Lo que viaja es el nombre, y la traducción es esta tabla.
#:
#: El catálogo del legacy es `estado_cs` —contratos y suplementos juntos— y el
#: del destino trae además "Por cobrar", que aquí no aparece: si algún día
#: surge un id que no esté en el mapa, la fase avisa y aplica el de por defecto
#: en vez de inventar un destino.
MAPA_ESTADO = {
    "1": "PENDIENTE",
    "2": "FINALIZADO",
    "3": "CANCELADO",
    "4": "ACTIVO",
}

#: Lo que se pone cuando el documento viene sin estado (id 0). Sin estado no
#: significa vigente: significa que nadie lo dijo todavía.
ESTADO_POR_DEFECTO = "PENDIENTE"


def estado_legacy(id_estado, estados):
    """`id_estadocontrato` del legacy -> `id_estado` del destino.

    `estados` es db.estados_contrato: {nombre: id_estado_contrato}.

    Un 0 o un id fuera del mapa van a ESTADO_POR_DEFECTO con aviso. La columna
    es NOT NULL, y dejar fuera 96 contratos por un 0 en el legacy sería peor
    que suponer cuál era su estado y dejarlo dicho.
    """
    avisos = []
    clave = texto(id_estado) or "0"
    nombre = MAPA_ESTADO.get(clave)

    if nombre is None:
        avisos.append((
            "estado %s sin equivalencia" % clave,
            "se asume %s" % ESTADO_POR_DEFECTO,
            None,
        ))
        nombre = ESTADO_POR_DEFECTO

    if nombre not in estados:
        raise RuntimeError(
            "el destino no tiene el estado %r que la migración necesita. "
            "Revisa la semilla de estado_contrato (backend/alembic/env.py)."
            % nombre
        )
    return estados[nombre], avisos


# --------------------------------------------------------------------------
# Fechas
# --------------------------------------------------------------------------
#: Se usa cuando la fila no trae fecha Y su grupo tampoco tiene ninguna. En
#: `artista_liquidacion` es una sola: la liquidación 217, del artista 711, que
#: es el único artista del dump con una sola liquidación. En `contrato` no
#: llega a pasar, porque los dos contratos sin fecha y sin grupo tienen ya un
#: descarte antes por no tener cliente.
#:
#: 1900-01-01 porque `fecha`/`fecha_emision` es NOT NULL y porque en cualquier
#: informe de contratos por periodo esta fila sale en el primero y delata que no
#: hay fecha real detrás, en vez de repartirse por los años como si la tuviera.
FECHA_SIN_RESPALDO = "1900-01-01"


def fecha_con_respaldo(fecha_legado, fechas_del_grupo):
    """La fecha del legacy, o la del mismo grupo si no la tiene.

    Hay filas con '0000-00-00' en las dos columnas de fecha —8 en
    `artista_liquidacion`, 4 en `contrato`— y `fecha_emision`/`fecha` son NOT
    NULL en el destino. Antes que inventar una fecha global, se toma la del
    mismo grupo: el mismo artista en las liquidaciones, el mismo cliente en los
    contratos.

    Cuando el grupo no tiene ninguna fecha se usa FECHA_SIN_RESPALDO. Es una
    suposición en las tres, y por eso las tres dejan aviso.

    `fechas_del_grupo` es la lista de fechas del grupo.

    Devuelve (fecha, avisos). La fecha es un `datetime.date` o None.
    """
    avisos = []
    directa = fecha(fecha_legado)
    if directa:
        return directa, avisos

    candidatas = sorted(f for f in fechas_del_grupo if f)
    if not candidatas:
        avisos.append((
            "fecha 0000-00-00 en el legacy",
            "se usa %s" % FECHA_SIN_RESPALDO,
            "ni la fila ni las de su grupo tienen fecha",
        ))
        return FECHA_SIN_RESPALDO, avisos

    # La MÁS ANTIGUA del grupo es la fecha en que ese cliente o artista empezó a
    # facturar: la elección conservadora cuando lo que hay que rellenar es un
    # NOT NULL.
    elegida = candidatas[0]
    avisos.append((
        "fecha 0000-00-00 en el legacy",
        "se usa %s" % elegida,
        "la fecha más antigua del mismo grupo; el legacy no guarda ninguna",
    ))
    return elegida, avisos


# --------------------------------------------------------------------------
# Códigos
# --------------------------------------------------------------------------
def codigo_legado(codigo, id_legado):
    """`LEG-{codigo}-{id}`: el código del legacy con su id detrás.

    Para `liquidacion` y `suplemento`, donde el número del legacy no sirve ni
    como código: `numero_liquidacion` se repite 746 veces, 113 de ellas dentro
    de un mismo artista, y 7 filas lo tienen NEGATIVO (el -238 va a dar
    `LEG--238-1043`). El sufijo no es decoración: `liquidacion.codigo` es UNIQUE
    y sin él la fila no entra.

    El id del legacy no viaja a ninguna parte: sólo está para que la clave sea
    única y para poder volver a la fila de origen.
    """
    base = (texto(codigo) or "").strip()
    if not base:
        return "LEG-%s" % id_legado
    return "LEG-%s-%s" % (base, id_legado)


def codigo_unico(codigo, id_legado, ya_usados):
    """El código del legacy tal cual, con el id detrás sólo si choca.

    Para `contrato`, donde `codigo_contrato` se repite 10 veces de 3.396: ahí el
    código limpio se lee bien en la interfaz y en 3.386 filas no estorba nada.
    """
    base = (texto(codigo) or "").strip()
    if not base:
        base = "LEG-%s" % id_legado
    if base not in ya_usados:
        return base, False
    return "%s-%s" % (base, id_legado), True


def codigo_previo(codigo, id_legado, previos):
    """Con qué código entró esta fila en una pasada anterior, o None.

    Hace falta porque `codigo_unico` sólo mira si el código limpio choca, y en una
    segunda pasada choca siempre: el propio contrato de la primera pasada ya
    ocupa ese código. Sin esta comprobación, la segunda pasada no reconocería sus
    propias filas, les añadiría el sufijo del id e insertaría 3.387 contratos
    duplicados con otro código.

    Se miran las tres formas en que una fila could've entrado: el código limpio,
    el limpio con el id detrás (que es lo que hace el desempate) y el de reserva.
    """
    base = (texto(codigo) or "").strip()
    candidatos = ["LEG-%s" % id_legado]
    if base:
        candidatos.append(base)
        candidatos.append("%s-%s" % (base, id_legado))
    for candidato in candidatos:
        if candidato in previos:
            return candidato
    return None