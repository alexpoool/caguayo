from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List
from src.database.connection import get_session
from src.services.servicio_service import (
    ServicioService,
    SolicitudServicioService,
    EtapaService,
    TareaEtapaService,
    PersonaEtapaService,
    FacturaServicioService,
    PagoFacturaServicioService,
    PersonaLiquidacionService,
)
from src.dto.servicio_dto import (
    ServicioCreate,
    ServicioRead,
    ServicioUpdate,
    SolicitudServicioCreate,
    SolicitudServicioRead,
    SolicitudServicioUpdate,
    EtapaCreate,
    EtapaRead,
    EtapaUpdate,
    TareaEtapaCreate,
    TareaEtapaRead,
    TareaEtapaUpdate,
    PersonaEtapaCreate,
    PersonaEtapaRead,
    FacturaServicioCreate,
    FacturaServicioRead,
    FacturaServicioUpdate,
    PagoFacturaServicioCreate,
    PagoFacturaServicioRead,
    PersonaLiquidacionCreate,
    PersonaLiquidacionCreateInput,
    PersonaLiquidacionRead,
    PersonaLiquidacionUpdate,
    PersonaLiquidacionUpdateInput,
    PersonaLiquidacionConfirmar,
)
from src.models.servicio import PersonaEtapa


# ==========================================
# SERVICIOS
# ==========================================
servicios_router = APIRouter(
    prefix="/servicios", tags=["servicios"], redirect_slashes=False
)


@servicios_router.get("", response_model=List[ServicioRead])
async def get_servicios(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await ServicioService.get_all(db, skip, limit)


@servicios_router.get("/{id}", response_model=ServicioRead)
async def get_servicio(id: int, db: AsyncSession = Depends(get_session)):
    result = await ServicioService.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return result


@servicios_router.post("", response_model=ServicioRead, status_code=201)
async def create_servicio(
    data: ServicioCreate, db: AsyncSession = Depends(get_session)
):
    return await ServicioService.create(db, data)


@servicios_router.put("/{id}", response_model=ServicioRead)
async def update_servicio(
    id: int, data: ServicioUpdate, db: AsyncSession = Depends(get_session)
):
    result = await ServicioService.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return result


@servicios_router.delete("/{id}", status_code=204)
async def delete_servicio(id: int, db: AsyncSession = Depends(get_session)):
    if not await ServicioService.delete(db, id):
        raise HTTPException(status_code=404, detail="Servicio no encontrado")


# ==========================================
# SOLICITUDES DE SERVICIO
# ==========================================
solicitudes_router = APIRouter(
    prefix="/solicitudes-servicio",
    tags=["solicitudes-servicio"],
    redirect_slashes=False,
)


@solicitudes_router.get("", response_model=List[SolicitudServicioRead])
async def get_solicitudes(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await SolicitudServicioService.get_all(db, skip, limit)


@solicitudes_router.get("/{id}", response_model=SolicitudServicioRead)
async def get_solicitud(id: int, db: AsyncSession = Depends(get_session)):
    result = await SolicitudServicioService.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return result


@solicitudes_router.get(
    "/cliente/{cliente_id}", response_model=List[SolicitudServicioRead]
)
async def get_solicitudes_by_cliente(
    cliente_id: int, db: AsyncSession = Depends(get_session)
):
    return await SolicitudServicioService.get_by_cliente(db, cliente_id)


@solicitudes_router.get(
    "/contrato/{contrato_id}", response_model=List[SolicitudServicioRead]
)
async def get_solicitudes_by_contrato(
    contrato_id: int, db: AsyncSession = Depends(get_session)
):
    return await SolicitudServicioService.get_by_contrato(db, contrato_id)


@solicitudes_router.post("", response_model=SolicitudServicioRead, status_code=201)
async def create_solicitud(
    data: SolicitudServicioCreate, db: AsyncSession = Depends(get_session)
):
    return await SolicitudServicioService.create(db, data)


@solicitudes_router.put("/{id}", response_model=SolicitudServicioRead)
async def update_solicitud(
    id: int, data: SolicitudServicioUpdate, db: AsyncSession = Depends(get_session)
):
    try:
        result = await SolicitudServicioService.update(db, id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@solicitudes_router.delete("/{id}", status_code=204)
async def delete_solicitud(id: int, db: AsyncSession = Depends(get_session)):
    if not await SolicitudServicioService.delete(db, id):
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")


# ==========================================
# ETAPAS
# ==========================================
etapas_router = APIRouter(prefix="/etapas", tags=["etapas"], redirect_slashes=False)


@etapas_router.get("/solicitud/{solicitud_id}", response_model=List[EtapaRead])
async def get_etapas_by_solicitud(
    solicitud_id: int, db: AsyncSession = Depends(get_session)
):
    return await EtapaService.get_by_solicitud(db, solicitud_id)


@etapas_router.get("/{id}", response_model=EtapaRead)
async def get_etapa(id: int, db: AsyncSession = Depends(get_session)):
    result = await EtapaService.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Etapa no encontrada")
    return result


@etapas_router.post("", response_model=EtapaRead, status_code=201)
async def create_etapa(data: EtapaCreate, db: AsyncSession = Depends(get_session)):
    return await EtapaService.create(db, data)


@etapas_router.put("/{id}", response_model=EtapaRead)
async def update_etapa(
    id: int, data: EtapaUpdate, db: AsyncSession = Depends(get_session)
):
    result = await EtapaService.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Etapa no encontrada")
    return result


@etapas_router.delete("/{id}", status_code=204)
async def delete_etapa(id: int, db: AsyncSession = Depends(get_session)):
    if not await EtapaService.delete(db, id):
        raise HTTPException(status_code=404, detail="Etapa no encontrada")


# ==========================================
# TAREAS ETAPA
# ==========================================
tareas_etapa_router = APIRouter(
    prefix="/tareas-etapa", tags=["tareas-etapa"], redirect_slashes=False
)


@tareas_etapa_router.get("/etapa/{etapa_id}", response_model=List[TareaEtapaRead])
async def get_tareas_by_etapa(etapa_id: int, db: AsyncSession = Depends(get_session)):
    return await TareaEtapaService.get_by_etapa(db, etapa_id)


@tareas_etapa_router.post("", response_model=TareaEtapaRead, status_code=201)
async def create_tarea_etapa(
    data: TareaEtapaCreate, db: AsyncSession = Depends(get_session)
):
    return await TareaEtapaService.create(db, data)


@tareas_etapa_router.put("/{id}", response_model=TareaEtapaRead)
async def update_tarea_etapa(
    id: int, data: TareaEtapaUpdate, db: AsyncSession = Depends(get_session)
):
    result = await TareaEtapaService.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return result


@tareas_etapa_router.delete("/{id}", status_code=204)
async def delete_tarea_etapa(id: int, db: AsyncSession = Depends(get_session)):
    if not await TareaEtapaService.delete(db, id):
        raise HTTPException(status_code=404, detail="Tarea no encontrada")


# ==========================================
# PERSONA ETAPA
# ==========================================
persona_etapa_router = APIRouter(
    prefix="/persona-etapa", tags=["persona-etapa"], redirect_slashes=False
)


@persona_etapa_router.get("/etapa/{etapa_id}", response_model=List[PersonaEtapaRead])
async def get_personas_by_etapa(etapa_id: int, db: AsyncSession = Depends(get_session)):
    return await PersonaEtapaService.get_by_etapa(db, etapa_id)


@persona_etapa_router.post("", response_model=PersonaEtapaRead, status_code=201)
async def create_persona_etapa(
    data: PersonaEtapaCreate, db: AsyncSession = Depends(get_session)
):
    return await PersonaEtapaService.create(db, data)


@persona_etapa_router.delete("/{etapa_id}/{persona_id}", status_code=204)
async def delete_persona_etapa(
    etapa_id: int, persona_id: int, db: AsyncSession = Depends(get_session)
):
    if not await PersonaEtapaService.delete(db, etapa_id, persona_id):
        raise HTTPException(status_code=404, detail="Registro no encontrado")


# ==========================================
# FACTURAS DE SERVICIO
# ==========================================
facturas_servicio_router = APIRouter(
    prefix="/facturas-servicio", tags=["facturas-servicio"], redirect_slashes=False
)


@facturas_servicio_router.get("", response_model=List[FacturaServicioRead])
async def get_facturas_servicio(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await FacturaServicioService.get_all(db, skip, limit)


@facturas_servicio_router.get("/{id}", response_model=FacturaServicioRead)
async def get_factura_servicio(id: int, db: AsyncSession = Depends(get_session)):
    result = await FacturaServicioService.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return result


@facturas_servicio_router.get(
    "/etapa/{etapa_id}", response_model=List[FacturaServicioRead]
)
async def get_facturas_by_etapa(etapa_id: int, db: AsyncSession = Depends(get_session)):
    return await FacturaServicioService.get_by_etapa(db, etapa_id)


@facturas_servicio_router.post("", response_model=FacturaServicioRead, status_code=201)
async def create_factura_servicio(
    data: FacturaServicioCreate, db: AsyncSession = Depends(get_session)
):
    return await FacturaServicioService.create(db, data)


@facturas_servicio_router.put("/{id}", response_model=FacturaServicioRead)
async def update_factura_servicio(
    id: int, data: FacturaServicioUpdate, db: AsyncSession = Depends(get_session)
):
    result = await FacturaServicioService.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return result


@facturas_servicio_router.delete("/{id}", status_code=204)
async def delete_factura_servicio(id: int, db: AsyncSession = Depends(get_session)):
    if not await FacturaServicioService.delete(db, id):
        raise HTTPException(status_code=404, detail="Factura no encontrada")


# ==========================================
# PAGOS FACTURA SERVICIO
# ==========================================
pagos_factura_servicio_router = APIRouter(
    prefix="/pagos-factura-servicio",
    tags=["pagos-factura-servicio"],
    redirect_slashes=False,
)


@pagos_factura_servicio_router.get(
    "/factura/{factura_id}", response_model=List[PagoFacturaServicioRead]
)
async def get_pagos_by_factura(
    factura_id: int, db: AsyncSession = Depends(get_session)
):
    return await PagoFacturaServicioService.get_by_factura(db, factura_id)


@pagos_factura_servicio_router.post(
    "", response_model=PagoFacturaServicioRead, status_code=201
)
async def create_pago_factura(
    data: PagoFacturaServicioCreate, db: AsyncSession = Depends(get_session)
):
    return await PagoFacturaServicioService.create(db, data)


@pagos_factura_servicio_router.delete("/{id}", status_code=204)
async def delete_pago_factura(id: int, db: AsyncSession = Depends(get_session)):
    if not await PagoFacturaServicioService.delete(db, id):
        raise HTTPException(status_code=404, detail="Pago no encontrado")


# ==========================================
# PERSONA LIQUIDACION
# ==========================================
persona_liquidacion_router = APIRouter(
    prefix="/persona-liquidacion", tags=["persona-liquidacion"], redirect_slashes=False
)


@persona_liquidacion_router.get("", response_model=List[PersonaLiquidacionRead])
async def get_liquidaciones(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await PersonaLiquidacionService.get_all(db, skip, limit)


@persona_liquidacion_router.get("/{id}", response_model=PersonaLiquidacionRead)
async def get_liquidacion(id: int, db: AsyncSession = Depends(get_session)):
    result = await PersonaLiquidacionService.get(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return result


@persona_liquidacion_router.post(
    "", response_model=PersonaLiquidacionRead, status_code=201
)
async def create_liquidacion(
    data: PersonaLiquidacionCreateInput, db: AsyncSession = Depends(get_session)
):
    return await PersonaLiquidacionService.create(db, data)


@persona_liquidacion_router.put("/{id}", response_model=PersonaLiquidacionRead)
async def update_liquidacion(
    id: int,
    data: PersonaLiquidacionUpdateInput,
    db: AsyncSession = Depends(get_session),
):
    result = await PersonaLiquidacionService.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return result


@persona_liquidacion_router.post(
    "/{id}/confirmar", response_model=PersonaLiquidacionRead
)
async def confirmar_liquidacion(
    id: int,
    data: PersonaLiquidacionConfirmar,
    db: AsyncSession = Depends(get_session),
):
    """Confirmar una liquidación de persona (marcar como liquidada)."""
    try:
        result = await PersonaLiquidacionService.confirmar(db, id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@persona_liquidacion_router.delete("/{id}", status_code=204)
async def delete_liquidacion(id: int, db: AsyncSession = Depends(get_session)):
    if not await PersonaLiquidacionService.delete(db, id):
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
