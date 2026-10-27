"""Endpoints de backups/restauración para dependencias (funcionalidad 'backups').

Todos los endpoints exigen autenticación + la funcionalidad 'backups' del
grupo del usuario. Ninguno deja operar con rutas de archivo arbitrarias: se
resuelven exclusivamente dentro de BACKUP_DIR con whitelist estricta.

El trabajo pesado (dump, restore, verificaciones) corre como job en
background; el frontend hace polling de GET /jobs/{job_id}.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    BackupJob,
    BackupJobIniciado,
    BackupListado,
    BackupRestaurarRequest,
)
from src.models import Dependencia
from src.services.backup_service import (
    backup_job_manager,
    listar_backups,
    validar_archivo_backup,
)
from src.utils.auth import require_funcionalidad

router = APIRouter(prefix="/backups", tags=["backups"], redirect_slashes=False)

usuario_autorizado = require_funcionalidad("backups")


async def _obtener_dependencia(db: AsyncSession, dependencia_id: int) -> Dependencia:
    """Carga la dependencia y valida que tenga BD asignada."""
    dep = await db.get(Dependencia, dependencia_id)
    if not dep:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    if not dep.base_datos:
        raise HTTPException(
            status_code=400,
            detail=(
                "La dependencia no tiene base de datos asignada "
                "(los backups operan sobre la BD de la dependencia)"
            ),
        )
    return dep


@router.get("/dependencias/{dependencia_id}/listar", response_model=BackupListado)
async def listar_backups_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Lista los backups disponibles para la BD de una dependencia + BDs _prev_ de rollback."""
    dep = await _obtener_dependencia(db, dependencia_id)
    try:
        return listar_backups(dep.base_datos)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar backups: {e}")


@router.post("/dependencias/{dependencia_id}/crear", response_model=BackupJobIniciado)
async def crear_backup_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Crea un backup pg_dump -Fc de la BD de la dependencia (job en background)."""
    dep = await _obtener_dependencia(db, dependencia_id)
    try:
        job = backup_job_manager.lanzar_backup(dep.base_datos)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return BackupJobIniciado(
        job_id=job["id"], tipo=job["tipo"], estado=job["estado"]
    )


@router.post("/dependencias/{dependencia_id}/restaurar", response_model=BackupJobIniciado)
async def restaurar_backup_dependencia(
    dependencia_id: int,
    data: BackupRestaurarRequest,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Restaura un .dump concreto en la BD de la dependencia (job en background).

    Flujo del job: verificación SHA256 + cabecera → restore a BD temporal →
    verificación de tablas/filas → swap con la BD activa (la anterior queda
    como {bd}_prev_{fecha} para rollback manual).
    """
    try:
        dump = validar_archivo_backup(data.archivo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dump.exists():
        raise HTTPException(status_code=404, detail="El archivo de backup no existe")

    dep = await _obtener_dependencia(db, dependencia_id)

    # El dump debe corresponder a ESTA dependencia. Se comprueba por el nombre
    # de BD deducido del archivo (patrón {bd}_...). Si el nombre del dump es de
    # otra BD, se rechaza: jamás se restaura una BD en otra.
    from src.services.backup_service import _base_de_nombre_archivo

    bd_de_archivo = _base_de_nombre_archivo(dump.name)
    if bd_de_archivo and bd_de_archivo != dep.base_datos:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El backup '{dump.name}' pertenece a la BD '{bd_de_archivo}', no "
                f"a la BD '{dep.base_datos}' de esta dependencia"
            ),
        )

    try:
        job = backup_job_manager.lanzar_restaurar(dep.base_datos, dump)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return BackupJobIniciado(
        job_id=job["id"], tipo=job["tipo"], estado=job["estado"]
    )


@router.get("/jobs/{job_id}", response_model=BackupJob)
async def obtener_estado_job(
    job_id: str,
    usuario: dict = Depends(usuario_autorizado),
):
    """Polling del estado de un job de backup/restauración."""
    job = backup_job_manager.obtener(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado o expirado")
    return job


@router.delete("/{archivo}", status_code=204)
async def eliminar_backup(
    archivo: str,
    usuario: dict = Depends(usuario_autorizado),
):
    """Elimina un backup (.dump) y sus sidecars (.sha256, .stats) del directorio.

    Doble confirmación en el frontend; aquí sólo se valida que el nombre sea
    un archivo legítimo dentro de BACKUP_DIR.
    """
    try:
        dump = validar_archivo_backup(archivo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dump.exists():
        raise HTTPException(status_code=404, detail="El archivo de backup no existe")

    errores = []
    for ruta in (
        dump,
        dump.with_suffix(dump.suffix + ".sha256"),
        dump.with_suffix(dump.suffix + ".stats"),
    ):
        try:
            ruta.unlink(missing_ok=True)
        except OSError as e:
            errores.append(f"{ruta.name}: {e}")
    if errores:
        raise HTTPException(status_code=500, detail="No se pudo eliminar: " + "; ".join(errores))
