# -*- coding: utf-8 -*-
"""Fase J: grupos del legacy y reasignación de los usuarios a su grupo.

El legacy tiene tres grupos (Administradores, Comerciales, Directivos) y seis
funcionalidades grosslyaes que no se parecen en nada a las 38 del destino, que
son una por pantalla. No hay traducción posible entre ambos modelos, así que
aquí sólo se migra la TABLA de grupos y las funcionalidades de cada uno se
asignan a mano desde Configuración → Grupos.

Consecuencia importante: los grupos nuevos nacen sin ninguna funcionalidad, y
`hasFuncionalidad` es sólo una comprobación de pertenencia, así que un usuario
en un grupo vacío no ve NADA del menú, tampoco la pantalla de Grupos. Por eso
los administradores NO se mueven: se quedan en ADMINISTRADOR, que tiene las 38
funcionalidades, y siempre queda alguien que pueda configurar los otros dos.

Los ids de grupo se resuelven por NOMBRE después de insertar, nunca se
transportan los del legacy. El id 1 del destino tampoco se toca nunca:
auth_service.py lo usa fijo al registrar usuarios (`db_target.get(Grupo, 1)`),
así que el grupo de administración tiene que seguir siendo ese.
"""
import unicodedata

import db
from config import DUMP_MARIADB
from limpieza import no_vacio, texto


def _int(valor):
    try:
        return int(str(valor).strip())
    except (TypeError, ValueError):
        return None
from log import Registro

ORIGEN = "grupo (legacy)"

LARGO_NOMBRE = 100

TABLA_GRUPO = "grupo"
TABLA_GRUPO_FUNC = "grupo_funcionalidad"
TABLA_USUARIOS = "usuarios"

# Grupo del destino que NO se toca y donde se quedan los administradores.
GRUPO_ADMINISTRADOR = "ADMINISTRADOR"

# Grupo legacy -> nombre del grupo en el destino.
#
# El 1 no aparece a propósito: Administradores del legacy se queda en
# ADMINISTRADOR, que es el mismo concepto y además el que exige el id 1.
MAPA_GRUPOS = {
    2: "Comerciales",
    3: "Directivos",
}

# Legacy sin grupo (DC SCU): se deja donde esté y no se toca.


def _clave(nombre):
    """Clave de comparación. Igual que en migrar_catalogo, para que un grupo
    llamado 'Comercial' en el destino y 'comercial' en el legacy se reconozcan
    como el mismo y no se duplique."""
    t = unicodedata.normalize("NFKD", texto(nombre) or "")
    t = t.encode("ascii", "ignore").decode()
    return " ".join(
        "".join(c if c.isalnum() or c.isspace() else " " for c in t.lower()).split()
    )


def _nombre_limpio(nombre):
    return " ".join((texto(nombre) or "").split())[:LARGO_NOMBRE].strip()


def _grupos_legacy() -> list:
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "grupo")
    grupos = []
    for fila in filas:
        nombre = no_vacio(fila.get("nombre_grupo"))
        if not nombre:
            continue
        grupos.append({
            "id_legacy": int(fila["id_grupo"]),
            "nombre": _nombre_limpio(nombre),
            "descripcion": no_vacio(fila.get("descripcion")),
        })
    return sorted(grupos, key=lambda g: g["id_legacy"])


def _usuarios_legacy() -> dict:
    """CI del legacy -> id_grupo, sólo los que tienen grupo.

    El CI se corrige con la misma tabla que usa la Fase F. Sin esto, Ileana Chuy
    e Isabel Alcántara comparten CI en el legacy (11111111111) y una pisa a la
    otra en el diccionario: la que se pierde se queda en el grupo equivocado o no
    se mueve. La corrección vive en un único sitio, en CORRECCIONES_CI, y las
    dos fases la comparten a propósito.
    """
    from fuente import leer_tabla
    from migrar_usuarios import CORRECCIONES_CI

    _, filas = leer_tabla(DUMP_MARIADB, "usuario")
    salida = {}
    for fila in filas:
        ci = no_vacio(fila.get("ci"))
        grupo = fila.get("id_grupo")
        if not ci or not grupo:
            continue
        ci = ci.strip()
        correccion = CORRECCIONES_CI.get(_int(fila.get("id_usuario")))
        if correccion and ci == correccion[0]:
            ci = correccion[1]
        salida[ci] = int(grupo)
    return salida


def preparar(registro: Registro, nombres_existentes, usuarios_por_ci, ids_por_nombre):
    """Calcula los grupos a insertar y los usuarios a mover. No escribe nada."""
    grupos = _grupos_legacy()
    por_ci = _usuarios_legacy()

    nuevos_grupos = []
    for g in grupos:
        if _clave(g["nombre"]) in nombres_existentes:
            continue
        nuevos_grupos.append(g)

    print("  Grupos legacy: %d | ya en PostgreSQL: %d | a insertar: %d"
          % (len(grupos), len(grupos) - len(nuevos_grupos), len(nuevos_grupos)))
    for g in nuevos_grupos:
        print("      + %-16s  %s" % (g["nombre"], g["descripcion"] or ""))

    # Los ids de los grupos nuevos aún no existen, así que se resuelve el
    # destino de cada usuario por el nombre del legacy y se deja la
    # comprobación de que el nombre exista para cuando se inserten.
    movimientos = []
    sin_destino = []
    ya_en_su_grupo = []

    for ci, id_grupo_legacy in sorted(por_ci.items()):
        usuario = usuarios_por_ci.get(ci)
        if usuario is None:
            sin_destino.append((ci, id_grupo_legacy, "no está en PostgreSQL"))
            continue

        nombre_destino = MAPA_GRUPOS.get(id_grupo_legacy)
        if nombre_destino is None:
            # Legacy Administradores (o un grupo que no se migra): se deja.
            ya_en_su_grupo.append(usuario)
            continue

        if usuario["id_grupo"] == ids_por_nombre.get(nombre_destino):
            ya_en_su_grupo.append(usuario)
            continue

        movimientos.append({
            "ci": ci,
            "alias": usuario["alias"],
            "id_usuario": usuario["id_usuario"],
            "id_grupo_legacy": id_grupo_legacy,
            "grupo_destino": nombre_destino,
        })

    print("  Usuarios con grupo legacy: %d | a mover: %d | sin cambios: %d | no migrados: %d"
          % (len(por_ci), len(movimientos), len(ya_en_su_grupo), len(sin_destino)))
    for m in movimientos:
        print("      ~ %-8s %-10s -> %s" % (m["alias"], m["ci"], m["grupo_destino"]))
    for ci, g, motivo in sin_destino:
        print("      ! %s (legacy grupo %s): %s" % (ci, g, motivo))
    for u in ya_en_su_grupo:
        print("      = %-8s se queda en %s" % (u["alias"], u["grupo_actual"]))

    return nuevos_grupos, movimientos


def ejecutar(conn, registro: Registro, nuevos_grupos, movimientos):
    """Inserta los grupos que falten y mueve los usuarios. Idempotente."""
    from psycopg2.extras import execute_values

    if nuevos_grupos:
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO {t} (nombre, descripcion) VALUES %s".format(t=TABLA_GRUPO),
                [(g["nombre"], g["descripcion"]) for g in nuevos_grupos],
            )
        conn.commit()

    # Los ids se resuelven ahora, ya con los grupos insertados.
    ids = db.ids_grupo_por_nombre(conn)
    faltantes = sorted({m["grupo_destino"] for m in movimientos
                        if m["grupo_destino"] not in ids})
    if faltantes:
        raise RuntimeError(
            "grupos que no se encontraron tras insertar: %s" % ", ".join(faltantes))

    movidos = 0
    for m in movimientos:
        destino = ids[m["grupo_destino"]]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE {t} SET id_grupo = %s WHERE id_usuario = %s".format(
                    t=TABLA_USUARIOS),
                (destino, m["id_usuario"]),
            )
        conn.commit()
        movidos += cur.rowcount

    return movidos


def cargar_grupos(registro=None, dry_run=True):
    registro = registro or Registro()

    with db.conexion() as conn:
        nombres_existentes = {_clave(n) for n in db.nombres_catalogo(conn, TABLA_GRUPO)}
        ids_por_nombre = db.ids_grupo_por_nombre(conn)
        usuarios_por_ci = db.usuarios_por_ci(conn)
        rel_actual = db.conteo_grupo_funcionalidad(conn)
    print("  Grupos en PostgreSQL: %d | usuarios: %d"
          % (len(ids_por_nombre), len(usuarios_por_ci)))
    for nombre, n in sorted(rel_actual.items()):
        print("    %-16s %2d funcionalidad(es)" % (nombre, n))

    nuevos_grupos, movimientos = preparar(
        registro, nombres_existentes, usuarios_por_ci, ids_por_nombre)

    if dry_run:
        print("  SIMULACIÓN: %d grupo(s) y %d usuario(s)"
              % (len(nuevos_grupos), len(movimientos)))
        return 0, registro, nuevos_grupos, movimientos

    with db.conexion() as conn:
        db.crear_log(conn)
        movidos = ejecutar(conn, registro, nuevos_grupos, movimientos)
        with db.conexion() as c2, c2.cursor() as cur:
            cur.execute("SELECT count(*) FROM {t}".format(t=TABLA_GRUPO))
            total = cur.fetchone()[0]
    print("  Grupos insertados: %d | usuarios movidos: %d | grupos ahora: %d"
          % (len(nuevos_grupos), movidos, total))
    return movidos, registro, nuevos_grupos, movimientos


# ---------------------------------------------------------------------------
# Reversión
# ---------------------------------------------------------------------------
#
# Comerciales y Directivos nacen SIN funcionalidades, y `hasFuncionalidad` es
# sólo `funcionalidades.some(...)`: un usuario en un grupo vacío no ve nada del
# menú, tampoco la pantalla de Grupos con la que se configuraría.
#
# Los administradores no se mueven nunca, así que siempre hay alguien que puede
# entrar y arreglarlo desde Configuración → Grupos. Si aun así hubiera que
# devolver a los cinco usuarios a LECTOR por SQL:
#
#   UPDATE usuarios SET id_grupo = 2
#    WHERE alias IN ('nelsy', 'soraya', 'yeya', 'isa', 'nanett');
#
# LECTOR (id 2) tiene 27 funcionalidades, con lo que vuelven a ver el sistema.
# Es un UPDATE directo y no pasa por el ETL: sirve para salir de un paso, no como
# forma de trabajo. Lo que debe hacerse es asignar las funcionalidades en la
# pantalla, que es reversible y queda registrado.
#
# No se borran los grupos al deshacer: se quedan vacíos y sin uso, y estorban
# más que molestar al siguiente que lea la tabla.
REV_USUARIOS_A_LECTOR = ("nelsy", "soraya", "yeya", "isa", "nanett")
