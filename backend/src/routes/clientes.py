from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.services.cliente_service import ClienteService
from src.dto import ClienteCreate, ClienteRead, ClienteUpdate
from src.models.cliente_natural import ClienteNatural
from src.models.cliente import Cliente

router = APIRouter(prefix="/clientes", tags=["clientes"], redirect_slashes=False)


@router.get("", response_model=List[ClienteRead])
async def listar_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=100000),
    tipo_relacion: Optional[str] = Query(
        None, description="Filtrar por tipo_relacion (CLIENTE, PROVEEDOR, AMBAS)"
    ),
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los clientes con paginación y opcionalmente filtrar por tipo_relacion."""
    return await ClienteService.get_clientes(
        db, skip=skip, limit=limit, tipo_relacion=tipo_relacion
    )


@router.post("", response_model=ClienteRead, status_code=201)
async def crear_cliente(
    cliente: ClienteCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo cliente."""
    try:
        print(f"DEBUG ROUTE: Received cliente = {cliente.model_dump()}")
        return await ClienteService.create_cliente(db, cliente)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear cliente: {str(e)}")


@router.get("/search", response_model=List[ClienteRead])
async def buscar_clientes(
    cedula_rif: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Buscar clientes por cédula/RIF."""
    if cedula_rif:
        cliente = await ClienteService.get_cliente_by_cedula(db, cedula_rif)
        return [cliente] if cliente else []
    return await ClienteService.get_clientes(db)


@router.get("/naturales")
async def listar_clientes_naturales(
    db: AsyncSession = Depends(get_session),
):
    """Listar clientes persona natural con tipo_relacion CLIENTE o AMBAS."""
    stmt = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            ClienteNatural.primer_apellido,
            ClienteNatural.segundo_apellido,
            ClienteNatural.carnet_identidad,
        )
        .outerjoin(ClienteNatural, ClienteNatural.id_cliente == Cliente.id_cliente)
        .where(
            Cliente.tipo_persona == "NATURAL",
            Cliente.tipo_relacion.in_(["CLIENTE", "AMBAS"]),
        )
        .order_by(Cliente.nombre, ClienteNatural.primer_apellido)
    )
    result = await db.exec(stmt)
    rows = result.all()
    return [
        {
            "id_cliente": row.id_cliente,
            "nombre": row.nombre,
            "primer_apellido": row.primer_apellido or "",
            "segundo_apellido": row.segundo_apellido or "",
            "carnet_identidad": row.carnet_identidad or "",
        }
        for row in rows
    ]


@router.get("/{cliente_id}", response_model=ClienteRead)
async def obtener_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un cliente específico por ID."""
    cliente = await ClienteService.get_cliente(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteRead)
async def actualizar_cliente(
    cliente_id: int,
    cliente_update: ClienteUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un cliente existente."""
    try:
        cliente = await ClienteService.update_cliente(db, cliente_id, cliente_update)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cliente: {str(e)}"
        )


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un cliente."""
    try:
        success = await ClienteService.delete_cliente(db, cliente_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cliente: {str(e)}"
        )
