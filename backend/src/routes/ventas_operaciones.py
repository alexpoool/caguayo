from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.database.connection import get_session
from src.services.contrato_service import (
    ContratoService,
    SuplementoService,
    FacturaService,
    VentaEfectivoService,
)
from src.dto import (
    ContratoCreate,
    ContratoReadWithDetails,
    ContratoUpdateWithProductos,
    SuplementoCreate,
    SuplementoReadWithDetails,
    SuplementoUpdateWithProductos,
    FacturaCreate,
    FacturaReadWithDetails,
    FacturaUpdateWithProductos,
    VentaEfectivoCreate,
    VentaEfectivoReadWithDetails,
    VentaEfectivoUpdateWithProductos,
)

contratos_router = APIRouter(prefix="/contratos", tags=["contratos"], redirect_slashes=False)


@contratos_router.post("", response_model=ContratoReadWithDetails, status_code=201)
async def crear_contrato(
    contrato: ContratoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo contrato."""
    try:
        return await ContratoService.create(db, contrato)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear contrato: {str(e)}"
        )


@contratos_router.get("", response_model=List[ContratoReadWithDetails])
async def obtener_contratos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los contratos."""
    try:
        return await ContratoService.get_all(db, skip, limit)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener contratos: {str(e)}"
        )


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


@contratos_router.put("/{contrato_id}", response_model=ContratoReadWithDetails)
async def actualizar_contrato(
    contrato_id: int,
    update_data: ContratoUpdateWithProductos,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un contrato."""
    try:
        contrato = await ContratoService.update(db, contrato_id, update_data)
        if not contrato:
            raise HTTPException(status_code=404, detail="Contrato no encontrado")
        return contrato
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar contrato: {str(e)}"
        )


@contratos_router.delete("/{contrato_id}", status_code=204)
async def eliminar_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un contrato."""
    try:
        success = await ContratoService.delete(db, contrato_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contrato no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar contrato: {str(e)}"
        )


suplementos_router = APIRouter(prefix="/suplementos", tags=["suplementos"], redirect_slashes=False)


@suplementos_router.post("", response_model=SuplementoReadWithDetails, status_code=201)
async def crear_suplemento(
    suplemento: SuplementoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo suplemento."""
    try:
        return await SuplementoService.create(db, suplemento)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear suplemento: {str(e)}"
        )


@suplementos_router.get("/contrato/{contrato_id}", response_model=List[SuplementoReadWithDetails])
async def obtener_suplementos_por_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los suplementos de un contrato."""
    try:
        return await SuplementoService.get_all_by_contrato(db, contrato_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener suplementos: {str(e)}"
        )


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
    update_data: SuplementoUpdateWithProductos,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un suplemento."""
    try:
        suplemento = await SuplementoService.update(db, suplemento_id, update_data)
        if not suplemento:
            raise HTTPException(status_code=404, detail="Suplemento no encontrado")
        return suplemento
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar suplemento: {str(e)}"
        )


@suplementos_router.delete("/{suplemento_id}", status_code=204)
async def eliminar_suplemento(
    suplemento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un suplemento."""
    try:
        success = await SuplementoService.delete(db, suplemento_id)
        if not success:
            raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar suplemento: {str(e)}"
        )


facturas_router = APIRouter(prefix="/facturas", tags=["facturas"], redirect_slashes=False)


@facturas_router.post("", response_model=FacturaReadWithDetails, status_code=201)
async def crear_factura(
    factura: FacturaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva factura."""
    try:
        return await FacturaService.create(db, factura)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear factura: {str(e)}"
        )


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
        raise HTTPException(
            status_code=500, detail=f"Error al obtener facturas: {str(e)}"
        )


@facturas_router.get("/contrato/{contrato_id}", response_model=List[FacturaReadWithDetails])
async def obtener_facturas_por_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todas las facturas de un contrato."""
    try:
        return await FacturaService.get_by_contrato(db, contrato_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener facturas: {str(e)}"
        )


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
    update_data: FacturaUpdateWithProductos,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una factura."""
    try:
        factura = await FacturaService.update(db, factura_id, update_data)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return factura
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar factura: {str(e)}"
        )


@facturas_router.delete("/{factura_id}", status_code=204)
async def eliminar_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una factura."""
    try:
        success = await FacturaService.delete(db, factura_id)
        if not success:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar factura: {str(e)}"
        )


ventas_efectivo_router = APIRouter(prefix="/ventas-efectivo", tags=["ventas-efectivo"], redirect_slashes=False)


@ventas_efectivo_router.post("", response_model=VentaEfectivoReadWithDetails, status_code=201)
async def crear_venta_efectivo(
    venta: VentaEfectivoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva venta en efectivo."""
    try:
        return await VentaEfectivoService.create(db, venta)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear venta en efectivo: {str(e)}"
        )


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
        raise HTTPException(
            status_code=500, detail=f"Error al obtener ventas en efectivo: {str(e)}"
        )


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
    update_data: VentaEfectivoUpdateWithProductos,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una venta en efectivo."""
    try:
        venta = await VentaEfectivoService.update(db, venta_id, update_data)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
        return venta
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar venta en efectivo: {str(e)}"
        )


@ventas_efectivo_router.delete("/{venta_id}", status_code=204)
async def eliminar_venta_efectivo(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una venta en efectivo."""
    try:
        success = await VentaEfectivoService.delete(db, venta_id)
        if not success:
            raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar venta en efectivo: {str(e)}"
        )
