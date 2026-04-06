from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
from src.models.servicio import (
    Servicio,
    SolicitudServicio,
    Etapa,
    TareaEtapa,
    PersonaEtapa,
    FacturaServicio,
    PagoFacturaServicio,
    PersonaLiquidacion,
)
from src.dto.servicio_dto import (
    ServicioCreate,
    ServicioUpdate,
    SolicitudServicioCreate,
    SolicitudServicioUpdate,
    EtapaCreate,
    EtapaUpdate,
    TareaEtapaCreate,
    TareaEtapaUpdate,
    PersonaEtapaCreate,
    PersonaEtapaUpdate,
    FacturaServicioCreate,
    FacturaServicioUpdate,
    PagoFacturaServicioCreate,
    PersonaLiquidacionCreate,
    PersonaLiquidacionUpdate,
)
from src.repository.base import CRUDBase


# ==========================================
# SERVICIOS
# ==========================================
servicio_repo = CRUDBase[Servicio, ServicioCreate, ServicioUpdate](Servicio)


# ==========================================
# SOLICITUD SERVICIO
# ==========================================
class SolicitudServicioRepository(
    CRUDBase[SolicitudServicio, SolicitudServicioCreate, SolicitudServicioUpdate]
):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[SolicitudServicio]:
        statement = (
            select(SolicitudServicio)
            .offset(skip)
            .limit(limit)
            .order_by(SolicitudServicio.id_solicitud_servicio.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_cliente(
        self, db: AsyncSession, id_cliente: int
    ) -> List[SolicitudServicio]:
        statement = (
            select(SolicitudServicio)
            .where(SolicitudServicio.id_cliente == id_cliente)
            .order_by(SolicitudServicio.id_solicitud_servicio.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_contrato(
        self, db: AsyncSession, id_contrato: int
    ) -> List[SolicitudServicio]:
        statement = (
            select(SolicitudServicio)
            .where(SolicitudServicio.id_contrato == id_contrato)
            .order_by(SolicitudServicio.id_solicitud_servicio.desc())
        )
        results = await db.exec(statement)
        return results.all()


solicitud_servicio_repo = SolicitudServicioRepository(SolicitudServicio)


# ==========================================
# ETAPAS
# ==========================================
class EtapaRepository(CRUDBase[Etapa, EtapaCreate, EtapaUpdate]):
    async def get(self, db: AsyncSession, id: int) -> Optional[Etapa]:
        statement = (
            select(Etapa)
            .options(selectinload(Etapa.solicitud))
            .where(Etapa.id_etapa == id)
        )
        result = await db.exec(statement)
        return result.first()

    async def get_by_solicitud(
        self, db: AsyncSession, id_solicitud: int
    ) -> List[Etapa]:
        statement = (
            select(Etapa)
            .where(Etapa.id_solicitud_servicio == id_solicitud)
            .order_by(Etapa.numero_etapa)
        )
        results = await db.exec(statement)
        return results.all()


etapa_repo = EtapaRepository(Etapa)


# ==========================================
# TAREAS ETAPA
# ==========================================
class TareaEtapaRepository(CRUDBase[TareaEtapa, TareaEtapaCreate, TareaEtapaUpdate]):
    async def get_by_etapa(self, db: AsyncSession, id_etapa: int) -> List[TareaEtapa]:
        statement = (
            select(TareaEtapa)
            .where(TareaEtapa.id_etapa == id_etapa)
            .order_by(TareaEtapa.id_tarea_etapa)
        )
        results = await db.exec(statement)
        return results.all()


tarea_etapa_repo = TareaEtapaRepository(TareaEtapa)


# ==========================================
# PERSONA ETAPA
# ==========================================
class PersonaEtapaRepository(
    CRUDBase[PersonaEtapa, PersonaEtapaCreate, PersonaEtapaUpdate]
):
    async def get_by_etapa(self, db: AsyncSession, id_etapa: int) -> List[PersonaEtapa]:
        statement = select(PersonaEtapa).where(PersonaEtapa.id_etapa == id_etapa)
        results = await db.exec(statement)
        return results.all()


persona_etapa_repo = PersonaEtapaRepository(PersonaEtapa)


# ==========================================
# FACTURA SERVICIO
# ==========================================
class FacturaServicioRepository(
    CRUDBase[FacturaServicio, FacturaServicioCreate, FacturaServicioUpdate]
):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[FacturaServicio]:
        statement = (
            select(FacturaServicio)
            .offset(skip)
            .limit(limit)
            .order_by(FacturaServicio.id_factura_servicio.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_etapa(
        self, db: AsyncSession, id_etapa: int
    ) -> List[FacturaServicio]:
        statement = (
            select(FacturaServicio)
            .where(FacturaServicio.id_etapa == id_etapa)
            .order_by(FacturaServicio.id_factura_servicio.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_last_by_year(
        self, db: AsyncSession, year: int
    ) -> Optional[FacturaServicio]:
        prefix = f"FAC-{year}-"
        statement = (
            select(FacturaServicio)
            .where(FacturaServicio.codigo_factura.like(f"{prefix}%"))
            .order_by(FacturaServicio.codigo_factura.desc())
            .limit(1)
        )
        results = await db.exec(statement)
        return results.one_or_none()


factura_servicio_repo = FacturaServicioRepository(FacturaServicio)


# ==========================================
# PAGO FACTURA SERVICIO
# ==========================================
class PagoFacturaServicioRepository(
    CRUDBase[PagoFacturaServicio, PagoFacturaServicioCreate, PagoFacturaServicio]
):
    async def get_by_factura(
        self, db: AsyncSession, id_factura: int
    ) -> List[PagoFacturaServicio]:
        statement = (
            select(PagoFacturaServicio)
            .where(PagoFacturaServicio.id_factura_servicio == id_factura)
            .order_by(PagoFacturaServicio.fecha.desc())
        )
        results = await db.exec(statement)
        return results.all()


pago_factura_servicio_repo = PagoFacturaServicioRepository(PagoFacturaServicio)


# ==========================================
# PERSONA LIQUIDACION
# ==========================================
class PersonaLiquidacionRepository(
    CRUDBase[PersonaLiquidacion, PersonaLiquidacionCreate, PersonaLiquidacionUpdate]
):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[PersonaLiquidacion]:
        statement = (
            select(PersonaLiquidacion)
            .offset(skip)
            .limit(limit)
            .order_by(PersonaLiquidacion.id_liquidacion.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_persona(
        self, db: AsyncSession, id_persona: int
    ) -> List[PersonaLiquidacion]:
        statement = (
            select(PersonaLiquidacion)
            .where(PersonaLiquidacion.id_persona == id_persona)
            .order_by(PersonaLiquidacion.id_liquidacion.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_last_by_year(
        self, db: AsyncSession, year: int
    ) -> Optional[PersonaLiquidacion]:
        prefix = f"LIQ-{year}-"
        statement = (
            select(PersonaLiquidacion)
            .where(PersonaLiquidacion.numero.like(f"{prefix}%"))
            .order_by(PersonaLiquidacion.numero.desc())
            .limit(1)
        )
        results = await db.exec(statement)
        return results.one_or_none()


persona_liquidacion_repo = PersonaLiquidacionRepository(PersonaLiquidacion)
