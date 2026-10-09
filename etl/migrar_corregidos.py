# -*- coding: utf-8 -*-
"""Fase D: artistas con CI inválido que se recuperan normalizando el CI.

Estos registros quedaron fuera en la Fase A porque su CI no tenía 11 dígitos.
Aquí se recuperan: se normaliza el CI, se inserta el registro y se marca con
`valido = false` para que alguien lo corrija a mano, porque un CI rellenado
con ceros casi nunca es el CI real de la persona.

Es idempotente: si el CI normalizado ya está en `clientes`, no hace nada.
"""
import db
import geo
import reglas
from config import DUMP_MARIADB, TABLA_CLIENTES, TABLA_NATURAL, TAMANO_LOTE
from fuente import leer_artistas
from limpieza import (
    es_ci_valido,
    nombre_completo,
    no_vacio,
    normalizar_ci,
    razon_normalizacion_ci,
    registro,
    texto,
)
from log import Registro

ORIGEN = "artista (CI normalizado)"
LARGO_CI = 11


def _codigo_disponible(fila, codigos_usados):
    """Elige un `clientes.codigo` libre.

    El `codigo_exp` del legacy puede estar repetido entre artistas distintos y
    `clientes.codigo` es UNIQUE. Cuando está ocupado se recurre al número de
    registro, que viene del origen y no es inventado.
    """
    codigo = texto(fila.get("codigo_exp"))
    if codigo and codigo not in codigos_usados:
        return codigo, None

    alternativo = registro(fila.get("registro"))
    if not alternativo:
        return None, "codigo_exp %s ocupado y sin registro alternativo" % codigo
    if alternativo in codigos_usados:
        return None, "codigo_exp %s y registro %s ocupados" % (codigo, alternativo)
    return alternativo, (
        'código "%s" ya pertenece a otro artista en la base; '
        'asignado "%s" (su número de registro)' % (codigo, alternativo)
    )


def preparar(registro: Registro, codigos_usados=(), nits_usados=()):
    """Construye los payloads de la Fase D. No toca la base de datos."""
    codigos_usados = set(codigos_usados)
    nits_usados = set(nits_usados)

    candidatos = [
        f for f in leer_artistas(DUMP_MARIADB)
        if not es_ci_valido(f.get("ci"))
    ]
    print("  Registros con CI inválido: %d" % len(candidatos))

    pares = []
    for cruda in candidatos:
        fila = dict(cruda)
        fila["_id"] = int(cruda["id_artista"])

        ci, accion, original = normalizar_ci(cruda["ci"])
        if accion == "sin cambios":
            registro.warning(ORIGEN, fila["_id"], nombre_completo(fila),
                              "CI sin formato válido", "valor=%r" % original)
            continue

        if ci in nits_usados:
            registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila),
                              "CI duplicado", "ci normalizado=%s ya migrado" % ci)
            continue

        codigo, nota_codigo = _codigo_disponible(cruda, codigos_usados)
        if not codigo:
            registro.descarte(ORIGEN, fila["_id"], nombre_completo(fila),
                              "codigo duplicado", nota_codigo)
            continue

        fila["ci"] = ci
        padre, hijo, avisos = reglas._mapeo_artista(fila)
        padre["codigo"] = codigo
        padre["valido"] = False
        padre["campo"] = "carnet_identidad"
        padre["razon"] = razon_normalizacion_ci(original, ci, accion)
        # El CI vive en `clientes.nit` y en `clientes_persona_natural.carnet_identidad`.
        hijo["carnet_identidad"] = ci
        if nota_codigo:
            hijo["codigo_expediente"] = codigo
            padre["razon"] = "%s. %s" % (padre["razon"], nota_codigo)

        for motivo, _, detalle in avisos:
            registro.warning(ORIGEN, fila["_id"], nombre_completo(fila), motivo, detalle)

        registro.warning(ORIGEN, fila["_id"], nombre_completo(fila),
                         "CI normalizado", padre["razon"])
        codigos_usados.add(codigo)
        nits_usados.add(ci)
        pares.append((padre, hijo))

    print("  Filas a migrar: %d" % len(pares))
    return pares


def ejecutar(conn, registro: Registro, pares):
    migradas = 0
    for lote in db.lotes(pares, TAMANO_LOTE):
        try:
            db.insertar_padres_hijas(conn, TABLA_CLIENTES, TABLA_NATURAL, lote, TAMANO_LOTE)
            conn.commit()
            migradas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase D] lote revertido: %s" % exc)
    return migradas


def cargar_corregidos(conn=None, registro=None, dry_run=True,
                      codigos_usados=(), nits_usados=()):
    registro = registro or Registro()

    # Se suma lo que ya está en el destino a lo que aporta la fase anterior. Sin
    # esto, al relanzar la cadena entera la fase A no proponía nada y `nits_usados`
    # llegaba vacío, con lo que esta fase volvía a proponer sus 6 filas.
    with db.conexion() as c:
        ya_en_destino = db.clientes_ya_migrados(c)
    codigos_usados = set(codigos_usados) | ya_en_destino
    nits_usados = set(nits_usados) | ya_en_destino
    print("  Códigos y CI en uso: %d" % len(nits_usados))

    pares = preparar(registro, codigos_usados, nits_usados)

    if not pares:
        return 0, registro, pares

    with db.conexion() as c:
        problemas = db.puerta_de_calidad(
            c, {TABLA_CLIENTES: [p[0] for p in pares],
                TABLA_NATURAL: [p[1] for p in pares]},
            claves_omitidas={TABLA_NATURAL: {"id_cliente"}},
        )
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)
    if problemas:
        return 0, registro, pares

    if dry_run:
        return 0, registro, pares

    with db.conexion() as c:
        db.crear_log(c)
        migradas = ejecutar(c, registro, pares)
    return migradas, registro, pares
