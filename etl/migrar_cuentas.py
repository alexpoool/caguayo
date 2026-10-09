# -*- coding: utf-8 -*-
"""Fase E: cuentas bancarias de artistas y clientes.

El origen sólo guarda números de cuenta: `artista.cuenta_cupa`/`cuenta_cuca`
y `cliente.cuenta_mn`/`cuenta_cuc`. `cliente.cuenta_estandarizada` está vacía
en las 570 filas y no aporta nada.

La tabla destino exige `titular`, `banco` y `direccion`, que el legacy no
tiene. El titular se compone con los nombres, la dirección se toma del propio
cliente y el banco lleva un marcador, porque no hay ninguna fuente de la que
sacarlo.

Además, las fichas descartadas por duplicado pueden traer cuentas distintas de
las de la ficha que sí se migró. Esas se añaden a la del cliente conservado.
"""
import db
from config import (
    DUMP_MARIADB,
    TABLA_CUENTA,
    TAMANO_LOTE,
)
from deduplicacion import deduplicar
from fuente import leer_artistas, leer_clientes
from limpieza import (
    es_ci_valido,
    limpiar_numero_cuenta,
    nombre_completo,
    no_vacio,
    texto,
    titular_de,
)
from log import Registro

ORIGEN_ARTISTA = "artista (cuenta)"
ORIGEN_CLIENTE = "cliente (cuenta)"

CAMPOS_ARTISTA = ("cuenta_cupa", "cuenta_cuca")
CAMPOS_CLIENTE = ("cuenta_mn", "cuenta_cuc")

# El origen no guarda el banco. La app lo exige en su formulario, así que se
# escribe un marcador explícito en lugar de una cadena vacía.
BANCO_DESCONOCIDO = "NO ESPECIFICADO"
DIRECCION_DESCONOCIDA = "NO ESPECIFICADO"

LARGO_TITULAR = 150
LARGO_DIRECCION = 255
LARGO_CUENTA = 50


def _fichas_artista():
    """Reproduce la Fase A: (conservadas, descartadas)."""
    filas = [dict(f, _id=int(f["id_artista"])) for f in leer_artistas(DUMP_MARIADB)]
    validas = [f for f in filas if es_ci_valido(f["ci"])]
    por_ci, d_ci = deduplicar(validas, "ci")
    por_codigo, d_codigo = deduplicar(por_ci, "codigo_exp")
    return por_codigo, d_ci + d_codigo


def _fichas_cliente():
    """Reproduce la Fase B: (conservadas, descartadas)."""
    filas = []
    for f in leer_clientes(DUMP_MARIADB):
        fila = dict(f, _id=int(f["id_cliente"]))
        fila["nit"] = no_vacio(f.get("nit")) or no_vacio(f.get("codigo"))
        filas.append(fila)
    con_codigo = [f for f in filas if no_vacio(f.get("codigo"))]
    por_codigo, d_codigo = deduplicar(con_codigo, "codigo")
    por_nit, d_nit = deduplicar(por_codigo, "nit")
    return por_nit, d_codigo + d_nit


def _cuenta_payload(ficha, id_cliente, numero, origen_campo):
    direccion = texto(ficha.get("direccion"))
    return {
        "id_cliente": id_cliente,
        "id_dependencia": None,
        "id_moneda": None,
        "titular": (titular_de(ficha) or BANCO_DESCONOCIDO)[:LARGO_TITULAR],
        "banco": BANCO_DESCONOCIDO,
        "sucursal": None,
        "numero_cuenta": numero,
        "direccion": (direccion or DIRECCION_DESCONOCIDA)[:LARGO_DIRECCION],
        "_origen_campo": origen_campo,
        "_sin_direccion": direccion is None,
    }


def _payloads_de(registro, ficha, id_cliente, campos, etiqueta, origen):
    """Construye los payloads de las cuentas propias de una ficha."""
    payloads = []
    nombre = nombre_completo(ficha)
    for campo in campos:
        numero, original = limpiar_numero_cuenta(ficha.get(campo))
        if not numero:
            continue
        if original != numero:
            registro.warning(
                origen, ficha["_id"], nombre, "numero de cuenta normalizado",
                "valor original=%r conservados sólo los dígitos=%r" % (original, numero),
            )
        payloads.append(_cuenta_payload(ficha, id_cliente, numero, campo))
    return payloads


def preparar(registro: Registro, mapa_codigo, pares_existentes=()):
    """Construye todos los payloads de `cuenta`. No escribe nada."""
    ya_cargadas = set(pares_existentes)
    payloads = []
    sin_cliente = []

    conservadas_a, descartadas_a = _fichas_artista()
    conservadas_c, descartadas_c = _fichas_cliente()

    def id_de(ficha):
        return mapa_codigo.get(texto(ficha.get("codigo_exp")) or texto(ficha.get("codigo")))

    for ficha in conservadas_a:
        destino = id_de(ficha)
        if destino is None:
            sin_cliente.append(ficha["_id"])
            continue
        payloads.extend(_payloads_de(registro, ficha, destino, CAMPOS_ARTISTA,
                                     "artista", ORIGEN_ARTISTA))

    for ficha in conservadas_c:
        destino = id_de(ficha)
        if destino is None:
            sin_cliente.append(ficha["_id"])
            continue
        payloads.extend(_payloads_de(registro, ficha, destino, CAMPOS_CLIENTE,
                                     "cliente", ORIGEN_CLIENTE))

    propias = len(payloads)

    # Cuentas que aportan las fichas descartadas por duplicado
    heredadas = 0
    vistas = set()
    for descartadas, conservadas, campos, origen in (
        (descartadas_a, conservadas_a, CAMPOS_ARTISTA, ORIGEN_ARTISTA),
        (descartadas_c, conservadas_c, CAMPOS_CLIENTE, ORIGEN_CLIENTE),
    ):
        por_id = {f["_id"]: f for f in conservadas}
        for ficha, _valor, id_mant, motivo in descartadas:
            if id_mant in vistas:
                continue
            vistas.add(id_mant)
            mant = por_id.get(id_mant)
            if mant is None:
                continue
            destino = id_de(mant)
            if destino is None:
                continue
            ya_en_mant = {
                limpiar_numero_cuenta(mant.get(c))[0] for c in campos
            }
            extras = []
            for campo in campos:
                numero, original = limpiar_numero_cuenta(ficha.get(campo))
                if not numero or numero in ya_en_mant:
                    continue
                ya_en_mant.add(numero)
                extras.append((campo, numero, original))
            for campo, numero, original in extras:
                registro.warning(
                    origen, ficha["_id"], nombre_completo(mant),
                    "cuenta heredada de ficha duplicada",
                    "de id_origen %s (%s): %s=%r" % (ficha["_id"], motivo, campo, original),
                )
                payloads.append(_cuenta_payload(mant, destino, numero, campo))
                heredadas += 1

    for id_origen in sin_cliente:
        registro.error("cuenta", id_origen, None, "cliente no encontrado",
                       "no se pudo resolver el id_cliente por el código")

    # Idempotencia: fuera lo que ya esté en `cuenta`
    finales = []
    repetidas = 0
    vistas = set()
    for p in payloads:
        clave = (p["id_cliente"], p["numero_cuenta"])
        if clave in ya_cargadas or clave in vistas:
            repetidas += 1
            continue
        vistas.add(clave)
        finales.append(p)

    print("  Cuentas propias:      %d" % propias)
    print("  Cuentas heredadas:    %d" % heredadas)
    print("  Ya existentes/duplicadas y omitidas: %d" % repetidas)
    print("  Total a insertar:     %d" % len(finales))
    if sin_cliente:
        print("  fichas sin id_cliente resuelto: %d" % len(sin_cliente))
    return finales


def ejecutar(conn, registro: Registro, payloads):
    migradas = 0
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            migradas += db.insertar_cuentas(conn, [
                {k: v for k, v in p.items() if not k.startswith("_")} for p in lote
            ])
            conn.commit()
        except Exception as exc:
            conn.rollback()
            registro.error("cuenta", 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase E] lote revertido: %s" % exc)
    return migradas


def cargar_cuentas(registro=None, dry_run=True):
    registro = registro or Registro()

    print("  Leyendo destino para el mapa de códigos...")
    with db.conexion() as conn:
        mapa = db.mapa_codigo_a_cliente(conn)
        existentes = db.pares_existentes_cuenta(conn)
    print("  clientes en destino: %d | cuentas ya cargadas: %d" % (len(mapa), len(existentes)))

    payloads = preparar(registro, mapa, existentes)

    filas = [{k: v for k, v in p.items() if not k.startswith("_")} for p in payloads]

    # La puerta de calidad corre también en modo --commit: si algo no va a
    # entrar bien contra la base, mejor no intentarlo que revertir lotes.
    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(
            conn, {TABLA_CUENTA: filas},
            # El formulario de CuentasCliente rechaza vacíos en estos cuatro.
            no_vacias={TABLA_CUENTA: ("titular", "banco", "numero_cuenta", "direccion")},
        )
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    for p in payloads:
        if p.get("_sin_direccion"):
            registro.warning("cuenta", p["id_cliente"], p["titular"],
                              "direccion del cliente vacia",
                              "cuenta %s: se guardó %r"
                              % (p["numero_cuenta"], DIRECCION_DESCONOCIDA))

    if problemas:
        print("  No se inserta nada: la puerta de calidad encontró problemas.")
        return 0, registro, payloads

    if dry_run:
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        migradas = ejecutar(conn, registro, payloads)
    return migradas, registro, payloads