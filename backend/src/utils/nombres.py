"""Nombre visible de un tercero y búsqueda por nombre y apellidos.

`clientes.nombre` es el nombre comercial (en personas naturales, a veces sólo
el nombre de pila). Los apellidos viven en `clientes_persona_natural` y
`clientes_tcp`; aquí se componen para mostrarlos y para buscarlos.
"""

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Cliente, ClienteNatural, ClienteTCP


def componer_nombre_completo(
    nombre: str | None,
    primer_apellido: str | None = None,
    segundo_apellido: str | None = None,
) -> str:
    """Une nombre y apellidos sin dejar espacios sobrantes."""
    partes = (nombre, primer_apellido, segundo_apellido)
    return " ".join(p.strip() for p in partes if p and p.strip())


async def nombres_completos_por_cliente(
    db: AsyncSession, ids
) -> dict[int, str]:
    """Devuelve `id_cliente -> nombre completo` con dos consultas en bloque.

    Se usa para enriquecer respuestas anidadas (contratos, convenios,
    liquidaciones) sin provocar una consulta por fila.
    """
    ids_unicos = list({i for i in ids if i is not None})
    if not ids_unicos:
        return {}

    nombres = {
        c.id_cliente: c.nombre
        for c in (
            await db.exec(select(Cliente).where(Cliente.id_cliente.in_(ids_unicos)))
        )
        .scalars()
        .all()
    }

    naturales = (
        await db.exec(
            select(ClienteNatural).where(
                ClienteNatural.id_cliente.in_(ids_unicos)
            )
        )
    ).scalars().all()
    for n in naturales:
        nombres[n.id_cliente] = componer_nombre_completo(
            n.nombre or nombres.get(n.id_cliente),
            n.primer_apellido,
            n.segundo_apellido,
        )

    tcp = (
        await db.exec(
            select(ClienteTCP).where(ClienteTCP.id_cliente.in_(ids_unicos))
        )
    ).scalars().all()
    for t in tcp:
        nombres[t.id_cliente] = componer_nombre_completo(
            t.nombre or nombres.get(t.id_cliente),
            t.primer_apellido,
            t.segundo_apellido,
        )

    return nombres


def _escapar_like(token: str) -> str:
    """Escapa comodines para que el texto se busque literal."""
    return token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _filtro_token(token: str):
    """Cláusula que exige que un token aparezca en el nombre completo."""
    patron = f"%{_escapar_like(token)}%"
    natural = (
        select(ClienteNatural.id_cliente)
        .where(
            ClienteNatural.id_cliente == Cliente.id_cliente,
            func.concat_ws(
                " ",
                ClienteNatural.nombre,
                ClienteNatural.primer_apellido,
                ClienteNatural.segundo_apellido,
            ).ilike(patron),
        )
        .exists()
    )
    tcp = (
        select(ClienteTCP.id_cliente)
        .where(
            ClienteTCP.id_cliente == Cliente.id_cliente,
            func.concat_ws(
                " ",
                ClienteTCP.nombre,
                ClienteTCP.primer_apellido,
                ClienteTCP.segundo_apellido,
            ).ilike(patron),
        )
        .exists()
    )
    return or_(natural, tcp)


def filtro_nombre_completo(termino: str):
    """Cláusula SQL que busca el término en el nombre completo del tercero.

    Cubre a las personas naturales y TCP (nombre + primer y segundo apellido),
    de modo que buscar "Pérez" encuentra a "Juan Pérez Gómez" aunque
    `clientes.nombre` sólo guarde "Juan". Cada palabra del término debe
    aparecer, así "Pedro Ojeda" encuentra a "Pedro Luis Ojeda Rodríguez".
    """
    tokens = [t for t in (termino or "").split() if t]
    if not tokens:
        return or_(False, False)
    return and_(*(_filtro_token(token) for token in tokens))
