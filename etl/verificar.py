# -*- coding: utf-8 -*-
"""Verificación post-migración (§18)."""
import db
from config import (
    TABLA_CLIENTES,
    TABLA_JURIDICA,
    TABLA_LOG,
    TABLA_NATURAL,
    TABLA_TCP,
)


def _uno(cur, sql, params=None):
    cur.execute(sql, params)
    fila = cur.fetchone()
    return fila[0] if fila else 0


def _consultas(conn):
    """Devuelve (etiqueta, valor, esperado_ok) para cada comprobación de §18."""
    with conn.cursor() as cur:
        controles = [
            ("clientes: filas",
             _uno(cur, "SELECT count(*) FROM %s" % TABLA_CLIENTES)),
            ("clientes_persona_natural: filas",
             _uno(cur, "SELECT count(*) FROM %s" % TABLA_NATURAL)),
            ("clientes_persona_juridica: filas",
             _uno(cur, "SELECT count(*) FROM %s" % TABLA_JURIDICA)),
            ("cliente_tcp: filas",
             _uno(cur, "SELECT count(*) FROM %s" % TABLA_TCP)),
            ("clientes.nit duplicados",
             _uno(cur, "SELECT count(*) FROM (SELECT nit FROM %s GROUP BY nit"
                       " HAVING count(*) > 1) d" % TABLA_CLIENTES)),
            ("clientes.codigo duplicados",
             _uno(cur, "SELECT count(*) FROM (SELECT codigo FROM %s GROUP BY codigo"
                       " HAVING count(*) > 1) d" % TABLA_CLIENTES)),
            ("clientes_persona_natural.carnet_identidad duplicados",
             _uno(cur, "SELECT count(*) FROM (SELECT carnet_identidad FROM %s"
                       " GROUP BY carnet_identidad HAVING count(*) > 1) d" % TABLA_NATURAL)),
            ("clientes_persona_juridica.codigo_reup duplicados",
             _uno(cur, "SELECT count(*) FROM (SELECT codigo_reup FROM %s"
                       " GROUP BY codigo_reup HAVING count(*) > 1) d" % TABLA_JURIDICA)),
            ("clientes_persona_natural: huérfanos",
             _uno(cur, "SELECT count(*) FROM %s n LEFT JOIN %s c USING (id_cliente)"
                       " WHERE c.id_cliente IS NULL" % (TABLA_NATURAL, TABLA_CLIENTES))),
            ("clientes_persona_juridica: huérfanos",
             _uno(cur, "SELECT count(*) FROM %s j LEFT JOIN %s c USING (id_cliente)"
                       " WHERE c.id_cliente IS NULL" % (TABLA_JURIDICA, TABLA_CLIENTES))),
            ("cliente_tcp: huérfanos",
             _uno(cur, "SELECT count(*) FROM %s t LEFT JOIN %s c USING (id_cliente)"
                       " WHERE c.id_cliente IS NULL" % (TABLA_TCP, TABLA_CLIENTES))),
            ("clientes: id_provincia fuera de rango",
             _uno(cur, "SELECT count(*) FROM %s WHERE id_provincia IS NOT NULL"
                       " AND NOT EXISTS (SELECT 1 FROM provincia p"
                       " WHERE p.id_provincia = clientes.id_provincia)" % TABLA_CLIENTES)),
            ("clientes: id_municipio inconsistente con su provincia",
             _uno(cur, "SELECT count(*) FROM %s c JOIN municipio m"
                       " ON m.id_municipio = c.id_municipio"
                       " WHERE m.id_provincia <> c.id_provincia" % TABLA_CLIENTES)),
            ("migracion_log: descartes",
             _uno(cur, "SELECT count(*) FROM %s WHERE severidad='DESCARTE'" % TABLA_LOG)),
            ("migracion_log: warnings",
             _uno(cur, "SELECT count(*) FROM %s WHERE severidad='WARNING'" % TABLA_LOG)),
            ("migracion_log: errores",
             _uno(cur, "SELECT count(*) FROM %s WHERE severidad='ERROR'" % TABLA_LOG)),
        ]

        cur.execute(
            "SELECT tabla_origen, motivo, severidad, count(*)"
            " FROM %s GROUP BY 1,2,3 ORDER BY 4 DESC, 1, 2" % TABLA_LOG)
        por_motivo = cur.fetchall()

        cur.execute(
            "SELECT estado, count(*) FROM %s GROUP BY 1 ORDER BY 1" % TABLA_CLIENTES)
        por_estado = cur.fetchall()

    return controles, por_motivo, por_estado


def verificar():
    """Imprime el informe de §18. Devuelve True si no hay fallos."""
    with db.conexion() as conn:
        controles, por_motivo, por_estado = _consultas(conn)

    print("\n=== Conteos ===")
    fallos = 0
    for etiqueta, valor in controles[:4]:
        print("  %-52s %6d" % (etiqueta, valor))

    print("\n=== Integridad ===")
    integridad = controles[4:13]
    for etiqueta, valor in integridad:
        debe_ser_cero = "duplicados" in etiqueta or "huérfanos" in etiqueta or "fuera de rango" in etiqueta or "inconsistente" in etiqueta
        estado = "OK" if (valor == 0 or not debe_ser_cero) else "FALLA"
        if estado == "FALLA":
            fallos += 1
        print("  [%s] %-52s %6d" % (estado, etiqueta, valor))

    print("\n=== Registro de migración ===")
    for etiqueta, valor in controles[13:]:
        print("  %-52s %6d" % (etiqueta, valor))
    fallos += controles[15][1]

    if por_estado:
        print("\n=== Estado de los clientes migrados ===")
        for estado, total in por_estado:
            print("  %-52s %6d" % (estado, total))

    if por_motivo:
        print("\n=== Descartes y advertencias por tabla y motivo ===")
        for tabla, motivo, severidad, total in por_motivo:
            print("  %-9s %-12s %-30s %5d" % (severidad, tabla, motivo, total))

    print("\n=== RESULTADO: %s ===" % ("TODO CORRECTO" if fallos == 0
                                       else "%d COMPROBACIÓN(ES) FALLIDA(S)" % fallos))
    return fallos == 0
