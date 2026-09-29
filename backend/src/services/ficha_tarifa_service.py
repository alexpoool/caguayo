import logging
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto.ficha_tarifa_dto import (
    FichaTarifaCreate,
    FichaTarifaRead,
    FichaTarifaUpdate,
)
from src.models import FichaTarifa

logger = logging.getLogger(__name__)


def _to_read(t: FichaTarifa) -> FichaTarifaRead:
    return FichaTarifaRead.model_validate(t)


class FichaTarifaService:
    @staticmethod
    async def listar(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 200,
        search: Optional[str] = None,
    ) -> List[FichaTarifaRead]:
        stmt = select(FichaTarifa)
        if search:
            escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            stmt = stmt.where(FichaTarifa.categoria.ilike(f"%{escaped}%"))
        stmt = stmt.order_by(FichaTarifa.categoria).offset(skip).limit(limit)
        result = await db.exec(stmt)
        return [_to_read(t) for t in result.all()]

    @staticmethod
    async def obtener(db: AsyncSession, id_tarifa: int) -> FichaTarifaRead:
        tarifa = await db.get(FichaTarifa, id_tarifa)
        if not tarifa:
            raise HTTPException(status_code=404, detail="Tarifa no encontrada")
        return _to_read(tarifa)

    @staticmethod
    async def crear(db: AsyncSession, datos: FichaTarifaCreate) -> FichaTarifaRead:
        categoria = datos.categoria.strip()
        if not categoria:
            raise HTTPException(status_code=400, detail="La categoría es obligatoria")

        stmt = select(FichaTarifa).where(FichaTarifa.categoria == categoria)
        result = await db.exec(stmt)
        if result.first():
            raise HTTPException(
                status_code=409, detail="Ya existe una tarifa con esa categoría"
            )

        tarifa = FichaTarifa(categoria=categoria, tarifa_horaria=datos.tarifa_horaria)
        db.add(tarifa)
        await db.commit()
        await db.refresh(tarifa)
        return _to_read(tarifa)

    @staticmethod
    async def actualizar(
        db: AsyncSession, id_tarifa: int, datos: FichaTarifaUpdate
    ) -> FichaTarifaRead:
        tarifa = await db.get(FichaTarifa, id_tarifa)
        if not tarifa:
            raise HTTPException(status_code=404, detail="Tarifa no encontrada")

        update_data = datos.model_dump(exclude_unset=True)
        nueva_categoria = update_data.get("categoria")
        if nueva_categoria is not None:
            nueva_categoria = nueva_categoria.strip()
            if not nueva_categoria:
                raise HTTPException(status_code=400, detail="La categoría es obligatoria")
            stmt = select(FichaTarifa).where(
                FichaTarifa.categoria == nueva_categoria,
                FichaTarifa.id_tarifa != id_tarifa,
            )
            result = await db.exec(stmt)
            if result.first():
                raise HTTPException(
                    status_code=409, detail="Ya existe una tarifa con esa categoría"
                )
            update_data["categoria"] = nueva_categoria

        tarifa.sqlmodel_update(update_data)
        await db.commit()
        await db.refresh(tarifa)
        return _to_read(tarifa)

    @staticmethod
    async def eliminar(db: AsyncSession, id_tarifa: int) -> None:
        tarifa = await db.get(FichaTarifa, id_tarifa)
        if not tarifa:
            raise HTTPException(status_code=404, detail="Tarifa no encontrada")
        await db.delete(tarifa)
        await db.commit()
