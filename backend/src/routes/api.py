from fastapi import APIRouter
from .productos import router as productos_router
from .dashboard import router as dashboard_router
from .categorias import router as categorias_router
from .ventas import router as ventas_router
from .clientes import router as clientes_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(productos_router)
api_router.include_router(dashboard_router)
api_router.include_router(categorias_router)
api_router.include_router(ventas_router)
api_router.include_router(clientes_router)


@api_router.get("/")
async def api_info():
    return {
        "message": "API de Inventario v1.0",
        "endpoints": {
            "productos": "/api/v1/productos",
            "categorias": "/api/v1/categorias",
            "ventas": "/api/v1/ventas",
            "clientes": "/api/v1/clientes",
            "dashboard": "/api/v1/dashboard/stats",
        },
    }
