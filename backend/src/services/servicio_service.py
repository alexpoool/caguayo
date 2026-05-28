from datetime import datetime, date
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy import text
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
    Certificacion,
    ItemFacturaServicio,
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
    CertificacionCreate,
    CertificacionRead,
    CertificacionUpdate,
    ItemFacturaServicioCreate,
    ItemFacturaServicioRead,
    FacturaServicioWithItems,
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
    item_factura_servicio_repo,
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
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 10000) -> List[EtapaRead]:
        items = await etapa_repo.get_multi(db, skip=skip, limit=limit)
        return [EtapaRead(**i.model_dump()) for i in items]

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
        if data.por_cobrar is None or data.por_cobrar == Decimal("0"):
            data.por_cobrar = data.cobro
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
        etapa = None
        if data.id_etapa:
            etapa = await etapa_repo.get(db, data.id_etapa)
            if etapa and etapa.tipo_etapa == "CERTIFICACIONES":
                stmt = select(Certificacion).where(Certificacion.id_etapa == etapa.id_etapa)
                result = await db.exec(stmt)
                existing_certs = result.all()
                if not existing_certs:
                    raise Exception("No hay certificaciones registradas para esta etapa")
                if not data.id_certificacion:
                    raise Exception("Para facturas de etapas de certificaciones debe seleccionar una certificación")
            elif etapa:
                tareas = await tarea_etapa_repo.get_by_etapa(db, etapa.id_etapa)
                if not tareas:
                    raise Exception("No hay tareas registradas para esta etapa")

        if data.id_certificacion:
            stmt = select(Certificacion).where(Certificacion.id_certificacion == data.id_certificacion)
            result = await db.exec(stmt)
            certificacion = result.first()

            if not certificacion:
                raise Exception("La certificación seleccionada no existe")

            if certificacion.facturado:
                raise Exception("La certificación ya está facturada")

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

        tareas_seleccionadas = data.tareas_seleccionadas or []
        data.tareas_seleccionadas = None
        tarea_modifiers = data.tarea_modifiers or {}
        data.tarea_modifiers = None
        certificacion_ajuste_porciento = data.ajuste_porciento
        data.ajuste_porciento = None
        certificacion_ajuste_valor = data.ajuste_valor
        data.ajuste_valor = None

        if data.id_certificacion:
            data.importe = certificacion.a_cobrar
        else:
            importe_total = Decimal("0")
            if tareas_seleccionadas:
                for tarea_id in tareas_seleccionadas:
                    tarea = await tarea_etapa_repo.get(db, tarea_id)
                    if tarea:
                        modifier = tarea_modifiers.get(str(tarea_id))
                        if modifier:
                            cant = Decimal(str(modifier.get("cantidad", 0)))
                            prec = Decimal(str(modifier.get("precio", 0)))
                        else:
                            cant = tarea.cantidad or Decimal("0")
                            prec = tarea.precio_ajustado or Decimal("0")
                        importe_total += cant * prec
            data.importe = importe_total

        if etapa and data.importe > etapa.valor:
            raise Exception(f"El importe de la factura ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})")

        data.pagado = Decimal("0")

        f = await factura_servicio_repo.create(db, obj_in=data)
        
        await db.commit()
        
        result = await db.exec(text("SELECT MAX(id_factura_servicio) FROM factura_servicio"))
        f_id = result.scalar_one_or_none()
        
        if f_id is None:
            raise Exception("No se pudo obtener el ID de la factura creada")
        
        f = await factura_servicio_repo.get(db, f_id)

        if data.id_certificacion and (certificacion_ajuste_porciento is not None or certificacion_ajuste_valor is not None):
            stmt = select(Certificacion).where(Certificacion.id_certificacion == data.id_certificacion)
            result = await db.exec(stmt)
            cert = result.first()
            if cert:
                if certificacion_ajuste_porciento is not None:
                    cert.ajuste_porciento = certificacion_ajuste_porciento
                if certificacion_ajuste_valor is not None:
                    cert.ajuste_valor = certificacion_ajuste_valor
                await db.commit()
                await db.refresh(cert)

        if tareas_seleccionadas:
            for tarea_id in tareas_seleccionadas:
                tarea = await tarea_etapa_repo.get(db, tarea_id)
                if tarea:
                    modifier = tarea_modifiers.get(str(tarea_id))
                    if modifier:
                        cant = Decimal(str(modifier.get("cantidad", 0)))
                        prec = Decimal(str(modifier.get("precio", 0)))
                        ajuste_pct = Decimal(str(modifier.get("ajuste_porciento", 0)))
                        ajuste_val = Decimal(str(modifier.get("ajuste_valor", 0)))
                    else:
                        cant = tarea.cantidad or Decimal("0")
                        prec = tarea.precio_ajustado or Decimal("0")
                        ajuste_pct = Decimal("0.00")
                        ajuste_val = Decimal("0.00")
                    item_data = ItemFacturaServicioCreate(
                        id_factura_servicio=f_id,
                        id_tarea_etapa=tarea_id,
                        codigo_extendido=tarea.codigo_extendido,
                        concepto=tarea.concepto_modificado,
                        unidad_medida=tarea.unidad_medida,
                        cantidad=cant,
                        precio=prec,
                        ajuste_porciento=ajuste_pct,
                        ajuste_valor=ajuste_val,
                    )
                    await item_factura_servicio_repo.create(db, obj_in=item_data)

                    tarea.facturada = True

            await db.commit()

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

        tareas_seleccionadas = data.tareas_seleccionadas
        data.tareas_seleccionadas = None
        tarea_modifiers = data.tarea_modifiers or {}
        data.tarea_modifiers = None
        update_ajuste_porciento = data.ajuste_porciento
        data.ajuste_porciento = None
        update_ajuste_valor = data.ajuste_valor
        data.ajuste_valor = None

        if tareas_seleccionadas is not None:
            existing_items = await item_factura_servicio_repo.get_by_factura(db, id)
            for item in existing_items:
                tarea = await tarea_etapa_repo.get(db, item.id_tarea_etapa)
                if tarea:
                    tarea.facturada = False
                    await db.commit()
                    await db.refresh(tarea)
                await db.delete(item)
            await db.commit()

            importe_total = Decimal("0")
            for tarea_id in tareas_seleccionadas:
                tarea = await tarea_etapa_repo.get(db, tarea_id)
                if tarea:
                    modifier = tarea_modifiers.get(str(tarea_id))
                    if modifier:
                        cant = Decimal(str(modifier.get("cantidad", 0)))
                        prec = Decimal(str(modifier.get("precio", 0)))
                        ajuste_pct = Decimal(str(modifier.get("ajuste_porciento", 0)))
                        ajuste_val = Decimal(str(modifier.get("ajuste_valor", 0)))
                    else:
                        cant = tarea.cantidad or Decimal("0")
                        prec = tarea.precio_ajustado or Decimal("0")
                        ajuste_pct = Decimal("0.00")
                        ajuste_val = Decimal("0.00")
                    item_data = ItemFacturaServicioCreate(
                        id_factura_servicio=id,
                        id_tarea_etapa=tarea_id,
                        codigo_extendido=tarea.codigo_extendido,
                        concepto=tarea.concepto_modificado,
                        unidad_medida=tarea.unidad_medida,
                        cantidad=cant,
                        precio=prec,
                        ajuste_porciento=ajuste_pct,
                        ajuste_valor=ajuste_val,
                    )
                    await item_factura_servicio_repo.create(db, obj_in=item_data)

                    tarea.facturada = True
                    await db.commit()
                    await db.refresh(tarea)

                    importe_total += cant * prec

            data.importe = importe_total

            if f.id_etapa:
                etapa = await etapa_repo.get(db, f.id_etapa)
                if etapa and data.importe > etapa.valor:
                    raise Exception(f"El importe de la factura ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})")

        if f.id_certificacion and (update_ajuste_porciento is not None or update_ajuste_valor is not None):
            stmt = select(Certificacion).where(Certificacion.id_certificacion == f.id_certificacion)
            result = await db.exec(stmt)
            cert = result.first()
            if cert:
                if update_ajuste_porciento is not None:
                    cert.ajuste_porciento = update_ajuste_porciento
                if update_ajuste_valor is not None:
                    cert.ajuste_valor = update_ajuste_valor
                await db.commit()
                await db.refresh(cert)

        updated = await factura_servicio_repo.update(db, db_obj=f, obj_in=data)
        return FacturaServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        existing_items = await item_factura_servicio_repo.get_by_factura(db, id)
        for item in existing_items:
            tarea = await tarea_etapa_repo.get(db, item.id_tarea_etapa)
            if tarea:
                tarea.facturada = False
                await db.commit()
                await db.refresh(tarea)
            await db.delete(item)
        await db.commit()

        obj = await factura_servicio_repo.remove(db, id=id)
        return obj is not None

    @staticmethod
    async def get_items(
        db: AsyncSession, id_factura: int
    ) -> List[ItemFacturaServicioRead]:
        items = await item_factura_servicio_repo.get_by_factura(db, id_factura)
        return [ItemFacturaServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get_with_items(
        db: AsyncSession, id: int
    ) -> Optional[FacturaServicioWithItems]:
        f = await factura_servicio_repo.get(db, id)
        if not f:
            return None
        items = await item_factura_servicio_repo.get_by_factura(db, id)
        return FacturaServicioWithItems(
            **f.model_dump(),
            items=[ItemFacturaServicioRead(**i.model_dump()) for i in items]
        )

    @staticmethod
    async def validar_pago_etapa(
        db: AsyncSession, id_etapa: int
    ) -> FacturaPagoValidacion:
        factura = await factura_servicio_repo.get_by_etapa_with_pagos(db, id_etapa)

        if not factura:
            return FacturaPagoValidacion(
                id_factura_servicio=None,
                codigo_factura=None,
                importe=Decimal("0.00"),
                pagado=Decimal("0.00"),
                saldo=Decimal("0.00"),
                esta_pagada=False,
                pagos=[],
            )

        pagado = sum((pago.monto or Decimal("0")) for pago in factura.pagos)
        importe = factura.importe or Decimal("0")
        saldo = importe - pagado

        pagos_detalle = [
            PagoDetalleRead(
                id_pago_factura_servicio=p.id_pago_factura_servicio,
                monto=p.monto or Decimal("0"),
                id_moneda=p.id_moneda,
                fecha=p.fecha,
                doc_traza=p.doc_traza,
            )
            for p in factura.pagos
        ]

        return FacturaPagoValidacion(
            id_factura_servicio=factura.id_factura_servicio,
            codigo_factura=factura.codigo_factura,
            importe=importe,
            pagado=pagado,
            saldo=saldo,
            esta_pagada=saldo <= 0,
            pagos=pagos_detalle,
        )


class PagoFacturaServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: PagoFacturaServicioCreate
    ) -> PagoFacturaServicioRead:
        data.monto_disponible = data.monto
        p = await pago_factura_servicio_repo.create(db, obj_in=data)
        
        if data.id_factura_servicio:
            await factura_servicio_repo.actualizar_pagado(
                db, 
                data.id_factura_servicio, 
                data.monto or Decimal("0")
            )
            
            factura = await factura_servicio_repo.get(db, data.id_factura_servicio)
            if factura and factura.id_certificacion and factura.pagado >= factura.importe:
                from src.models.servicio import Certificacion
                stmt = select(Certificacion).where(Certificacion.id_certificacion == factura.id_certificacion)
                result = await db.exec(stmt)
                certificacion = result.first()
                if certificacion:
                    certificacion.facturado = True
                    await db.commit()
        
        await db.commit()
        return PagoFacturaServicioRead(**p.model_dump())

    @staticmethod
    async def get_by_factura(
        db: AsyncSession, id_factura: int
    ) -> List[PagoFacturaServicioRead]:
        items = await pago_factura_servicio_repo.get_by_factura(db, id_factura)
        return [PagoFacturaServicioRead(**i.model_dump()) for i in items]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        pago = await pago_factura_servicio_repo.get(db, id)
        if pago and pago.id_factura_servicio:
            await factura_servicio_repo.actualizar_pagado(
                db,
                pago.id_factura_servicio,
                -(pago.monto or Decimal("0"))
            )
        
        obj = await pago_factura_servicio_repo.remove(db, id=id)
        await db.commit()
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
                validacion.mensaje or "No se puede liquidar: no hay pagos registrados"
            )

        from decimal import Decimal

        importe = Decimal("0")
        
        if data.importe is not None:
            importe = Decimal(str(data.importe))
        elif data.id_pago:
            pago = await pago_factura_servicio_repo.get(db, data.id_pago)
            if pago and pago.monto_disponible:
                importe = Decimal(str(pago.monto_disponible))
            elif pago and pago.monto:
                importe = Decimal(str(pago.monto))
        else:
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
            id_pago=data.id_pago,
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

        if data.id_pago and importe > 0:
            pago = await pago_factura_servicio_repo.get(db, data.id_pago)
            if pago and pago.monto_disponible:
                pago.monto_disponible = max(Decimal("0"), pago.monto_disponible - importe)
                db.add(pago)
                await db.commit()

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

        old_importe = l.importe or Decimal("0")
        old_id_pago = l.id_pago

        importe = Decimal(str(data.importe)) if data.importe is not None else (l.importe or Decimal("0"))

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
            importe=importe,
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

        delta = importe - old_importe
        if delta != 0:
            if data.id_pago and data.id_pago == old_id_pago:
                pago_obj = await pago_factura_servicio_repo.get(db, data.id_pago)
                if pago_obj and pago_obj.monto_disponible is not None:
                    if delta > 0:
                        pago_obj.monto_disponible = max(Decimal("0"), pago_obj.monto_disponible - delta)
                    else:
                        pago_obj.monto_disponible = min(
                            pago_obj.monto or Decimal("0"),
                            pago_obj.monto_disponible + abs(delta)
                        )
                    db.add(pago_obj)

            if updated.confirmado:
                statement = select(PersonaEtapa).where(
                    PersonaEtapa.id_etapa == updated.id_etapa,
                    PersonaEtapa.id_persona == updated.id_persona,
                )
                result = await db.exec(statement)
                persona_etapa = result.first()
                if persona_etapa:
                    total_liquidado = await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
                        db, updated.id_etapa, updated.id_persona
                    )
                    persona_etapa.por_cobrar = max(Decimal("0"), (persona_etapa.cobro or Decimal("0")) - total_liquidado)
                    db.add(persona_etapa)

            await db.commit()

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
                validacion.mensaje or "No se puede confirmar: no hay pagos registrados"
            )

        importe = l.importe or Decimal("0")
        
        total_liquidado = await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
            db, l.id_etapa, l.id_persona
        )
        
        statement = select(PersonaEtapa).where(
            PersonaEtapa.id_etapa == l.id_etapa,
            PersonaEtapa.id_persona == l.id_persona,
        )
        result = await db.exec(statement)
        persona_etapa = result.first()
        
        if persona_etapa and persona_etapa.cobro:
            cobro = Decimal(str(persona_etapa.cobro))
            disponible = cobro - total_liquidado
            if importe > disponible:
                importe = disponible
                l.importe = importe

        if data.porcentaje_caguayo is not None:
            l.porcentaje_caguayo = Decimal(str(data.porcentaje_caguayo))
        if data.tributario is not None:
            l.tributario = Decimal(str(data.tributario))
        if data.gasto_empresa is not None:
            l.gasto_empresa = Decimal(str(data.gasto_empresa))
        if data.comision_bancaria is not None:
            l.comision_bancaria = Decimal(str(data.comision_bancaria))

        porcentaje_caguayo = l.porcentaje_caguayo or Decimal("10")
        l.importe_caguayo = importe * (porcentaje_caguayo / 100)
        l.devengado = importe - l.importe_caguayo

        tributario = l.tributario or Decimal("5")
        l.tributario_monto = l.devengado * (tributario / 100)
        subtotal = l.devengado - l.tributario_monto

        gasto_empresa = l.gasto_empresa or Decimal("0")
        comision = l.comision_bancaria or Decimal("0")
        l.neto_pagar = subtotal - gasto_empresa - comision

        l.fecha_liquidacion = date.today()
        l.confirmado = True

        if data.observaciones:
            l.observacion = data.observaciones
        
        if data.doc_pago_liquidacion:
            l.doc_pago_liquidacion = data.doc_pago_liquidacion

        db.add(l)
        
        if l.id_etapa:
            if persona_etapa:
                persona_etapa.liquidada = True
                nuevo_total = total_liquidado + importe
                persona_etapa.por_cobrar = max(Decimal("0"), (persona_etapa.cobro or Decimal("0")) - nuevo_total)
                db.add(persona_etapa)

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
        elif not validacion_factura.pagado or validacion_factura.pagado <= 0:
            puede_liquidar = False
            mensaje = "No hay pagos registrados para esta etapa"

        return PersonaLiquidacionValidacion(
            puede_liquidar=puede_liquidar,
            id_etapa=id_etapa,
            id_persona=id_persona,
            factura=validacion_factura,
            mensaje=mensaje,
        )

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        from decimal import Decimal
        
        liquidacion = await persona_liquidacion_repo.get(db, id)
        if not liquidacion:
            return False
        
        id_etapa = liquidacion.id_etapa
        id_persona = liquidacion.id_persona
        
        obj = await persona_liquidacion_repo.remove(db, id=id)
        
        if id_etapa and id_persona:
            total_liquidado = await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
                db, id_etapa, id_persona
            )
            
            statement = select(PersonaEtapa).where(
                PersonaEtapa.id_etapa == id_etapa,
                PersonaEtapa.id_persona == id_persona,
            )
            result = await db.exec(statement)
            persona_etapa = result.first()
            
            if persona_etapa:
                if total_liquidado > 0:
                    persona_etapa.liquidada = True
                else:
                    persona_etapa.liquidada = False
                persona_etapa.por_cobrar = max(Decimal("0"), (persona_etapa.cobro or Decimal("0")) - total_liquidado)
                db.add(persona_etapa)
                await db.commit()

            if liquidacion.id_pago and liquidacion.importe:
                pago_obj = await pago_factura_servicio_repo.get(db, liquidacion.id_pago)
                if pago_obj and pago_obj.monto_disponible is not None:
                    pago_obj.monto_disponible = min(
                        pago_obj.monto or Decimal("0"),
                        pago_obj.monto_disponible + (liquidacion.importe or Decimal("0"))
                    )
                    db.add(pago_obj)
                    await db.commit()
        
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

    @staticmethod
    async def get_pagos_disponibles_etapa(
        db: AsyncSession, id_etapa: int
    ) -> List[PagoDetalleRead]:
        pagos = await pago_factura_servicio_repo.get_by_etapa(db, id_etapa)
        return [
            PagoDetalleRead(
                id_pago_factura_servicio=p.id_pago_factura_servicio,
                monto=p.monto or Decimal("0"),
                monto_disponible=p.monto_disponible or Decimal("0"),
                id_moneda=p.id_moneda,
                fecha=p.fecha,
                doc_traza=p.doc_traza,
            )
            for p in pagos
        ]

    @staticmethod
    async def get_disponible_liquidar(
        db: AsyncSession, id_etapa: int, id_persona: int
    ) -> Decimal:
        statement = select(PersonaEtapa).where(
            PersonaEtapa.id_etapa == id_etapa,
            PersonaEtapa.id_persona == id_persona,
        )
        result = await db.exec(statement)
        persona_etapa = result.first()
        
        if not persona_etapa or not persona_etapa.cobro:
            return Decimal("0")
        
        cobro = Decimal(str(persona_etapa.cobro))
        total_liquidado = await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
            db, id_etapa, id_persona
        )
        
        disponible = cobro - total_liquidado
        return disponible if disponible > 0 else Decimal("0")


# ==========================================
# CERTIFICACIONES SERVICE
# ==========================================
class CertificacionService:
    async def create(self, db: AsyncSession, data: CertificacionCreate) -> CertificacionRead:
        certificacion = Certificacion(**data.model_dump())
        db.add(certificacion)
        await db.commit()
        await db.refresh(certificacion)
        return CertificacionRead.model_validate(certificacion)

    async def get_by_id(self, db: AsyncSession, id_certificacion: int) -> Optional[CertificacionRead]:
        statement = select(Certificacion).where(Certificacion.id_certificacion == id_certificacion)
        result = await db.exec(statement)
        certificacion = result.first()
        if certificacion:
            return CertificacionRead.model_validate(certificacion)
        return None

    async def get_all(self, db: AsyncSession) -> List[CertificacionRead]:
        statement = select(Certificacion).order_by(Certificacion.id_certificacion.desc())
        result = await db.exec(statement)
        return [CertificacionRead.model_validate(c) for c in result.all()]

    async def get_by_etapa(self, db: AsyncSession, id_etapa: int) -> List[CertificacionRead]:
        statement = select(Certificacion).where(Certificacion.id_etapa == id_etapa).order_by(Certificacion.id_certificacion.desc())
        result = await db.exec(statement)
        return [CertificacionRead.model_validate(c) for c in result.all()]

    async def update(self, db: AsyncSession, id_certificacion: int, data: CertificacionUpdate) -> Optional[CertificacionRead]:
        statement = select(Certificacion).where(Certificacion.id_certificacion == id_certificacion)
        result = await db.exec(statement)
        certificacion = result.first()
        
        if not certificacion:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(certificacion, key, value)
        
        await db.commit()
        await db.refresh(certificacion)
        return CertificacionRead.model_validate(certificacion)

    async def delete(self, db: AsyncSession, id_certificacion: int) -> bool:
        statement = select(Certificacion).where(Certificacion.id_certificacion == id_certificacion)
        result = await db.exec(statement)
        certificacion = result.first()
        
        if not certificacion:
            return False
        
        await db.delete(certificacion)
        await db.commit()
        return True


certificacion_service = CertificacionService()
