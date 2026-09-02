from datetime import datetime, date
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Optional
from src.core.exceptions import BusinessLogicError
from src.utils.codigos_entidad import (
    generar_codigo,
    generar_codigo_correlativo,
    siguiente_secuencia,
)
from src.models.servicio import (
    Etapa,
    PersonaEtapa,
    Certificacion,
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
    OfertaCreate,
    OfertaRead,
    OfertaUpdate,
    ItemOfertaCreate,
    ItemOfertaRead,
    OfertaWithItems,
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
    oferta_repo,
    item_oferta_repo,
)


class ServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: ServicioCreate, denominacion: Optional[str] = None
    ) -> ServicioRead:
        servicio = await servicio_repo.create(db, obj_in=data)
        año = datetime.now().year
        servicio.codigo_servicio = generar_codigo(denominacion or "", año, servicio.id_servicio)
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
        db: AsyncSession, data: SolicitudServicioCreate, denominacion: Optional[str] = None
    ) -> SolicitudServicioRead:
        sec = await siguiente_secuencia(db, "solicitud_servicio", "codigo_solicitud")
        s = await solicitud_servicio_repo.create(db, obj_in=data)
        año = (data.fecha_solicitud or date.today()).year
        s.codigo_solicitud = generar_codigo_correlativo(denominacion or "", año, sec)

        # Generar codigo_proyecto si viene aprobado con contrato
        if data.aprobado and data.id_contrato:
            sec_proy = await siguiente_secuencia(db, "solicitud_servicio", "codigo_proyecto")
            s.codigo_proyecto = generar_codigo_correlativo(denominacion or "", año, sec_proy)

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
        db: AsyncSession,
        id: int,
        data: SolicitudServicioUpdate,
        denominacion: Optional[str] = None,
    ) -> SolicitudServicioRead:
        s = await solicitud_servicio_repo.get(db, id)
        if not s:
            return None

        new_estado = data.estado if hasattr(data, "estado") and data.estado else None
        if new_estado and s.estado != new_estado:
            TRANSICIONES_VALIDAS = {
                None: ["PENDIENTE"],
                "PENDIENTE": ["EN NEGOCIACION", "CANCELADA"],
                "EN NEGOCIACION": ["EN PROCESO", "CANCELADA"],
                "EN PROCESO": ["TERMINADA", "CANCELADA"],
                "TERMINADA": [],
                "CANCELADA": [],
            }
            permitidos = TRANSICIONES_VALIDAS.get(s.estado, [])
            if new_estado not in permitidos:
                raise BusinessLogicError(
                    f"No se puede cambiar de '{s.estado}' a '{new_estado}'. "
                    f"Transiciones permitidas desde '{s.estado}': {permitidos or 'ninguna'}"
                )

        aprobado = getattr(data, "aprobado", None)
        id_contrato = getattr(data, "id_contrato", None)
        if aprobado and id_contrato and not s.codigo_proyecto:
            sec = await siguiente_secuencia(db, "solicitud_servicio", "codigo_proyecto")
            año = datetime.now().year
            data.codigo_proyecto = generar_codigo_correlativo(denominacion or "", año, sec)

        updated = await solicitud_servicio_repo.update(db, db_obj=s, obj_in=data)
        return SolicitudServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        s = await solicitud_servicio_repo.get(db, id)
        if not s:
            return False

        etapas = await etapa_repo.get_by_solicitud(db, id)
        for etapa in etapas:
            facturas = await factura_servicio_repo.get_by_etapa(db, etapa.id_etapa)
            for factura in facturas:
                if factura.estado not in ("CANCELADA",):
                    raise BusinessLogicError(
                        f"No se puede eliminar: la etapa '{etapa.nombre_etapa or etapa.numero_etapa}' "
                        f"tiene facturas activas. Cancele las facturas primero."
                    )

        obj = await solicitud_servicio_repo.remove(db, id=id)
        return obj is not None


class EtapaService:
    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 10000
    ) -> List[EtapaRead]:
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
        if not data.codigo_extendido and data.id_servicio:
            servicio = await servicio_repo.get(db, data.id_servicio)
            if servicio:
                data.codigo_extendido = servicio.codigo_servicio

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
        db: AsyncSession, data: FacturaServicioCreate, denominacion: Optional[str] = None
    ) -> FacturaServicioRead:
        etapa = None
        if data.id_etapa:
            etapa = await etapa_repo.get(db, data.id_etapa)
            if etapa and etapa.tipo_etapa == "CERTIFICACIONES":
                stmt = select(Certificacion).where(
                    Certificacion.id_etapa == etapa.id_etapa
                )
                result = await db.exec(stmt)
                existing_certs = result.all()
                if not existing_certs:
                    raise Exception(
                        "No hay certificaciones registradas para esta etapa"
                    )
                if not data.id_certificacion:
                    raise Exception(
                        "Para facturas de etapas de certificaciones debe seleccionar una certificación"
                    )
            elif etapa:
                tareas = await tarea_etapa_repo.get_by_etapa(db, etapa.id_etapa)
                if not tareas:
                    raise Exception("No hay tareas registradas para esta etapa")

        if data.id_certificacion:
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == data.id_certificacion
            )
            result = await db.exec(stmt)
            certificacion = result.first()

            if not certificacion:
                raise Exception("La certificación seleccionada no existe")

            if certificacion.facturado:
                raise Exception("La certificación ya está facturada")

        # Verificar si ya existe una factura para esta etapa que esté completamente pagada
        if data.id_etapa:
            existing = await factura_servicio_repo.get_by_etapa_with_pagos(db, data.id_etapa)
            if existing:
                pagado = sum((p.monto or Decimal("0")) for p in existing.pagos)
                importe = existing.importe or Decimal("0")
                if importe > 0 and pagado >= importe:
                    raise Exception(
                        f"La factura {existing.codigo_factura} de esta etapa ya está completamente pagada "
                        f"(pagado: {pagado}, importe: {importe}). No se puede crear otra factura."
                    )

        data.codigo_factura = None
        if data.estado is None:
            data.estado = "APROBADA"
        es_prefactura = data.estado == "PENDIENTE"
        if data.tipo is None:
            data.tipo = "PREFACTURA" if es_prefactura else "FACTURA"
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
            raise BusinessLogicError(
                f"El importe de la factura ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
            )

        if etapa and not data.id_certificacion:
            total_existente = await factura_servicio_repo.get_total_importe_by_etapa(
                db, etapa.id_etapa
            )
            if total_existente + data.importe > etapa.valor:
                raise BusinessLogicError(
                    f"El total facturado en la etapa ({total_existente + data.importe:.2f}) "
                    f"excedería el valor de la etapa ({etapa.valor:.2f}). "
                    f"Ya existen facturas por {total_existente:.2f}."
                )

        data.pagado = Decimal("0")

        f = await factura_servicio_repo.create(db, obj_in=data)
        await db.flush()
        f.codigo_factura = generar_codigo(denominacion or "", datetime.now().year, f.id_factura_servicio)
        db.add(f)
        await db.commit()

        f = await factura_servicio_repo.get(db, f.id_factura_servicio)

        if data.id_certificacion and (
            certificacion_ajuste_porciento is not None
            or certificacion_ajuste_valor is not None
        ):
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == data.id_certificacion
            )
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
                        id_factura_servicio=f.id_factura_servicio,
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

                    if not es_prefactura:
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
        delattr(data, "tareas_seleccionadas")
        tarea_modifiers = data.tarea_modifiers or {}
        delattr(data, "tarea_modifiers")
        update_ajuste_porciento = data.ajuste_porciento
        delattr(data, "ajuste_porciento")
        update_ajuste_valor = data.ajuste_valor
        delattr(data, "ajuste_valor")

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

                    estado_efectivo = getattr(data, "estado", None) or f.estado or "APROBADA"
                    if estado_efectivo != "PENDIENTE":
                        tarea.facturada = True
                    await db.commit()
                    await db.refresh(tarea)

                    importe_total += cant * prec

            data.importe = importe_total

            if f.id_etapa:
                etapa = await etapa_repo.get(db, f.id_etapa)
                if etapa and data.importe > etapa.valor:
                    raise BusinessLogicError(
                        f"El importe de la factura ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
                    )
                if etapa and not f.id_certificacion:
                    total_existente = await factura_servicio_repo.get_total_importe_by_etapa(
                        db, f.id_etapa, exclude_id=id
                    )
                    if total_existente + data.importe > etapa.valor:
                        raise BusinessLogicError(
                            f"El total facturado en la etapa ({total_existente + data.importe:.2f}) "
                            f"excedería el valor de la etapa ({etapa.valor:.2f}). "
                            f"Ya existen facturas por {total_existente:.2f}."
                        )

        if f.id_certificacion and (
            update_ajuste_porciento is not None or update_ajuste_valor is not None
        ):
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == f.id_certificacion
            )
            result = await db.exec(stmt)
            cert = result.first()
            if cert:
                if update_ajuste_porciento is not None:
                    cert.ajuste_porciento = update_ajuste_porciento
                if update_ajuste_valor is not None:
                    cert.ajuste_valor = update_ajuste_valor
                await db.commit()
                await db.refresh(cert)

        await db.refresh(f)
        updated = await factura_servicio_repo.update(db, db_obj=f, obj_in=data)
        return FacturaServicioRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        existing_items = await item_factura_servicio_repo.get_by_factura(db, id)
        for item in existing_items:
            other_refs = await item_factura_servicio_repo.count_other_references_by_tarea(
                db, item.id_tarea_etapa, exclude_factura_id=id
            )
            if other_refs == 0:
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
            items=[ItemFacturaServicioRead(**i.model_dump()) for i in items],
        )

    @staticmethod
    async def aprobar_prefactura(db: AsyncSession, id: int) -> FacturaServicioRead:
        f = await factura_servicio_repo.get(db, id)
        if not f:
            return None
        if f.estado == "APROBADA":
            raise Exception("La factura ya está aprobada")

        if f.id_certificacion:
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == f.id_certificacion
            )
            result = await db.exec(stmt)
            cert = result.first()
            if cert and cert.facturado:
                raise Exception("La certificación ya está facturada")

        if f.id_etapa:
            etapa = await etapa_repo.get(db, f.id_etapa)
            if etapa and f.importe > etapa.valor:
                raise Exception(
                    f"El importe de la factura ({f.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
                )

        f.estado = "APROBADA"
        f.tipo = "FACTURA"
        await db.commit()
        await db.refresh(f)

        items = await item_factura_servicio_repo.get_by_factura(db, id)
        for item in items:
            tarea = await tarea_etapa_repo.get(db, item.id_tarea_etapa)
            if tarea:
                tarea.facturada = True
                await db.commit()
                await db.refresh(tarea)

        return FacturaServicioRead(**f.model_dump())

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
        # Verificar si la factura ya está completamente pagada
        if data.id_factura_servicio:
            factura_check = await factura_servicio_repo.get(db, data.id_factura_servicio)
            if factura_check:
                pagado_actual = factura_check.pagado or Decimal("0")
                importe = factura_check.importe or Decimal("0")
                if importe > 0 and pagado_actual >= importe:
                    raise ValueError(
                        f"La factura {factura_check.codigo_factura} ya está completamente pagada "
                        f"(pagado: {pagado_actual}, importe: {importe}). No se puede registrar otro pago."
                    )

        data.monto_disponible = data.monto
        p = await pago_factura_servicio_repo.create(db, obj_in=data)

        if data.id_factura_servicio:
            await factura_servicio_repo.actualizar_pagado(
                db, data.id_factura_servicio, data.monto or Decimal("0")
            )

            factura = await factura_servicio_repo.get(db, data.id_factura_servicio)
            if (
                factura
                and factura.id_certificacion
                and factura.pagado >= factura.importe
            ):
                from src.models.servicio import Certificacion

                stmt = select(Certificacion).where(
                    Certificacion.id_certificacion == factura.id_certificacion
                )
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
                db, pago.id_factura_servicio, -(pago.monto or Decimal("0"))
            )

        obj = await pago_factura_servicio_repo.remove(db, id=id)
        await db.commit()
        return obj is not None


class PersonaLiquidacionService:
    @staticmethod
    async def create(
        db: AsyncSession, data: PersonaLiquidacionCreateInput, denominacion: Optional[str] = None
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
        comision_admin = Decimal(str(data.comision_admin_obra or 0))
        neto_pagar = subtotal - gasto_empresa - comision - comision_admin

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
            comision_admin_obra=Decimal(str(data.comision_admin_obra or 0)),
            gasto_empresa=Decimal(str(data.gasto_empresa or 0)),
            neto_pagar=neto_pagar,
            doc_pago_liquidacion=data.doc_pago_liquidacion,
            observacion=data.observacion,
        )

        liquidacion_data.numero = None

        liquidacion = await persona_liquidacion_repo.create(db, obj_in=liquidacion_data)
        await db.flush()
        liquidacion.numero = generar_codigo(denominacion or "", datetime.now().year, liquidacion.id_liquidacion)
        db.add(liquidacion)

        if data.id_pago and importe > 0:
            pago = await pago_factura_servicio_repo.get(db, data.id_pago)
            if pago:
                disponible = pago.monto_disponible or Decimal("0")
                if importe > disponible:
                    raise BusinessLogicError(
                        f"El importe de la liquidación ({importe:.2f}) excede el monto disponible del pago ({disponible:.2f})"
                    )
                pago.monto_disponible = disponible - importe
                db.add(pago)

        await db.commit()

        return PersonaLiquidacionRead(**liquidacion.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[PersonaLiquidacionRead]:
        items = await persona_liquidacion_repo.get_all_with_details(db, skip, limit)
        return [PersonaLiquidacionRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> PersonaLiquidacionRead:
        liq = await persona_liquidacion_repo.get(db, id)
        return PersonaLiquidacionRead(**liq.model_dump()) if liq else None

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: PersonaLiquidacionUpdateInput
    ) -> PersonaLiquidacionRead:
        from decimal import Decimal

        liq = await persona_liquidacion_repo.get(db, id)
        if not liq:
            return None

        old_importe = liq.importe or Decimal("0")
        old_id_pago = liq.id_pago

        importe = (
            Decimal(str(data.importe))
            if data.importe is not None
            else (liq.importe or Decimal("0"))
        )

        porcentaje_caguayo = (
            Decimal(str(data.porcentaje_caguayo))
            if data.porcentaje_caguayo is not None
            else (liq.porcentaje_caguayo or Decimal("10"))
        )
        importe_caguayo = importe * (porcentaje_caguayo / 100)
        devengado = importe - importe_caguayo

        tributario = (
            Decimal(str(data.tributario))
            if data.tributario is not None
            else (liq.tributario or Decimal("5"))
        )
        tributario_monto = devengado * (tributario / 100)
        subtotal = devengado - tributario_monto

        gasto_empresa = (
            Decimal(str(data.gasto_empresa))
            if data.gasto_empresa is not None
            else (liq.gasto_empresa or Decimal("0"))
        )
        comision = (
            Decimal(str(data.comision_bancaria))
            if data.comision_bancaria is not None
            else (liq.comision_bancaria or Decimal("0"))
        )
        comision_admin = (
            Decimal(str(data.comision_admin_obra))
            if data.comision_admin_obra is not None
            else (liq.comision_admin_obra or Decimal("0"))
        )
        neto_pagar = subtotal - gasto_empresa - comision - comision_admin

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
            comision_admin_obra=data.comision_admin_obra,
            gasto_empresa=data.gasto_empresa,
            neto_pagar=neto_pagar,
            doc_pago_liquidacion=data.doc_pago_liquidacion,
            observacion=data.observacion,
        )

        updated = await persona_liquidacion_repo.update(
            db, db_obj=liq, obj_in=update_data
        )

        delta = importe - old_importe
        if delta != 0:
            if data.id_pago and data.id_pago == old_id_pago:
                pago_obj = await pago_factura_servicio_repo.get(db, data.id_pago)
                if pago_obj and pago_obj.monto_disponible is not None:
                    if delta > 0:
                        pago_obj.monto_disponible = max(
                            Decimal("0"), pago_obj.monto_disponible - delta
                        )
                    else:
                        pago_obj.monto_disponible = min(
                            pago_obj.monto or Decimal("0"),
                            pago_obj.monto_disponible + abs(delta),
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
                    persona_etapa.por_cobrar = max(
                        Decimal("0"),
                        (persona_etapa.cobro or Decimal("0")) - total_liquidado,
                    )
                    db.add(persona_etapa)

            await db.commit()

        return PersonaLiquidacionRead(**updated.model_dump())

    @staticmethod
    async def confirmar(
        db: AsyncSession, liquidacion_id: int, data: "PersonaLiquidacionConfirmar"
    ) -> Optional[PersonaLiquidacionRead]:
        from decimal import Decimal

        liquidacion_obj = await persona_liquidacion_repo.get(db, liquidacion_id)
        if not liquidacion_obj:
            return None

        if liquidacion_obj.confirmado:
            raise ValueError("La liquidación ya está confirmada")

        validacion = await PersonaLiquidacionService.validar_liquidar(
            db, liquidacion_obj.id_etapa, liquidacion_obj.id_persona
        )

        if not validacion.puede_liquidar:
            raise ValueError(
                validacion.mensaje or "No se puede confirmar: no hay pagos registrados"
            )

        importe = liquidacion_obj.importe or Decimal("0")

        total_liquidado = (
            await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
                db, liquidacion_obj.id_etapa, liquidacion_obj.id_persona
            )
        )

        statement = select(PersonaEtapa).where(
            PersonaEtapa.id_etapa == liquidacion_obj.id_etapa,
            PersonaEtapa.id_persona == liquidacion_obj.id_persona,
        )
        result = await db.exec(statement)
        persona_etapa = result.first()

        if persona_etapa and persona_etapa.cobro:
            cobro = Decimal(str(persona_etapa.cobro))
            disponible = cobro - total_liquidado
            if disponible <= 0:
                raise BusinessLogicError(
                    f"No hay saldo disponible para liquidar. "
                    f"Cobro: {cobro:.2f}, ya liquidado: {total_liquidado:.2f}"
                )
            if importe > disponible:
                raise BusinessLogicError(
                    f"El importe de la liquidación ({importe:.2f}) excede el saldo disponible ({disponible:.2f})"
                )

        if data.porcentaje_caguayo is not None:
            liquidacion_obj.porcentaje_caguayo = Decimal(str(data.porcentaje_caguayo))
        if data.tributario is not None:
            liquidacion_obj.tributario = Decimal(str(data.tributario))
        if data.gasto_empresa is not None:
            liquidacion_obj.gasto_empresa = Decimal(str(data.gasto_empresa))
        if data.comision_bancaria is not None:
            liquidacion_obj.comision_bancaria = Decimal(str(data.comision_bancaria))
        if data.comision_admin_obra is not None:
            liquidacion_obj.comision_admin_obra = Decimal(str(data.comision_admin_obra))

        porcentaje_caguayo = liquidacion_obj.porcentaje_caguayo or Decimal("10")
        liquidacion_obj.importe_caguayo = importe * (porcentaje_caguayo / 100)
        liquidacion_obj.devengado = importe - liquidacion_obj.importe_caguayo

        tributario = liquidacion_obj.tributario or Decimal("5")
        liquidacion_obj.tributario_monto = liquidacion_obj.devengado * (
            tributario / 100
        )
        subtotal = liquidacion_obj.devengado - liquidacion_obj.tributario_monto

        gasto_empresa = liquidacion_obj.gasto_empresa or Decimal("0")
        comision = liquidacion_obj.comision_bancaria or Decimal("0")
        comision_admin = liquidacion_obj.comision_admin_obra or Decimal("0")
        liquidacion_obj.neto_pagar = subtotal - gasto_empresa - comision - comision_admin

        liquidacion_obj.fecha_liquidacion = date.today()
        liquidacion_obj.confirmado = True

        if data.observaciones:
            liquidacion_obj.observacion = data.observaciones

        if data.doc_pago_liquidacion:
            liquidacion_obj.doc_pago_liquidacion = data.doc_pago_liquidacion

        db.add(liquidacion_obj)

        if liquidacion_obj.id_etapa:
            if persona_etapa:
                persona_etapa.liquidada = True
                nuevo_total = total_liquidado + importe
                persona_etapa.por_cobrar = max(
                    Decimal("0"), (persona_etapa.cobro or Decimal("0")) - nuevo_total
                )
                db.add(persona_etapa)

        await db.commit()
        await db.refresh(liquidacion_obj)
        return PersonaLiquidacionRead(**liquidacion_obj.model_dump())

    @staticmethod
    async def validar_liquidar(
        db: AsyncSession, id_etapa: int, id_persona: int
    ) -> PersonaLiquidacionValidacion:

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
        else:
            # Verificar si el realizador ya tiene todo liquidado
            from src.models import PersonaEtapa
            stmt = select(PersonaEtapa).where(
                PersonaEtapa.id_etapa == id_etapa,
                PersonaEtapa.id_persona == id_persona
            )
            result = await db.exec(stmt)
            pe = result.first()
            if pe and pe.por_cobrar is not None and pe.por_cobrar <= 0:
                puede_liquidar = False
                mensaje = "Este realizador ya tiene todo liquidado (por cobrar = 0)"

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
            total_liquidado = (
                await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
                    db, id_etapa, id_persona
                )
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
                persona_etapa.por_cobrar = max(
                    Decimal("0"),
                    (persona_etapa.cobro or Decimal("0")) - total_liquidado,
                )
                db.add(persona_etapa)
                await db.commit()

            if liquidacion.id_pago and liquidacion.importe:
                pago_obj = await pago_factura_servicio_repo.get(db, liquidacion.id_pago)
                if pago_obj and pago_obj.monto_disponible is not None:
                    pago_obj.monto_disponible = min(
                        pago_obj.monto or Decimal("0"),
                        pago_obj.monto_disponible
                        + (liquidacion.importe or Decimal("0")),
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
        total_liquidado = (
            await persona_liquidacion_repo.get_total_liquidado_by_persona_etapa(
                db, id_etapa, id_persona
            )
        )

        disponible = cobro - total_liquidado
        return disponible if disponible > 0 else Decimal("0")


# ==========================================
# CERTIFICACIONES SERVICE
# ==========================================
class CertificacionService:
    async def create(
        self, db: AsyncSession, data: CertificacionCreate
    ) -> CertificacionRead:
        certificacion = Certificacion(**data.model_dump())
        db.add(certificacion)
        await db.commit()
        await db.refresh(certificacion)
        return CertificacionRead.model_validate(certificacion)

    async def get_by_id(
        self, db: AsyncSession, id_certificacion: int
    ) -> Optional[CertificacionRead]:
        statement = select(Certificacion).where(
            Certificacion.id_certificacion == id_certificacion
        )
        result = await db.exec(statement)
        certificacion = result.first()
        if certificacion:
            return CertificacionRead.model_validate(certificacion)
        return None

    async def get_all(self, db: AsyncSession) -> List[CertificacionRead]:
        statement = select(Certificacion).order_by(
            Certificacion.id_certificacion.desc()
        )
        result = await db.exec(statement)
        return [CertificacionRead.model_validate(c) for c in result.all()]

    async def get_by_etapa(
        self, db: AsyncSession, id_etapa: int
    ) -> List[CertificacionRead]:
        statement = (
            select(Certificacion)
            .where(Certificacion.id_etapa == id_etapa)
            .order_by(Certificacion.id_certificacion.desc())
        )
        result = await db.exec(statement)
        return [CertificacionRead.model_validate(c) for c in result.all()]

    async def update(
        self, db: AsyncSession, id_certificacion: int, data: CertificacionUpdate
    ) -> Optional[CertificacionRead]:
        statement = select(Certificacion).where(
            Certificacion.id_certificacion == id_certificacion
        )
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
        statement = select(Certificacion).where(
            Certificacion.id_certificacion == id_certificacion
        )
        result = await db.exec(statement)
        certificacion = result.first()

        if not certificacion:
            return False

        await db.delete(certificacion)
        await db.commit()
        return True


certificacion_service = CertificacionService()


class OfertaServicioService:
    @staticmethod
    async def create(
        db: AsyncSession, data: OfertaCreate, denominacion: Optional[str] = None
    ) -> OfertaRead:
        etapa = None
        if data.id_etapa:
            etapa = await etapa_repo.get(db, data.id_etapa)
            if etapa and etapa.tipo_etapa == "CERTIFICACIONES":
                stmt = select(Certificacion).where(
                    Certificacion.id_etapa == etapa.id_etapa
                )
                result = await db.exec(stmt)
                existing_certs = result.all()
                if not existing_certs:
                    raise Exception(
                        "No hay certificaciones registradas para esta etapa"
                    )
                if not data.id_certificacion:
                    raise Exception(
                        "Para ofertas de etapas de certificaciones debe seleccionar una certificación"
                    )
            elif etapa:
                tareas = await tarea_etapa_repo.get_by_etapa(db, etapa.id_etapa)
                if not tareas:
                    raise Exception("No hay tareas registradas para esta etapa")

        if data.id_certificacion:
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == data.id_certificacion
            )
            result = await db.exec(stmt)
            certificacion = result.first()

            if not certificacion:
                raise Exception("La certificación seleccionada no existe")

            if certificacion.facturado:
                raise Exception("La certificación ya está facturada")

        data.codigo_oferta = None
        if data.estado is None:
            data.estado = "PENDIENTE"
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
            raise BusinessLogicError(
                f"El importe de la oferta ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
            )

        if etapa and not data.id_certificacion:
            total_ofertas = await oferta_repo.get_total_importe_by_etapa(
                db, etapa.id_etapa
            )
            if total_ofertas + data.importe > etapa.valor:
                raise BusinessLogicError(
                    f"El total de ofertas en la etapa ({total_ofertas + data.importe:.2f}) "
                    f"excedería el valor de la etapa ({etapa.valor:.2f}). "
                    f"Ya existen ofertas por {total_ofertas:.2f}."
                )

        oferta = await oferta_repo.create(db, obj_in=data)
        await db.flush()
        oferta.codigo_oferta = generar_codigo(
            denominacion or "", datetime.now().year, oferta.id_oferta
        )
        db.add(oferta)
        await db.commit()

        oferta = await oferta_repo.get(db, oferta.id_oferta)

        if data.id_certificacion and (
            certificacion_ajuste_porciento is not None
            or certificacion_ajuste_valor is not None
        ):
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == data.id_certificacion
            )
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
                    item_data = ItemOfertaCreate(
                        id_oferta=oferta.id_oferta,
                        id_tarea_etapa=tarea_id,
                        codigo_extendido=tarea.codigo_extendido,
                        concepto=tarea.concepto_modificado,
                        unidad_medida=tarea.unidad_medida,
                        cantidad=cant,
                        precio=prec,
                        ajuste_porciento=ajuste_pct,
                        ajuste_valor=ajuste_val,
                    )
                    await item_oferta_repo.create(db, obj_in=item_data)

            await db.commit()

        return OfertaRead(**oferta.model_dump())

    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[str] = None,
    ) -> List[OfertaRead]:
        items = await oferta_repo.get_all_with_details(db, skip, limit, estado=estado)
        return [OfertaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get(db: AsyncSession, id: int) -> OfertaRead:
        oferta = await oferta_repo.get(db, id)
        return OfertaRead(**oferta.model_dump()) if oferta else None

    @staticmethod
    async def get_by_etapa(db: AsyncSession, id_etapa: int) -> List[OfertaRead]:
        items = await oferta_repo.get_by_etapa(db, id_etapa)
        return [OfertaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get_items(db: AsyncSession, id_oferta: int) -> List[ItemOfertaRead]:
        items = await item_oferta_repo.get_by_oferta(db, id_oferta)
        return [ItemOfertaRead(**i.model_dump()) for i in items]

    @staticmethod
    async def get_with_items(db: AsyncSession, id: int) -> Optional[OfertaWithItems]:
        oferta = await oferta_repo.get(db, id)
        if not oferta:
            return None
        items = await item_oferta_repo.get_by_oferta(db, id)
        return OfertaWithItems(
            **oferta.model_dump(),
            items=[ItemOfertaRead(**i.model_dump()) for i in items],
        )

    @staticmethod
    async def update(db: AsyncSession, id: int, data: OfertaUpdate) -> OfertaRead:
        oferta = await oferta_repo.get(db, id)
        if not oferta:
            return None

        tareas_seleccionadas = data.tareas_seleccionadas
        delattr(data, "tareas_seleccionadas")
        tarea_modifiers = data.tarea_modifiers or {}
        delattr(data, "tarea_modifiers")
        update_ajuste_porciento = data.ajuste_porciento
        delattr(data, "ajuste_porciento")
        update_ajuste_valor = data.ajuste_valor
        delattr(data, "ajuste_valor")

        if tareas_seleccionadas is not None:
            existing_items = await item_oferta_repo.get_by_oferta(db, id)
            for item in existing_items:
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
                    item_data = ItemOfertaCreate(
                        id_oferta=id,
                        id_tarea_etapa=tarea_id,
                        codigo_extendido=tarea.codigo_extendido,
                        concepto=tarea.concepto_modificado,
                        unidad_medida=tarea.unidad_medida,
                        cantidad=cant,
                        precio=prec,
                        ajuste_porciento=ajuste_pct,
                        ajuste_valor=ajuste_val,
                    )
                    await item_oferta_repo.create(db, obj_in=item_data)

                    importe_total += cant * prec

            data.importe = importe_total

            if oferta.id_etapa:
                etapa = await etapa_repo.get(db, oferta.id_etapa)
                if etapa and data.importe > etapa.valor:
                    raise BusinessLogicError(
                        f"El importe de la oferta ({data.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
                    )
                if etapa and not oferta.id_certificacion:
                    total_ofertas = await oferta_repo.get_total_importe_by_etapa(
                        db, oferta.id_etapa, exclude_id=id
                    )
                    if total_ofertas + data.importe > etapa.valor:
                        raise BusinessLogicError(
                            f"El total de ofertas en la etapa ({total_ofertas + data.importe:.2f}) "
                            f"excedería el valor de la etapa ({etapa.valor:.2f}). "
                            f"Ya existen ofertas por {total_ofertas:.2f}."
                        )

        if oferta.id_certificacion and (
            update_ajuste_porciento is not None or update_ajuste_valor is not None
        ):
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == oferta.id_certificacion
            )
            result = await db.exec(stmt)
            cert = result.first()
            if cert:
                if update_ajuste_porciento is not None:
                    cert.ajuste_porciento = update_ajuste_porciento
                if update_ajuste_valor is not None:
                    cert.ajuste_valor = update_ajuste_valor
                await db.commit()
                await db.refresh(cert)

        await db.refresh(oferta)
        updated = await oferta_repo.update(db, db_obj=oferta, obj_in=data)
        return OfertaRead(**updated.model_dump())

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        existing_items = await item_oferta_repo.get_by_oferta(db, id)
        for item in existing_items:
            await db.delete(item)
        await db.commit()

        obj = await oferta_repo.remove(db, id=id)
        return obj is not None

    @staticmethod
    async def confirmar(
        db: AsyncSession,
        id: int,
        denominacion: Optional[str] = None,
        tipo: str = "FACTURA",
    ) -> FacturaServicioRead:
        oferta = await oferta_repo.get(db, id)
        if not oferta:
            return None
        if oferta.estado == "CONFIRMADA":
            raise Exception("La oferta ya fue confirmada")

        if oferta.id_certificacion:
            stmt = select(Certificacion).where(
                Certificacion.id_certificacion == oferta.id_certificacion
            )
            result = await db.exec(stmt)
            cert = result.first()
            if cert and cert.facturado:
                raise Exception("La certificación ya está facturada")

        if oferta.id_etapa:
            etapa = await etapa_repo.get(db, oferta.id_etapa)
            if etapa and oferta.importe > etapa.valor:
                raise Exception(
                    f"El importe de la factura ({oferta.importe:.2f}) no puede ser mayor al valor de la etapa ({etapa.valor:.2f})"
                )

        es_prefactura = tipo == "PREFACTURA"
        factura_data = FacturaServicioCreate(
            id_etapa=oferta.id_etapa,
            id_certificacion=oferta.id_certificacion,
            alcance=oferta.alcance,
            id_moneda=oferta.id_moneda,
            fecha=oferta.fecha,
            descripcion=oferta.descripcion,
            observaciones=oferta.observaciones,
            cuenta_factura=oferta.cuenta_factura,
            id_usuario=oferta.id_usuario,
            importe=oferta.importe,
            estado="PENDIENTE" if es_prefactura else "APROBADA",
            tipo="PREFACTURA" if es_prefactura else "FACTURA",
        )
        factura = await factura_servicio_repo.create(db, obj_in=factura_data)
        await db.flush()
        factura.codigo_factura = generar_codigo(
            denominacion or "", datetime.now().year, factura.id_factura_servicio
        )
        db.add(factura)
        await db.commit()

        oferta_items = await item_oferta_repo.get_by_oferta(db, id)
        for item in oferta_items:
            item_data = ItemFacturaServicioCreate(
                id_factura_servicio=factura.id_factura_servicio,
                id_tarea_etapa=item.id_tarea_etapa,
                codigo_extendido=item.codigo_extendido,
                concepto=item.concepto,
                unidad_medida=item.unidad_medida,
                cantidad=item.cantidad,
                precio=item.precio,
                ajuste_porciento=item.ajuste_porciento,
                ajuste_valor=item.ajuste_valor,
            )
            await item_factura_servicio_repo.create(db, obj_in=item_data)

            if not es_prefactura:
                tarea = await tarea_etapa_repo.get(db, item.id_tarea_etapa)
                if tarea:
                    tarea.facturada = True

        oferta.estado = "CONFIRMADA"
        await db.commit()

        factura = await factura_servicio_repo.get(db, factura.id_factura_servicio)
        return FacturaServicioRead(**factura.model_dump())
