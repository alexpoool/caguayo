import logging
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from src.database.connection import get_auth_session, get_session
from src.services.contrato_service import (
    ContratoService,
    SuplementoService,
    FacturaService,
    VentaEfectivoService,
)
from src.dto import (
    ContratoCreate,
    ContratoReadWithDetails,
    ContratoUpdate,
    SuplementoCreate,
    SuplementoReadWithDetails,
    SuplementoUpdate,
    FacturaCreate,
    FacturaReadWithDetails,
    FacturaUpdate,
    VentaEfectivoCreate,
    VentaEfectivoReadWithDetails,
    VentaEfectivoUpdate,
    ItemAnexoDisponible,
)
from src.utils import _get_nit_from_token, verify_auth

logger = logging.getLogger(__name__)

contratos_router = APIRouter(
    prefix="/contratos", tags=["contratos"], redirect_slashes=False
)


@contratos_router.post("", response_model=ContratoReadWithDetails, status_code=201)
async def crear_contrato(
    contrato: ContratoCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo contrato."""
    try:
        nit = await _get_nit_from_token(authorization, db)
        return await ContratoService.create(db, contrato, nit=nit)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "Input should be a valid integer" in error_msg:
            raise HTTPException(
                status_code=400, detail=f"Error de validación: {error_msg}"
            )
        logger.error("Error al crear contrato", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@contratos_router.get("", response_model=List[ContratoReadWithDetails])
async def obtener_contratos(
    skip: int = 0,
    limit: int = 10000,
    id_cliente: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los contratos, opcionalmente filtrados por id_cliente."""
    try:
        return await ContratoService.get_all(db, skip, limit, id_cliente)
    except Exception as e:
        logger.error("Error al obtener contratos", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@contratos_router.get("/{contrato_id}", response_model=ContratoReadWithDetails)
async def obtener_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un contrato por ID."""
    contrato = await ContratoService.get(db, contrato_id)
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return contrato


@contratos_router.get(
    "/{contrato_id}/items-disponibles", response_model=List[ItemAnexoDisponible]
)
async def obtener_items_disponibles(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener items de anexos disponibles con precio en la moneda del contrato."""
    try:
        return await ContratoService.get_items_disponibles(db, contrato_id)
    except Exception as e:
        logger.error("Error al obtener items disponibles", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@contratos_router.put("/{contrato_id}", response_model=ContratoReadWithDetails)
async def actualizar_contrato(
    contrato_id: int,
    update_data: ContratoUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un contrato."""
    try:
        await verify_auth(authorization=authorization, db=db)
        contrato = await ContratoService.update(db, contrato_id, update_data)
        if not contrato:
            raise HTTPException(status_code=404, detail="Contrato no encontrado")
        return contrato
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al actualizar contrato", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@contratos_router.delete("/{contrato_id}", status_code=204)
async def eliminar_contrato(
    contrato_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un contrato."""
    try:
        await verify_auth(authorization=authorization, db=db)
        success = await ContratoService.delete(db, contrato_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contrato no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al eliminar contrato", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


suplementos_router = APIRouter(
    prefix="/suplementos", tags=["suplementos"], redirect_slashes=False
)


@suplementos_router.post("", response_model=SuplementoReadWithDetails, status_code=201)
async def crear_suplemento(
    suplemento: SuplementoCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo suplemento."""
    try:
        await verify_auth(authorization=authorization, db=db)
        return await SuplementoService.create(db, suplemento)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al crear suplemento", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@suplementos_router.get(
    "/contrato/{contrato_id}", response_model=List[SuplementoReadWithDetails]
)
async def obtener_suplementos_por_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los suplementos de un contrato."""
    try:
        return await SuplementoService.get_all_by_contrato(db, contrato_id)
    except Exception as e:
        logger.error("Error al obtener suplementos", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@suplementos_router.get("", response_model=List[SuplementoReadWithDetails])
async def obtener_suplementos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los suplementos."""
    try:
        return await SuplementoService.get_all(db, skip, limit)
    except Exception as e:
        logger.error("Error al obtener suplementos", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@suplementos_router.get("/{suplemento_id}", response_model=SuplementoReadWithDetails)
async def obtener_suplemento(
    suplemento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un suplemento por ID."""
    suplemento = await SuplementoService.get(db, suplemento_id)
    if not suplemento:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    return suplemento


@suplementos_router.put("/{suplemento_id}", response_model=SuplementoReadWithDetails)
async def actualizar_suplemento(
    suplemento_id: int,
    update_data: SuplementoUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un suplemento."""
    try:
        await verify_auth(authorization=authorization, db=db)
        suplemento = await SuplementoService.update(db, suplemento_id, update_data)
        if not suplemento:
            raise HTTPException(status_code=404, detail="Suplemento no encontrado")
        return suplemento
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al actualizar suplemento", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@suplementos_router.delete("/{suplemento_id}", status_code=204)
async def eliminar_suplemento(
    suplemento_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un suplemento."""
    try:
        await verify_auth(authorization=authorization, db=db)
        success = await SuplementoService.delete(db, suplemento_id)
        if not success:
            raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al eliminar suplemento", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


facturas_router = APIRouter(
    prefix="/facturas", tags=["facturas"], redirect_slashes=False
)


@facturas_router.post("", response_model=FacturaReadWithDetails, status_code=201)
async def crear_factura(
    factura: FacturaCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva factura."""
    try:
        nit = await _get_nit_from_token(authorization, db)
        return await FacturaService.create(db, factura, nit=nit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al crear factura", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.get("", response_model=List[FacturaReadWithDetails])
async def obtener_facturas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todas las facturas."""
    try:
        return await FacturaService.get_all(db, skip, limit)
    except Exception as e:
        logger.error("Error al obtener facturas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.get(
    "/contrato/{contrato_id}", response_model=List[FacturaReadWithDetails]
)
async def obtener_facturas_por_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todas las facturas de un contrato."""
    try:
        return await FacturaService.get_by_contrato(db, contrato_id)
    except Exception as e:
        logger.error("Error al obtener facturas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.get("/{factura_id}", response_model=FacturaReadWithDetails)
async def obtener_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una factura por ID."""
    factura = await FacturaService.get(db, factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura


@facturas_router.put("/{factura_id}", response_model=FacturaReadWithDetails)
async def actualizar_factura(
    factura_id: int,
    update_data: FacturaUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una factura."""
    try:
        await verify_auth(authorization=authorization, db=db)
        factura = await FacturaService.update(db, factura_id, update_data)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return factura
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al actualizar factura", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.delete("/{factura_id}", status_code=204)
async def eliminar_factura(
    factura_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una factura."""
    try:
        await verify_auth(authorization=authorization, db=db)
        success = await FacturaService.delete(db, factura_id)
        if not success:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al eliminar factura", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


ventas_efectivo_router = APIRouter(
    prefix="/ventas-efectivo", tags=["ventas-efectivo"], redirect_slashes=False
)


@ventas_efectivo_router.post(
    "", response_model=VentaEfectivoReadWithDetails, status_code=201
)
async def crear_venta_efectivo(
    venta: VentaEfectivoCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva venta en efectivo."""
    try:
        nit = await _get_nit_from_token(authorization, db)
        return await VentaEfectivoService.create(db, venta, nit=nit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al crear venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ventas_efectivo_router.get("", response_model=List[VentaEfectivoReadWithDetails])
async def obtener_ventas_efectivo(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todas las ventas en efectivo."""
    try:
        return await VentaEfectivoService.get_all(db, skip, limit)
    except Exception as e:
        logger.error("Error al obtener ventas en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ventas_efectivo_router.get("/{venta_id}", response_model=VentaEfectivoReadWithDetails)
async def obtener_venta_efectivo(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una venta en efectivo por ID."""
    venta = await VentaEfectivoService.get(db, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
    return venta


@ventas_efectivo_router.put("/{venta_id}", response_model=VentaEfectivoReadWithDetails)
async def actualizar_venta_efectivo(
    venta_id: int,
    update_data: VentaEfectivoUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una venta en efectivo."""
    try:
        await verify_auth(authorization=authorization, db=db)
        venta = await VentaEfectivoService.update(db, venta_id, update_data)
        if not venta:
            raise HTTPException(
                status_code=404, detail="Venta en efectivo no encontrada"
            )
        return venta
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al actualizar venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ventas_efectivo_router.delete("/{venta_id}", status_code=204)
async def eliminar_venta_efectivo(
    venta_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una venta en efectivo."""
    try:
        await verify_auth(authorization=authorization, db=db)
        success = await VentaEfectivoService.delete(db, venta_id)
        if not success:
            raise HTTPException(
                status_code=404, detail="Venta en efectivo no encontrada"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al eliminar venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
