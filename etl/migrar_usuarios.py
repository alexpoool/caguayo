# -*- coding: utf-8 -*-
"""Fase F: usuarios del legacy al destino.

El legacy guarda la contraseña en texto plano (3 a 6 caracteres). El destino
usa bcrypt, así que aquí se hashea con el mismo esquema que genera
`usuario_service.py`: bcrypt.hashpw(pw, bcrypt.gensalt()).

Los grupos del destino (ADMINISTRADOR / LECTOR, con 38 funcionalidades) no
coinciden con los del legacy (Administradores / Comerciales / Directivos, con
6). No se migra el sistema de permisos: cada usuario se asigna al grupo del
destino que mejor se ajusta.

`cargo` es NOT NULL en el destino y está vacío en las 10 filas del legacy, así
que lleva un valor por defecto. `id_sucursal` no tiene equivalente y se
descarta.
"""
import bcrypt
import db
from config import (
    DUMP_MARIADB,
    TABLA_USUARIO,
    TAMANO_LOTE,
)
from fuente import leer_tabla
from limpieza import no_vacio, texto
from log import Registro

ORIGEN = "usuario"

GRUPO_ADMINISTRADOR = 1
GRUPO_LECTOR = 2

# Administradores del legacy controlan todo; el resto se acerca al LECTOR.
MAPA_GRUPOS = {
    1: GRUPO_ADMINISTRADOR,   # Administradores
    2: GRUPO_LECTOR,         # Comerciales
    3: GRUPO_LECTOR,         # Directivos
}

GRUPO_POR_DEFECTO = GRUPO_LECTOR
CARGO_POR_DEFECTO = "SIN CARGO"

LARGO_CLAVE_MINIMO = 8
SIN_NOMBRE = "(sin nombre)"

COLUMNAS_USUARIOS = (
    "ci", "nombre", "primer_apellido", "segundo_apellido", "alias",
    "contrasenia", "cargo", "id_grupo", "id_dependencia",
)


def _int(valor, defecto=None):
    v = no_vacio(valor)
    if v is None:
        return defecto
    try:
        return int(v)
    except ValueError:
        return defecto


def _hash(clave):
    return bcrypt.hashpw(clave.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# CI corregidos a mano: id_usuario del legacy -> (CI original, CI nuevo, motivo).
#
# Ileana Chuy Mendibur (usuario 9) y Isabel Alcántara (usuario 4) tienen las dos
# el CI 11111111111. No es un dato de relleno de una sola: el legacy guardaba el
# mismo valor de relleno en las dos filas y el CI real de ninguna. La Fase F
# conserva a Isabel por orden de id y descartaba a Ileana, con lo que se perdía
# una administradora de verdad.
#
# El CI es inventado: se cambia un dígito para que sea único y tener 11 cifras
# como las demás. Es un marcador, NO su cédula real, y hay que sustituirlo en
# cuanto se sepa. Al aplicar la corrección se deja un WARNING en migracion_log
# con las tres cosas: el valor original, el nuevo y por qué, para que quien lea
# la base dentro de un año no se fíe de este número.
#
# Su contraseña (`contrasenna`) sí es real y no se toca: el legacy la guarda en
# claro y el hash sale de ahí, no del alias.
CORRECCIONES_CI = {
    9: ("11111111111", "21111111111",
        "CI de relleno duplicado con Isabel Alcántara (usuario 4); el legacy "
        "no guarda el CI real de ninguna de las dos. Valor inventado: sustituir "
        "por la cédula real"),
}


def _payload(fila):
    """Payload de `usuarios`, o None si el usuario no es migrable."""
    alias = no_vacio(fila.get("nombre_usuario"))
    ci = no_vacio(fila.get("ci"))
    clave = no_vacio(fila.get("contrasenna"))

    if not alias or not ci:
        return None, "sin alias o sin ci"

    grupo = MAPA_GRUPOS.get(_int(fila.get("id_grupo"))) or GRUPO_POR_DEFECTO

    return {
        "ci": ci[:20],
        "nombre": (no_vacio(fila.get("nombre")) or SIN_NOMBRE)[:100],
        "primer_apellido": (no_vacio(fila.get("apellido1")) or SIN_NOMBRE)[:100],
        "segundo_apellido": no_vacio(fila.get("apellido2")),
        "alias": alias[:50],
        "contrasenia": _hash(clave or alias),
        "cargo": CARGO_POR_DEFECTO[:200],
        "id_grupo": grupo,
        "id_dependencia": None,
        "_clave_plana": clave,
        "_alias": alias,
        "_id_origen": _int(fila.get("id_usuario")),
    }, None






def preparar(registro: Registro, cis_existentes=(), aliases_existentes=()):
    """Construye los payloads de `usuarios`. No escribe nada."""
    _, filas = leer_tabla(DUMP_MARIADB, "usuario")
    filas.sort(key=lambda f: int(f["id_usuario"]))
    print("  Usuarios en el origen: %d" % len(filas))

    ya_cis = set(cis_existentes)
    ya_aliases = set(aliases_existentes)

    payloads = []
    ya_migrados = 0
    desc_carte = 0
    vistos_ci = {}
    vistos_alias = {}

    for fila in filas:
        id_origen = int(fila["id_usuario"])
        alias = no_vacio(fila.get("nombre_usuario"))
        ci = no_vacio(fila.get("ci"))

        # La corrección va ANTES de cualquier comprobación de duplicado. Si se
        # aplicara después, el CI de relleno de Ileana seguiría coincidiendo con
        # el de Isabel y la seguiría descartando por lo mismo de siempre.
        #
        # Se corrige la FILA, no una variable suelta: _payload vuelve a leer el
        # CI de ahí, y si se corrigiera sólo la variable de este bucle se
        # comprobaría contra un valor y se insertaría otro.
        correccion = CORRECCIONES_CI.get(id_origen)
        pendiente = None
        if correccion:
            ci_original, ci_nuevo, motivo = correccion
            if ci == ci_original:
                fila = dict(fila)
                fila["ci"] = ci_nuevo
                ci = ci_nuevo
                # El aviso se registra más abajo, cuando la fila va a insertarse
                # de verdad. Ponerlo aquí lo repetiría en cada corrida, y este
                # log registra lo que ocurrió, no lo que se volvió a revisar.
                pendiente = (ci_original, ci_nuevo, motivo)
            else:
                # El legacy cambió respecto a lo que se revisó: no se aplica nada
                # sin que alguien lo mire.
                registro.error(
                    ORIGEN, id_origen, alias, "correccion de CI obsoleta",
                    "se esperaba el CI %s y el legacy trae %s; la correccion de "
                    "CORRECCIONES_CI ya no aplica y este usuario se migra tal cual"
                    % (ci_original, ci))
                desc_carte += 1
                continue

        if ci in ya_cis:
            ya_migrados += 1
            print("  ya migrado (CI %s): %s" % (ci, alias))
            continue

        if ci in vistos_ci:
            registro.descarte(ORIGEN, id_origen, "%s %s" % (
                texto(fila.get("nombre")), texto(fila.get("apellido1"))),
                "CI duplicado", "ci=%s ya lo tiene el usuario %s"
                % (ci, vistos_ci[ci]))
            desc_carte += 1
            continue

        if alias in vistos_alias:
            registro.descarte(ORIGEN, id_origen, "%s %s" % (
                texto(fila.get("nombre")), texto(fila.get("apellido1"))),
                "alias duplicado", "alias=%s ya lo tiene el usuario %s"
                % (alias, vistos_alias[alias]))
            desc_carte += 1
            continue

        payload, motivo = _payload(fila)
        if payload is None:
            registro.descarte(ORIGEN, id_origen, alias, motivo or "incompleto", None)
            desc_carte += 1
            continue

        clave = payload.pop("_clave_plana") or ""
        payload.pop("_alias")

        if pendiente:
            registro.warning(
                ORIGEN, id_origen, payload["nombre"],
                "CI corregido a mano", pendiente[2])
            print("  CI corregido: %s -> %s (%s)"
                  % (pendiente[0], pendiente[1], alias))

        if len(clave) < LARGO_CLAVE_MINIMO:
            registro.warning(
                ORIGEN, id_origen, payload["nombre"],
                "clave del legacy demasiado corta",
                "se ha hasheado una clave de %d caracteres; conviene forzar el cambio"
                % len(clave))

        vistos_ci[ci] = id_origen
        vistos_alias[alias] = id_origen
        payloads.append(payload)

    print("  Ya migrados: %d | descartados por duplicado: %d | a migrar: %d"
          % (ya_migrados, desc_carte, len(payloads)))
    return payloads


def ejecutar(conn, registro: Registro, payloads):
    migrados = 0
    for lote in db.lotes(payloads, TAMANO_LOTE):
        columnas = [c for c in COLUMNAS_USUARIOS]
        filas = [tuple(p[c] for c in columnas) for p in lote]
        try:
            with conn.cursor() as cur:
                from psycopg2.extras import execute_values
                execute_values(
                    cur,
                    "INSERT INTO {t} ({cols}) VALUES %s".format(
                        t=TABLA_USUARIO, cols=", ".join(columnas)),
                    filas, page_size=len(lote),
                )
            conn.commit()
            migrados += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase F] lote revertido: %s" % exc)
    return migrados


def cargar_usuarios(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        cis, aliases = db.usuarios_existentes(conn)

    payloads = preparar(registro, cis, aliases)

    filas = [{c: p[c] for c in COLUMNAS_USUARIOS} for p in payloads]
    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(
            conn, {TABLA_USUARIO: filas},
            # El formulario de gestión de usuarios rechaza vacíos en estos.
            no_vacias={TABLA_USUARIO: ("ci", "nombre", "primer_apellido",
                                       "alias", "contrasenia", "cargo")},
        )
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if problemas:
        print("  No se inserta nada: la puerta de calidad encontró problemas.")
        return 0, registro, payloads

    if dry_run:
        return 0, registro, payloads

    with db.conexion() as conn:
        db.crear_log(conn)
        migrados = ejecutar(conn, registro, payloads)
    return migrados, registro, payloads