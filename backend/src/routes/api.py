from fastapi import APIRouter
from .productos import router as productos_router
from .dashboard import router as dashboard_router
from .categorias import router as categorias_router
from .subcategorias import router as subcategorias_router
from .ventas import router as ventas_router
from .clientes import router as clientes_router
from .monedas import router as monedas_router
from .movimientos import router as movimientos_router
from .convenios import router as convenios_router
from .anexos import router as anexos_router
from .dependencias import router as dependencias_router
from .configuracion import router as configuracion_router
from .administracion import router as administracion_router
from .auth import router as auth_router
from .conexiones import router as conexiones_router
from .tipos_entidad import router as tipos_entidad_router
from .clientes_naturales import router as clientes_naturales_router
from .clientes_juridicas import router as clientes_juridicas_router
from .clientes_tcp import router as clientes_tcp_router
from .cuentas import router as cuentas_router
from .ventas_operaciones import (
    contratos_router,
    suplementos_router,
    facturas_router,
    ventas_efectivo_router,
)
from .productos_en_liquidacion import router as productos_en_liquidacion_router
from .liquidaciones import router as liquidaciones_router
from .pagos import router as pagos_router
from .reportes_router import router as reportes_router
from .servicios import (
    servicios_router,
    solicitudes_router,
    etapas_router,
    tareas_etapa_router,
    persona_etapa_router,
    facturas_servicio_router,
    pagos_factura_servicio_router,
    persona_liquidacion_router,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(conexiones_router)
api_router.include_router(productos_router)
api_router.include_router(dashboard_router)
api_router.include_router(categorias_router)
api_router.include_router(subcategorias_router)
api_router.include_router(ventas_router)
api_router.include_router(clientes_router)
api_router.include_router(monedas_router)
api_router.include_router(movimientos_router)
api_router.include_router(convenios_router)
api_router.include_router(anexos_router)
api_router.include_router(dependencias_router)
api_router.include_router(configuracion_router)
api_router.include_router(administracion_router)
api_router.include_router(tipos_entidad_router)
api_router.include_router(clientes_naturales_router)
api_router.include_router(clientes_juridicas_router)
api_router.include_router(clientes_tcp_router)
api_router.include_router(cuentas_router)
api_router.include_router(contratos_router)
api_router.include_router(suplementos_router)
api_router.include_router(facturas_router)
api_router.include_router(ventas_efectivo_router)
api_router.include_router(productos_en_liquidacion_router)
api_router.include_router(liquidaciones_router)
api_router.include_router(pagos_router)
api_router.include_router(reportes_router)
api_router.include_router(servicios_router)
api_router.include_router(solicitudes_router)
api_router.include_router(etapas_router)
api_router.include_router(tareas_etapa_router)
api_router.include_router(persona_etapa_router)
api_router.include_router(facturas_servicio_router)
api_router.include_router(pagos_factura_servicio_router)
api_router.include_router(persona_liquidacion_router)


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
            "configuracion": "/api/v1/configuracion",
            "administracion": "/api/v1/administracion",
            "dependencias": "/api/v1/dependencias",
            "dashboard": "/api/v1/dashboard/stats",
            "auth": "/api/v1/auth",
            "contratos": "/api/v1/contratos",
            "facturas": "/api/v1/facturas",
            "suplementos": "/api/v1/suplementos",
            "ventas_efectivo": "/api/v1/ventas-efectivo",
            "productos_en_liquidacion": "/api/v1/productos-en-liquidacion",
            "pagos": "/api/v1/pagos",
            "servicios": "/api/v1/servicios",
            "solicitudes_servicio": "/api/v1/solicitudes-servicio",
            "etapas": "/api/v1/etapas",
            "tareas_etapa": "/api/v1/tareas-etapa",
            "persona_etapa": "/api/v1/persona-etapa",
            "facturas_servicio": "/api/v1/facturas-servicio",
            "pagos_factura_servicio": "/api/v1/pagos-factura-servicio",
            "persona_liquidacion": "/api/v1/persona-liquidacion",
        },
    }
