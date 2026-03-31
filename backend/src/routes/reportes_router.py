from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from datetime import date

from src.database.connection import get_session
# Add your auth dependency as needed, for now generating dummy user
from src.services.reportes_service import (
    get_proveedores_por_dependencia,
    get_existencias,
    get_movimientos_dependencia,
    get_movimientos_producto
)
from src.utils.pdf_generator import (
    generar_pdf_proveedores_dependencia,
    generar_pdf_existencias,
    generar_pdf_movimientos_dependencia,
    generar_pdf_movimientos_producto
)

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"]
)

@router.get("/proveedores-dependencia")
def obtener_reporte_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: Session = Depends(get_session)
    # user = Depends(get_current_user)
):
    try:
        proveedores, dependencia_info = get_proveedores_por_dependencia(
            db, 
            id_dependencia, 
            tipo_entidad, 
            id_provincia
        )
        
        # Replace dummy with `user.username` if auth is integrated
        usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_proveedores_dependencia(
            proveedores, 
            dependencia_info, 
            tipo_entidad, 
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo
        )
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=proveedores_{id_dependencia}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/existencias")
def obtener_reporte_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: Session = Depends(get_session)
):
    try:
        existencias, dependencia_info = get_existencias(db, id_dependencia)
        
        usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_existencias(
            existencias, 
            dependencia_info, 
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo
        )
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=existencias_{id_dependencia}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movimientos-dependencia")
def obtener_reporte_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: Session = Depends(get_session)
):
    try:
        movimientos, dependencia_info = get_movimientos_dependencia(
            db, id_dependencia, fecha_inicio, fecha_fin
        )
        
        usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_movimientos_dependencia(
            movimientos, 
            dependencia_info, 
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo
        )
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=movimientos_dependencia_{id_dependencia}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movimientos-producto")
def obtener_reporte_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: Session = Depends(get_session)
):
    try:
        movimientos, dependencia_info, producto_info = get_movimientos_producto(
            db, id_dependencia, id_producto, fecha_inicio, fecha_fin
        )
        
        usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_movimientos_producto(
            movimientos, 
            producto_info,
            dependencia_info, 
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo
        )
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=movimientos_producto_{id_producto}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

