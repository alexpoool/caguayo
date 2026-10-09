# -*- coding: utf-8 -*-
"""Registro de descartes, advertencias y errores (§3 y §17)."""
import csv
from collections import Counter

from config import CSV_RECHAZOS, TABLA_LOG, ENCODING

SEVERIDAD_DESCARTE = "DESCARTE"
SEVERIDAD_WARNING = "WARNING"
SEVERIDAD_ERROR = "ERROR"

CAMPOS_LOG = ("tabla_origen", "id_origen", "nombre", "motivo", "detalle", "severidad")
CAMPOS_CSV = ("tabla_origen", "id_origen", "nombre", "motivo", "detalle")


class Registro:
    """Acumula entradas de `migracion_log` y produce el CSV de rechazos."""

    def __init__(self):
        self.entradas = []

    def add(self, tabla_origen, id_origen, nombre, motivo, detalle=None,
            severidad=SEVERIDAD_DESCARTE):
        self.entradas.append({
            "tabla_origen": str(tabla_origen)[:50],
            "id_origen": int(id_origen),
            "nombre": (nombre or None),
            "motivo": str(motivo)[:200],
            "detalle": detalle,
            "severidad": severidad,
        })

    def descarte(self, tabla_origen, id_origen, nombre, motivo, detalle=None):
        self.add(tabla_origen, id_origen, nombre, motivo, detalle, SEVERIDAD_DESCARTE)

    def warning(self, tabla_origen, id_origen, nombre, motivo, detalle=None):
        self.add(tabla_origen, id_origen, nombre, motivo, detalle, SEVERIDAD_WARNING)

    def error(self, tabla_origen, id_origen, nombre, motivo, detalle=None):
        self.add(tabla_origen, id_origen, nombre, motivo, detalle, SEVERIDAD_ERROR)

    def por_severidad(self):
        return Counter(e["severidad"] for e in self.entradas)

    def resumen_por_motivo(self):
        return Counter((e["tabla_origen"], e["motivo"], e["severidad"])
                       for e in self.entradas)

    def volcar_db(self, cur):
        if not self.entradas:
            return 0
        filas = [(e["tabla_origen"], e["id_origen"], e["nombre"], e["motivo"],
                  e["detalle"], e["severidad"]) for e in self.entradas]
        cur.executemany(
            "INSERT INTO %s (tabla_origen, id_origen, nombre, motivo, detalle, severidad)"
            " VALUES (%%s, %%s, %%s, %%s, %%s, %%s)" % TABLA_LOG,
            filas,
        )
        return len(filas)

    def volcar_csv(self, ruta=None):
        ruta = ruta or CSV_RECHAZOS
        descartes = [e for e in self.entradas if e["severidad"] != SEVERIDAD_WARNING]
        ruta.parent.mkdir(parents=True, exist_ok=True)
        with open(ruta, "w", encoding=ENCODING, newline="") as fh:
            escritor = csv.DictWriter(fh, fieldnames=list(CAMPOS_CSV))
            escritor.writeheader()
            for e in descartes:
                escritor.writerow({c: e.get(c) for c in CAMPOS_CSV})
        return ruta, len(descartes)

    def limpiar(self):
        self.entradas = []


def imprimir_resumen(registro):
    severidades = registro.por_severidad()
    print("  Resumen por severidad:")
    for severidad in (SEVERIDAD_DESCARTE, SEVERIDAD_WARNING, SEVERIDAD_ERROR):
        print("    %-9s %d" % (severidad, severidades.get(severidad, 0)))

    print("  Resumen por tabla y motivo:")
    for (tabla, motivo, severidad), total in sorted(
        registro.resumen_por_motivo().items(), key=lambda kv: (-kv[1], kv[0])
    ):
        print("    %-8s %-22s %-28s %5d" % (severidad, tabla, motivo, total))
