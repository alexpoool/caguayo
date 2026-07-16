import logging
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from sqlalchemy.orm import selectinload

from src.database.connection import get_auth_session, get_session
from src.models import Cliente, Cliente as ClienteModel, Convenio
from src.dto.convenios_dto import ConvenioCreate, ConvenioRead, ConvenioUpdate
from src.utils import generar_codigo, _get_denominacion_from_token, verify_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/convenios", tags=["convenios"], redirect_slashes=False)


def _sanitize_search(search: str) -> str:
    """Escape wildcard characters from search string."""
    return search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("")
async def listar_convenios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    cliente_id: int = Query(None, description="Filtrar por cliente"),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    statement = (
        select(Convenio)
        .options(selectinload(Convenio.cliente), selectinload(Convenio.tipo_convenio))
        .order_by(Convenio.id_convenio.desc())
    )
    if cliente_id:
        statement = statement.where(Convenio.id_cliente == cliente_id)
    if search:
        escaped = _sanitize_search(search)
        statement = statement.where(Convenio.nombre_convenio.ilike(f"%{escaped}%"))
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    convenios = results.all()
    return [ConvenioRead.model_validate(c) for c in convenios]


@router.get("/simple")
async def listar_convenios_simple(db: AsyncSession = Depends(get_session)):
    statement = select(Convenio.id_convenio, ClienteModel.nombre).join(
        ClienteModel, isouter=True
    )
    results = await db.exec(statement)
    return [{"id_convenio": c.id_convenio, "nombre": c.nombre} for c in results.all()]


@router.get("/count")
async def contar_convenios(
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    statement = select(func.count(Convenio.id_convenio))
    if search:
        escaped = _sanitize_search(search)
        statement = statement.where(Convenio.nombre_convenio.ilike(f"%{escaped}%"))
    results = await db.exec(statement)
    return results.one()


@router.get("/{convenioid}")
async def obtener_convenio(
    convenioid: int,
    db: AsyncSession = Depends(get_session),
):
    statement = (
        select(Convenio)
        .where(Convenio.id_convenio == convenioid)
        .options(selectinload(Convenio.cliente), selectinload(Convenio.tipo_convenio))
    )
    results = await db.exec(statement)
    c = results.first()
    if not c:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")
    return ConvenioRead.model_validate(c)


@router.post("", status_code=201)
async def crear_convenio(
    datos: ConvenioCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    try:
        denominacion = await _get_denominacion_from_token(authorization)

        id_cliente = datos.id_cliente
        if not id_cliente:
            raise HTTPException(status_code=400, detail="El cliente es requerido")

        stmt_cliente = select(Cliente).where(Cliente.id_cliente == id_cliente)
        result_cliente = await db.exec(stmt_cliente)
        cliente = result_cliente.first()

        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        if cliente.tipo_relacion not in ["PROVEEDOR", "AMBAS"]:
            raise HTTPException(
                status_code=400,
                detail="Solo los clientes que son proveedores o ambos pueden tener convenios",
            )

        datos_dict = datos.model_dump(exclude={"codigo"})
        db_convenio = Convenio(**datos_dict, codigo="")
        db.add(db_convenio)
        await db.flush()
        db_convenio.codigo = generar_codigo(denominacion, datos.fecha.year, db_convenio.id_convenio)
        db.add(db_convenio)
        await db.commit()
        await db.refresh(db_convenio)
        return {
            "id_convenio": db_convenio.id_convenio,
            "id_cliente": db_convenio.id_cliente,
            "nombre_convenio": db_convenio.nombre_convenio,
            "fecha": str(db_convenio.fecha),
            "vigencia": str(db_convenio.vigencia),
            "id_tipo_convenio": db_convenio.id_tipo_convenio,
            "codigo": db_convenio.codigo,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al crear convenio", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.patch("/{convenioid}")
async def actualizar_convenio(
    convenioid: int,
    datos: ConvenioUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    try:
        await verify_auth(authorization=authorization, db=db)

        statement = select(Convenio).where(Convenio.id_convenio == convenioid)
        results = await db.exec(statement)
        db_convenio = results.first()
        if not db_convenio:
            raise HTTPException(status_code=404, detail="Convenio no encontrado")

        update_data = datos.model_dump(exclude_unset=True)
        db_convenio.sqlmodel_update(update_data)

        await db.commit()
        await db.refresh(db_convenio)
        return {
            "id_convenio": db_convenio.id_convenio,
            "id_cliente": db_convenio.id_cliente,
            "nombre_convenio": db_convenio.nombre_convenio,
            "fecha": str(db_convenio.fecha),
            "vigencia": str(db_convenio.vigencia),
            "id_tipo_convenio": db_convenio.id_tipo_convenio,
            "codigo": db_convenio.codigo,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al actualizar convenio", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{convenioid}", status_code=204)
async def eliminar_convenio(
    convenioid: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    try:
        await verify_auth(authorization=authorization, db=db)

        statement = select(Convenio).where(Convenio.id_convenio == convenioid)
        results = await db.exec(statement)
        db_convenio = results.first()
        if not db_convenio:
            raise HTTPException(status_code=404, detail="Convenio no encontrado")
        await db.delete(db_convenio)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al eliminar convenio", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
