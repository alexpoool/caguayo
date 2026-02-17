from fastapi import APIRouter
from .productos import router as productos_router
from .dashboard import router as dashboard_router
from .categorias import router as categorias_router
from .subcategorias import router as subcategorias_router
from .ventas import router as ventas_router
from .clientes import router as clientes_router
from .monedas import router as monedas_router
from .movimientos import router as movimientos_router
from .provedores import router as provedores_router
from .convenios import router as convenios_router
from .anexos import router as anexos_router
from .dependencias import router as dependencias_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(productos_router)
api_router.include_router(dashboard_router)
api_router.include_router(categorias_router)
api_router.include_router(subcategorias_router)
api_router.include_router(ventas_router)
api_router.include_router(clientes_router)
api_router.include_router(monedas_router)
api_router.include_router(movimientos_router)
api_router.include_router(provedores_router)
api_router.include_router(convenios_router)
api_router.include_router(anexos_router)
api_router.include_router(dependencias_router)


@api_router.get("/")
async def api_info():
    return {
        "message": "API de Inventario v1.0",
        "endpoints": {
            "productos": "/api/v1/productos",
            "categorias": "/api/v1/categorias",
            "subcategorias": "/api/v1/subcategorias",
            "ventas": "/api/v1/ventas",
            "clientes": "/api/v1/clientes",
            "monedas": "/api/v1/monedas",
            "movimientos": "/api/v1/movimientos",
            "dashboard": "/api/v1/dashboard/stats",
        },
    }
