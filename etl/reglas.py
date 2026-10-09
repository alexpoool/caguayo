# -*- coding: utf-8 -*-
"""Mapeo de reglas de migración (§5 a §13).

Cada constructor devuelve un payload listo para insertar en PostgreSQL, o
`(payload, avisos)` cuando la fila genera advertencias que se registran en
`migracion_log` sin impedir la inserción.
"""
import datetime

import geo
from limpieza import (
    codigo_postal,
    es_baja,
    es_ci_valido,
    fecha,
    hay_datos_laborales,
    no_vacio,
    registro,
    telefono,
    texto,
)

HOY = datetime.date.today().isoformat()

TIPO_NATURAL = "NATURAL"
TIPO_JURIDICA = "JURIDICA"
TIPO_PROVEEDOR = "PROVEEDOR"
TIPO_CLIENTE = "CLIENTE"

SIN_DIRECCION = ""


def _geografia(fila):
    """Resuelve provincia y municipio, y avisa si el municipio no existe."""
    avisos = []
    id_prov = geo.provincia_destino(_int(fila.get("id_provincia")))
    id_mun = geo.municipio_destino(_int(fila.get("id_municipio")))

    if _int(fila.get("id_municipio")) is not None and id_mun is None:
        avisos.append(("municipio sin equivalente en destino", None, "id_municipio queda NULL"))

    return id_prov, id_mun, avisos


def _int(valor):
    v = no_vacio(valor)
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def _direccion(valor, avisos):
    """`clientes.direccion` es NOT NULL: se conserva '' y se avisa (§13)."""
    d = no_vacio(valor)
    if d is None:
        avisos.append(("direccion vacia", None, "se guarda cadena vacia"))
        return SIN_DIRECCION
    return d


def _telefono_preferido(movil, fijo):
    """Regla §6, opción A: el móvil si existe, si no el fijo."""
    return telefono(movil) or telefono(fijo)


def _payload_clientes(nombre, nit, codigo, tipo_persona, tipo_relacion, estado,
                      id_provincia, id_municipio, direccion, codigo_post,
                      tel, email, web, fax):
    return {
        "nombre": nombre,
        "tipo_persona": tipo_persona,
        "nit": nit,
        "telefono": tel,
        "email": email,
        "fax": fax,
        "web": web,
        "id_provincia": id_provincia,
        "id_municipio": id_municipio,
        "codigo": codigo,
        "codigo_postal": codigo_post,
        "direccion": direccion,
        "tipo_relacion": tipo_relacion,
        "estado": estado,
        "fecha_registro": HOY,
    }


def _mapeo_artista(fila):
    """§6 y §7: `artista` -> `clientes` + `clientes_persona_natural`."""
    avisos = []
    ci = texto(fila.get("ci"))
    baja = es_baja(fila.get("baja"))

    id_prov, id_mun, avisos_geo = _geografia(fila)
    avisos.extend(avisos_geo)

    padre = _payload_clientes(
        nombre=no_vacio(fila.get("nombre")) or SIN_DIRECCION,
        nit=ci,
        codigo=no_vacio(fila.get("codigo_exp")) or SIN_DIRECCION,
        tipo_persona=TIPO_NATURAL,
        tipo_relacion=TIPO_PROVEEDOR,
        estado="BAJA" if baja else "ACTIVO",
        id_provincia=id_prov,
        id_municipio=id_mun,
        direccion=_direccion(fila.get("direccion"), avisos),
        codigo_post=codigo_postal(fila.get("codigo_postal")),
        tel=_telefono_preferido(fila.get("telefono_movilp"), fila.get("telefono_fijop")),
        email=no_vacio(fila.get("correo_particular")),
        web=no_vacio(fila.get("web_personal")),
        fax=telefono(fila.get("fax")),
    )

    hijo = {
        "nombre": no_vacio(fila.get("nombre")) or SIN_DIRECCION,
        "primer_apellido": no_vacio(fila.get("apellido1")) or SIN_DIRECCION,
        "segundo_apellido": no_vacio(fila.get("apellido2")),
        "carnet_identidad": ci,
        "codigo_expediente": no_vacio(fila.get("codigo_exp")),
        "numero_registro": registro(fila.get("registro")),
        "catalogo": no_vacio(fila.get("catalogo")),
        "es_trabajador": hay_datos_laborales(fila),
        "ocupacion": no_vacio(fila.get("ocupacion")),
        "centro_trabajo": no_vacio(fila.get("centro_laboral")),
        "correo_trabajo": no_vacio(fila.get("correo_trabajo")),
        "direccion_trabajo": no_vacio(fila.get("direccion_laboral")),
        "telefono_trabajo": telefono(fila.get("telefono_trabajo")),
        "en_baja": baja,
        "fecha_baja": fecha(fila.get("fecha_baja")),
        "vigencia": fecha(fila.get("fecha_caducidad")),
    }

    if not padre["codigo"]:
        avisos.append(("codigo vacio", None, "clientes.codigo queda vacio"))

    return padre, hijo, avisos


def _mapeo_cliente(fila):
    """§8 y §9: `cliente` -> `clientes` + `clientes_persona_juridica`."""
    avisos = []
    codigo = no_vacio(fila.get("codigo"))
    nit = no_vacio(fila.get("nit")) or codigo
    id_prov, id_mun, avisos_geo = _geografia(fila)
    avisos.extend(avisos_geo)

    padre = _payload_clientes(
        nombre=no_vacio(fila.get("nombre_empresa")) or SIN_DIRECCION,
        nit=nit,
        codigo=codigo or SIN_DIRECCION,
        tipo_persona=TIPO_JURIDICA,
        tipo_relacion=TIPO_CLIENTE,
        estado="ACTIVO",
        id_provincia=id_prov,
        id_municipio=id_mun,
        direccion=_direccion(fila.get("direccion"), avisos),
        codigo_post=None,
        tel=telefono(fila.get("telefono")),
        email=no_vacio(fila.get("email")),
        web=no_vacio(fila.get("web")),
        fax=telefono(fila.get("fax")),
    )

    hijo = {
        "codigo_reup": nit,
        "id_tipo_entidad": None,
    }

    if not nit:
        avisos.append(("nit vacio sin fallback", None, "codigo_reup quedaria NULL"))

    return padre, hijo, avisos


def _es_tcp(fila):
    """Regla §11. En el conjunto actual no detecta ninguna fila (§11.3)."""
    nombre = (texto(fila.get("nombre_empresa")) or "").lower()
    codigo = texto(fila.get("codigo")) or ""
    if "tcp" in nombre or "mipyme" in nombre:
        return True
    if codigo.startswith("50004"):
        return True
    return False


def _mapeo_tcp(fila):
    """§10: `cliente` (TCP/mipyme) -> `clientes` + `cliente_tcp`."""
    avisos = []
    codigo = no_vacio(fila.get("codigo"))
    nit = no_vacio(fila.get("nit")) or codigo
    id_prov, id_mun, avisos_geo = _geografia(fila)
    avisos.extend(avisos_geo)

    padre = _payload_clientes(
        nombre=no_vacio(fila.get("nombre_empresa")) or SIN_DIRECCION,
        nit=nit,
        codigo=codigo or SIN_DIRECCION,
        tipo_persona=TIPO_NATURAL,
        tipo_relacion=TIPO_CLIENTE,
        estado="ACTIVO",
        id_provincia=id_prov,
        id_municipio=id_mun,
        direccion=_direccion(fila.get("direccion"), avisos),
        codigo_post=None,
        tel=telefono(fila.get("telefono")),
        email=no_vacio(fila.get("email")),
        web=no_vacio(fila.get("web")),
        fax=telefono(fila.get("fax")),
    )

    partes = (texto(fila.get("nombre_empresa")) or "").split()
    hijo = {
        "nombre": partes[0] if partes else SIN_DIRECCION,
        "primer_apellido": partes[1] if len(partes) > 1 else SIN_DIRECCION,
        "segundo_apellido": " ".join(partes[2:]) or None,
        "direccion": no_vacio(fila.get("direccion")),
        "numero_registro_proyecto": codigo,
        "fecha_aprobacion": HOY,
    }

    return padre, hijo, avisos


def validar_ci(fila):
    """Devuelve el motivo de descarte si el CI no cumple el formato."""
    if not es_ci_valido(fila.get("ci")):
        valor = texto(fila.get("ci"))
        return "CI invalido", "valor=%r longitud=%d" % (valor, len(valor or ""))
    return None, None
