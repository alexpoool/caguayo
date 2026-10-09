# -*- coding: utf-8 -*-
"""Acceso a PostgreSQL: conexión, lotes con commit/rollback y puerta de calidad.

Cada lote es una transacción independiente (§19): si falla, se revierte sólo ese
lote y la migración continúa con el siguiente (§3).

La puerta de calidad contrasta los payloads contra `information_schema` de la
base viva ANTES de escribir, para no descubrir una violación a mitad de un
INSERT.
"""
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import execute_values

from config import (
    DIR_SQL,
    POSTGRES,
    TABLA_CLIENTES,
    TABLA_CUENTA,
    TABLA_CUENTA_DEP,
    TABLA_ESPECIALIDAD,
    TABLA_NATURAL,
    TABLA_USUARIO,
)


@contextmanager
def conexion():
    conn = psycopg2.connect(
        host=POSTGRES.host,
        port=POSTGRES.port,
        user=POSTGRES.user,
        password=POSTGRES.password,
        dbname=POSTGRES.database,
    )
    conn.autocommit = False
    try:
        yield conn
    finally:
        conn.close()


def crear_log(conn):
    """Crea `migracion_log` si no existe (§17)."""
    sql = (DIR_SQL / "001_migracion_log.sql").read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


def lotes(secuencia, tamano):
    """Parte una secuencia en lotes."""
    for inicio in range(0, len(secuencia), tamano):
        yield secuencia[inicio:inicio + tamano]


def insertar_padres_hijas(conn, tabla_padre, tabla_hija, pares, lote=None):
    """Inserta un lote de (padre, hijo) y devuelve el id generado de cada padre.

    Padre e hijo se escriben en la misma transacción, de modo que nunca queda
    un padre sin su fila hija. El `id_cliente` de la tabla hija lo inyecta el
    propio lote a partir del `RETURNING` del padre.
    """
    columnas_padre = list(pares[0][0].keys())
    columnas_hija = list(pares[0][1].keys())
    columnas_hija_sql = ["id_cliente"] + columnas_hija

    with conn.cursor() as cur:
        sql_padre = (
            "INSERT INTO {tabla} ({cols}) VALUES %s RETURNING id_cliente"
        ).format(tabla=tabla_padre, cols=", ".join(columnas_padre))

        valores_padre = [tuple(padre[c] for c in columnas_padre) for padre, _ in pares]
        ids = [i[0] for i in execute_values(cur, sql_padre, valores_padre,
                                           fetch=True, page_size=len(pares))]

        sql_hija = "INSERT INTO {tabla} ({cols}) VALUES %s".format(
            tabla=tabla_hija, cols=", ".join(columnas_hija_sql))
        valores_hija = [
            tuple([id_cliente] + [hijo[c] for c in columnas_hija])
            for id_cliente, (_, hijo) in zip(ids, pares)
        ]
        execute_values(cur, sql_hija, valores_hija, page_size=len(pares))

    return ids


def _restricciones(conn):
    """Lee del destino las columnas NOT NULL, sus defaults y las longitudes.

    Una columna NOT NULL con DEFAULT no tiene que ir en el payload: la genera
    la base de datos, como ocurre con `id_cliente` (SERIAL).
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT table_name, column_name, is_nullable, character_maximum_length,"
            "       column_default IS NOT NULL AS tiene_default"
            " FROM information_schema.columns WHERE table_schema = 'public'"
        )
        return cur.fetchall()


def puerta_de_calidad(conn, payloads_por_tabla, claves_omitidas=None, no_vacias=None):
    """Valida los payloads contra las restricciones reales del destino.

    `claves_omitidas` indica, por tabla, las columnas que no viajan en el
    payload porque las aporta la base de datos (la FK `id_cliente` de las
    tablas hijas, o los seriales con DEFAULT).

    `no_vacias` indica, por tabla, las columnas que además de NOT NULL no
    admiten cadena vacía. Es un requisito de la aplicación, no de la base:
    NOT NULL acepta '' sin error, así que sin esto el paso no se entera.

    Devuelve una lista de problemas. Vacía significa que se puede escribir.
    """
    problemas = []
    restricciones = _restricciones(conn)
    claves_omitidas = claves_omitidas or {}
    no_vacias = no_vacias or {}

    por_tabla = {}
    for tabla, columna, is_nullable, max_len, tiene_default in restricciones:
        por_tabla.setdefault(tabla, []).append((columna, is_nullable, max_len, tiene_default))

    with conn.cursor() as cur:
        for tabla, filas in payloads_por_tabla.items():
            specs = por_tabla.get(tabla)
            if specs is None:
                problemas.append(("tabla inexistente en destino", tabla, None))
                continue

            omitidas = set(claves_omitidas.get(tabla, ()))
            obligatorias = [c for (c, nullable, _, dflt) in specs
                            if nullable == "NO" and not dflt and c not in omitidas]
            longitudes = {c: m for (c, _, m, _) in specs if m}
            sin_vacias = set(no_vacias.get(tabla, ()))

            vistos = {}
            for fila in filas:
                etiqueta = fila.get("nombre") or fila.get("codigo") or fila.get("codigo_reup")

                for columna in obligatorias:
                    if columna not in fila:
                        problemas.append(("%s.%s es NOT NULL y no se envía"
                                          % (tabla, columna), tabla, etiqueta))
                    elif fila[columna] is None:
                        problemas.append(("%s.%s es NOT NULL" % (tabla, columna), tabla, etiqueta))

                for columna in sin_vacias:
                    if str(fila.get(columna) or "").strip() == "":
                        problemas.append(("%s.%s no admite cadena vacía"
                                          % (tabla, columna), tabla, etiqueta))

                for columna, maximo in longitudes.items():
                    valor = fila.get(columna)
                    if valor is not None and len(str(valor)) > maximo:
                        problemas.append((
                            "%s.%s excede varchar(%d), longitud %d"
                            % (tabla, columna, maximo, len(str(valor))), tabla, etiqueta))

                for columna in ("nit", "codigo", "codigo_reup", "carnet_identidad"):
                    valor = fila.get(columna)
                    if valor is None:
                        continue
                    clave = (columna, valor)
                    if clave in vistos:
                        problemas.append((
                            "%s.%s duplicado dentro de la carga: %r" % (tabla, columna, valor),
                            tabla, etiqueta))
                    vistos[clave] = etiqueta

            for columna, etiqueta in _choques_con_destino(cur, tabla, filas):
                problemas.append((
                    "%s.%s ya existe en destino: %r" % (tabla, columna, etiqueta), tabla, etiqueta))

    return problemas


def _choques_con_destino(cur, tabla, filas):
    """Detecta valores que ya existen en las columnas UNIQUE del destino."""
    for columna in ("nit", "codigo", "codigo_reup", "carnet_identidad"):
        valores = [f[columna] for f in filas if f.get(columna) is not None]
        if not valores:
            continue
        cur.execute(
            "SELECT {c} FROM {t} WHERE {c} = ANY(%s)".format(c=columna, t=tabla),
            (valores,),
        )
        for (existente,) in cur.fetchall():
            yield columna, existente


def valores_existentes(conn, tabla, columna):
    """Valores ya presentes en una columna del destino."""
    with conn.cursor() as cur:
        cur.execute("SELECT {c} FROM {t}".format(c=columna, t=tabla))
        return {f[0] for f in cur.fetchall()}


def pares_existentes_cuenta(conn, tabla=TABLA_CUENTA):
    """Pares (id_cliente, numero_cuenta) ya presentes en `cuenta`.

    La tabla no tiene UNIQUE sobre `numero_cuenta`, así que la comprobación
    de idempotencia hay que hacerla explícita.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT id_cliente, numero_cuenta FROM {t}".format(t=tabla))
        return {(f[0], f[1]) for f in cur.fetchall()}


def mapa_codigo_a_cliente(conn):
    """`clientes.codigo` -> `id_cliente`.

    Permite Recover la equivalencia entre la ficha legacy y la fila migrada:
    el código se copió tal cual del origen en las fases A y B.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT codigo, id_cliente FROM {t}".format(t=TABLA_CLIENTES))
        return {f[0]: f[1] for f in cur.fetchall()}


def columnas(conn, tabla):
    """Los nombres de columna que tiene la tabla ahora mismo."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = %s",
            (tabla,),
        )
        return {f[0] for f in cur.fetchall()}


def nombres_catalogo(conn, tabla):
    """Los `nombre` tal cual están cargados en un catálogo.

    Se devuelven sin normalizar a propósito. La comparación la hace
    migrar_catalogo con su propia función, igual que se aplica a las filas del
    legacy: si cada lado se normalizara distinto, un "Compra-Venta" ya
    cargado en PostgreSQL y un "Compra-Venta" del legacy acabarían en claves
    diferentes por un guion y se insertaría un duplicado.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT nombre FROM {t}".format(t=tabla))
        return {f[0] for f in cur.fetchall() if f[0]}


def especialidades_existentes(conn):
    """Nombre normalizado -> id_especialidad de lo ya cargado."""
    with conn.cursor() as cur:
        cur.execute("SELECT id_especialidad, lower(nombre) FROM {t}".format(
            t=TABLA_ESPECIALIDAD))
        return {f[1]: f[0] for f in cur.fetchall()}


def ids_especialidad_de_artistas(conn):
    """artistas ya enlazados: id_cliente -> id_especialidad."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id_cliente, id_especialidad FROM clientes_persona_natural"
            " WHERE id_especialidad IS NOT NULL"
        )
        return {f[0]: f[1] for f in cur.fetchall()}


def artistas_migrados(conn):
    """Naturales ya en la base, indexados para emparejar con el origen.

    Devuelve dos diccionarios de id_cliente:
      por_ci     -> id_cliente,indexado por `carnet_identidad`
      por_codigo -> id_cliente,indexado por `clientes.codigo`

    El enlace se hace primero por CI; la Fase D normalizó el CI de unos pocos
    artistas (quedó con ceros a la izquierda), así que `codigo` sirve de
    alternativa.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT n.id_cliente, n.carnet_identidad, c.codigo"
            " FROM clientes_persona_natural n JOIN clientes c USING (id_cliente)"
        )
        filas = cur.fetchall()
    por_ci = {f[1]: f[0] for f in filas}
    por_codigo = {f[2]: f[0] for f in filas}
    return por_ci, por_codigo


def dependencia_por_nombre(conn, nombre):
    """`id_dependencia` a partir del nombre exacto. Devuelve None si no está."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id_dependencia FROM dependencia WHERE nombre = %s", (nombre,)
        )
        fila = cur.fetchone()
    return fila[0] if fila else None


def nombres_dependencias(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id_dependencia, nombre FROM dependencia")
        return {f[1]: f[0] for f in cur.fetchall()}


def pares_existentes_cuenta_dep(conn, tabla=TABLA_CUENTA_DEP):
    """Pares (id_dependencia, numero_cuenta) ya presentes."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id_dependencia, numero_cuenta FROM {t}".format(t=tabla)
        )
        return {(f[0], f[1]) for f in cur.fetchall()}


def insertar_cuentas_dependencia(conn, payloads):
    """Inserta un lote de filas de `cuenta_dependencias`."""
    if not payloads:
        return 0
    columnas = list(payloads[0].keys())
    valores = [tuple(p[c] for c in columnas) for p in payloads]
    sql = "INSERT INTO {t} ({cols}) VALUES %s".format(
        t=TABLA_CUENTA_DEP, cols=", ".join(columnas))
    with conn.cursor() as cur:
        execute_values(cur, sql, valores, page_size=len(payloads))
    return len(payloads)


def usuarios_existentes(conn):
    """CI y alias ya presentes en `usuarios`, para no duplicar."""
    with conn.cursor() as cur:
        cur.execute("SELECT ci, alias FROM {t}".format(t=TABLA_USUARIO))
        cis, aliases = set(), set()
        for ci, alias in cur.fetchall():
            if ci:
                cis.add(ci)
            if alias:
                aliases.add(alias)
    return cis, aliases


def insertar_cuentas(conn, payloads):
    """Inserta un lote de filas de `cuenta`. Devuelve cuántas entraron."""
    if not payloads:
        return 0
    columnas = list(payloads[0].keys())
    valores = [tuple(p[c] for c in columnas) for p in payloads]
    sql = "INSERT INTO {t} ({cols}) VALUES %s".format(
        t=TABLA_CUENTA, cols=", ".join(columnas))
    with conn.cursor() as cur:
        execute_values(cur, sql, valores, page_size=len(payloads))
    return len(payloads)


def ids_grupo_por_nombre(conn):
    """nombre de grupo -> id_grupo. Se resuelve por nombre y no por id del
    legacy porque los ids de ambas bases no significan lo mismo."""
    with conn.cursor() as cur:
        cur.execute("SELECT nombre, id_grupo FROM grupo")
        return {f[0]: f[1] for f in cur.fetchall()}


def usuarios_por_ci(conn):
    """CI -> lo justo para reasignar un grupo: id, alias y grupo actual."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT u.ci, u.id_usuario, u.alias, u.id_grupo, g.nombre "
            "FROM usuarios u LEFT JOIN grupo g USING(id_grupo)"
        )
        return {
            f[0]: {"id_usuario": f[1], "alias": f[2], "id_grupo": f[3],
                   "grupo_actual": f[4]}
            for f in cur.fetchall()
        }


def conteo_grupo_funcionalidad(conn):
    """nombre de grupo -> número de funcionalidades asignadas."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT g.nombre, count(gf.id_funcionalidad) "
            "FROM grupo g LEFT JOIN grupo_funcionalidad gf USING(id_grupo) "
            "GROUP BY g.nombre"
        )
        return {f[0]: f[1] for f in cur.fetchall()}


def clientes_ya_migrados(conn):
    """CI y códigos de `clientes` que ya están en el destino.

    Las tres columnas van al mismo conjunto porque las tres son la clave con la
    que la Fase A colisionaría al volver a correr: `artista.ci` acaba en
    `clientes.nit` y en `clientes_persona_natural.carnet_identidad`, y
    `artista.codigo_exp` en `clientes.codigo`. Las tres son UNIQUE, así que
    sin esta comprobación la fase no duplicaría, sólo fallaría por lotes.
    """
    valores = set()
    for tabla, columna in ((TABLA_CLIENTES, "nit"),
                           (TABLA_CLIENTES, "codigo"),
                           (TABLA_NATURAL, "carnet_identidad")):
        if columna in columnas(conn, tabla):
            valores |= {v for v in valores_existentes(conn, tabla, columna) if v}
    return valores
