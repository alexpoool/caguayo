import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from src.database.connection import get_auth_session, get_session
from src.core.exceptions import BusinessLogicError
from src.services.contrato_service import (
    ContratoService,
    SuplementoService,
    FacturaService,
    VentaEfectivoService,
)
from src.services.oferta_tienda_service import OfertaTiendaService
from src.repository.contratos_repo import (
    contrato_repo,
    suplemento_repo,
    venta_efectivo_repo,
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
    OfertaTiendaCreate,
    OfertaTiendaReadWithDetails,
    OfertaTiendaUpdate,
)
from src.utils import _get_denominacion_from_token, _get_user_dependencia_id, verify_auth
from src.core.exceptions import AppError

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
        denominacion = await _get_denominacion_from_token(authorization)
        return await ContratoService.create(db, contrato, denominacion=denominacion)
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
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
    response: Response = None,
):
    """Obtener todos los contratos, opcionalmente filtrados por id_cliente o búsqueda."""
    try:
        response.headers["X-Total-Count"] = str(
            await contrato_repo.count_all(db, id_cliente=id_cliente, search=search)
        )
        return await ContratoService.get_all(db, skip, limit, id_cliente, search)
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
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el contrato tiene registros asociados",
        )
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
        denominacion = await _get_denominacion_from_token(authorization)
        return await SuplementoService.create(db, suplemento, denominacion=denominacion)
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
    response: Response = None,
):
    """Obtener todos los suplementos."""
    try:
        response.headers["X-Total-Count"] = str(await suplemento_repo.count(db))
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
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: el suplemento tiene registros asociados",
        )
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
        denominacion = await _get_denominacion_from_token(authorization)
        id_dependencia = await _get_user_dependencia_id(authorization)
        return await FacturaService.create(db, factura, denominacion=denominacion, id_dependencia_usuario=id_dependencia)
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al crear factura: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.get("", response_model=List[FacturaReadWithDetails])
async def obtener_facturas(
    skip: int = 0,
    limit: int = 100,
    tipo: str = "FACTURA",
    db: AsyncSession = Depends(get_session),
):
    """Obtener todas las facturas o pre-facturas según `tipo`."""
    try:
        return await FacturaService.get_all(db, skip, limit, tipo)
    except Exception as e:
        logger.error("Error al obtener facturas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.get(
    "/contrato/{contrato_id}", response_model=List[FacturaReadWithDetails]
)
async def obtener_facturas_por_contrato(
    contrato_id: int,
    tipo: str = "FACTURA",
    db: AsyncSession = Depends(get_session),
):
    """Obtener las facturas o pre-facturas de un contrato."""
    try:
        return await FacturaService.get_by_contrato(db, contrato_id, tipo)
    except Exception as e:
        logger.error("Error al obtener facturas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@facturas_router.post(
    "/{factura_id}/aprobar", response_model=FacturaReadWithDetails
)
async def aprobar_factura(
    factura_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Aprobar una pre-factura: la convierte en factura y reserva stock."""
    try:
        await verify_auth(authorization=authorization, db=db)
        denominacion = await _get_denominacion_from_token(authorization)
        id_dependencia = await _get_user_dependencia_id(authorization)
        factura = await FacturaService.aprobar(
            db,
            factura_id,
            denominacion=denominacion,
            id_dependencia_usuario=id_dependencia,
        )
        if not factura:
            raise HTTPException(status_code=404, detail="Pre-factura no encontrada")
        return factura
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al aprobar pre-factura", exc_info=True)
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
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: la factura tiene registros asociados",
        )
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
        denominacion = await _get_denominacion_from_token(authorization)
        return await VentaEfectivoService.create(db, venta, denominacion=denominacion)
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error al crear venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ventas_efectivo_router.get("", response_model=List[VentaEfectivoReadWithDetails])
async def obtener_ventas_efectivo(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
    response: Response = None,
):
    """Obtener todas las ventas en efectivo."""
    try:
        response.headers["X-Total-Count"] = str(await venta_efectivo_repo.count(db))
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
        denominacion = await _get_denominacion_from_token(authorization)
        venta = await VentaEfectivoService.update(
            db, venta_id, update_data, denominacion=denominacion
        )
        if not venta:
            raise HTTPException(
                status_code=404, detail="Venta en efectivo no encontrada"
            )
        return venta
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error al actualizar venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


ofertas_tienda_router = APIRouter(
    prefix="/ofertas-tienda", tags=["ofertas-tienda"], redirect_slashes=False
)


@ofertas_tienda_router.post("", response_model=OfertaTiendaReadWithDetails, status_code=201)
async def crear_oferta_tienda(
    oferta: OfertaTiendaCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva oferta de tienda (no toca stock)."""
    try:
        denominacion = await _get_denominacion_from_token(authorization)
        return await OfertaTiendaService.create(db, oferta, denominacion=denominacion)
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al crear oferta de tienda: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ofertas_tienda_router.get("", response_model=List[OfertaTiendaReadWithDetails])
async def obtener_ofertas_tienda(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Obtener las ofertas de tienda.

    Sin `estado` devuelve las vigentes (ACTIVA y CONVERTIDA); con `estado`
    filtra por ACTIVA, CONVERTIDA, ANULADA o TODAS.
    """
    try:
        return await OfertaTiendaService.get_all(db, skip, limit, estado)
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al obtener ofertas de tienda", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ofertas_tienda_router.get(
    "/contrato/{contrato_id}", response_model=List[OfertaTiendaReadWithDetails]
)
async def obtener_ofertas_tienda_por_contrato(
    contrato_id: int,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Obtener las ofertas de tienda de un contrato, con filtro opcional."""
    try:
        return await OfertaTiendaService.get_by_contrato(db, contrato_id, estado)
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al obtener ofertas de tienda", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ofertas_tienda_router.get("/{oferta_id}", response_model=OfertaTiendaReadWithDetails)
async def obtener_oferta_tienda(
    oferta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una oferta de tienda por ID (incluye convertidas)."""
    oferta = await OfertaTiendaService.get(db, oferta_id)
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return oferta


@ofertas_tienda_router.put(
    "/{oferta_id}", response_model=OfertaTiendaReadWithDetails
)
async def actualizar_oferta_tienda(
    oferta_id: int,
    update_data: OfertaTiendaUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una oferta de tienda (solo si está ACTIVA)."""
    try:
        await verify_auth(authorization=authorization, db=db)
        oferta = await OfertaTiendaService.update(db, oferta_id, update_data)
        if not oferta:
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
        return oferta
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al actualizar oferta de tienda", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ofertas_tienda_router.delete("/{oferta_id}", status_code=204)
async def eliminar_oferta_tienda(
    oferta_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Anular una oferta de tienda (borrado lógico)."""
    try:
        await verify_auth(authorization=authorization, db=db)
        success = await OfertaTiendaService.delete(db, oferta_id)
        if not success:
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: la oferta tiene registros asociados",
        )
    except Exception as e:
        logger.error("Error al eliminar oferta de tienda", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@ofertas_tienda_router.post(
    "/{oferta_id}/convertir", response_model=FacturaReadWithDetails, status_code=201
)
async def convertir_oferta_tienda(
    oferta_id: int,
    tipo: str = "FACTURA",
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Convertir una oferta de tienda en factura o pre-factura.

    Con `tipo=FACTURA` valida stock: si no alcanza, la oferta queda activa y
    no se crea nada; si alcanza, crea la factura (códigos autogenerados
    nuevos), copia los items y crea los movimientos de venta pendientes.

    Con `tipo=PREFACTURA` no valida stock ni crea movimientos: solo copia la
    oferta en una pre-factura, que luego se aprueba desde Pre-facturas.
    """
    try:
        await verify_auth(authorization=authorization, db=db)
        denominacion = await _get_denominacion_from_token(authorization)
        id_dependencia = await _get_user_dependencia_id(authorization)
        factura = await OfertaTiendaService.convertir(
            db,
            oferta_id,
            denominacion=denominacion,
            id_dependencia_usuario=id_dependencia,
            tipo=tipo,
        )
        if not factura:
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
        return factura
    except HTTPException:
        raise
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al convertir oferta de tienda", exc_info=True)
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
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar: la venta en efectivo tiene registros asociados",
        )
    except Exception as e:
        logger.error("Error al eliminar venta en efectivo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
