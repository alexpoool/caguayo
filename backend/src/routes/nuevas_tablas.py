from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
import logging
from src.database.connection import get_session
from src.services.nuevas_tablas_service import (
    ContratoService,
    ContratoProductoService,
    SuplementoService,
    SuplementoProductoService,
    FacturaService,
    FacturaProductoService,
    PagoService,
    VentaEfectivoService,
    VentaEfectivoProductoService,
)
from src.dto import (
    ContratoCreate,
    ContratoRead,
    ContratoUpdate,
    ContratoProductoCreate,
    ContratoProductoRead,
    ContratoProductoUpdate,
    SuplementoCreate,
    SuplementoRead,
    SuplementoUpdate,
    SuplementoProductoCreate,
    SuplementoProductoRead,
    SuplementoProductoUpdate,
    FacturaCreate,
    FacturaRead,
    FacturaUpdate,
    FacturaProductoCreate,
    FacturaProductoRead,
    FacturaProductoUpdate,
    PagoCreate,
    PagoRead,
    PagoUpdate,
    VentaEfectivoCreate,
    VentaEfectivoRead,
    VentaEfectivoUpdate,
    VentaEfectivoProductoCreate,
    VentaEfectivoProductoRead,
    VentaEfectivoProductoUpdate,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ============== CONTRATOS ==============
@router.post("/contratos", response_model=ContratoRead)
async def create_contrato(contrato: ContratoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await ContratoService.create(db, contrato)
    except Exception as e:
        logger.error(f"Error creating contrato: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contratos", response_model=List[ContratoRead])
async def read_contratos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)):
    return await ContratoService.get_all(db, skip=skip, limit=limit)


@router.get("/contratos/cliente/{cliente_id}", response_model=List[ContratoRead])
async def read_contratos_by_cliente(cliente_id: int, db: AsyncSession = Depends(get_session)):
    return await ContratoService.get_by_cliente(db, cliente_id)


@router.get("/contratos/{contrato_id}", response_model=ContratoRead)
async def read_contrato(contrato_id: int, db: AsyncSession = Depends(get_session)):
    contrato = await ContratoService.get(db, contrato_id)
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return contrato


@router.put("/contratos/{contrato_id}", response_model=ContratoRead)
async def update_contrato(contrato_id: int, contrato: ContratoUpdate, db: AsyncSession = Depends(get_session)):
    updated = await ContratoService.update(db, contrato_id, contrato)
    if not updated:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return updated


@router.delete("/contratos/{contrato_id}")
async def delete_contrato(contrato_id: int, db: AsyncSession = Depends(get_session)):
    deleted = await ContratoService.delete(db, contrato_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return {"message": "Contrato eliminado correctamente"}


# ============== CONTRATO PRODUCTOS ==============
@router.post("/contrato-productos", response_model=ContratoProductoRead)
async def create_contrato_producto(data: ContratoProductoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await ContratoProductoService.create(db, data)
    except Exception as e:
        logger.error(f"Error creating contrato producto: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contrato-productos/contrato/{contrato_id}", response_model=List[ContratoProductoRead])
async def read_contrato_productos(contrato_id: int, db: AsyncSession = Depends(get_session)):
    return await ContratoProductoService.get_by_contrato(db, contrato_id)


@router.delete("/contrato-productos/{id}")
async def delete_contrato_producto(id: int, db: AsyncSession = Depends(get_session)):
    deleted = await ContratoProductoService.delete(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contrato producto no encontrado")
    return {"message": "Contrato producto eliminado correctamente"}


# ============== SUPLEMENTOS ==============
@router.post("/suplementos", response_model=SuplementoRead)
async def create_suplemento(suplemento: SuplementoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await SuplementoService.create(db, suplemento)
    except Exception as e:
        logger.error(f"Error creating suplemento: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/suplementos", response_model=List[SuplementoRead])
async def read_suplementos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)):
    return await SuplementoService.get_all(db, skip=skip, limit=limit)


@router.get("/suplementos/contrato/{contrato_id}", response_model=List[SuplementoRead])
async def read_suplementos_by_contrato(contrato_id: int, db: AsyncSession = Depends(get_session)):
    return await SuplementoService.get_by_contrato(db, contrato_id)


@router.get("/suplementos/{suplemento_id}", response_model=SuplementoRead)
async def read_suplemento(suplemento_id: int, db: AsyncSession = Depends(get_session)):
    suplemento = await SuplementoService.get(db, suplemento_id)
    if not suplemento:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    return suplemento


@router.put("/suplementos/{suplemento_id}", response_model=SuplementoRead)
async def update_suplemento(suplemento_id: int, suplemento: SuplementoUpdate, db: AsyncSession = Depends(get_session)):
    updated = await SuplementoService.update(db, suplemento_id, suplemento)
    if not updated:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    return updated


@router.delete("/suplementos/{suplemento_id}")
async def delete_suplemento(suplemento_id: int, db: AsyncSession = Depends(get_session)):
    deleted = await SuplementoService.delete(db, suplemento_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado")
    return {"message": "Suplemento eliminado correctamente"}


# ============== SUPLEMENTO PRODUCTOS ==============
@router.post("/suplemento-productos", response_model=SuplementoProductoRead)
async def create_suplemento_producto(data: SuplementoProductoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await SuplementoProductoService.create(db, data)
    except Exception as e:
        logger.error(f"Error creating suplemento producto: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/suplemento-productos/suplemento/{suplemento_id}", response_model=List[SuplementoProductoRead])
async def read_suplemento_productos(suplemento_id: int, db: AsyncSession = Depends(get_session)):
    return await SuplementoProductoService.get_by_suplemento(db, suplemento_id)


@router.delete("/suplemento-productos/{id}")
async def delete_suplemento_producto(id: int, db: AsyncSession = Depends(get_session)):
    deleted = await SuplementoProductoService.delete(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Suplemento producto no encontrado")
    return {"message": "Suplemento producto eliminado correctamente"}


# ============== FACTURAS ==============
@router.post("/facturas", response_model=FacturaRead)
async def create_factura(factura: FacturaCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await FacturaService.create(db, factura)
    except Exception as e:
        logger.error(f"Error creating factura: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/facturas", response_model=List[FacturaRead])
async def read_facturas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)):
    return await FacturaService.get_all(db, skip=skip, limit=limit)


@router.get("/facturas/contrato/{contrato_id}", response_model=List[FacturaRead])
async def read_facturas_by_contrato(contrato_id: int, db: AsyncSession = Depends(get_session)):
    return await FacturaService.get_by_contrato(db, contrato_id)


@router.get("/facturas/{factura_id}", response_model=FacturaRead)
async def read_factura(factura_id: int, db: AsyncSession = Depends(get_session)):
    factura = await FacturaService.get(db, factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura


@router.put("/facturas/{factura_id}", response_model=FacturaRead)
async def update_factura(factura_id: int, factura: FacturaUpdate, db: AsyncSession = Depends(get_session)):
    updated = await FacturaService.update(db, factura_id, factura)
    if not updated:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return updated


@router.delete("/facturas/{factura_id}")
async def delete_factura(factura_id: int, db: AsyncSession = Depends(get_session)):
    deleted = await FacturaService.delete(db, factura_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": "Factura eliminada correctamente"}


# ============== FACTURA PRODUCTOS ==============
@router.post("/factura-productos", response_model=FacturaProductoRead)
async def create_factura_producto(data: FacturaProductoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await FacturaProductoService.create(db, data)
    except Exception as e:
        logger.error(f"Error creating factura producto: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/factura-productos/factura/{factura_id}", response_model=List[FacturaProductoRead])
async def read_factura_productos(factura_id: int, db: AsyncSession = Depends(get_session)):
    return await FacturaProductoService.get_by_factura(db, factura_id)


@router.delete("/factura-productos/{id}")
async def delete_factura_producto(id: int, db: AsyncSession = Depends(get_session)):
    deleted = await FacturaProductoService.delete(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Factura producto no encontrado")
    return {"message": "Factura producto eliminado correctamente"}


# ============== PAGOS ==============
@router.post("/pagos", response_model=PagoRead)
async def create_pago(pago: PagoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await PagoService.create(db, pago)
    except Exception as e:
        logger.error(f"Error creating pago: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pagos", response_model=List[PagoRead])
async def read_pagos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)):
    return await PagoService.get_all(db, skip=skip, limit=limit)


@router.get("/pagos/factura/{factura_id}", response_model=List[PagoRead])
async def read_pagos_by_factura(factura_id: int, db: AsyncSession = Depends(get_session)):
    return await PagoService.get_by_factura(db, factura_id)


@router.get("/pagos/{pago_id}", response_model=PagoRead)
async def read_pago(pago_id: int, db: AsyncSession = Depends(get_session)):
    pago = await PagoService.get(db, pago_id)
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return pago


@router.put("/pagos/{pago_id}", response_model=PagoRead)
async def update_pago(pago_id: int, pago: PagoUpdate, db: AsyncSession = Depends(get_session)):
    updated = await PagoService.update(db, pago_id, pago)
    if not updated:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return updated


@router.delete("/pagos/{pago_id}")
async def delete_pago(pago_id: int, db: AsyncSession = Depends(get_session)):
    deleted = await PagoService.delete(db, pago_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return {"message": "Pago eliminado correctamente"}


# ============== VENTAS EFECTIVO ==============
@router.post("/ventas-efectivo", response_model=VentaEfectivoRead)
async def create_venta_efectivo(venta: VentaEfectivoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await VentaEfectivoService.create(db, venta)
    except Exception as e:
        logger.error(f"Error creating venta efectivo: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ventas-efectivo", response_model=List[VentaEfectivoRead])
async def read_ventas_efectivo(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)):
    return await VentaEfectivoService.get_all(db, skip=skip, limit=limit)


@router.get("/ventas-efectivo/dependencia/{dependencia_id}", response_model=List[VentaEfectivoRead])
async def read_ventas_efectivo_by_dependencia(dependencia_id: int, db: AsyncSession = Depends(get_session)):
    return await VentaEfectivoService.get_by_dependencia(db, dependencia_id)


@router.get("/ventas-efectivo/{venta_id}", response_model=VentaEfectivoRead)
async def read_venta_efectivo(venta_id: int, db: AsyncSession = Depends(get_session)):
    venta = await VentaEfectivoService.get(db, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
    return venta


@router.put("/ventas-efectivo/{venta_id}", response_model=VentaEfectivoRead)
async def update_venta_efectivo(venta_id: int, venta: VentaEfectivoUpdate, db: AsyncSession = Depends(get_session)):
    updated = await VentaEfectivoService.update(db, venta_id, venta)
    if not updated:
        raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
    return updated


@router.delete("/ventas-efectivo/{venta_id}")
async def delete_venta_efectivo(venta_id: int, db: AsyncSession = Depends(get_session)):
    deleted = await VentaEfectivoService.delete(db, venta_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Venta en efectivo no encontrada")
    return {"message": "Venta en efectivo eliminada correctamente"}


# ============== VENTA EFECTIVO PRODUCTOS ==============
@router.post("/venta-efectivo-productos", response_model=VentaEfectivoProductoRead)
async def create_venta_efectivo_producto(data: VentaEfectivoProductoCreate, db: AsyncSession = Depends(get_session)):
    try:
        return await VentaEfectivoProductoService.create(db, data)
    except Exception as e:
        logger.error(f"Error creating venta efectivo producto: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/venta-efectivo-productos/venta/{venta_id}", response_model=List[VentaEfectivoProductoRead])
async def read_venta_efectivo_productos(venta_id: int, db: AsyncSession = Depends(get_session)):
    return await VentaEfectivoProductoService.get_by_venta(db, venta_id)


@router.delete("/venta-efectivo-productos/{id}")
async def delete_venta_efectivo_producto(id: int, db: AsyncSession = Depends(get_session)):
    deleted = await VentaEfectivoProductoService.delete(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Venta efectivo producto no encontrado")
    return {"message": "Venta efectivo producto eliminado correctamente"}
