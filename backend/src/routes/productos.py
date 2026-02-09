from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import List
from src.database.connection import get_session
from src.services import ProductosService
from src.dto import ProductosCreate, ProductosRead, ProductosUpdate

router = APIRouter(prefix="/productos", tags=["productos"])


@router.post("", response_model=ProductosRead)
async def create_producto(
    producto: ProductosCreate, db: AsyncSession = Depends(get_session)
):
    try:
        return await ProductosService.create_producto(db, producto)
    except IntegrityError as e:
        print(f"Integrity Error creating product: {e}")
        raise HTTPException(
            status_code=400,
            detail="Error de datos: Verifique que la subcategoría y monedas seleccionadas existan.",
        )
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[ProductosRead])
async def read_productos(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    return await ProductosService.get_productos(db, skip=skip, limit=limit)


@router.get("/search/{nombre}", response_model=List[ProductosRead])
async def search_productos(nombre: str, db: AsyncSession = Depends(get_session)):
    return await ProductosService.search_productos(db, nombre=nombre)


@router.get("/{producto_id}", response_model=ProductosRead)
async def read_producto(producto_id: int, db: AsyncSession = Depends(get_session)):
    producto = await ProductosService.get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.put("/{producto_id}", response_model=ProductosRead)
async def update_producto(
    producto_id: int, producto: ProductosUpdate, db: AsyncSession = Depends(get_session)
):
    updated_producto = await ProductosService.update_producto(db, producto_id, producto)
    if not updated_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return updated_producto


@router.delete("/{producto_id}")
async def delete_producto(producto_id: int, db: AsyncSession = Depends(get_session)):
    try:
        deleted = await ProductosService.delete_producto(db, producto_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"message": "Producto eliminado correctamente"}
    except IntegrityError as e:
        print(f"Integrity Error deleting product: {e}")
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el producto porque tiene ventas o movimientos asociados.",
        )
    except Exception as e:
        print(f"Error deleting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))
