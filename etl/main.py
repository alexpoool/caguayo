# -*- coding: utf-8 -*-
"""Orquestador del ETL de migración MariaDB -> PostgreSQL.

    python main.py              simulación: no escribe nada en la base
    python main.py --commit     ejecuta la migración por lotes
"""
import sys

import db
from config import TABLA_CLIENTES
from deduplicacion import valores_de
from log import Registro, imprimir_resumen
from migrar_artistas import cargar_artistas
from migrar_catalogo import cargar_catalogo
from migrar_grupos import cargar_grupos
from migrar_clientes import cargar_clientes
from migrar_corregidos import cargar_corregidos
from migrar_cuentas import cargar_cuentas
from migrar_especialidades import cargar_especialidades
from migrar_cuentas_dependencia import cargar_cuentas_dependencia
from migrar_tcp import cargar_tcp
from migrar_usuarios import cargar_usuarios
from verificar import verificar


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
    verificar()
    return 0


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    dry_run = "--commit" not in argv
    solo_corregidos = "--solo-corregidos" in argv
    solo_cuentas = "--solo-cuentas" in argv
    solo_usuarios = "--solo-usuarios" in argv
    solo_cuentas_dep = "--solo-cuentas-dep" in argv
    solo_especialidades = "--solo-especialidades" in argv
    solo_catalogo = "--solo-catalogo" in argv
    solo_grupos = "--solo-grupos" in argv

    print("=" * 66)
    print("  MIGRACIÓN MariaDB → PostgreSQL  (artista, cliente)")
    print("=" * 66)
    print("  Modo: %s" % ("SIMULACIÓN (no escribe)" if dry_run else "EJECUCIÓN"))
    print("  Destino: %s" % __import__("config").POSTGRES.database)
    print()

    registro = Registro()

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
        verificar()
        return 0

    if solo_catalogo:
        print("=== FASE I: CATÁLOGOS TIPO_CONTRATO / TIPO_CONVENIO (aislada) ===")
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
        verificar()
        return 0

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
        verificar()
        return 0

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
        verificar()
        return 0

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
        verificar()
        return 0

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
        verificar()
        return 0

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

    print("=== FASE I: CATÁLOGOS TIPO_CONTRATO / TIPO_CONVENIO ===")
    cargar_catalogo(registro=registro, dry_run=dry_run)
    print()

    print("=== FASE J: GRUPOS DEL LEGACY ===")
    cargar_grupos(registro=registro, dry_run=dry_run)
    print()

    print("=== RESUMEN DE LA MIGRACIÓN ===")
    imprimir_resumen(registro)
    print()

    if dry_run:
        print("Simulación completada. No se ha escrito nada.")
        print("Ejecuta `python main.py --commit` para migrar.")
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
    verificar()
    return 0


if __name__ == "__main__":
    sys.exit(main())
