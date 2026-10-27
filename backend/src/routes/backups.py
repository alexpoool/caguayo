"""Endpoints de backups/restauración por base de datos (funcionalidad 'backups').

Una base de datos atiende N dependencias: por eso el anclaje del módulo es la
BD (todas las BDs no-template del servidor, igual que el router /conexiones),
no la dependencia. Los endpoints de acción exigen autenticación + la
funcionalidad 'backups' del grupo del usuario; el polling del estado de jobs
sólo valida el token (sin sesión de BD: una conexión a la BD en swap
bloquearía el RENAME del restore).

Los archivos se resuelven SIEMPRE dentro de BACKUP_DIR con whitelist estricta,
y las BDs se operan sólo si existen en el servidor. El trabajo pesado (dump,
restore, verificaciones, swap) corre como job en background; el frontend hace
polling de GET /jobs/{job_id}.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    BackupJob,
    BackupJobIniciado,
    BackupListado,
    BackupRestaurarRequest,
)
from src.services.backup_service import (
    backup_job_manager,
    existe_bd_servidor,
    listar_backups,
    listar_bases_datos,
    validar_archivo_backup,
)
from src.utils.auth import require_funcionalidad, verify_auth, verify_auth_token_only

router = APIRouter(prefix="/backups", tags=["backups"], redirect_slashes=False)
usuario_autorizado = require_funcionalidad("backups")


@router.get("/bases-datos")
async def listar_bases_datos_con_backups(
    usuario: dict = Depends(verify_auth),
):
    """BDs no-template del servidor con resumen de backups por BD.

    Requiere autenticación (el detalle y las operaciones sí exigen la
    funcionalidad 'backups'; el listado de BDs es inofensivo).
    """
    try:
        return listar_bases_datos()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudieron obtener las bases de datos del servidor: {e}",
        )


@router.get("/bases-datos/{base_datos}/listar", response_model=BackupListado)
async def listar_backups_base_datos(
    base_datos: str,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Lista los backups disponibles para una BD + BDs _prev_ de rollback."""
    if not existe_bd_servidor(base_datos):
        raise HTTPException(status_code=404, detail="La base de datos no existe")
    try:
        return listar_backups(base_datos)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar backups: {e}")


@router.post("/bases-datos/{base_datos}/crear", response_model=BackupJobIniciado)
async def crear_backup_base_datos(
    base_datos: str,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Crea un backup pg_dump -Fc de la BD (job en background)."""
    if not existe_bd_servidor(base_datos):
        raise HTTPException(status_code=404, detail="La base de datos no existe")
    try:
        job = backup_job_manager.lanzar_backup(base_datos)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return BackupJobIniciado(
        job_id=job["id"], tipo=job["tipo"], estado=job["estado"]
    )


@router.post("/bases-datos/{base_datos}/restaurar", response_model=BackupJobIniciado)
async def restaurar_backup_base_datos(
    base_datos: str,
    data: BackupRestaurarRequest,
    db: AsyncSession = Depends(get_session),
    usuario: dict = Depends(usuario_autorizado),
):
    """Restaura un .dump concreto en la BD indicada (job en background).

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

    if not existe_bd_servidor(base_datos):
        raise HTTPException(status_code=404, detail="La base de datos no existe")

    # El dump debe corresponder a ESTA BD. Se comprueba por el nombre de BD
    # deducido del archivo (patrón {bd}_...): jamás se restaura una BD en otra.
    from src.services.backup_service import _base_de_nombre_archivo

    bd_de_archivo = _base_de_nombre_archivo(dump.name)
    if bd_de_archivo and bd_de_archivo != base_datos:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El backup '{dump.name}' pertenece a la BD '{bd_de_archivo}', "
                f"no a la BD pedida '{base_datos}'"
            ),
        )

    try:
        job = backup_job_manager.lanzar_restaurar(base_datos, dump)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return BackupJobIniciado(
        job_id=job["id"], tipo=job["tipo"], estado=job["estado"]
    )


@router.get("/jobs/{job_id}", response_model=BackupJob)
async def obtener_estado_job(
    job_id: str,
    usuario: dict = Depends(verify_auth_token_only),
):
    """Polling del estado de un job de backup/restauración.

    IMPORTANTE: NO abre sesión contra la BD tenant (dependencia
    verify_auth_token_only). El navegador sondea este endpoint cada ~2 s
    mientras corre un restore, y una sesión a la BD en swap bloquearía el
    RENAME: cada poll re-abriría la conexión que el job acaba de cortar.
    El job_id es un uuid opaco no adivinable; las acciones (crear/restaurar/
    eliminar/listar) sí exigen la funcionalidad 'backups' con sesión.
    """
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
