"""Los reportes y selectores muestran nombre + apellidos de los terceros."""

import uuid

from src.models import Cliente, ClienteNatural, ClienteTCP
from src.services.reportes_service import get_personas_list, get_registro_clientes


def _sufijo() -> str:
    return uuid.uuid4().hex[:10]


async def _crear_natural(db_session, nombre: str, apellidos: tuple[str, str]):
    sufijo = _sufijo()
    cliente = Cliente(
        nombre=nombre,
        tipo_persona="NATURAL",
        nit=f"NIT-{sufijo}",
        codigo=f"TEST-{sufijo}",
        direccion="",
        tipo_relacion="CLIENTE",
        estado="ACTIVO",
    )
    db_session.add(cliente)
    await db_session.commit()
    await db_session.refresh(cliente)

    natural = ClienteNatural(
        id_cliente=cliente.id_cliente,
        nombre=nombre,
        primer_apellido=apellidos[0],
        segundo_apellido=apellidos[1],
        carnet_identidad=str(uuid.uuid4().int % 10**11).zfill(11),
    )
    db_session.add(natural)
    await db_session.commit()
    return cliente, natural


async def _crear_tcp(db_session, nombre: str, apellidos: tuple[str, str]):
    sufijo = _sufijo()
    cliente = Cliente(
        nombre=nombre,
        tipo_persona="TCP",
        nit=f"NIT-{sufijo}",
        codigo=f"TEST-{sufijo}",
        direccion="",
        tipo_relacion="CLIENTE",
        estado="ACTIVO",
    )
    db_session.add(cliente)
    await db_session.commit()
    await db_session.refresh(cliente)

    tcp = ClienteTCP(
        id_cliente=cliente.id_cliente,
        nombre=nombre,
        primer_apellido=apellidos[0],
        segundo_apellido=apellidos[1],
        direccion="",
        numero_registro_proyecto=f"TCP-{sufijo}",
    )
    db_session.add(tcp)
    await db_session.commit()
    return cliente, tcp


async def _borrar(db_session, cliente, hijo):
    await db_session.delete(hijo)
    await db_session.delete(cliente)
    await db_session.commit()


async def test_registro_clientes_compone_nombre_completo(db_session):
    cliente, natural = await _crear_natural(
        db_session, "Ana", ("Pérez", "Gómez")
    )
    try:
        data, _ = await get_registro_clientes(db_session)
        fila = next(d for d in data if d["id_cliente"] == cliente.id_cliente)
        assert fila["nombre"] == "Ana"
        assert fila["nombre_completo"] == "Ana Pérez Gómez"
    finally:
        await _borrar(db_session, cliente, natural)


async def test_personas_list_incluye_tcp_y_separa_apellidos(db_session):
    natural, hijo_natural = await _crear_natural(
        db_session, "Luis", ("Ojeda", "Rodríguez")
    )
    tcp, hijo_tcp = await _crear_tcp(db_session, "Marta", ("Díaz", "López"))
    try:
        personas = await get_personas_list(db_session)
        por_id = {p["id_persona"]: p for p in personas}

        assert por_id[natural.id_cliente]["nombre"] == "Luis"
        assert por_id[natural.id_cliente]["apellidos"] == "Ojeda Rodríguez"

        assert por_id[tcp.id_cliente]["nombre"] == "Marta"
        assert por_id[tcp.id_cliente]["apellidos"] == "Díaz López"
    finally:
        await _borrar(db_session, natural, hijo_natural)
        await _borrar(db_session, tcp, hijo_tcp)
