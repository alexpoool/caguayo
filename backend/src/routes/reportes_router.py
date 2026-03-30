from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from src.database.connection import get_session
# Add your auth dependency as needed, for now generating dummy user
from src.services.reportes_service import get_proveedores_por_dependencia
from src.utils.pdf_generator import generar_pdf_proveedores_dependencia

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
