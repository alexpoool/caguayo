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


def avisos_resueltos():
    """Filas de `municipio` legacy que no resuelven a un id de destino."""
    return [(k, NOMBRES_PROVINCIA[k], "municipio sin equivalente en destino")
            for k, v in MUN_MAP.items() if v is None]
