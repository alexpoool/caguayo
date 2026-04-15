from datetime import datetime, date
from decimal import Decimal
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
    FacturaPagoValidacion,
    PersonaLiquidacionValidacion,
    PagoDetalleRead,
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
        servicio.codigo_servicio = f"SRV-{servicio.id_servicio}"
        await db.commit()
        await db.refresh(servicio)
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

        aprobado = getattr(data, "aprobado", None)
        id_contrato = getattr(data, "id_contrato", None)
        if aprobado and id_contrato and not s.codigo_proyecto:
            anno = datetime.now().year - 2000
            data.codigo_proyecto = f"PROY-{anno:02d}-{id}"

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

        data.monto = (data.cantidad or Decimal("0")) * (data.precio or Decimal("0"))

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

        if data.cantidad is not None and data.precio is not None:
            data.monto = data.cantidad * data.precio
        elif data.cantidad is not None and f.precio:
            data.monto = data.cantidad * f.precio
        elif data.precio is not None and f.cantidad:
            data.monto = f.cantidad * data.precio

        updated = await factura_servicio_repo.update(db, db_obj=f, obj_in=data)
        return FacturaServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await factura_servicio_repo.remove(db, id=id)
        return obj is not None

    @staticmethod
    async def validar_pago_etapa(
        db: AsyncSession, id_etapa: int
    ) -> FacturaPagoValidacion:
        factura = await factura_servicio_repo.get_by_etapa_with_pagos(db, id_etapa)

        if not factura:
            return FacturaPagoValidacion(
                id_factura_servicio=None,
                codigo_factura=None,
                monto=Decimal("0.00"),
                monto_pagado=Decimal("0.00"),
                saldo=Decimal("0.00"),
                esta_pagada=False,
                pagos=[],
            )

        monto_pagado = sum((pago.monto or Decimal("0")) for pago in factura.pagos)
        monto = factura.monto or Decimal("0")
        saldo = monto - monto_pagado

        pagos_detalle = [
            PagoDetalleRead(
                id_pago_factura_servicio=p.id_pago_factura_servicio,
                monto=p.monto or Decimal("0"),
                fecha=p.fecha,
                doc_traza=p.doc_traza,
                doc_factura=p.doc_factura,
            )
            for p in factura.pagos
        ]

        return FacturaPagoValidacion(
            id_factura_servicio=factura.id_factura_servicio,
            codigo_factura=factura.codigo_factura,
            monto=monto,
            monto_pagado=monto_pagado,
            saldo=saldo,
            esta_pagada=saldo <= 0,
            pagos=pagos_detalle,
        )


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
        validacion = await PersonaLiquidacionService.validar_liquidar(
            db, data.id_etapa, data.id_persona
        )

        if not validacion.puede_liquidar:
            raise ValueError(
                validacion.mensaje or "No se puede liquidar: factura no pagada"
            )

        from decimal import Decimal

        importe = Decimal("0")
        statement = select(PersonaEtapa).where(
            PersonaEtapa.id_etapa == data.id_etapa,
            PersonaEtapa.id_persona == data.id_persona,
        )
        result = await db.exec(statement)
        persona_etapa = result.first()
        if persona_etapa and persona_etapa.cobro:
            importe = Decimal(str(persona_etapa.cobro))

        porcentaje_caguayo = Decimal(str(data.porcentaje_caguayo or 10))
        importe_caguayo = importe * (porcentaje_caguayo / 100)
        devengado = importe - importe_caguayo

        tributario = Decimal(str(data.tributario or 5))
        tributario_monto = devengado * (tributario / 100)
        subtotal = devengado - tributario_monto

        gasto_empresa = Decimal(str(data.gasto_empresa or 0))
        comision = Decimal(str(data.comision_bancaria or 0))
        neto_pagar = subtotal - gasto_empresa - comision

        liquidacion_data = PersonaLiquidacionCreate(
            numero=data.numero,
            id_etapa=data.id_etapa,
            id_persona=data.id_persona,
            fecha_emision=data.fecha_emision,
            fecha_liquidacion=data.fecha_liquidacion,
            descripcion=data.descripcion,
            id_moneda=data.id_moneda,
            tipo_pago=data.tipo_pago,
            importe=importe,
            porcentaje_caguayo=porcentaje_caguayo,
            importe_caguayo=importe_caguayo,
            devengado=devengado,
            tributario=tributario,
            tributario_monto=tributario_monto,
            comision_bancaria=Decimal(str(data.comision_bancaria or 0)),
            gasto_empresa=Decimal(str(data.gasto_empresa or 0)),
            neto_pagar=neto_pagar,
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
        from decimal import Decimal

        l = await persona_liquidacion_repo.get(db, id)
        if not l:
            return None

        importe = l.importe or Decimal("0")

        porcentaje_caguayo = (
            Decimal(str(data.porcentaje_caguayo))
            if data.porcentaje_caguayo is not None
            else (l.porcentaje_caguayo or Decimal("10"))
        )
        importe_caguayo = importe * (porcentaje_caguayo / 100)
        devengado = importe - importe_caguayo

        tributario = (
            Decimal(str(data.tributario))
            if data.tributario is not None
            else (l.tributario or Decimal("5"))
        )
        tributario_monto = devengado * (tributario / 100)
        subtotal = devengado - tributario_monto

        gasto_empresa = (
            Decimal(str(data.gasto_empresa))
            if data.gasto_empresa is not None
            else (l.gasto_empresa or Decimal("0"))
        )
        comision = (
            Decimal(str(data.comision_bancaria))
            if data.comision_bancaria is not None
            else (l.comision_bancaria or Decimal("0"))
        )
        neto_pagar = subtotal - gasto_empresa - comision

        update_data = PersonaLiquidacionUpdate(
            numero=data.numero,
            id_etapa=data.id_etapa,
            id_persona=data.id_persona,
            fecha_emision=data.fecha_emision,
            fecha_liquidacion=data.fecha_liquidacion,
            descripcion=data.descripcion,
            id_moneda=data.id_moneda,
            tipo_pago=data.tipo_pago,
            porcentaje_caguayo=porcentaje_caguayo,
            importe_caguayo=importe_caguayo,
            devengado=devengado,
            tributario=tributario,
            tributario_monto=tributario_monto,
            comision_bancaria=data.comision_bancaria,
            gasto_empresa=data.gasto_empresa,
            neto_pagar=neto_pagar,
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

        if l.confirmado:
            raise ValueError("La liquidación ya está confirmada")

        validacion = await PersonaLiquidacionService.validar_liquidar(
            db, l.id_etapa, l.id_persona
        )

        if not validacion.puede_liquidar:
            raise ValueError(
                validacion.mensaje or "No se puede confirmar: factura no pagada"
            )

        if data.porcentaje_caguayo is not None:
            l.porcentaje_caguayo = Decimal(str(data.porcentaje_caguayo))
        if data.tributario is not None:
            l.tributario = Decimal(str(data.tributario))
        if data.gasto_empresa is not None:
            l.gasto_empresa = Decimal(str(data.gasto_empresa))
        if data.comision_bancaria is not None:
            l.comision_bancaria = Decimal(str(data.comision_bancaria))

        importe = l.importe or Decimal("0")
        porcentaje_caguayo = l.porcentaje_caguayo or Decimal("10")
        l.importe_caguayo = importe * (porcentaje_caguayo / 100)
        l.devengado = importe - l.importe_caguayo

        tributario = l.tributario or Decimal("5")
        l.tributario_monto = l.devengado * (tributario / 100)
        subtotal = l.devengado - l.tributario_monto

        gasto_empresa = l.gasto_empresa or Decimal("0")
        comision = l.comision_bancaria or Decimal("0")
        l.neto_pagar = subtotal - gasto_empresa - comision

        l.confirmado = True

        if data.observaciones:
            l.observacion = data.observaciones

        db.add(l)
        await db.commit()
        await db.refresh(l)
        return PersonaLiquidacionRead(**l.model_dump())

    @staticmethod
    async def validar_liquidar(
        db: AsyncSession, id_etapa: int, id_persona: int
    ) -> PersonaLiquidacionValidacion:
        from decimal import Decimal

        validacion_factura = await FacturaServicioService.validar_pago_etapa(
            db, id_etapa
        )

        mensaje = None
        puede_liquidar = True

        if not validacion_factura.id_factura_servicio:
            puede_liquidar = False
            mensaje = "No existe factura para esta etapa"
        elif not validacion_factura.esta_pagada:
            puede_liquidar = False
            mensaje = f"Factura no pagada. Saldo pendiente: {validacion_factura.saldo}"

        return PersonaLiquidacionValidacion(
            puede_liquidar=puede_liquidar,
            id_etapa=id_etapa,
            id_persona=id_persona,
            factura=validacion_factura,
            mensaje=mensaje,
        )

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        obj = await persona_liquidacion_repo.remove(db, id=id)
        return obj is not None

    @staticmethod
    async def get_by_etapa_persona(
        db: AsyncSession, id_etapa: int, id_persona: int
    ) -> List[PersonaLiquidacionRead]:
        items = await persona_liquidacion_repo.get_by_etapa_persona(
            db, id_etapa, id_persona
        )
        return [PersonaLiquidacionRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get_by_persona(
        db: AsyncSession, id_persona: int
    ) -> List[PersonaLiquidacionRead]:
        items = await persona_liquidacion_repo.get_by_persona(db, id_persona)
        return [PersonaLiquidacionRead(**i.model_dump()) for i in items]
