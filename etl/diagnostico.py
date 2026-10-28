# -*- coding: utf-8 -*-
"""Autodiagnóstico: comprobar lo hecho y decir dónde y por qué falló.

`puerta_de_calidad` contrasta los payloads contra `information_schema`, que es
lo que puede hacer sin mirar el contenido: que la columna exista, que no sea
NOT NULL, que no exceda el varchar y que el código no choque con el destino.

Lo que no puede ver es si los ids existen. Un `id_cliente` que no está en
`clientes` no da ningún error al construir el payload: revienta en el INSERT, por
lotes, y el lote entero se pierde. Estas comprobaciones miran los valores antes
de escribir, y cuando algo está mal dicen qué tabla, qué columna, cuántas filas
y por qué.

El informe se lee sin abrir el log:

    [FALLA] O etapas: 14 etapas no llegan a ninguna solicitud
            dónde:   etapas_cs.id_contrato / etapas_cs.id_suplemento
            filas:   14 de 2058 (0,7%)
           ejemplo:  id_etapa 111 -> complemento 6
            por qué: el complemento no tiene contrato, y sin contrato no hay
                     id_solicitudsc con el que llegar a la solicitud
            efecto:  se descartan y quedan en migracion_log

Cada comprobación lleva su causa escrita en el código, al lado: un "0" sin
explicación es un fallo que nadie sabe arreglar.
"""
from collections import Counter


class Diagnostico:
    """Acumula comprobaciones y las imprime con su causa."""

    def __init__(self):
        self.lineas = []

    def ok(self, fase, texto):
        self.lineas.append(("OK", fase, texto, None))

    def falla(self, fase, texto, donde, filas, ejemplos, porque, efecto):
        self.lineas.append(("FALLA", fase, texto, {
            "donde": donde,
            "filas": filas,
            "ejemplos": ejemplos,
            "porque": porque,
            "efecto": efecto,
        }))

    @property
    def fallos(self):
        return [l for l in self.lineas if l[0] == "FALLA"]

    def imprimir(self):
        print("\n=== AUTODIAGNÓSTICO ===")
        for estado, fase, texto, detalle in self.lineas:
            if estado == "OK":
                print("  [OK]    %s: %s" % (fase, texto))
                continue
            print("  [FALLA] %s: %s" % (fase, texto))
            print("          dónde:   %s" % detalle["donde"])
            print("          filas:   %s" % detalle["filas"])
            if detalle["ejemplos"]:
                print("         ejemplo:  %s" % detalle["ejemplos"])
            print("          por qué:  %s" % detalle["porque"])
            print("          efecto:  %s" % detalle["efecto"])
        total = len(self.fallos)
        print("\nRESULTADO: %d COMPROBACIÓN(ES) FALLIDA(S)" % total)
        return total


def _pct(parte, total):
    if not total:
        return "0"
    return "%.1f%%" % (100.0 * parte / total)


def _ejemplos(valores, cuantos=3):
    return ", ".join(str(v) for v in list(valores)[:cuantos])


# --------------------------------------------------------------------------
# Fase N: solicitudes
# --------------------------------------------------------------------------
def revisar_solicitudes(diag, payloads):
    """Referencias y NOT NULL de `solicitud_servicio`."""
    total = len(payloads)
    sin_cliente = [p["codigo_solicitud"] for p in payloads if not p.get("id_cliente")]
    sin_fecha = [p["codigo_solicitud"] for p in payloads
                 if not p.get("fecha_solicitud")]
    sin_codigo = [p["codigo_solicitud"] for p in payloads
                  if not (p.get("codigo_solicitud") or "").strip()]

    if sin_cliente:
        diag.falla("N solicitudes", "%d sin cliente" % len(sin_cliente),
                   "solicitud_sc.id_cliente", "%d de %d" % (len(sin_cliente), total),
                   _ejemplos(sin_cliente),
                   "el cliente del legacy no está en `clientes`: la Fase B no lo "
                   "migró o su código no coincide",
                   "el INSERT reventaría por lotes; se descartan")
    else:
        diag.ok("N solicitudes", "%d filas, todas con cliente" % total)

    if sin_fecha:
        diag.falla("N solicitudes", "%d sin fecha de solicitud" % len(sin_fecha),
                   "solicitud_sc.fecha_solicitudsc",
                   "%d de %d" % (len(sin_fecha), total), _ejemplos(sin_fecha),
                   "fecha_solicitud es NOT NULL y ni la fila ni las de su "
                   "cliente tienen una fecha válida",
                   "se descartan")
    else:
        diag.ok("N solicitudes", "ninguna sin fecha")

    if sin_codigo:
        diag.falla("N solicitudes", "%d sin código" % len(sin_codigo),
                   "solicitud_sc.codigo_solicitudsc",
                   "%d de %d" % (len(sin_codigo), total), _ejemplos(sin_codigo),
                   "el generador de código falló al calcular el correlativo",
                   "se descartan")
    else:
        diag.ok("N solicitudes", "ninguna sin código")


# --------------------------------------------------------------------------
# Fase O: etapas, tareas y personas
# --------------------------------------------------------------------------
def revisar_etapas(diag, etapas, ids_etapa, tareas, personas, ids_cliente):
    """Referencias y unicidad de las tres tablas de la fase O.

    `ids_etapa` es el mapa `{indice_del_payload: id_etapa}` que devuelve el
    insert; sus **valores** son los ids válidos, no sus claves.
    """
    ids_insertadas = set(ids_etapa.values())
    total = len(etapas)

    huerfanas = [e["id_solicitud_servicio"] for e in etapas
                 if not e.get("id_solicitud_servicio")]
    if huerfanas:
        diag.falla("O etapas", "%d sin solicitud" % len(huerfanas),
                   "etapas.id_solicitud_servicio",
                   "%d de %d" % (len(huerfanas), total), _ejemplos(huerfanas),
                   "la etapa cuelga de un contrato o de un suplemento, y sin "
                   "contrato no hay id_solicitudsc con el que llegar a la "
                   "solicitud; id_solicitud_servicio es NOT NULL",
                   "el INSERT reventaría por lotes; se descartan")
    else:
        diag.ok("O etapas", "%d filas, todas con solicitud" % total)

    sin_valor = [e["nombre_etapa"] for e in etapas if e.get("valor") is None]
    if sin_valor:
        diag.falla("O etapas", "%d sin importe" % len(sin_valor), "etapas.valor",
                   "%d de %d" % (len(sin_valor), total), _ejemplos(sin_valor),
                   "valor es NOT NULL y el legacy no trae importe",
                   "se descartan")
    else:
        diag.ok("O etapas", "ninguna sin importe")

    # Tareas: una por etapa, que es lo que la interfaz espera.
    sin_etapa = [t["concepto_modificado"] for t in tareas
                 if not t.get("id_etapa") and t["concepto_modificado"] is not None]
    if len(tareas) != total:
        diag.falla("O tareas", "%d tareas para %d etapas" % (len(tareas), total),
                   "tareas_etapa.id_etapa",
                   "%d etapas sin tarea" % (total - len(tareas)), None,
                   "una etapa sin tarea se ve vacía en la pantalla de etapas",
                   "se acepta, pero la etapa no tiene trabajo asociado")
    else:
        diag.ok("O tareas", "%d, una por etapa" % len(tareas))

    # Personas: el par (etapa, persona) es la clave primaria, y el servicio
    # rechaza el duplicado (`servicio_service.py:298`).
    pares = Counter((p["id_etapa"], p["id_persona"]) for p in personas)
    repetidos = [k for k, v in pares.items() if v > 1]
    if repetidos:
        diag.falla("O personas", "%d pares (etapa, persona) repetidos"
                   % len(repetidos), "persona_etapa (id_etapa, id_persona)",
                   "%d de %d" % (len(repetidos), len(personas)),
                   _ejemplos("%s/%s" % p for p in repetidos),
                   "la misma pareja repetida en la carga; el INSERT reventaría "
                   "por la clave primaria",
                   "se descartan")
    else:
        diag.ok("O personas", "%d, sin pares repetidos" % len(personas))

    sin_persona = [p["id_etapa"] for p in personas if not p.get("id_persona")]
    if sin_persona:
        diag.falla("O personas", "%d sin cliente asignado" % len(sin_persona),
                   "artista_contrato.id_artista",
                   "%d de %d" % (len(sin_persona), len(personas)),
                   _ejemplos(sin_persona),
                   "el artista del legacy no está en `clientes`: la Fase A no lo "
                   "migró o su codigo_exp no coincide",
                   "se descartan")
    else:
        diag.ok("O personas", "todas con cliente")

    sin_etapa_real = [p for p in personas if p["id_etapa"] not in ids_insertadas]
    if sin_etapa_real:
        diag.falla("O personas", "%d apuntan a una etapa que no se insertó"
                   % len(sin_etapa_real), "persona_etapa.id_etapa",
                   "%d de %d" % (len(sin_etapa_real), len(personas)),
                   _ejemplos(p["id_etapa"] for p in sin_etapa_real),
                   "el id de etapa no coincide con ninguno devuelto al insertar",
                   "se descartan")
    else:
        diag.ok("O personas", "todas apuntan a una etapa insertada")

    # Concentradas: no es un fallo, pero se declara para que el número del
    # reporte se lea con el aviso delante.
    marcadas = [p for p in personas if p.get("asignada_por_migracion")]
    sin_motivo = [p for p in marcadas if not p.get("motivo_asignacion")]
    if sin_motivo:
        diag.falla("O personas", "%d marcadas sin motivo" % len(sin_motivo),
                   "persona_etapa.motivo_asignacion",
                   "%d de %d" % (len(sin_motivo), len(marcadas)), None,
                   "una fila marcada sin motivo no se puede rectificar",
                   "se acepta; el triángulo de la pantalla saldría vacío")
    else:
        diag.ok("O personas", "%d concentradas, todas con motivo" % len(marcadas))