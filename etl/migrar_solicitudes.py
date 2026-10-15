# -*- coding: utf-8 -*-
"""Fase N: `solicitud_sc` -> `solicitud_servicio`.

En el proyecto la solicitud es el origen de todo lo demás: al aprobarla se crea
o se elige el contrato, y de ahí salen las etapas. En el legacy es al revés —el
contrato apunta a la solicitud con `id_solicitudsc`—, y por eso esta tabla se
venía exportando sólo como puente para la Fase L. A partir de aquí se migra.

La referencia es mutua: `solicitud_servicio.id_contrato` apunta al contrato, y el
contrato sabe su solicitud por el legacy. Por eso el `id_contrato` NO va en el
INSERT: se inserta la solicitud sin él y se enlaza después con un UPDATE, que va
en su propia transacción. Tirar la constraint y reponerla obligaría a saber su
nombre y a que nadie la toque en medio.

Las 3.426 solicitudes van en `EN PROCESO` para que aparezcan en la pantalla de
proyectos, que filtra por ese estado. En 337 el legacy no decía si estaban
aprobadas, así que el estado es provisional y se marcan con `estado_por_revisar`
para que alguien las rectifique. `aprobado` conserva el valor real del legacy: el
estado lo inventamos, el booleano es dato.

Del legacy sin destino: `nombre_rec`, `primerapellido_rec`,
`segundoapellido_rec` (3.101 filas los tienen), `cta` (3) y `numero` (el destino
borró esa columna en `drop_numero_solicitud`).
"""

import db
import reglas_legacy as rl
from config import (
    DUMP_MARIADB,
    TAMANO_LOTE,
)
from diagnostico import Diagnostico, revisar_solicitudes
from limpieza import fecha as fecha_legado
from limpieza import no_vacio, texto
from log import Registro
from migrar_clientes import _codigo_de_rescate

ORIGEN = "solicitud_sc"

TABLA = "solicitud_servicio"

LARGO_CARGO = 100

#: Se pone en todas para que la fila se vea en la pantalla de proyectos, que
#: filtra por este estado. El legacy no guarda un estado de solicitud: sólo un
#: `aprobada` de dos letras.
ESTADO_MIGRACION = "EN PROCESO"


def _clientes_legacy():
    """`id_cliente` del legacy -> el código con el que está en PostgreSQL.

    Misma regla que la Fase L: el `codigo` del legacy o, si vino vacío,
    `LEG-{id}`, que es lo que le asignó la Fase B.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "cliente")
    salida = {}
    for f in filas:
        id_legacy = texto(f.get("id_cliente"))
        if id_legacy:
            salida[id_legacy] = no_vacio(f.get("codigo")) or _codigo_de_rescate(
                {"_id": id_legacy})
    return salida


def _contratos_legacy():
    """Del dump del legacy: `id_solicitudsc` -> `codigo_contrato`.

    Es el puente en el otro sentido: de la solicitud al contrato. Se recorre una
    sola vez, porque hacerlo por fila sobre 3.427 solicitudes y 3.396 contratos
    son 13 millones de comparaciones.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "contrato")
    salida = {}
    for f in filas:
        id_solicitud = texto(f.get("id_solicitudsc"))
        codigo = texto(f.get("codigo_contrato"))
        if id_solicitud and codigo:
            salida.setdefault(id_solicitud, codigo)
    return salida


def _fechas_por_cliente(filas):
    """cliente del legacy -> fechas ISO de SUS solicitudes, para las que faltan."""
    por_cliente = {}
    for f in filas:
        fecha = fecha_legado(f.get("fecha_solicitudsc"))
        if fecha:
            por_cliente.setdefault(f.get("id_cliente"), []).append(fecha)
    return por_cliente


def _material_asumido(valor):
    """`mat_asumidos` -> `material_asumido_x`.

    El legacy guarda QUIÉN asume el material ('Cliente', 'Artista',
    'Artista Cliente') y el destino un booleano. Se lee como "lo asume el
    artista".

    Es una interpretación del nombre de la columna, no un dato: nadie lo escribió
    en ningún sitio. Por eso los valores raros avisan.
    """
    clave = (texto(valor) or "").strip().lower()
    if clave == "artista":
        return True, []
    if clave in ("cliente", ""):
        return False, []
    return True, [(
        "material asumido %r" % valor,
        "se asume que lo asume el artista",
        "el destino sólo admite un sí o un no y el legacy tiene tres valores",
    )]


def _revision(estado_aprobada):
    """(aprobado, estado_por_revisar, motivo_revision) desde el `aprobada` legacy.

    El estado va a `EN PROCESO` en todas para que la fila se vea en la pantalla
    de proyectos, pero eso sólo es una traducción fiel cuando el legacy decía
    'Si'. Con 'No' o sin dato el estado es inventado, y eso se marca para que
    alguien lo rectifique. `aprobado` conserva el valor real del legacy: el
    estado se inventa, el booleano es dato.
    """
    clave = (texto(estado_aprobada) or "").strip().lower()
    if clave == "si":
        return True, False, None
    if clave == "no":
        return False, True, "el legacy la tiene aprobada=No"
    return False, True, "el legacy no guarda si esta solicitud estaba aprobada"


def _codigo(codigo_legacy, id_legacy, fecha_iso):
    """El código del legacy tal cual, o uno nuevo si no lo tiene.

    Los 3.103 que trae son `AAAA.NNN`, y `codigo_solicitud` NO es UNIQUE en el
    destino, así que se copian aunque seis estén repetidos.

    Los que faltan usan el formato de la aplicación (`PREFIX.AA.NNN`) con el
    `id_solicitudsc` como correlativo. Encima de ser único y estar por encima del
    581 del legacy, tiene que ser **determinista**: si se sacara de
    `MAX(SPLIT_PART(codigo,'.',-1)::int) + 1` sobre lo que ya hay, la segunda
    pasada calcularía un número mayor, no reconocería lo que escribió la primera y
    duplicaría 282 solicitudes. El año sale de la fecha de la propia solicitud, no
    del reloj, para que el código tampoco cambie en enero.

    `fecha_iso` es la fecha ISO (`AAAA-MM-DD`) que devuelve `limpieza.fecha`.
    """
    if codigo_legacy:
        return codigo_legacy, False
    # 'AAAA-MM-DD' -> los dos últimos dígitos del año.
    return "CAG.%s.%03d" % (str(fecha_iso)[2:4], int(id_legacy)), True


def preparar(registro: Registro, codigos_cliente, codigos_existentes=()):
    """Arma los payloads. No escribe nada en la base.

    Devuelve (payloads, id_legacy_por_codigo) para poder enlazar los contratos
    después: el segundo es lo que permite ir del `codigo_solicitud` que acabamos
    de inventar al `id_solicitudsc` del legacy.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "solicitud_sc")
    clientes = _clientes_legacy()
    fechas_por_cliente = _fechas_por_cliente(filas)

    ya_usados = set(codigos_existentes)
    previos = set(codigos_existentes)
    payloads = []
    id_legacy_por_codigo = {}
    generados = 0

    for f in filas:
        id_legacy = texto(f.get("id_solicitudsc"))
        nombre = no_vacio(f.get("descripcion"))

        codigo_cliente = clientes.get(f.get("id_cliente"))
        if codigo_cliente is None or codigo_cliente not in codigos_cliente:
            registro.descarte(ORIGEN, id_legacy, nombre, "cliente no migrado",
                              "id_cliente=%s codigo=%r"
                              % (f.get("id_cliente"), codigo_cliente))
            continue

        fecha_solicitud, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha_solicitudsc"),
            fechas_por_cliente.get(f.get("id_cliente"), []))
        if fecha_solicitud is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "sin fecha",
                              "ni la fila ni las de su cliente tienen fecha")
            continue

        codigo, generado = _codigo(no_vacio(f.get("codigo_solicitudsc")),
                                   id_legacy, fecha_solicitud)
        if codigo in previos:
            registro.descarte(ORIGEN, id_legacy, nombre, "ya migrada",
                              "codigo=%s" % codigo)
            continue
        ya_usados.add(codigo)
        generados += 1 if generado else 0

        avisos = list(avisos_fecha)
        material, avisos_material = _material_asumido(f.get("mat_asumidos"))
        avisos += avisos_material

        aprobada, revisar, motivo = _revision(f.get("aprobada"))

        payloads.append({
            "codigo_solicitud": codigo,
            "id_cliente": codigos_cliente[codigo_cliente],
            # Se deja vacío a propósito: se enlaza en `_enlazar`.
            "id_contrato": None,
            "id_suplemento": None,
            "nombres_rep": no_vacio(f.get("nombre_rep")),
            "apellido1_rep": no_vacio(f.get("primerapellido_rep")),
            "apellido2_rep": no_vacio(f.get("segundoapellido_rep")),
            "ci_rep": no_vacio(f.get("ci_rep")),
            # El legacy no guarda teléfono del representante.
            "telefono_rep": None,
            "cargo": (no_vacio(f.get("caracter")) or "")[:LARGO_CARGO] or None,
            "descripcion": nombre,
            "fecha_solicitud": fecha_solicitud,
            "fecha_entrega": fecha_legado(f.get("fecha_entrega")),
            "estado": ESTADO_MIGRACION,
            "observaciones": no_vacio(f.get("observaciones")),
            "material_asumido_x": material,
            # El legacy trae 0 en las 3.427.
            "id_usuario": None,
            "aprobado": aprobada,
            "codigo_proyecto": None,
            "estado_por_revisar": revisar,
            "motivo_revision": motivo,
        })
        id_legacy_por_codigo[codigo] = id_legacy

        for motivo_aviso, resumen, detalle in avisos:
            registro.warning(ORIGEN, id_legacy, nombre, motivo_aviso,
                             detalle or resumen)

    print("  Filas a migrar: %d | códigos generados: %d | para revisar: %d"
          % (len(payloads), generados,
             sum(1 for p in payloads if p["estado_por_revisar"])))
    return payloads, id_legacy_por_codigo


def _enlazar(conn, id_legacy_por_codigo, codigos_contrato, registro: Registro):
    """Rellena `id_contrato` de las solicitudes ya insertadas.

    Va en su propia transacción y con un UPDATE por fila, no un INSERT con la
    foreign key puesta: tirar la constraint obligaría a conocer su nombre y a que
    nadie la toque mientras se insertan 3.426 filas.
    """
    contrato_por_solicitud = _contratos_legacy()
    if not contrato_por_solicitud:
        return 0

    with conn.cursor() as cur:
        cur.execute("SELECT codigo_solicitud, id_solicitud_servicio FROM %s"
                    % TABLA)
        # codigo_solicitud -> id_solicitud_servicio. El orden de las columnas
        # importa: invertido, el enlace sale 0 sin que ninguna fila proteste.
        ids_por_codigo = {codigo: id_sol for codigo, id_sol in cur.fetchall()
                          if codigo}

    enlazados = 0
    with conn.cursor() as cur:
        for codigo_solicitud, id_legacy in id_legacy_por_codigo.items():
            codigo_contrato = contrato_por_solicitud.get(id_legacy)
            if not codigo_contrato or codigo_contrato == "0":
                continue
            id_solicitud = ids_por_codigo.get(codigo_solicitud)
            if not id_solicitud:
                continue
            cur.execute(
                "UPDATE %s SET id_contrato ="
                " (SELECT id_contrato FROM contrato WHERE codigo = %%s)"
                " WHERE id_solicitud_servicio = %%s AND id_contrato IS NULL" % TABLA,
                (codigo_contrato, id_solicitud),
            )
            enlazados += cur.rowcount
    conn.commit()
    return enlazados


def _enlazables(id_legacy_por_codigo, codigos_contrato):
    """Cuántas solicitudes encontrarían contrato, sin tocar la base."""
    contrato_por_solicitud = _contratos_legacy()
    total = 0
    for id_legacy in id_legacy_por_codigo.values():
        codigo = contrato_por_solicitud.get(id_legacy)
        if codigo and codigo != "0" and (
                codigo in codigos_contrato
                or "%s-%s" % (codigo, id_legacy) in codigos_contrato):
            total += 1
    return total


def ejecutar(conn, registro: Registro, payloads):
    """Inserta por lotes. Cada lote es una transacción."""
    from psycopg2.extras import execute_values

    insertadas = 0
    columnas = list(payloads[0].keys()) if payloads else []
    for lote in db.lotes(payloads, TAMANO_LOTE):
        try:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    "INSERT INTO {t} ({c}) VALUES %s".format(
                        t=TABLA, c=", ".join(columnas)),
                    [tuple(f[c] for c in columnas) for f in lote],
                    page_size=TAMANO_LOTE,
                )
            conn.commit()
            insertadas += len(lote)
        except Exception as exc:
            conn.rollback()
            registro.error(ORIGEN, 0, None, "error inesperado",
                           "lote revertido: %s" % exc)
            print("  [Fase N] lote revertido: %s" % exc)
    return insertadas


def cargar_solicitudes(registro=None, dry_run=True, diag=None):
    registro = registro or Registro()
    diag = diag or Diagnostico()

    with db.conexion() as conn:
        codigos_cliente = db.mapa_codigo_a_cliente(conn)
        codigos_contrato = db.codigos_de_contrato(conn)
        codigos_existentes = {
            c for c in db.valores_existentes(conn, TABLA, "codigo_solicitud") if c}

    print("  Clientes: %d | contratos: %d | solicitudes ya: %d"
          % (len(codigos_cliente), len(codigos_contrato), len(codigos_existentes)))

    payloads, id_legacy_por_codigo = preparar(
        registro, codigos_cliente, codigos_existentes)
    revisar_solicitudes(diag, payloads)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {TABLA: payloads})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d solicitud(es), %d con contrato enlazable"
              % (len(payloads), _enlazables(id_legacy_por_codigo, codigos_contrato)))
        return 0, registro, payloads, id_legacy_por_codigo, diag

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
        enlazados = _enlazar(conn, id_legacy_por_codigo, codigos_contrato, registro)

    print("  Solicitudes insertadas: %d | con contrato enlazado: %d"
          % (insertadas, enlazados))
    return insertadas, registro, payloads, id_legacy_por_codigo, diag