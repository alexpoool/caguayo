from datetime import datetime, date
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
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
from src.repository.servicio_repo import (
    servicio_repo,
    solicitud_servicio_repo,
    etapa_repo,
    tarea_etapa_repo,
    persona_etapa_repo,
    factura_servicio_repo,
    pago_factura_servicio_repo,
    persona_liquidacion_repo,
)


class ServicioService:
    @staticmethod
    async def create(db: AsyncSession, data: ServicioCreate) -> ServicioRead:
        servicio = await servicio_repo.create(db, obj_in=data)
        return ServicioRead(**servicio.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ServicioRead]:
        servicios = await servicio_repo.get_multi(db, skip=skip, limit=limit)
        return [ServicioRead(**s.model_dump()) for s in servicios]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> ServicioRead:
        s = await servicio_repo.get(db, id)
        return ServicioRead(**s.model_dump()) if s else None

    @staticmethod
    async def update(db: AsyncSession, id: int, data: ServicioUpdate) -> ServicioRead:
        s = await servicio_repo.get(db, id)
        if not s:
            return None
        updated = await servicio_repo.update(db, db_obj=s, obj_in=data)
        return ServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await servicio_repo.remove(db, id=id)
        return obj is not None


class SolicitudServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: SolicitudServicioCreate
    ) -> SolicitudServicioRead:
        s = await solicitud_servicio_repo.create(db, obj_in=data)
        year_offset = s.fecha_solicitud.year - 2000
        s.codigo_solicitud = f"SOL-{year_offset}-{s.id_solicitud_servicio}"
        await db.commit()
        await db.refresh(s)
        return SolicitudServicioRead(**s.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[SolicitudServicioRead]:
        items = await solicitud_servicio_repo.get_all_with_details(db, skip, limit)
        return [SolicitudServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> SolicitudServicioRead:
        s = await solicitud_servicio_repo.get(db, id)
        return SolicitudServicioRead(**s.model_dump()) if s else None

    @staticmethod
    async def get_by_cliente(
        db: AsyncSession, id_cliente: int
    ) -> List[SolicitudServicioRead]:
        items = await solicitud_servicio_repo.get_by_cliente(db, id_cliente)
        return [SolicitudServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get_by_contrato(
        db: AsyncSession, id_contrato: int
    ) -> List[SolicitudServicioRead]:
        items = await solicitud_servicio_repo.get_by_contrato(db, id_contrato)
        return [SolicitudServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: SolicitudServicioUpdate
    ) -> SolicitudServicioRead:
        s = await solicitud_servicio_repo.get(db, id)
        if not s:
            return None

        new_estado = data.estado if hasattr(data, "estado") and data.estado else None
        if new_estado in ("TERMINADA", "CANCELADA") and s.estado != "EN PROCESO":
            raise ValueError(
                f"No se puede cambiar a '{new_estado}' porque la solicitud no está en estado 'EN PROCESO'"
            )

        updated = await solicitud_servicio_repo.update(db, db_obj=s, obj_in=data)
        return SolicitudServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await solicitud_servicio_repo.remove(db, id=id)
        return obj is not None


class EtapaService:
    @staticmethod
    async def create(db: AsyncSession, data: EtapaCreate) -> EtapaRead:
        if not data.numero_etapa:
            existentes = await etapa_repo.get_by_solicitud(
                db, data.id_solicitud_servicio
            )
            data.numero_etapa = len(existentes) + 1

        e = await etapa_repo.create(db, obj_in=data)
        return EtapaRead(**e.model_dump())

    @staticmethod
    async def get_by_solicitud(db: AsyncSession, id_solicitud: int) -> List[EtapaRead]:
        items = await etapa_repo.get_by_solicitud(db, id_solicitud)
        return [EtapaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> EtapaRead:
        e = await etapa_repo.get(db, id)
        return EtapaRead(**e.model_dump()) if e else None

    @staticmethod
    async def update(db: AsyncSession, id: int, data: EtapaUpdate) -> EtapaRead:
        e = await etapa_repo.get(db, id)
        if not e:
            return None
        updated = await etapa_repo.update(db, db_obj=e, obj_in=data)
        return EtapaRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await etapa_repo.remove(db, id=id)
        return obj is not None


class TareaEtapaService:
    @staticmethod
    async def create(db: AsyncSession, data: TareaEtapaCreate) -> TareaEtapaRead:
        if not data.codigo_extendido:
            etapa = await etapa_repo.get(db, data.id_etapa)
            if etapa:
                codigo_sol = (
                    etapa.solicitud.codigo_solicitud if etapa.solicitud else None
                ) or f"SOL-{etapa.id_solicitud_servicio}"
                codigo_eta = f"ETAPA-{etapa.numero_etapa}"
                codigo_serv = f"SERV-{data.id_servicio}" if data.id_servicio else "SERV"
                data.codigo_extendido = f"TE-{codigo_sol}-{codigo_eta}-{codigo_serv}"

        t = await tarea_etapa_repo.create(db, obj_in=data)
        return TareaEtapaRead(**t.model_dump())

    @staticmethod
    async def get_by_etapa(db: AsyncSession, id_etapa: int) -> List[TareaEtapaRead]:
        items = await tarea_etapa_repo.get_by_etapa(db, id_etapa)
        return [TareaEtapaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TareaEtapaUpdate
    ) -> TareaEtapaRead:
        t = await tarea_etapa_repo.get(db, id)
        if not t:
            return None
        updated = await tarea_etapa_repo.update(db, db_obj=t, obj_in=data)
        return TareaEtapaRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await tarea_etapa_repo.remove(db, id=id)
        return obj is not None


class PersonaEtapaService:
    @staticmethod
    async def create(db: AsyncSession, data: PersonaEtapaCreate) -> PersonaEtapaRead:
        pe = await persona_etapa_repo.create(db, obj_in=data)
        return PersonaEtapaRead(**pe.model_dump())

    @staticmethod
    async def get_by_etapa(db: AsyncSession, id_etapa: int) -> List[PersonaEtapaRead]:
        items = await persona_etapa_repo.get_by_etapa(db, id_etapa)
        return [PersonaEtapaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def delete(db: AsyncSession, id_etapa: int, id_persona: int) -> bool:
        obj = await persona_etapa_repo.remove(db, id=(id_etapa, id_persona))
        return obj is not None


class FacturaServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: FacturaServicioCreate
    ) -> FacturaServicioRead:
        if not data.codigo_factura:
            year = datetime.now().year
            last = await factura_servicio_repo.get_last_by_year(db, year)
            if last and last.codigo_factura:
                try:
                    last_num = int(last.codigo_factura.split("-")[-1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            data.codigo_factura = f"FAC-{year}-{new_num:04d}"

        f = await factura_servicio_repo.create(db, obj_in=data)
        return FacturaServicioRead(**f.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[FacturaServicioRead]:
        items = await factura_servicio_repo.get_all_with_details(db, skip, limit)
        return [FacturaServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> FacturaServicioRead:
        f = await factura_servicio_repo.get(db, id)
        return FacturaServicioRead(**f.model_dump()) if f else None

    @staticmethod
    async def get_by_etapa(
        db: AsyncSession, id_etapa: int
    ) -> List[FacturaServicioRead]:
        items = await factura_servicio_repo.get_by_etapa(db, id_etapa)
        return [FacturaServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: FacturaServicioUpdate
    ) -> FacturaServicioRead:
        f = await factura_servicio_repo.get(db, id)
        if not f:
            return None
        updated = await factura_servicio_repo.update(db, db_obj=f, obj_in=data)
        return FacturaServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await factura_servicio_repo.remove(db, id=id)
        return obj is not None


class PagoFacturaServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: PagoFacturaServicioCreate
    ) -> PagoFacturaServicioRead:
        p = await pago_factura_servicio_repo.create(db, obj_in=data)
        return PagoFacturaServicioRead(**p.model_dump())

    @staticmethod
    async def get_by_factura(
        db: AsyncSession, id_factura: int
    ) -> List[PagoFacturaServicioRead]:
        items = await pago_factura_servicio_repo.get_by_factura(db, id_factura)
        return [PagoFacturaServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await pago_factura_servicio_repo.remove(db, id=id)
        return obj is not None


class PersonaLiquidacionService:
    @staticmethod
    async def create(
        db: AsyncSession, data: PersonaLiquidacionCreateInput
    ) -> PersonaLiquidacionRead:
        importe = 0
        statement = select(PersonaEtapa).where(
            PersonaEtapa.id_etapa == data.id_etapa,
            PersonaEtapa.id_persona == data.id_persona,
        )
        result = await db.exec(statement)
        persona_etapa = result.first()
        if persona_etapa:
            importe = float(persona_etapa.cobro) if persona_etapa.cobro else 0

        devengado = float(data.gasto_empresa or 0) - float(data.comision_bancaria or 0)
        tributario = float(data.tributario or 0)
        neto_pagar = devengado * (100 - tributario) / 100 if devengado > 0 else 0

        from decimal import Decimal

        liquidacion_data = PersonaLiquidacionCreate(
            numero=data.numero,
            id_etapa=data.id_etapa,
            id_persona=data.id_persona,
            fecha_emision=data.fecha_emision,
            fecha_liquidacion=data.fecha_liquidacion,
            descripcion=data.descripcion,
            id_moneda=data.id_moneda,
            importe=Decimal(str(importe)),
            devengado=Decimal(str(devengado)),
            tributario=Decimal(str(tributario)),
            comision_bancaria=data.comision_bancaria,
            neto_pagar=Decimal(str(neto_pagar)),
            gasto_empresa=data.gasto_empresa,
            doc_pago_liquidacion=data.doc_pago_liquidacion,
            observacion=data.observacion,
        )

        if not liquidacion_data.numero:
            year = datetime.now().year
            last = await persona_liquidacion_repo.get_last_by_year(db, year)
            if last and last.numero:
                try:
                    last_num = int(last.numero.split("-")[-1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            liquidacion_data.numero = f"LIQ-{year}-{new_num:04d}"

        l = await persona_liquidacion_repo.create(db, obj_in=liquidacion_data)
        return PersonaLiquidacionRead(**l.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[PersonaLiquidacionRead]:
        items = await persona_liquidacion_repo.get_all_with_details(db, skip, limit)
        return [PersonaLiquidacionRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> PersonaLiquidacionRead:
        l = await persona_liquidacion_repo.get(db, id)
        return PersonaLiquidacionRead(**l.model_dump()) if l else None

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: PersonaLiquidacionUpdateInput
    ) -> PersonaLiquidacionRead:
        l = await persona_liquidacion_repo.get(db, id)
        if not l:
            return None

        gasto_empresa = (
            float(data.gasto_empresa)
            if data.gasto_empresa is not None
            else float(l.gasto_empresa or 0)
        )
        comision_bancaria = (
            float(data.comision_bancaria)
            if data.comision_bancaria is not None
            else float(l.comision_bancaria or 0)
        )
        tributario = (
            float(data.tributario)
            if data.tributario is not None
            else float(l.tributario or 0)
        )

        devengado = gasto_empresa - comision_bancaria
        neto_pagar = devengado * (100 - tributario) / 100 if devengado > 0 else 0

        from decimal import Decimal

        update_data = PersonaLiquidacionUpdate(
            numero=data.numero,
            id_etapa=data.id_etapa,
            id_persona=data.id_persona,
            fecha_emision=data.fecha_emision,
            fecha_liquidacion=data.fecha_liquidacion,
            descripcion=data.descripcion,
            id_moneda=data.id_moneda,
            devengado=Decimal(str(devengado))
            if data.gasto_empresa is not None or data.comision_bancaria is not None
            else None,
            tributario=data.tributario,
            comision_bancaria=data.comision_bancaria,
            neto_pagar=Decimal(str(neto_pagar))
            if data.gasto_empresa is not None
            or data.comision_bancaria is not None
            or data.tributario is not None
            else None,
            gasto_empresa=data.gasto_empresa,
            doc_pago_liquidacion=data.doc_pago_liquidacion,
            observacion=data.observacion,
        )

        updated = await persona_liquidacion_repo.update(
            db, db_obj=l, obj_in=update_data
        )
        return PersonaLiquidacionRead(**updated.model_dump())

    @staticmethod
    async def confirmar(
        db: AsyncSession, liquidacion_id: int, data: "PersonaLiquidacionConfirmar"
    ) -> Optional[PersonaLiquidacionRead]:
        from datetime import date
        from decimal import Decimal

        l = await persona_liquidacion_repo.get(db, liquidacion_id)
        if not l:
            return None

        if l.fecha_liquidacion:
            raise ValueError("La liquidación ya está confirmada")

        if data.devengado is not None:
            l.devengado = data.devengado
        if data.tributario is not None:
            l.tributario = data.tributario
        if data.comision_bancaria is not None:
            l.comision_bancaria = data.comision_bancaria
        if data.gasto_empresa is not None:
            l.gasto_empresa = data.gasto_empresa

        devengado = float(l.gasto_empresa or 0) - float(l.comision_bancaria or 0)
        tributario = float(l.tributario or 0)
        l.neto_pagar = (
            Decimal(str(devengado * (100 - tributario) / 100))
            if devengado > 0
            else Decimal("0")
        )

        l.fecha_liquidacion = date.today()

        if data.observaciones:
            l.observacion = data.observaciones

        db.add(l)
        await db.commit()
        await db.refresh(l)
        return PersonaLiquidacionRead(**l.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await persona_liquidacion_repo.remove(db, id=id)
        return obj is not None
