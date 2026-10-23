# -*- coding: utf-8 -*-
"""Mapeo geográfico legacy (MariaDB) -> PostgreSQL.

Los identificadores de `provincia` y `municipio` NO coinciden entre la base
legacy y la base de destino, de modo que copiarlos directamente asignaría la
provincia y el municipio equivocados sin producir ningún error de FK, porque
las claves foráneas apuntan a una sola columna.

Se resuelve por nombre normalizado (sin acentos, minúsculas, sin espacios
sobrantes). La tabla `municipio` legacy contiene en realidad la capital de
cada provincia (16 filas), mientras que en destino hay 171 municipios reales.
"""

PROV_MAP = {
    1: 16,   # Isla de la Juventud
    2: 1,    # Pinar del Río
    3: 3,    # La Habana
    4: 4,    # Mayabeque
    5: 2,    # Artemisa
    6: 5,    # Matanzas
    7: 6,    # Cienfuegos
    8: 7,    # Villa Clara
    9: 8,    # Sancti Spiritus
    10: 9,   # Ciego de Ávila
    11: 10,  # Camagüey
    12: 11,  # Las Tunas
    13: 12,  # Holguín
    14: 13,  # Granma
    15: 14,  # Santiago de Cuba
    16: 15,  # Guantánamo
}

MUN_MAP = {
    2: None,   # La Habana: no existe como municipio en destino (Playa, Centro Habana, ...)
    3: 8,      # Pinar del Río
    4: 52,     # Matanzas
    5: 81,     # Santa Clara
    6: 71,     # Cienfuegos
    7: 92,     # Santi Spiritus -> Sancti Spíritus (alias)
    8: 101,    # Ciego de Ávila
    9: 113,    # Camagüey
    10: 121,   # Las Tunas
    11: 130,   # Holguín
    12: 142,   # Bayamo
    13: 157,   # Santiago de Cuba
    14: 167,   # Guantánamo
    15: 19,    # Artemisa
    16: 43,    # San José de las Lajas
    17: 171,   # Nueva Gerona -> Isla de la Juventud (alias)
}

ALIAS_MUNICIPIO = {
    "santi spiritus": 92,
    "nueva gerona": 171,
}

NOMBRES_PROVINCIA = {
    1: "Isla de la Juventud",
    2: "Pinar del Río",
    3: "La Habana",
    4: "Mayabeque",
    5: "Artemisa",
    6: "Matanzas",
    7: "Cienfuegos",
    8: "Villa Clara",
    9: "Sancti Spiritus",
    10: "Ciego de Ávila",
    11: "Camagüey",
    12: "Las Tunas",
    13: "Holguín",
    14: "Granma",
    15: "Santiago de Cuba",
    16: "Guantánamo",
}

SIN_MUNICIPIO = "la habana"

# Nombre que se espera en el destino para cada id de PROV_MAP y MUN_MAP.
#
# Los mapas de arriba son ids FIJOS: dependen del orden en que `alembic/env.py`
# inserta las provincias y los municipios. Si alguien borra esas tablas y las
# vuelve a llenar, los ids se reasignan, PROV_MAP y MUN_MAP empiezan a apuntar a
# sitios equivocados y la migración no da ningún error: los 698 artistas de
# Santiago de Cuba acaban con el municipio de otra provincia.
#
# Estos dos mapas son el nombre que debe haber en ese id. `verificar_mapas` los
# contrasta contra la base viva antes de escribir nada, y por eso el fallo es
# ruidoso en vez de silencioso.
NOMBRES_DESTINO_PROVINCIA = {
    1: "Pinar del Río",
    2: "Artemisa",
    3: "La Habana",
    4: "Mayabeque",
    5: "Matanzas",
    6: "Cienfuegos",
    7: "Villa Clara",
    8: "Sancti Spiritus",
    9: "Ciego de Ávila",
    10: "Camagüey",
    11: "Las Tunas",
    12: "Holguín",
    13: "Granma",
    14: "Santiago de Cuba",
    15: "Guantánamo",
    16: "Isla de la Juventud",
}

NOMBRES_DESTINO_MUNICIPIO = {
    8: "Pinar del Río",
    19: "Artemisa",
    43: "San José de las Lajas",
    52: "Matanzas",
    71: "Cienfuegos",
    81: "Santa Clara",
    92: "Sancti Spíritus",
    101: "Ciego de Ávila",
    113: "Camagüey",
    121: "Las Tunas",
    130: "Holguín",
    142: "Bayamo",
    157: "Santiago de Cuba",
    167: "Guantánamo",
    171: "Isla de la Juventud",
}


def provincia_destino(id_legacy):
    """id_provincia legacy -> id_provincia de destino."""
    if id_legacy is None:
        return None
    return PROV_MAP.get(id_legacy)


def municipio_destino(id_legacy):
    """id_municipio legacy -> id_municipio de destino, o None si no resuelve."""
    if id_legacy is None:
        return None
    return MUN_MAP.get(id_legacy)


def verificar_mapas(provincias, municipios):
    """Contrasta PROV_MAP y MUN_MAP contra los nombres que hay en el destino.

    `provincias` y `municipios` son {id: nombre} leídos de la base. Devuelve una
    lista de problemas; vacía significa que los ids fijos siguen apuntando donde
    deben. Cada problema es (tabla, id_legacy, id_destino, esperado, encontrado).
    """
    problemas = []
    for etiqueta, mapa, nombres, reales in (
        ("PROV_MAP", PROV_MAP, NOMBRES_DESTINO_PROVINCIA, provincias),
        ("MUN_MAP", MUN_MAP, NOMBRES_DESTINO_MUNICIPIO, municipios),
    ):
        for id_legacy, id_destino in mapa.items():
            if id_destino is None:
                continue
            esperado = nombres.get(id_destino)
            if esperado is None:
                problemas.append((etiqueta, id_legacy, id_destino,
                                  "sin nombre de referencia", "-"))
                continue
            encontrado = reales.get(id_destino)
            if encontrado is None:
                problemas.append((etiqueta, id_legacy, id_destino,
                                  esperado, "NO EXISTE"))
            elif _clave_nombre(encontrado) != _clave_nombre(esperado):
                problemas.append((etiqueta, id_legacy, id_destino,
                                  esperado, encontrado))
    return problemas


def _clave_nombre(nombre):
    import unicodedata
    t = unicodedata.normalize("NFKD", nombre or "")
    t = t.encode("ascii", "ignore").decode().lower()
    return " ".join(t.split())


def avisos_resueltos():
    """Filas de `municipio` legacy que no resuelven a un id de destino."""
    return [(k, NOMBRES_PROVINCIA[k], "municipio sin equivalente en destino")
            for k, v in MUN_MAP.items() if v is None]
