# -*- coding: utf-8 -*-
"""Fabricar —o adoptar— los dos volcados del legacy.

El ETL no lee del legacy: lee volcados suyos. Este módulo los deja en
`etl/dumps/`, que es donde `config.py` los busca por defecto, de modo que en
una máquina recién desplegada `python main.py` funcione sin exportar nada.

Dos caminos:

* `volcar()`   llama a mysqldump contra el MariaDB del legacy. Es el camino
               normal cuando el legacy sigue en pie.
* `adoptar()`  instala un `.sql` que ya existe. Es el camino cuando el legacy
               ya no está y sólo quedan los respaldos.

Los dos terminan igual: validar con el tokenizer del propio ETL y, sólo si sale
bien, mover el fichero a su sitio. Un volcado a medias nunca queda como bueno.
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import fuente
from config import (
    DIR_DUMPS,
    LEGACY,
    LEGACY_DB_COMERCIAL,
    LEGACY_DB_PRINCIPAL,
)


class DumpInvalido(Exception):
    """El fichero no sirve: le falta una tabla, o la tabla viene vacía."""


#: Tablas que hay que extraer de cada base. Son las únicas que lee el ETL.
#:
#: De `caguayo_comercial` se leen estas catorce. De la base principal, dos: los
#: catálogos. El ETL NO lee `provincia` ni `municipio` — su mapeo de ids está en
#: geo.py — ni ninguna otra cosa.
#:
#: Exportar sólo esto, en vez de la base entera, da un volcado mucho más
#: pequeño y no arrastra facturas ni movimientos que nadie va a migrar.
#:
#: Cuatro de estas no se migran a una tabla propia; se leen para resolver ids:
#: `solicitud_sc` es el puente de `contrato` a `clientes` (el legacy guarda ahí el
#: `id_cliente`, no en el contrato), `estado_cs` traduce el estado del legacy al
#: del destino y `tipo_concepto` da el nombre del concepto de una liquidación.
#:
#: `artista_suplemento` entra aquí porque la Fase O la lee para saber a qué
#: artistas se les reparte un suplemento. Antes se leía igual y no estaba en esta
#: lista: el escaneo de tablas que lee el ETL (el test de este módulo) sólo
#: veía los literales de `leer_tabla(...)` y esta tabla se pide por el envoltorio
#: `_leer`, así que su ausencia pasó inadvertida y un volcado nuevo habría
#: reventado la migración a mitad del `--commit`.
TABLAS = {
    "comercial": (
        "artista",
        "cliente",
        "usuario",
        "grupo",
        "empresa",
        "artista_liquidacion",
        "tipo_concepto",
        "contrato",
        "suplemento",
        "solicitud_sc",
        "estado_cs",
        "etapas_cs",
        "artista_contrato",
        "artista_suplemento",
    ),
    "principal": ("tipo_contrato", "tipo_convenio"),
}

BASES = {"comercial": LEGACY_DB_COMERCIAL, "principal": LEGACY_DB_PRINCIPAL}

ETIQUETAS = {
    "comercial": "caguayo_comercial (artistas, clientes, usuarios, grupos, "
                 "liquidaciones, contratos, suplementos, solicitudes y etapas)",
    "principal": "caguayo principal (tipos de contrato y de convenio)",
}

#: Flags comunes a cualquier mysqldump.
#:
#: `--complete-insert` no es opcional: el ETL lee los nombres de columna del
#: propio INSERT (fuente.py). Sin esta opción mysqldump emite
#: `INSERT INTO `artista` VALUES (...)` y no se ve ni una columna.
#:
#: `--default-character-set=utf8mb4` tampoco: fuente.py lee con
#: `errors="replace"`, así que una codificación mal reconocida no da error,
#: destroza en silencio los nombres con tilde.
FLAGS_BASE = (
    "--single-transaction",
    "--skip-lock-tables",
    "--complete-insert",
    "--no-create-info",
    "--default-character-set=utf8mb4",
)

#: Los clientes de MySQL 8 fallan contra un MariaDB si no se quitan:
#: `COLUMN_STATISTICS` no existe allí, y el volcado de GTID no aplica.
#:
#: Ojo con la forma de estos dos, que no es la evidente y ya ha fallado:
#: `--set-gtid-purged` TOMA UN VALOR desde MySQL 8.2, así que
#: `--skip-set-gtid-purged` se interpreta como `--set-gtid-purged=0` y el
#: cliente aborta con "Unknown option to set-gtid-purged: 0". Lo correcto es
#: `=OFF`, que es válido en 8.0 y en 8.4. `--column-statistics` sigue siendo un
#: interruptor y sí lleva `--skip-`.
#:
#: En `mariadb-dump` ninguna de las dos existe, así que sólo se añaden si el
#: binario no es de MariaDB.
FLAGS_SOLO_MYSQL = ("--skip-column-statistics", "--set-gtid-purged=OFF")

TIMEOUT_VOLCADO = 1800


def ruta_destino(rol: str) -> Path:
    return DIR_DUMPS / ("%s.sql" % rol)


# --------------------------------------------------------------------------
# El binario y sus flags
# --------------------------------------------------------------------------
def buscar_binario():
    """El cliente de volcado disponible, o None."""
    for nombre in ("mariadb-dump", "mysqldump"):
        encontrado = shutil.which(nombre)
        if encontrado:
            return encontrado
    return None


def version_mysqldump(binario: str) -> str:
    try:
        salida = subprocess.run([binario, "--version"], capture_output=True,
                                text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return ""
    return (salida.stdout or "") + (salida.stderr or "")


def flags_mysqldump(binario: str) -> list:
    """Los flags de volcado, ajustados al sabor y la versión del cliente.

    El ajuste es por sabor y por versión, no por gusto: los mismos flags no
    valen para los tres casos. Ante una versión que no se reconoce se devuelve
    el juego mínimo, que es el que funciona en todos.
    """
    flags = list(FLAGS_BASE)
    version = version_mysqldump(binario).lower()
    if not version:
        return flags
    if "mariadb" in version:
        return flags
    if re.search(r"\bver\s+8\.", version):
        flags += list(FLAGS_SOLO_MYSQL)
    return flags


def comando_volcado(binario: str, rol: str) -> list:
    """El comando completo, como lista. La contraseña va aparte, en el entorno."""
    return (
        [binario]
        + flags_mysqldump(binario)
        + ["-h%s" % LEGACY.host, "-P%s" % LEGACY.port, "-u%s" % LEGACY.user]
        + [BASES[rol]]
        + list(TABLAS[rol])
    )


# --------------------------------------------------------------------------
# Validación
# --------------------------------------------------------------------------
def contar_filas(ruta: Path, tablas) -> dict:
    """Filas por tabla, leídas con el mismo parser que usa la migración.

    Que las cuente `fuente.leer_tabla` y no un `grep` es a propósito: valida
    exactamente lo que la migración va a leer, con los mismos requisitos
    (acentos graves, nombres de columna, comillas escapadas).
    """
    counts = {}
    for tabla in tablas:
        try:
            _, filas = fuente.leer_tabla(str(ruta), tabla)
        except KeyError as exc:
            raise DumpInvalido(str(exc))
        counts[tabla] = len(filas)
    return counts


def validar(ruta: Path, rol: str):
    """Comprueba que el volcado sirve y devuelve el recuento por tabla.

    Falla si le falta alguna tabla o si alguna viene vacía. Un volcado que sale
    a medias de un mysqldump interrumpido tiene las tablas pero vacías, y eso es
    justo lo que no debe llegar a la migración.
    """
    tablas = TABLAS[rol]
    counts = contar_filas(Path(ruta), tablas)
    vacias = [t for t, n in counts.items() if n == 0]
    if vacias:
        raise DumpInvalido(
            "en %s la(s) tabla(s) %s vienen vacías. Un volcado a medias no sirve: "
            "vuelve a lanzarlo y no lo interrumpas."
            % (ruta, ", ".join(vacias))
        )
    return counts


def _resumen(counts: dict) -> str:
    return "  " + "  ".join("%s=%d" % (t, n) for t, n in sorted(counts.items()))


# --------------------------------------------------------------------------
# Volcar
# --------------------------------------------------------------------------
def _password() -> str:
    """La del legacy. Si falta y hay terminal, se pregunta; si no, error."""
    if LEGACY.password:
        return LEGACY.password
    if sys.stdin.isatty():
        import getpass
        print("Contraseña para %s@%s (LEGACY_PASSWORD):"
              % (LEGACY.user, LEGACY.host))
        return getpass.getpass()
    raise DumpInvalido(
        "Falta la contraseña del legacy. Exporta LEGACY_PASSWORD=... o ponla en "
        "backend/.env. Sin ella no se puede conectar."
    )


def volcar(rol: str, binario=None, forzar: bool = False, password=None) -> Path:
    """Extrae el volcado de `rol` desde el MariaDB del legacy.

    Escribe primero en `<destino>.tmp` y sólo lo mueve a su sitio si validar()
    pasa. Si mysqldump falla o el volcado sale incompleto, no queda un fichero
    con nombre de bueno.
    """
    destino = ruta_destino(rol)
    if destino.exists() and not forzar:
        raise DumpInvalido(
            "Ya existe %s. No se toca. Usa --forzar para reemplazarlo." % destino
        )

    binario = binario or buscar_binario()
    if not binario:
        raise DumpInvalido(
            "No hay mysqldump ni mariadb-dump en el PATH. Instala el cliente "
            "de MySQL/MariaDB, o usa `--adoptar` con un volcado que ya tengas."
        )

    password = LEGACY.password if password is None else password
    if not password:
        password = _password()

    DIR_DUMPS.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_name(destino.name + ".tmp")
    comando = comando_volcado(binario, rol)

    print("Volcando %s desde %s@%s/%s ..."
          % (rol, LEGACY.user, LEGACY.host, BASES[rol]))
    print("  %s" % " ".join(comando))

    # La contraseña va por entorno, no en la línea de comandos: `-pCONTRASEÑA`
    # la deja a la vista en `ps` para cualquier usuario de la máquina.
    entorno = dict(os.environ, MYSQL_PWD=password)
    try:
        with temporal.open("wb") as salida:
            proceso = subprocess.run(
                comando, stdout=salida, stderr=subprocess.PIPE,
                env=entorno, timeout=TIMEOUT_VOLCADO,
            )
    except subprocess.TimeoutExpired:
        temporal.unlink(missing_ok=True)
        raise DumpInvalido(
            "mysqldump pasó de %d s y se detuvo. No se ha dejado nada a medias."
            % TIMEOUT_VOLCADO
        )
    except OSError as exc:
        temporal.unlink(missing_ok=True)
        raise DumpInvalido("No se pudo lanzar mysqldump: %s" % exc)

    if proceso.returncode != 0:
        detalle = (proceso.stderr or b"").decode("utf-8", "replace").strip()
        temporal.unlink(missing_ok=True)
        raise DumpInvalido(
            "mysqldump terminó con código %d.\n%s"
            % (proceso.returncode, detalle or "(sin mensaje)")
        )

    try:
        counts = validar(temporal, rol)
    except DumpInvalido:
        temporal.unlink(missing_ok=True)
        raise

    temporal.replace(destino)
    print("  OK %s" % destino)
    print(_resumen(counts))
    return destino


# --------------------------------------------------------------------------
# Adoptar
# --------------------------------------------------------------------------
def adoptar(origen: str, rol: str, forzar: bool = False) -> Path:
    """Instala en `dumps/` un volcado que ya existe en el disco.

    Es el camino para una máquina donde el legacy ya no está y sólo quedan los
    respaldos. Se valida igual que uno recién volcado: los dos caminos dejan
    las mismas garantías.
    """
    origen = Path(origen).expanduser()
    destino = ruta_destino(rol)
    if not origen.is_file():
        raise DumpInvalido("No existe el fichero: %s" % origen)
    if destino.exists() and not forzar:
        raise DumpInvalido(
            "Ya existe %s. No se toca. Usa --forzar para reemplazarlo." % destino
        )

    counts = validar(origen, rol)
    DIR_DUMPS.mkdir(parents=True, exist_ok=True)
    # Se copia, no se enlaza: la carpeta tiene que ser autosuficiente aunque el
    # disco de respaldos no esté montado. Va en .gitignore: lleva CI y NITs.
    shutil.copyfile(origen, destino)
    print("  OK %s <- %s" % (destino, origen))
    print(_resumen(counts))
    return destino


# --------------------------------------------------------------------------
# Instrucciones
# --------------------------------------------------------------------------
def _bloque_titulo(texto: str) -> str:
    return "\n%s\n%s\n" % (texto, "=" * len(texto))


def instrucciones() -> str:
    """El texto de `main.py --instrucciones`. Sin efectos: sólo lee."""
    partes = []

    partes.append("=" * 66)
    partes.append("  CÓMO SACAR LOS VOLCADOS Y MIGRAR")
    partes.append("=" * 66)

    partes.append(_bloque_titulo("1) QUÉ HACE FALTA"))
    partes.append("""\
Para extraer los volcados:
  · El legacy MariaDB accesible (host, usuario y contraseña).
  · El cliente de volcado: mysqldump o mariadb-dump en el PATH.

Para migrar:
  · PostgreSQL en marcha.
  · El venv del backend (el ETL no tiene entorno propio): ../backend/.venv
  · El ESQUEMA ya creado en PostgreSQL. Sin esto la migración falla: mira más
    abajo el apartado 4.""")
    partes.append("""\

Sólo hacen falta 15 tablas del legacy, ni una más:

  caguayo_comercial   artista, cliente, usuario, grupo, empresa,
                      artista_liquidacion, tipo_concepto, contrato,
                      suplemento, solicitud_sc, estado_cs, etapas_cs,
                      artista_contrato
  caguayo (principal) tipo_contrato, tipo_convenio

Cuatro de las de la comercial no se migran a una tabla propia: se leen para
resolver ids. `solicitud_sc` es el puente de `contrato` a `clientes` —en el
legacy el contrato no guarda el cliente, lo guarda la solicitud—, `estado_cs`
traduce el estado y `tipo_concepto` da el nombre del concepto de una
liquidación.

El ETL no lee `provincia` ni `municipio` del volcado: su mapeo de ids está en
`geo.py`. Exportar sólo estas tablas da un volcado mucho más pequeño y no
arrastra facturas ni movimientos que nadie va a migrar.""")

    partes.append(_bloque_titulo("2) LOS DOS VOLCADOS, A MANO"))
    partes.append("""\
Si prefieres sacarlos tú, o si mysqldump no está disponible:

  caguayo_comercial:
    mysqldump --single-transaction --skip-lock-tables --complete-insert \\
      --no-create-info --default-character-set=utf8mb4 \\
      -h HOST -u USUARIO -p caguayo_comercial \\
      artista cliente usuario grupo empresa artista_liquidacion tipo_concepto \\
      contrato suplemento solicitud_sc estado_cs etapas_cs \\
      artista_contrato > %s

  caguayo (principal):
    mysqldump --single-transaction --skip-lock-tables --complete-insert \\
      --no-create-info --default-character-set=utf8mb4 \\
      -h HOST -u USUARIO -p caguayo \\
      tipo_contrato tipo_convenio > %s

Los dos golpes de línea son sólo para que quepa en pantalla; cópialos en una
línea cada uno.

Tres cosas que no son opcionales:
  --complete-insert          el ETL lee los NOMBRES DE COLUMNA del propio
                             INSERT. Sin esto mysqldump emite
                             "INSERT INTO `artista` VALUES (...)" y no se ve
                             ni una columna.
  --default-character-set    fuente.py lee con errors="replace": una
    =utf8mb4                 codificación mal reconocida no da error, destroza
                             en silencio los nombres con tilde.
  acentos graves             el patrón del parser es INSERT INTO `tabla`.
                             Sin ellos no encuentra la tabla.

Si tu cliente es el de MySQL 8 y el legacy es MariaDB, añade también
--skip-column-statistics --skip-set-gtid-purged. Si tu cliente es
mariadb-dump, NO los añadas: no existen y abortan el comando.
`python main.py --generar-dumps` los pone solos según el binario que encuentre.
""" % (ruta_destino("comercial"), ruta_destino("principal")))

    partes.append(_bloque_titulo("3) DEJARLOS LISTOS PARA LA MIGRACIÓN"))

    binario = buscar_binario()
    if binario:
        partes.append("""\
Este script los extrae del MariaDB y los deja ya en su sitio:

  export LEGACY_HOST=... LEGACY_USER=... LEGACY_PASSWORD=...
  python main.py --generar-dumps

Cliente de volcado encontrado: %s (%s)
Flags que se van a usar: %s
Conexión: %s@%s:%s""" % (
            binario, version_mysqldump(binario).strip().splitlines()[0]
            if version_mysqldump(binario).strip() else "versión desconocida",
            " ".join(flags_mysqldump(binario)),
            LEGACY.user, LEGACY.host, LEGACY.port,
        ))
    else:
        partes.append(
            "No hay mysqldump ni mariadb-dump en el PATH, así que "
            "`--generar-dumps` no puede funcionar aquí. Usa el apartado 2, o "
            "`--adoptar` si ya tienes los volcados."
        )

    partes.append("""\
Si ya tienes los volcados en el disco, instálalos sin pasar por MariaDB:

  python main.py --adoptar /ruta/comercial.sql /ruta/principal.sql

Los dos caminos validan el volcado antes de dejarlo en su sitio, y si una tabla
falta o viene vacía no dejan nada a medias.""")

    partes.append(_bloque_titulo("4) DESPUÉS, LA MIGRACIÓN"))
    partes.append("""\
En una máquina nueva, el orden importa:

  1. ./scripts/setup.sh
       Crea los .env, la base y el ESQUEMA, y aplica Alembic.

       Este paso va primero y no es opcional. La puerta de calidad —la que
       contrasta los payloads contra el esquema real— SÓLO corre en
       simulación. Si el esquema no existe y lanzas --commit, cada lote
       revienta, quedan todos los errores en migracion_log y la verificación
       final revienta al hacer `SELECT count(*) FROM clientes`.

  2. python main.py
       Simulación. No escribe nada. Aquí se ve qué se va a migrar.

  3. python main.py --commit
       Ejecuta de verdad. Al final verifica y sale con
       "RESULTADO: TODO CORRECTO".

Lo normal es simular primero y leer el recuento: si en una base vacía la Fase A
dice "Filas a migrar: 0", algo va mal y conviene mirarlo antes de escribir.

Dónde acaba lo que no entra: etl/data/migracion_rechazos.csv y la tabla
migracion_log.""")

    partes.append("\n" + "=" * 66)
    return "\n".join(partes)


def imprimir_instrucciones() -> int:
    print(instrucciones())
    return 0