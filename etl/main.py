# -*- coding: utf-8 -*-
"""Orquestador del ETL de migración MariaDB -> PostgreSQL.

    python main.py                simulación: no escribe nada en la base
    python main.py --commit       ejecuta la migración por lotes

    python main.py --instrucciones   qué hace falta para sacar los volcados
    python main.py --generar-dumps   los extrae del MariaDB del legacy
    python main.py --adoptar A B     instala dos volcados que ya tienes
"""
import sys

import config
import db
import geo
from config import TABLA_CLIENTES
from diagnostico import Diagnostico
from deduplicacion import valores_de
from log import Registro, imprimir_resumen
from migrar_artistas import cargar_artistas
from migrar_catalogo import cargar_catalogo
from migrar_contratos import cargar_contratos
from migrar_grupos import cargar_grupos
from migrar_clientes import cargar_clientes
from migrar_corregidos import cargar_corregidos
from migrar_cuentas import cargar_cuentas
from migrar_especialidades import cargar_especialidades
from migrar_cuentas_dependencia import cargar_cuentas_dependencia
from migrar_liquidaciones import cargar_liquidaciones
from migrar_solicitudes import cargar_solicitudes
from migrar_etapas import cargar_etapas
from migrar_suplementos import cargar_suplementos
from migrar_tcp import cargar_tcp
from migrar_usuarios import cargar_usuarios
from verificar import verificar

SOLO = ("--solo-corregidos", "--solo-cuentas", "--solo-usuarios",
        "--solo-cuentas-dep", "--solo-especialidades", "--solo-catalogo",
        "--solo-grupos", "--solo-liquidaciones", "--solo-contratos",
        "--solo-suplementos", "--solo-solicitudes", "--solo-etapas")


def _dumps_necesarios(argv):
    """Qué volcados hace falta para esta ejecución.

    `config.CATALOGOS` es la respuesta: un volcado hace falta si algún catálogo
    lo lee. Ahora mismo la Fase I lee `tipo_contrato` sólo del comercial, así
    que `principal.sql` no se exige —sin él la Fase I migra `tipo_contrato` y se
    salta `tipo_convenio`, con un WARNING en `migracion_log`.

    El día que un catálogo vuelva a leer de la principal, esto se ajusta solo:
    basta con que `CATALOGOS` lo mencione.
    """
    del argv  # la Catálogo ya decide; no hace falta mirar los flags
    return ("comercial",)


def _volcados(argv):
    """`--generar-dumps` y `--adoptar`: preparar los ficheros del legacy."""
    import generar_dumps

    if "--instrucciones" in argv:
        return generar_dumps.imprimir_instrucciones()

    solo = [rol for flag, rol in (("--solo-comercial", "comercial"),
                                  ("--solo-principal", "principal"))
            if flag in argv]
    roles = tuple(solo) if solo else ("comercial", "principal")
    forzar = "--forzar" in argv

    if "--adoptar" in argv:
        origenes = argv[argv.index("--adoptar") + 1:argv.index("--adoptar") + 3]
        if len(origenes) < 2:
            print("--adoptar necesita dos rutas: COMERCIAL PRINCIPAL")
            return 1
        print("ADOPTANDO VOLCADOS EXISTENTES")
        try:
            for origen, rol in zip(origenes, roles):
                generar_dumps.adoptar(origen, rol, forzar=forzar)
        except generar_dumps.DumpInvalido as exc:
            print("\nERROR: %s" % exc)
            return 1
        print("\nVolcados en %s. Ya se puede migrar sin exportar nada."
              % config.DIR_DUMPS)
        return 0

    if "--generar-dumps" in argv:
        print("GENERANDO VOLCADOS DEL LEGACY")
        try:
            for rol in roles:
                generar_dumps.volcar(rol, forzar=forzar)
        except generar_dumps.DumpInvalido as exc:
            print("\nERROR: %s" % exc)
            return 1
        print("\nVolcados en %s. Siguiente paso: python main.py"
              % config.DIR_DUMPS)
        return 0

    return None


def _valores_migrados(pares):
    """Códigos y NITs que un conjunto de pares ocupa en `clientes`."""
    return (valores_de([p[0] for p in pares], "codigo"),
            valores_de([p[0] for p in pares], "nit"))


def _fase_d_solo(registro, dry_run):
    """Ejecuta únicamente la Fase D contra una base ya migrada.

    Los códigos y NITs ocupados se leen de `clientes`, porque las fases A-C no
    vuelven a correr y sus payloads ya no están en memoria.
    """
    print("=== FASE D: ARTISTAS CON CI NORMALIZADO (aislada) ===")
    with db.conexion() as conn:
        codigos = db.valores_existentes(conn, TABLA_CLIENTES, "codigo")
        nits = db.valores_existentes(conn, TABLA_CLIENTES, "nit")
    print("  Ya en `clientes`: %d códigos, %d NITs" % (len(codigos), len(nits)))

    _, registro, pares = cargar_corregidos(
        registro=registro, dry_run=dry_run, codigos_usados=codigos, nits_usados=nits)
    print()
    imprimir_resumen(registro)
    print()

    if dry_run:
        print("Simulación completada. No se ha escrito nada.")
        return 0

    with db.conexion() as conn:
        db.crear_log(conn)
        with conn.cursor() as cur:
            registro.volcar_db(cur)
        conn.commit()
    ruta, total = registro.volcar_csv()
    print("CSV de rechazos: %s (%d filas)" % (ruta, total))
    print()
    print("=== VERIFICACIÓN POST-MIGRACIÓN ===")
    return 0 if verificar() else 1


def _fase_aislada(titulo, correr, registro, dry_run):
    """Imprime la fase, la ejecuta, y cierra el ciclo de log y verificación.

    Es lo mismo que hacen las siete fases que ya tenían su `--solo-*`, pero en
    una función. No se unifican con aquéllas porque cada una tiene algo
    particular —la D lee el destino antes, la J además mueve usuarios— y tocar
    siete bloques que hoy funcionan no compensa. Esto es sólo para las tres
    nuevas, que sí son idénticas entre sí.
    """
    print(titulo)
    correr()
    print()
    imprimir_resumen(registro)
    print()
    if dry_run:
        print("Simulación completada. No se ha escrito nada.")
        return 0
    with db.conexion() as conn:
        db.crear_log(conn)
        with conn.cursor() as cur:
            registro.volcar_db(cur)
        conn.commit()
    print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
    print()
    return 0 if verificar() else 1


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    dry_run = "--commit" not in argv

    volcados = _volcados(argv)
    if volcados is not None:
        return volcados

    try:
        config.comprobar_dumps(_dumps_necesarios(argv))
    except config.DumpAusente as exc:
        print("\nERROR: %s" % exc)
        return 1

    solo_corregidos = "--solo-corregidos" in argv
    solo_cuentas = "--solo-cuentas" in argv
    solo_usuarios = "--solo-usuarios" in argv
    solo_cuentas_dep = "--solo-cuentas-dep" in argv
    solo_especialidades = "--solo-especialidades" in argv
    solo_catalogo = "--solo-catalogo" in argv
    solo_grupos = "--solo-grupos" in argv
    solo_liquidaciones = "--solo-liquidaciones" in argv
    solo_contratos = "--solo-contratos" in argv
    solo_suplementos = "--solo-suplementos" in argv
    solo_solicitudes = "--solo-solicitudes" in argv
    solo_etapas = "--solo-etapas" in argv

    print("=" * 66)
    print("  MIGRACIÓN MariaDB → PostgreSQL  (artista, cliente)")
    print("=" * 66)
    print("  Modo: %s" % ("SIMULACIÓN (no escribe)" if dry_run else "EJECUCIÓN"))
    print("  Destino: %s" % __import__("config").POSTGRES.database)
    print()

    registro = Registro()
    # El autodiagnóstico se acumula en toda la ejecución y se imprime una vez, al
    # final. Cada fase lo recibe por si quiere añadir sus comprobaciones.
    diagnostico = Diagnostico()

    # Se comprueba antes de nada, incluso en simulación: si los ids fijos de
    # geo.py no apuntan a lo que deben, las fases siguientes escriben la
    # provincia equivocada sin que ninguna salte. Mejor pararse aquí con el
    # nombre de los dos municipios que no cuadran que migrar 1371 clientes mal.
    print("=== COMPROBACIÓN GEOGRÁFICA ===")
    with db.conexion() as conn:
        geografia = db.nombres_geografia(conn)
    problemas_geo = geo.verificar_mapas(
        geografia["provincia"], geografia["municipio"])
    if problemas_geo:
        print("  FALLO: geo.py y el destino no coinciden. No se migra nada.")
        print("  Los ids de provincia/municipio están reasignados; revisa el")
        print("  orden de siembra de alembic/env.py antes de seguir.")
        for etiqueta, id_legacy, id_destino, esperado, encontrado in problemas_geo:
            print("    - %s legacy %-3s -> destino %-4s  esperaba %r, hay %r"
                  % (etiqueta, id_legacy, id_destino, esperado, encontrado))
        return 1
    print("  geo.py coincide con el destino: %d municipios de referencia OK"
          % len(geo.MUN_MAP))
    print()

    if solo_etapas:
        return _fase_aislada(
            "=== FASE O: ETAPAS, TAREAS Y REALIZADORES (aislada) ===",
            lambda: cargar_etapas(registro=registro, dry_run=dry_run),
            registro, dry_run)

    if solo_solicitudes:
        return _fase_aislada(
            "=== FASE N: SOLICITUDES DEL LEGACY (aislada) ===",
            lambda: cargar_solicitudes(registro=registro, dry_run=dry_run),
            registro, dry_run)

    if solo_suplementos:
        return _fase_aislada(
            "=== FASE M: SUPLEMENTOS DEL LEGACY (aislada) ===",
            lambda: cargar_suplementos(registro=registro, dry_run=dry_run),
            registro, dry_run)

    if solo_contratos:
        return _fase_aislada(
            "=== FASE L: CONTRATOS DEL LEGACY (aislada) ===",
            lambda: cargar_contratos(registro=registro, dry_run=dry_run),
            registro, dry_run)

    if solo_liquidaciones:
        return _fase_aislada(
            "=== FASE K: LIQUIDACIONES DEL LEGACY (aislada) ===",
            lambda: cargar_liquidaciones(registro=registro, dry_run=dry_run),
            registro, dry_run)

    if solo_grupos:
        print("=== FASE J: GRUPOS DEL LEGACY (aislada) ===")
        cargar_grupos(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_catalogo:
        print("=== FASE I: CATÁLOGO TIPO_CONTRATO (aislada) ===")
        cargar_catalogo(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_especialidades:
        print("=== FASE H: ESPECIALIDADES DEL ARTISTA (aislada) ===")
        _, registro, _, _ = cargar_especialidades(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_cuentas_dep:
        print("=== FASE G: CUENTAS DE LA DEPENDENCIA (aislada) ===")
        _, registro, _ = cargar_cuentas_dependencia(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_usuarios:
        print("=== FASE F: USUARIOS (aislada) ===")
        _, registro, _ = cargar_usuarios(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_cuentas:
        print("=== FASE E: CUENTAS BANCARIAS (aislada) ===")
        _, registro, _ = cargar_cuentas(registro=registro, dry_run=dry_run)
        print()
        imprimir_resumen(registro)
        print()
        if dry_run:
            print("Simulación completada. No se ha escrito nada.")
            return 0
        with db.conexion() as conn:
            db.crear_log(conn)
            with conn.cursor() as cur:
                registro.volcar_db(cur)
            conn.commit()
        print("CSV de rechazos: %s (%d filas)" % registro.volcar_csv())
        print()
        return 0 if verificar() else 1

    if solo_corregidos:
        return _fase_d_solo(registro, dry_run)

    print("=== FASE A: ARTISTAS ===")
    _, registro, pares_a = cargar_artistas(registro=registro, dry_run=dry_run)
    codigos, nits = _valores_migrados(pares_a)
    print()

    print("=== FASE B: CLIENTES ===")
    _, registro, pares_b, tcp = cargar_clientes(
        registro=registro, dry_run=dry_run,
        codigos_ya_migrados=codigos, nits_ya_migrados=nits)
    print()

    print("=== FASE C: TCP / MIPYME ===")
    codigos = codigos | valores_de([p[0] for p in pares_b], "codigo")
    nits = nits | valores_de([p[0] for p in pares_b], "nit")
    cargar_tcp(registro=registro, dry_run=dry_run, filas_tcp=tcp,
               codigos_ya_migrados=codigos, nits_ya_migrados=nits)
    print()

    print("=== FASE D: ARTISTAS CON CI NORMALIZADO ===")
    cargar_corregidos(registro=registro, dry_run=dry_run,
                      codigos_usados=codigos, nits_usados=nits)
    print()

    # A partir de aquí todas las fases se ejecutan también por defecto. Antes
    # sólo llegaban hasta la D y las demás sólo con su `--solo-*`, así que no
    # había forma de migrarlo todo de una vez.
    #
    # El orden lo imponen las dependencias:
    #   E antes que G  -> G reparte cuentas de las dependencias
    #   F antes que J  -> J reparte usuarios que tienen que existir ya
    #   D antes que H  -> H enlaza especialidades de los artistas que D recupera
    print("=== FASE E: CUENTAS BANCARIAS ===")
    cargar_cuentas(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE F: USUARIOS ===")
    cargar_usuarios(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE G: CUENTAS DE LA DEPENDENCIA ===")
    cargar_cuentas_dependencia(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE H: ESPECIALIDADES DEL ARTISTA ===")
    cargar_especialidades(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE I: CATÁLOGO TIPO_CONTRATO ===")
    cargar_catalogo(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE J: GRUPOS DEL LEGACY ===")
    cargar_grupos(registro=registro, dry_run=dry_run)
    print()

    # K, L y M son el bloque de documentos comerciales del legacy. Las
    # dependencias:
    #   K -> clientes de la Fase A (artistas).   No depende de L.
    #   L -> clientes de la Fase B.              No depende de K.
    #   M -> los contratos de la L.              Ésta sí es una dependencia
    #                                             real: el supplements cuelga
    #                                             de un id_contrato que
    #                                             asigna PostgreSQL, y sin L no
    #                                             hay a qué colgarlo.
    # K y L pueden ir en cualquier orden entre sí; M tiene que ir la última.
    print("=== FASE K: LIQUIDACIONES DEL LEGACY ===")
    cargar_liquidaciones(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE L: CONTRATOS DEL LEGACY ===")
    cargar_contratos(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE M: SUPLEMENTOS DEL LEGACY ===")
    cargar_suplementos(registro=registro, dry_run=dry_run)
    print()

    # N tiene que ir antes que O por los datos, no sólo por el orden: las etapas
    # cuelgan de `solicitud_servicio`, y para llegar a la solicitud hay que pasar
    # por el contrato con `id_solicitudsc`. Sin el mapa que devuelve la N, la O
    # sólo encuentra las solicitudes que traían código propio en el legacy y
    # deja 1.893 contratos sin artistas.
    print("=== FASE N: SOLICITUDES DEL LEGACY ===")
    resultado_n = cargar_solicitudes(registro=registro, dry_run=dry_run,
                                     diag=diagnostico)
    codigo_a_id_legacy = resultado_n[3]
    print()

    print("=== FASE O: ETAPAS, TAREAS Y REALIZADORES ===")
    cargar_etapas(registro=registro, dry_run=dry_run,
                  codigo_a_id_legacy=codigo_a_id_legacy, diag=diagnostico)
    print()

    print("=== RESUMEN DE LA MIGRACIÓN ===")
    imprimir_resumen(registro)
    print()

    diagnostico.imprimir()
    print()

    if dry_run:
        print("Simulación completada. No se ha escrito nada.")
        print("Ejecuta `python main.py --commit` para migrar.")
        # En simulación el destino no se ha tocado, así que su estado no dice
        # nada del resultado de esta migración. Se enseña igualmente, que es
        # como se ve si arrastra restos de una pasada anterior, pero no cambia
        # el código de salida: informa la simulación, falla la migración.
        print("\n=== ESTADO ACTUAL DEL DESTINO (no es el resultado de esta "
              "migración) ===")
        return 0 if verificar() else 1

    with db.conexion() as conn:
        db.crear_log(conn)
        with conn.cursor() as cur:
            registro.volcar_db(cur)
        conn.commit()

    ruta, total = registro.volcar_csv()
    print("CSV de rechazos: %s (%d filas)" % (ruta, total))
    print()

    print("=== VERIFICACIÓN POST-MIGRACIÓN ===")
    # El código de salida tiene que reflejar el resultado: antes se llamaba a
    # verificar() y se devolvía 0 igual, así que un exit code 0 no significaba
    # que la migración estuviera bien.
    return 0 if verificar() else 1


if __name__ == "__main__":
    sys.exit(main())
