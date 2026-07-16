from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from src.database.connection import get_auth_session, get_session
from src.services.servicio_service import (
    ServicioService,
    SolicitudServicioService,
    EtapaService,
    TareaEtapaService,
    PersonaEtapaService,
    FacturaServicioService,
    PagoFacturaServicioService,
    PersonaLiquidacionService,
    certificacion_service,
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
    PersonaLiquidacionCreateInput,
    PersonaLiquidacionRead,
    ItemFacturaServicioRead,
    FacturaServicioWithItems,
    PersonaLiquidacionUpdateInput,
    PersonaLiquidacionConfirmar,
    FacturaPagoValidacion,
    PersonaLiquidacionValidacion,
    PagoDetalleRead,
    CertificacionCreate,
    CertificacionRead,
    CertificacionUpdate,
)
from src.utils import _get_denominacion_from_token


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
    data: ServicioCreate,
    db: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None),
):
    denominacion = await _get_denominacion_from_token(authorization)
    return await ServicioService.create(db, data, denominacion=denominacion)


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
    data: SolicitudServicioCreate,
    db: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None),
):
    denominacion = await _get_denominacion_from_token(authorization)
    return await SolicitudServicioService.create(db, data, denominacion=denominacion)


@solicitudes_router.put("/{id}", response_model=SolicitudServicioRead)
async def update_solicitud(
    id: int,
    data: SolicitudServicioUpdate,
    db: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None),
):
    try:
        denominacion = await _get_denominacion_from_token(authorization)
        result = await SolicitudServicioService.update(db, id, data, denominacion=denominacion)
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


@etapas_router.get("", response_model=List[EtapaRead])
async def get_all_etapas(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=100000),
    db: AsyncSession = Depends(get_session),
):
    return await EtapaService.get_all(db, skip=skip, limit=limit)


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


@facturas_servicio_router.get(
    "/etapa/{etapa_id}/validar-pago", response_model=FacturaPagoValidacion
)
async def validar_pago_factura_etapa(
    etapa_id: int, db: AsyncSession = Depends(get_session)
):
    return await FacturaServicioService.validar_pago_etapa(db, etapa_id)


@facturas_servicio_router.post("", response_model=FacturaServicioRead, status_code=201)
async def create_factura_servicio(
    data: FacturaServicioCreate,
    db: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None),
):
    denominacion = await _get_denominacion_from_token(authorization)
    return await FacturaServicioService.create(db, data, denominacion=denominacion)


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


@facturas_servicio_router.get(
    "/{id}/items", response_model=List[ItemFacturaServicioRead]
)
async def get_factura_servicio_items(id: int, db: AsyncSession = Depends(get_session)):
    return await FacturaServicioService.get_items(db, id)


@facturas_servicio_router.get(
    "/{id}/with-items", response_model=FacturaServicioWithItems
)
async def get_factura_servicio_with_items(
    id: int, db: AsyncSession = Depends(get_session)
):
    result = await FacturaServicioService.get_with_items(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return result


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


@persona_liquidacion_router.get(
    "/pagos/etapa/{id_etapa}",
    response_model=List[PagoDetalleRead],
)
async def get_pagos_disponibles_etapa(
    id_etapa: int, db: AsyncSession = Depends(get_session)
):
    """Obtiene los pagos disponibles de una etapa para liquidar."""
    return await PersonaLiquidacionService.get_pagos_disponibles_etapa(db, id_etapa)


@persona_liquidacion_router.get(
    "/disponible",
)
async def get_disponible_liquidar(
    id_etapa: int = Query(...),
    id_persona: int = Query(...),
    db: AsyncSession = Depends(get_session),
):
    """Obtiene el monto disponible para liquidar a una persona en una etapa."""

    disponible = await PersonaLiquidacionService.get_disponible_liquidar(
        db, id_etapa, id_persona
    )
    return {"disponible": float(disponible)}


@persona_liquidacion_router.get(
    "/validar/{id_etapa}/{id_persona}", response_model=PersonaLiquidacionValidacion
)
async def validar_liquidar_persona(
    id_etapa: int, id_persona: int, db: AsyncSession = Depends(get_session)
):
    """Valida si se puede liquidar a una persona en una etapa (verifica que la factura esté pagada)."""
    return await PersonaLiquidacionService.validar_liquidar(db, id_etapa, id_persona)


@persona_liquidacion_router.get(
    "/etapa/{id_etapa}/persona/{id_persona}",
    response_model=List[PersonaLiquidacionRead],
)
async def get_liquidaciones_by_etapa_persona(
    id_etapa: int, id_persona: int, db: AsyncSession = Depends(get_session)
):
    """Obtiene las liquidaciones de una persona en una etapa."""
    return await PersonaLiquidacionService.get_by_etapa_persona(
        db, id_etapa, id_persona
    )


@persona_liquidacion_router.get(
    "/persona/{id_persona}",
    response_model=List[PersonaLiquidacionRead],
)
async def get_liquidaciones_by_persona(
    id_persona: int, db: AsyncSession = Depends(get_session)
):
    """Obtiene todas las liquidaciones de una persona."""
    return await PersonaLiquidacionService.get_by_persona(db, id_persona)


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
    data: PersonaLiquidacionCreateInput,
    db: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None),
):
    denominacion = await _get_denominacion_from_token(authorization)
    return await PersonaLiquidacionService.create(db, data, denominacion=denominacion)


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


# ==========================================
# CERTIFICACIONES
# ==========================================
certificaciones_router = APIRouter(
    prefix="/certificaciones", tags=["certificaciones"], redirect_slashes=False
)


@certificaciones_router.get("", response_model=List[CertificacionRead])
async def get_certificaciones(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await certificacion_service.get_all(db)


@certificaciones_router.get("/etapa/{id_etapa}", response_model=List[CertificacionRead])
async def get_certificaciones_by_etapa(
    id_etapa: int, db: AsyncSession = Depends(get_session)
):
    return await certificacion_service.get_by_etapa(db, id_etapa)


@certificaciones_router.get("/{id}", response_model=CertificacionRead)
async def get_certificacion(id: int, db: AsyncSession = Depends(get_session)):
    result = await certificacion_service.get_by_id(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
    return result


@certificaciones_router.post("", response_model=CertificacionRead, status_code=201)
async def create_certificacion(
    data: CertificacionCreate, db: AsyncSession = Depends(get_session)
):
    return await certificacion_service.create(db, data)


@certificaciones_router.put("/{id}", response_model=CertificacionRead)
async def update_certificacion(
    id: int, data: CertificacionUpdate, db: AsyncSession = Depends(get_session)
):
    result = await certificacion_service.update(db, id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
    return result


@certificaciones_router.delete("/{id}", status_code=204)
async def delete_certificacion(id: int, db: AsyncSession = Depends(get_session)):
    if not await certificacion_service.delete(db, id):
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
