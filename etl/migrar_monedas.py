# -*- coding: utf-8 -*-
"""Paso 0: deja `moneda` con las cuatro monedas del destino.

El legacy liquida en CUC y CUP; el destino necesita USD, EUR, CUC y CUP. Alembic
siembra USD/EUR/CUP, pero con otros textos y sin CUC. Este paso, al inicio de la
migración, reemplaza la tabla entera por las cuatro filas canónicas y deja CUC
disponible para las fases K/L/M/O/P, que resuelven la moneda por símbolo.

Se borra todo y se reinsrtan las cuatro: al arrancar la migración ninguna tabla
referencia `moneda` (contrato, etapas, liquidaciones... están vacías y el único
`servicios`, "GEN", tiene `id_moneda` NULL), así que el borrado no choca con
ninguna clave foránea. Si la migración se reintenta con datos ya cargados, el
DELETE viola la FK: se avisa con un mensaje claro y se para, en vez de reventar
a mitad de una fase.
"""
from psycopg2 import errors as pg_errors
from psycopg2.extras import execute_values

import db
from log import Registro

ORIGEN = "moneda"

#: (nombre, denominación, símbolo). El símbolo es la clave con la que el resto
#: del ETL resuelve `id_moneda` (`db.monedas_por_simbolo`), así que es lo que no
#: puede faltar. El nombre lleva la tilde que el sistema muestra.
MONEDAS = (
    ("Peso Cubano Convertible", "Peso Cubano Convertible", "CUC"),
    ("Peso Cubano", "Peso Cubano", "CUP"),
    ("Dólar Americano", "Dólar Americano", "USD"),
    ("Euro", "Euro", "EUR"),
)


class MonedaEnUso(Exception):
    """`moneda` está referenciada: no se puede reemplazar sin romper las FK."""


def _leer(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT nombre, denominacion, simbolo FROM moneda ORDER BY id_moneda"
        )
        return cur.fetchall()


def sembrar_monedas(registro=None, dry_run=True):
    """Deja `moneda` con exactamente las filas de `MONEDAS`.

    Si la tabla ya tiene las cuatro filas canónicas tal cual, no toca nada: un
    reemplazo sobre una base ya migrada reasignaría los ids y dejaría colgadas
    las referencias de contrato, etapas y liquidaciones.
    """
    registro = registro or Registro()

    with db.conexion() as conn:
        actuales = _leer(conn)

    print("  Antes:   %s" % (", ".join(s for _, _, s in actuales) or "(vacía)"))
    print("  Después: %s" % ", ".join(s for _, _, s in MONEDAS))

    ya_siembra = {tuple(fila) for fila in MONEDAS}
    if {tuple(fila) for fila in actuales} == ya_siembra:
        print("  Ya es siembra: nada que hacer.")
        return registro

    if dry_run:
        print("  SIMULACIÓN: se borrarían %d fila(s) y se insertarían %d"
              % (len(actuales), len(MONEDAS)))
        return registro

    with db.conexion() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM moneda")
                execute_values(
                    cur,
                    "INSERT INTO moneda (nombre, denominacion, simbolo) VALUES %s",
                    list(MONEDAS),
                )
            conn.commit()
        except pg_errors.ForeignKeyViolation as exc:
            conn.rollback()
            raise MonedaEnUso(
                "no se puede reemplazar `moneda`: hay filas que la referencian "
                "(contrato, etapas, liquidacion...). Migra sobre una base de "
                "destino limpia. Detalle: %s" % exc
            ) from exc
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM moneda")
            total = cur.fetchone()[0]

    print("  Reemplazadas: %d fila(s); en la tabla ahora hay %d"
          % (len(MONEDAS), total))
    return registro
