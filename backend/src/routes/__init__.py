from fastapi import APIRouter
from .productos import router as productos_router
from .dashboard import router as dashboard_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(productos_router)
api_router.include_router(dashboard_router)


@api_router.get("/")
async def api_info():
    return {
        "message": "API de Inventario v1.0",
        "endpoints": {
            "productos": "/api/v1/productos",
            "dashboard": "/api/v1/dashboard/stats",
        },
    }
