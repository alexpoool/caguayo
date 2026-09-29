import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto.ficha_costo_dto import FichaCostoCreate, FichaCostoRead, FichaCostoUpdate
from src.models import FichaTarifa, Productos
from src.services.ficha_costo_service import FichaCostoService
from src.services.ficha_costo_excel import exportar_ficha_excel
from src.services.ficha_costo_pdf import exportar_ficha_pdf


class FichaExportFirmas(BaseModel):
    """Datos de firmas solicitados al exportar el documento."""

    elaborado_por: Optional[str] = None
    aprobado_por: Optional[str] = None
    fecha_aprobacion: Optional[date] = None

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fichas-costo", tags=["fichas-costo"], redirect_slashes=False
)


@router.get("", response_model=List[FichaCostoRead])
async def listar_fichas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    id_producto: Optional[int] = Query(None, description="Filtrar por producto"),
    search: Optional[str] = Query(
        None, description="Buscar por número de ficha o elaborador"
    ),
    db: AsyncSession = Depends(get_session),
):
    try:
        return await FichaCostoService.listar(
            db, skip=skip, limit=limit, id_producto=id_producto, search=search
        )
    except Exception as e:
        logger.error("Error en listar_fichas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/producto/{id_producto}/ultima", response_model=FichaCostoRead)
async def ultima_ficha_por_producto(
    id_producto: int,
    db: AsyncSession = Depends(get_session),
):
    """Última ficha de costo de un producto (para sugerir precio)."""
    ficha = await FichaCostoService.ultima_por_producto(db, id_producto)
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="El producto no tiene fichas de costo registradas",
        )
    return ficha


@router.get("/{id_ficha}", response_model=FichaCostoRead)
async def obtener_ficha(
    id_ficha: int,
    db: AsyncSession = Depends(get_session),
):
    return await FichaCostoService.obtener(db, id_ficha)


@router.post("", response_model=FichaCostoRead, status_code=201)
async def crear_ficha(
    datos: FichaCostoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear ficha de costo: recalcula todos los importes y los persiste."""
    try:
        return await FichaCostoService.crear(db, datos)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al crear ficha de costo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{id_ficha}", response_model=FichaCostoRead)
async def actualizar_ficha(
    id_ficha: int,
    datos: FichaCostoUpdate,
    db: AsyncSession = Depends(get_session),
):
    try:
        return await FichaCostoService.actualizar(db, id_ficha, datos)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al actualizar ficha de costo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


async def _cargar_ficha_orm(db: AsyncSession, id_ficha: int):
    from src.models import FichaCosto
    from sqlalchemy.orm import selectinload

    stmt = (
        select(FichaCosto)
        .where(FichaCosto.id_ficha == id_ficha)
        .options(
            selectinload(FichaCosto.insumos),
            selectinload(FichaCosto.mano_obra),
            selectinload(FichaCosto.producto),
        )
    )
    result = await db.exec(stmt)
    return result.one()


@router.post("/{id_ficha}/exportar")
async def exportar_ficha(
    id_ficha: int,
    firmas: FichaExportFirmas,
    db: AsyncSession = Depends(get_session),
):
    """Exporta la ficha de costo como documento Excel (documento base).

    Los datos de firmas se solicitan al usuario en el momento de exportar.
    """
    ficha_read = await FichaCostoService.obtener(db, id_ficha)
    ficha = await _cargar_ficha_orm(db, id_ficha)

    tarifas = (await db.exec(select(FichaTarifa).order_by(FichaTarifa.categoria))).all()
    productos = (await db.exec(select(Productos).order_by(Productos.codigo))).all()

    contenido = exportar_ficha_excel(
        ficha,
        producto_nombre=ficha_read.producto_nombre or "",
        tarifas=tarifas,
        productos=productos,
        elaborado_por=firmas.elaborado_por,
        aprobado_por=firmas.aprobado_por,
        fecha_aprobacion=firmas.fecha_aprobacion,
    )
    nombre = f"FICHA {ficha.numero_ficha or id_ficha}.xlsx"
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@router.post("/{id_ficha}/exportar-pdf")
async def exportar_ficha_pdf_endpoint(
    id_ficha: int,
    firmas: FichaExportFirmas,
    db: AsyncSession = Depends(get_session),
):
    """Exporta la ficha de costo como PDF (Ficha + Materiales + Mano de obra)."""
    ficha_read = await FichaCostoService.obtener(db, id_ficha)
    ficha = await _cargar_ficha_orm(db, id_ficha)

    contenido = exportar_ficha_pdf(
        ficha,
        producto_nombre=ficha_read.producto_nombre or "",
        elaborado_por=firmas.elaborado_por,
        aprobado_por=firmas.aprobado_por,
        fecha_aprobacion=firmas.fecha_aprobacion,
    )
    nombre = f"FICHA {ficha.numero_ficha or id_ficha}.pdf"
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@router.delete("/{id_ficha}", status_code=204)
async def eliminar_ficha(
    id_ficha: int,
    db: AsyncSession = Depends(get_session),
):
    try:
        await FichaCostoService.eliminar(db, id_ficha)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al eliminar ficha de costo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
