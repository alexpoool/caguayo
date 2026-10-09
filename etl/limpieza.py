# -*- coding: utf-8 -*-
"""Limpieza de datos (reglas §13).

Se trabaja con funciones puras sobre valores sueltos: el conjunto tiene menos
de 1.500 filas, de modo que no justifica un marco de datos vectorizado.
"""
import datetime
import re

PLACEHOLDER_INT32 = "2147483647"
FECHAS_INVALIDAS = ("", "0000-00-00", "0000-00-00 00:00:00", "None", "nan", "NaT", "NULL")
VALORES_NULOS = ("", "nan", "None", "NaN", "NaT", "NULL", "null")


def texto(valor):
    """TRIM; None se conserva como None."""
    if valor is None:
        return None
    return str(valor).strip()


def no_vacio(valor):
    """TRIM y convierte cadena vacía en None."""
    v = texto(valor)
    if v is None or v in VALORES_NULOS:
        return None
    return v


def fecha(valor):
    """Fecha ISO o None. Rechaza '0000-00-00' y fechas anteriores a 1900."""
    v = texto(valor)
    if v is None or v in FECHAS_INVALIDAS:
        return None
    try:
        d = datetime.date.fromisoformat(v[:10])
    except ValueError:
        return None
    if d.year < 1900:
        return None
    return d.isoformat()


def es_baja(valor):
    """Regla §13: 'si' -> True; 'no', '' o NULL -> False."""
    v = (texto(valor) or "").lower()
    return v in ("si", "sí", "true", "1")


def registro(valor):
    """Regla §13: el placeholder INT32 máximo pasa a None."""
    v = no_vacio(valor)
    if v is None or v == PLACEHOLDER_INT32:
        return None
    return v


def codigo_postal(valor):
    """Regla §13: 0 pasa a None."""
    v = no_vacio(valor)
    if v is None or v == "0":
        return None
    try:
        return None if int(float(v)) == 0 else str(int(float(v)))
    except (TypeError, ValueError):
        return None


def telefono(valor):
    """Regla §13: el centinela '0' pasa a None."""
    v = no_vacio(valor)
    if v is None or v == "0":
        return None
    return v


def es_ci_valido(ci):
    """Regla §13: el CI debe tener exactamente 11 dígitos."""
    v = texto(ci)
    return bool(v) and bool(re.fullmatch(r"\d{11}", v))


LARGO_CI = 11


def normalizar_ci(ci):
    """Fuerza un CI a 11 dígitos. Devuelve (valor, accion, original).

    Se descartan los separadores, se rellena con ceros a la izquierda si
    falta algún dígito y se trunca por la derecha si sobran.

        normalizar_ci('5206213790')   -> ('05206213790', 'rellenado',  '5206213790')
        normalizar_ci('510320099-3')  -> ('05103200993', 'rellenado',  '510320099-3')
        normalizar_ci('123456789012') -> ('12345678901', 'truncado',   '123456789012')
        normalizar_ci('52062137901')  -> ('52062137901', 'sin cambios','52062137901')
    """
    original = texto(ci)
    digitos = re.sub(r"\D", "", original or "")

    if len(digitos) > LARGO_CI:
        return digitos[:LARGO_CI], "truncado", original
    if len(digitos) < LARGO_CI:
        return digitos.rjust(LARGO_CI, "0"), "rellenado", original
    return digitos, "sin cambios", original


def razon_normalizacion_ci(original, valor, accion):
    """Explicación legible de la normalización, para `clientes.razon`."""
    digitos = len(re.sub(r"\D", "", original or ""))
    if accion == "rellenado":
        return (
            'CI original "%s" (%d dígitos) normalizado a "%s" '
            "rellenando con 0 a la izquierda" % (original, digitos, valor)
        )
    if accion == "truncado":
        return (
            'CI original "%s" (%d dígitos) truncado a "%s"' % (original, digitos, valor)
        )
    return None


def nombre_completo(fila):
    """Nombre legible para los registros de `migracion_log`."""
    partes = [
        no_vacio(fila.get("nombre")),
        no_vacio(fila.get("apellido1")),
        no_vacio(fila.get("apellido2")),
        no_vacio(fila.get("nombre_empresa")),
    ]
    return " ".join(p for p in partes if p)[:200] or None


def hay_datos_laborales(fila):
    """Regla §7: marca `es_trabajador`."""
    return any(
        no_vacio(fila.get(campo))
        for campo in ("centro_laboral", "ocupacion", "telefono_trabajo", "correo_trabajo")
    )


def titular_de(fila):
    """Nombre completo del titular de la cuenta.

    En los artistas se componen nombre y apellidos; en los clientes es el
    nombre de la empresa. `cliente.nombre_empresa` es NOT NULL y
    `artista.apellido1` también, así que casi nunca hace falta un respaldo.
    """
    empresa = no_vacio(fila.get("nombre_empresa"))
    if empresa:
        return empresa[:150]
    partes = [
        no_vacio(fila.get("nombre")),
        no_vacio(fila.get("apellido1")),
        no_vacio(fila.get("apellido2")),
    ]
    compuesto = " ".join(p for p in partes if p)
    return compuesto[:150] if compuesto else None


def limpiar_numero_cuenta(valor):
    """Deja sólo los dígitos del número de cuenta. Devuelve (valor, original).

    En el origen hay cuatro números con texto pegado, como
    '32101223300.BICSA. U' o 'USD0300000003447637'. Se conserva la parte
    numérica y el original queda para el registro de la migración.
    """
    original = no_vacio(valor)
    if original is None:
        return None, None
    digitos = re.sub(r"\D", "", original)
    if not digitos:
        return None, original
    return digitos[:50], original
