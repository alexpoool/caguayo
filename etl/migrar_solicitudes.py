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

Todas las solicitudes van en `EN PROCESO` para que aparezcan en la pantalla de
proyectos, que filtra por ese estado, y además se dan por **aprobadas**
(`aprobado = true`). El legacy sólo trae un `aprobada` de dos letras, así que el
estado y el booleano son ambos decisión de la migración; no queda nada pendiente
de revisión, y por eso `estado_por_revisar` queda siempre en `False`.

Del legacy sin destino: `nombre_rec`, `primerapellido_rec`,
`segundoapellido_rec` (3.101 filas los tienen), `cta` (3) y `numero` (el destino
borró esa columna en `drop_numero_solicitud`).
"""

import db
import reglas_legacy as rl
from cliente_pivote import CODIGO as CODIGO_PIVOTE
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
#: filtra por este estado. El legacy no guarda un estado de solicitud (sólo un
#: `aprobada` de dos letras), así que el estado se inventa; lo mismo pasa con
#: `aprobado`, que se fuerza a `true` en todas.
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


def _nits_legacy():
    """`id_cliente` del legacy -> su NIT, para recuperar un cliente por NIT.

    Misma idea que en la Fase L: un cliente que la Fase B descartó por código
    duplicado se encuentra por su NIT, que sí apunta al superviviente.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "cliente")
    salida = {}
    for f in filas:
        id_legacy = texto(f.get("id_cliente"))
        nit = no_vacio(f.get("nit"))
        if id_legacy and nit:
            salida[id_legacy] = nit
    return salida


def _contratos_legacy():
    """Del dump del legacy: `id_solicitudsc` -> (id_contrato, código, fila).

    Es el puente en el otro sentido: de la solicitud al contrato. Se recorre una
    sola vez, porque hacerlo por fila sobre 3.427 solicitudes y 3.396 contratos
    son 13 millones de comparaciones. La fila entera hace falta para saber, por
    sus importes, en qué moneda quedó el contrato y si se partió en dos.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "contrato")
    salida = {}
    for f in filas:
        id_solicitud = texto(f.get("id_solicitudsc"))
        codigo = texto(f.get("codigo_contrato"))
        if id_solicitud and id_solicitud != "0" and codigo:
            salida.setdefault(
                id_solicitud, (texto(f.get("id_contrato")), codigo, f))
    return salida


def _copias_contrato(id_contrato, codigo, fila, codigos_contrato):
    """`{símbolo: código del contrato en el destino}`.

    Un contrato con las dos monedas quedó partido en dos por la Fase L
    (`1.FT.codigo` en CUP y `2.FT.codigo` en CUC); uno de una sola moneda quedó
    tal cual, también con su `FT.`. La Fase L antepone `FT.` al código del
    legacy (`migrar_contratos`), así que aquí los candidatos se componen igual.
    Se resuelve mirando qué códigos existen de verdad en el destino.
    """
    copias = {}
    for simbolo, cand in rl.copias_de_contrato(
            "FT.%s" % codigo, id_contrato, fila.get("valor_contratocuc"),
            fila.get("valor_contratocup")):
        if cand in codigos_contrato:
            copias[simbolo] = cand
    # Sin partido, la copia vino con símbolo None: se le pone el que dicen los
    # importes del contrato.
    if set(copias) == {None}:
        importes, _ = rl.importes_por_moneda(
            fila.get("valor_contratocuc"), fila.get("valor_contratocup"))
        copias = {importes[0][1]: copias[None]}
    return copias


def _codigo_de_copia(codigo, simbolo):
    """El código de la solicitud clonada: CUP conserva el del legacy, CUC `-CUC`.

    El proyecto original —el que ya existía— se queda con el código de siempre y
    la moneda CUP; la copia nueva, la CUC, se distingue con el sufijo. Así los
    enlaces, los informes y las búsquedas por el código viejo siguen apuntando al
    mismo sitio de antes.
    """
    return codigo if simbolo == "CUP" else "%s-CUC" % codigo


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


def _revision():
    """(aprobado, estado_por_revisar, motivo_revision): siempre aprobada.

    Todas las solicitudes se dan por aprobadas. El legacy sólo trae un
    `aprobada` de dos letras ('Si'/'No') y el resto ya se migra como proyecto en
    curso, así que se fuerza `aprobado=True` y no queda nada por revisar: ni
    `estado_por_revisar` ni `motivo_revision`.
    """
    return True, False, None


def _codigo(codigo_legacy, id_legacy, fecha_iso, codigo_de_contrato=None):
    """El código del legacy con su `FT.`, o el de su contrato, o uno nuevo.

    Los 3.104 que trae son `AAAA.NNN`; quedan `FT.AAAA.NNN`
    (`2014.001` → `FT.2014.001`). `codigo_solicitud` NO es UNIQUE en el
    destino, así que se copian aunque seis estén repetidos.

    Las que faltan (324, id_solicitudsc 3172 en adelante) van con el código de
    su contrato antepuesto de `FT.`: la 3172, enlazada al contrato `2022.021`,
    sale `FT.2022.021`. Los 324 códigos no chocan entre sí porque cada
    solicitud tiene a lo sumo un contrato. Si tampoco hubiese contrato, cae el
    formato de la aplicación (`FT.AA.NNN`) con el
    `id_solicitudsc` como correlativo. Encima de ser único y estar por encima
    del 581 del legacy, tiene que ser **determinista**: si se sacara de
    `MAX(SPLIT_PART(codigo,'.',-1)::int) + 1` sobre lo que ya hay, la segunda
    pasada calcularía un número mayor, no reconocería lo que escribió la
    primera y duplicaría 282 solicitudes. El año sale de la fecha de la propia
    solicitud, no del reloj, para que el código tampoco cambie en enero.

    `fecha_iso` es la fecha ISO (`AAAA-MM-DD`) que devuelve `limpieza.fecha`.
    """
    avisos = []
    if codigo_legacy:
        return "FT.%s" % codigo_legacy, False, avisos
    if codigo_de_contrato:
        codigo = "FT.%s" % codigo_de_contrato
        avisos.append((
            "sin codigo en el legacy",
            "se usa %s" % codigo,
            "la solicitud no trae código; se compone con el de su contrato",
        ))
        return codigo, True, avisos
    # 'AAAA-MM-DD' -> los dos últimos dígitos del año.
    return "FT.%s.%03d" % (str(fecha_iso)[2:4], int(id_legacy)), True, avisos


def preparar(registro: Registro, codigos_cliente, codigos_contrato,
             codigos_existentes=(), nits_cliente=None):
    """Arma los payloads. No escribe nada en la base.

    Devuelve (payloads, enlaces): `enlaces` es `codigo_solicitud ->
    codigo_contrato del destino`, con el que `_enlazar` rellena `id_contrato`
    después. Un contrato que el destino partió en dos monedas genera **dos**
    solicitudes, una por moneda, cada una con su contrato: el "proyecto" entero
    se duplica, como pidió el usuario.
    """
    from fuente import leer_tabla

    _, filas = leer_tabla(DUMP_MARIADB, "solicitud_sc")
    clientes = _clientes_legacy()
    nits = _nits_legacy()
    nits_cliente = nits_cliente or {}
    contratos = _contratos_legacy()
    fechas_por_cliente = _fechas_por_cliente(filas)

    ya_usados = set(codigos_existentes)
    previos = set(codigos_existentes)
    payloads = []
    enlaces = {}
    generados = 0

    for f in filas:
        id_legacy = texto(f.get("id_solicitudsc"))
        nombre = no_vacio(f.get("descripcion"))

        id_cliente_legacy = texto(f.get("id_cliente"))
        codigo_cliente = clientes.get(id_cliente_legacy)
        id_cliente = codigos_cliente.get(codigo_cliente) if codigo_cliente else None
        avisos_cliente = []
        if id_cliente is None and id_cliente_legacy:
            nit = nits.get(id_cliente_legacy)
            id_cliente = nits_cliente.get(nit) if nit else None
            if id_cliente is not None:
                avisos_cliente.append((
                    "cliente recuperado por NIT",
                    "id_cliente legacy=%s nit=%r" % (id_cliente_legacy, nit),
                    "la Fase B lo descarto por codigo duplicado; el NIT apunta "
                    "al superviviente"))
        if id_cliente is None:
            id_cliente = codigos_cliente.get(CODIGO_PIVOTE)
            avisos_cliente.append((
                "cliente pivote",
                "id_cliente legacy=%s codigo=%r"
                % (id_cliente_legacy, codigo_cliente),
                "la solicitud no tiene cliente propio en el legacy"))
        if id_cliente is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "cliente no migrado",
                              "id_cliente=%s codigo=%r"
                              % (id_cliente_legacy, codigo_cliente))
            continue

        encontrado = contratos.get(id_legacy)

        # La fila puede no tener fecha; si su contrato sí la trae, esa es
        # directamente la suya (329 del legacy van así). La fecha más antigua
        # del mismo cliente queda como segundo nivel para el caso raro de
        # contrato también sin fecha.
        fecha_solicitud, avisos_fecha = rl.fecha_con_respaldo(
            f.get("fecha_solicitudsc"),
            fechas_por_cliente.get(f.get("id_cliente"), []),
            respaldo=encontrado[2].get("fecha") if encontrado else None)
        if fecha_solicitud is None:
            registro.descarte(ORIGEN, id_legacy, nombre, "sin fecha",
                              "ni la fila ni las de su cliente tienen fecha")
            continue

        codigo, generado, avisos_codigo = _codigo(
            no_vacio(f.get("codigo_solicitudsc")), id_legacy, fecha_solicitud,
            codigo_de_contrato=encontrado[1] if encontrado else None)

        copias = (_copias_contrato(encontrado[0], encontrado[1], encontrado[2],
                                   codigos_contrato)
                  if encontrado else {})

        # Un contrato con las dos monedas dejó DOS contratos en el destino, así
        # que su solicitud se clona: CUP con el código del legacy, CUC `-CUC`.
        if len(copias) >= 2:
            partes = [(simbolo, _codigo_de_copia(codigo, simbolo))
                      for simbolo in ("CUP", "CUC")]
        elif copias:
            partes = [(next(iter(copias)), codigo)]
        else:
            partes = [(None, codigo)]

        avisos = list(avisos_fecha) + list(avisos_codigo) + list(avisos_cliente)
        material, avisos_material = _material_asumido(f.get("mat_asumidos"))
        avisos += avisos_material
        aprobada, revisar, motivo = _revision()

        emitidas = 0
        for simbolo, cod_sol in partes:
            if cod_sol in previos:
                registro.descarte(ORIGEN, id_legacy, nombre, "ya migrada",
                                  "codigo=%s" % cod_sol)
                continue
            ya_usados.add(cod_sol)

            payloads.append({
                "codigo_solicitud": cod_sol,
                "id_cliente": id_cliente,
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
            emitidas += 1
            if simbolo is not None:
                enlaces[cod_sol] = copias[simbolo]

        if generado and emitidas:
            generados += 1

        for motivo_aviso, resumen, detalle in avisos:
            registro.warning(ORIGEN, id_legacy, nombre, motivo_aviso,
                             detalle or resumen)

    print("  Filas a migrar: %d | códigos suplidos del legacy: %d | para revisar: %d"
          % (len(payloads), generados,
             sum(1 for p in payloads if p["estado_por_revisar"])))
    return payloads, enlaces


def _enlazar(conn, enlaces, registro: Registro):
    """Rellena `id_contrato` de las solicitudes ya insertadas.

    `enlaces` es `codigo_solicitud -> codigo_contrato` del destino, que ya trae
    la moneda resuelta: la solicitud clonada de un contrato partido apunta a su
    propia copia del contrato. Va en su propia transacción y con un UPDATE por
    fila, no un INSERT con la foreign key puesta: tirar la constraint obligaría a
    conocer su nombre y a que nadie la toque mientras se insertan 3.426 filas.
    """
    if not enlaces:
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
        for codigo_solicitud, codigo_contrato in enlaces.items():
            if not codigo_contrato:
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


def _generar_codigos_proyecto(conn, registro: Registro):
    """Rellena `codigo_proyecto` de las solicitudes que ya son proyecto.

    Es la misma regla que aplica la aplicación en `servicio_service.py:187-190`:
    aprobado **y** con contrato. Sin las dos cosas la solicitud todavía no es un
    proyecto, y `update()` le generará el código en su día si llega a serlo.

    Va después de `_enlazar` porque hasta que el contrato no está enlazado no se
    sabe si la fila califica.

    El proyecto hereda el código de su propia solicitud: proyecto y solicitud
    comparten código y el rastreo end-to-end queda amarrado (el contrato de
    arriba lleva su `2026.041`). Nada de serie correlativa añadida: no hay
    secuencia que inventar, y reejecutar la fase no puede chocar con lo que ya
    escribió una pasada anterior ni con lo que ponga la aplicación después,
    porque el UPDATE es idempotente por su `WHERE codigo_proyecto IS NULL` y los
    códigos que la app genere más tarde son para filas nuevas.
    """
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE %s SET codigo_proyecto = codigo_solicitud"
            " WHERE aprobado AND id_contrato IS NOT NULL"
            "   AND codigo_proyecto IS NULL" % TABLA)
        generadas = cur.rowcount
    conn.commit()
    return max(generadas, 0)


def _enlazables(enlaces):
    """Cuántas solicitudes encontrarían contrato, sin tocar la base.

    Los códigos ya vienen resueltos contra el destino cuando se armó el payload,
    así que sólo se cuentan los que tienen a dónde apuntar.
    """
    return sum(1 for codigo in enlaces.values() if codigo)


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
        nits_cliente = db.mapa_nit_a_cliente(conn)
        codigos_contrato = db.codigos_de_contrato(conn)
        codigos_existentes = {
            c for c in db.valores_existentes(conn, TABLA, "codigo_solicitud") if c}

    print("  Clientes: %d | contratos: %d | solicitudes ya: %d"
          % (len(codigos_cliente), len(codigos_contrato), len(codigos_existentes)))

    payloads, enlaces = preparar(
        registro, codigos_cliente, codigos_contrato, codigos_existentes,
        nits_cliente)
    revisar_solicitudes(diag, payloads)

    with db.conexion() as conn:
        problemas = db.puerta_de_calidad(conn, {TABLA: payloads})
    print("  Puerta de calidad: %d problema(s)" % len(problemas))
    for problema in problemas[:10]:
        print("    - %s | %s | %s" % problema)

    if dry_run:
        print("  SIMULACIÓN: %d solicitud(es), %d con contrato enlazable"
              % (len(payloads), _enlazables(enlaces)))
        return 0, registro, payloads, enlaces, diag

    with db.conexion() as conn:
        db.crear_log(conn)
        insertadas = ejecutar(conn, registro, payloads)
        enlazados = _enlazar(conn, enlaces, registro)
        proyectos = _generar_codigos_proyecto(conn, registro)

    print("  Solicitudes insertadas: %d | con contrato enlazado: %d"
          % (insertadas, enlazados))
    print("  Códigos de proyecto generados: %d" % proyectos)
    return insertadas, registro, payloads, enlaces, diag