import logging
from decimal import Decimal
from types import SimpleNamespace
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto.ficha_costo_dto import (
    FichaCostoCreate,
    FichaCostoRead,
    FichaCostoUpdate,
    FichaInsumoCreate,
    FichaManoObraCreate,
)
from src.models import FichaCosto, FichaInsumo, FichaManoObra, Productos
from src.services.ficha_costo_calculo import calcular_ficha

logger = logging.getLogger(__name__)

_LOAD_OPTS = (
    selectinload(FichaCosto.insumos),
    selectinload(FichaCosto.mano_obra),
    selectinload(FichaCosto.producto),
)


def _to_read(ficha: FichaCosto) -> FichaCostoRead:
    read = FichaCostoRead.model_validate(ficha)
    if ficha.producto is not None:
        read.producto_nombre = ficha.producto.nombre
    return read


class FichaCostoService:
    # Campos que participan en el cálculo (para fusionar update parcial + vigentes)
    _CAMPOS_CALCULO = (
        "gasto_combustible",
        "gasto_osde",
        "nivel_produccion",
        "pct_energia",
        "pct_agua",
        "pct_otros_gastos_directos",
        "pct_vacaciones",
        "coef_gastos_asociados",
        "coef_gastos_generales",
        "coef_gastos_distribucion",
        "coef_gastos_financieros",
        "pct_seguridad_social",
        "pct_fuerza_trabajo",
        "pct_utilidad",
        "pct_impuesto_ventas",
    )

    @staticmethod
    def _montos(datos, insumos, mano_obra) -> dict:
        total_insumos = sum(
            (i.norma_consumo * i.precio_unitario for i in insumos), Decimal("0")
        )
        salario_directo = sum(
            (m.tarifa_horaria * m.norma_tiempo for m in mano_obra), Decimal("0")
        )
        montos = calcular_ficha(
            total_insumos=total_insumos,
            gasto_combustible=datos.gasto_combustible,
            salario_directo=salario_directo,
            gasto_osde=datos.gasto_osde,
            nivel_produccion=datos.nivel_produccion,
            pct_energia=datos.pct_energia,
            pct_agua=datos.pct_agua,
            pct_otros_gastos_directos=datos.pct_otros_gastos_directos,
            pct_vacaciones=datos.pct_vacaciones,
            coef_gastos_asociados=datos.coef_gastos_asociados,
            coef_gastos_generales=datos.coef_gastos_generales,
            coef_gastos_distribucion=datos.coef_gastos_distribucion,
            coef_gastos_financieros=datos.coef_gastos_financieros,
            pct_seguridad_social=datos.pct_seguridad_social,
            pct_fuerza_trabajo=datos.pct_fuerza_trabajo,
            pct_utilidad=datos.pct_utilidad,
            pct_impuesto_ventas=datos.pct_impuesto_ventas,
        )
        # Snapshot también de las entradas base usadas en el cálculo
        montos["total_insumos"] = total_insumos
        montos["salario_directo"] = salario_directo
        return montos

    @staticmethod
    async def listar(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        id_producto: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[FichaCostoRead]:
        stmt = select(FichaCosto).options(*_LOAD_OPTS)
        if id_producto:
            stmt = stmt.where(FichaCosto.id_producto == id_producto)
        if search:
            escaped = (
                search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            )
            stmt = stmt.where(
                (FichaCosto.numero_ficha.ilike(f"%{escaped}%"))
                | (FichaCosto.elaborado_por.ilike(f"%{escaped}%"))
            )
        stmt = stmt.order_by(FichaCosto.id_ficha.desc()).offset(skip).limit(limit)
        result = await db.exec(stmt)
        return [_to_read(f) for f in result.all()]

    @staticmethod
    async def obtener(db: AsyncSession, id_ficha: int) -> FichaCostoRead:
        stmt = (
            select(FichaCosto)
            .where(FichaCosto.id_ficha == id_ficha)
            .options(*_LOAD_OPTS)
        )
        result = await db.exec(stmt)
        ficha = result.first()
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha de costo no encontrada")
        return _to_read(ficha)

    @staticmethod
    async def ultima_por_producto(
        db: AsyncSession, id_producto: int
    ) -> Optional[FichaCostoRead]:
        stmt = (
            select(FichaCosto)
            .where(FichaCosto.id_producto == id_producto)
            .options(*_LOAD_OPTS)
            .order_by(FichaCosto.id_ficha.desc())
        )
        result = await db.exec(stmt)
        ficha = result.first()
        return _to_read(ficha) if ficha else None

    @staticmethod
    async def crear(db: AsyncSession, datos: FichaCostoCreate) -> FichaCostoRead:
        producto = await db.get(Productos, datos.id_producto)
        if not producto:
            raise HTTPException(status_code=400, detail="Producto no encontrado")

        ficha = FichaCosto(
            **datos.model_dump(exclude={"insumos", "mano_obra", "numero_ficha"}),
        )
        db.add(ficha)
        await db.flush()
        # El No. de ficha es el propio id (autoincremental)
        ficha.numero_ficha = str(ficha.id_ficha)

        for i in datos.insumos:
            db.add(
                FichaInsumo(
                    id_ficha=ficha.id_ficha,
                    id_producto=i.id_producto,
                    codigo=i.codigo or "",
                    nombre=i.nombre,
                    um=i.um,
                    norma_consumo=i.norma_consumo,
                    precio_unitario=i.precio_unitario,
                    costo=i.norma_consumo * i.precio_unitario,
                )
            )
        for m in datos.mano_obra:
            db.add(
                FichaManoObra(
                    id_ficha=ficha.id_ficha,
                    id_tarifa=m.id_tarifa,
                    categoria=m.categoria,
                    tarifa_horaria=m.tarifa_horaria,
                    norma_tiempo=m.norma_tiempo,
                    gasto_salario=m.tarifa_horaria * m.norma_tiempo,
                )
            )
        await db.flush()

        stmt = (
            select(FichaCosto)
            .where(FichaCosto.id_ficha == ficha.id_ficha)
            .options(*_LOAD_OPTS)
        )
        result = await db.exec(stmt)
        ficha_full = result.one()

        for campo, valor in FichaCostoService._montos(
            datos, ficha_full.insumos, ficha_full.mano_obra
        ).items():
            setattr(ficha_full, campo, valor)
        await db.commit()

        return await FichaCostoService.obtener(db, ficha.id_ficha)

    @staticmethod
    async def actualizar(
        db: AsyncSession, id_ficha: int, datos: FichaCostoUpdate
    ) -> FichaCostoRead:
        stmt = (
            select(FichaCosto)
            .where(FichaCosto.id_ficha == id_ficha)
            .options(*_LOAD_OPTS)
        )
        result = await db.exec(stmt)
        ficha = result.first()
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha de costo no encontrada")

        update_data = datos.model_dump(exclude_unset=True)
        insumos_data = update_data.pop("insumos", None)
        mano_obra_data = update_data.pop("mano_obra", None)
        ficha.sqlmodel_update(update_data)

        if insumos_data is not None:
            ficha.insumos = []
            await db.flush()
            for i in insumos_data:
                db.add(
                    FichaInsumo(
                        id_ficha=ficha.id_ficha,
                        id_producto=i.get("id_producto"),
                        codigo=i.get("codigo") or "",
                        nombre=i["nombre"],
                        um=i.get("um"),
                        norma_consumo=i["norma_consumo"],
                        precio_unitario=i["precio_unitario"],
                        costo=Decimal(str(i["norma_consumo"]))
                        * Decimal(str(i["precio_unitario"])),
                    )
                )

        if mano_obra_data is not None:
            ficha.mano_obra = []
            await db.flush()
            for m in mano_obra_data:
                db.add(
                    FichaManoObra(
                        id_ficha=ficha.id_ficha,
                        id_tarifa=m.get("id_tarifa"),
                        categoria=m["categoria"],
                        tarifa_horaria=m["tarifa_horaria"],
                        norma_tiempo=m["norma_tiempo"],
                        gasto_salario=Decimal(str(m["tarifa_horaria"]))
                        * Decimal(str(m["norma_tiempo"])),
                    )
                )
        await db.flush()

        stmt2 = (
            select(FichaCosto)
            .where(FichaCosto.id_ficha == id_ficha)
            .options(*_LOAD_OPTS)
        )
        result2 = await db.exec(stmt2)
        ficha_full = result2.one()

        # Fusionar: valores vigentes de la ficha + solo los campos enviados en el
        # update (evita pasar None al cálculo cuando el update es parcial).
        merged = {k: getattr(ficha_full, k) for k in FichaCostoService._CAMPOS_CALCULO}
        merged.update(
            {k: v for k, v in update_data.items() if k in merged and v is not None}
        )
        datos_calc = SimpleNamespace(**merged)

        insumos_para_calcular = (
            [FichaInsumoCreate(**i) for i in insumos_data]
            if insumos_data is not None
            else [
                FichaInsumoCreate(
                    codigo=i.codigo,
                    nombre=i.nombre,
                    um=i.um,
                    norma_consumo=i.norma_consumo,
                    precio_unitario=i.precio_unitario,
                )
                for i in ficha_full.insumos
            ]
        )
        mano_obra_para_calcular = (
            [FichaManoObraCreate(**m) for m in mano_obra_data]
            if mano_obra_data is not None
            else [
                FichaManoObraCreate(
                    id_tarifa=m.id_tarifa,
                    categoria=m.categoria,
                    tarifa_horaria=m.tarifa_horaria,
                    norma_tiempo=m.norma_tiempo,
                )
                for m in ficha_full.mano_obra
            ]
        )

        for campo, valor in FichaCostoService._montos(
            datos_calc, insumos_para_calcular, mano_obra_para_calcular
        ).items():
            setattr(ficha_full, campo, valor)
        await db.commit()

        return await FichaCostoService.obtener(db, id_ficha)

    @staticmethod
    async def eliminar(db: AsyncSession, id_ficha: int) -> None:
        stmt = select(FichaCosto).where(FichaCosto.id_ficha == id_ficha)
        result = await db.exec(stmt)
        ficha = result.first()
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha de costo no encontrada")
        await db.delete(ficha)
        await db.commit()
