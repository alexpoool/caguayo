"""Router raíz del módulo RRHH (Fase 0).

Fase 0: solo expone la información del módulo (health/versión y submódulos
disponibles) para que el frontend pueda registrar la navegación. Los endpoints
de cada submódulo se agregan en las fases siguientes, cada uno en su propio
archivo (`rrhh_empleados.py`, `rrhh_asistencia.py`, …) con el prefijo
`/rrhh/<recurso>`.
"""

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

rrhh_router = APIRouter(prefix="/rrhh", tags=["rrhh"])


class RrhhSubmodulo(BaseModel):
    id: str
    nombre: str
    descripcion: str
    funcionalidad: str
    fase: int


class RrhhInfoResponse(BaseModel):
    modulo: str
    nombre: str
    version: str
    estado: str
    submodulos: List[RrhhSubmodulo]


_SUBMODULOS = [
    RrhhSubmodulo(
        id="catalogos",
        nombre="Catálogos",
        descripcion="Tipos de contrato, deducciones, bonificaciones, pago y calificaciones",
        funcionalidad="rrhh_catalogos",
        fase=1,
    ),
    RrhhSubmodulo(
        id="departamentos",
        nombre="Departamentos",
        descripcion="Estructura de departamentos y sus responsables",
        funcionalidad="rrhh_departamentos",
        fase=2,
    ),
    RrhhSubmodulo(
        id="puestos",
        nombre="Puestos",
        descripcion="Puestos de trabajo y rangos salariales",
        funcionalidad="rrhh_puestos",
        fase=2,
    ),
    RrhhSubmodulo(
        id="empleados",
        nombre="Empleados",
        descripcion="Ficha del personal, asignaciones y organigrama",
        funcionalidad="rrhh_empleados",
        fase=3,
    ),
    RrhhSubmodulo(
        id="asistencia",
        nombre="Asistencia",
        descripcion="Registro de entrada/salida, tardanzas y horas extras",
        funcionalidad="rrhh_asistencia",
        fase=4,
    ),
    RrhhSubmodulo(
        id="deducciones",
        nombre="Deducciones",
        descripcion="Deducciones por empleado y periodo",
        funcionalidad="rrhh_deducciones",
        fase=5,
    ),
    RrhhSubmodulo(
        id="bonificaciones",
        nombre="Bonificaciones",
        descripcion="Bonificaciones por empleado y periodo",
        funcionalidad="rrhh_bonificaciones",
        fase=5,
    ),
    RrhhSubmodulo(
        id="nomina",
        nombre="Nómina",
        descripcion="Generación de nómina, recibos y estados",
        funcionalidad="rrhh_nomina",
        fase=6,
    ),
    RrhhSubmodulo(
        id="pagos",
        nombre="Pagos",
        descripcion="Registro de pagos y comprobantes",
        funcionalidad="rrhh_pagos",
        fase=6,
    ),
    RrhhSubmodulo(
        id="solicitudes",
        nombre="Solicitudes",
        descripcion="Vacaciones y permisos con flujo de aprobación",
        funcionalidad="rrhh_solicitudes",
        fase=7,
    ),
    RrhhSubmodulo(
        id="evaluaciones",
        nombre="Evaluaciones",
        descripcion="Evaluaciones de desempeño, objetivos y metas",
        funcionalidad="rrhh_evaluaciones",
        fase=8,
    ),
    RrhhSubmodulo(
        id="reportes",
        nombre="Reportes",
        descripcion="Dashboards y reportes exportables del módulo",
        funcionalidad="rrhh_reportes",
        fase=9,
    ),
]


@rrhh_router.get("/info", response_model=RrhhInfoResponse)
async def rrhh_info() -> RrhhInfoResponse:
    """Información del módulo RRHH y sus submódulos (Fase 0: esqueleto)."""
    return RrhhInfoResponse(
        modulo="rrhh",
        nombre="Recursos Humanos",
        version="0.1.0",
        estado="fase-0",
        submodulos=_SUBMODULOS,
    )
