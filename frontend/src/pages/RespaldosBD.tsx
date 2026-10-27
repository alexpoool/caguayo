import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  DatabaseBackup,
  HardDriveDownload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  Archive,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
} from "../components/ui";
import { backupsService } from "../services/administracion";
import type { BackupInfo, BackupJob } from "../types/backup";

/** Formatea un tamaño en bytes a texto legible. */
function formatoTamano(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** Badge de checksum/integridad de un dump. */
function BadgeIntegridad({ backup }: { backup: BackupInfo }) {
  if (backup.cabecera_ok === false || backup.checksum_ok === false) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
        <XCircle className="h-3 w-3" />
        Inválido
      </span>
    );
  }
  if (backup.checksum_ok === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
        <AlertTriangle className="h-3 w-3" />
        Sin .sha256
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
      <CheckCircle2 className="h-3 w-3" />
      Válido
    </span>
  );
}

/** Panel del job en ejecución (o terminado) con sus pasos. */
function PanelJob({ job }: { job: BackupJob }) {
  const esJobActivo = job.estado === "pendiente" || job.estado === "ejecutando";
  const colorEstado =
    job.estado === "completado"
      ? "bg-green-50 border-green-300"
      : job.estado === "fallido"
        ? "bg-red-50 border-red-300"
        : "bg-blue-50 border-blue-300";

  return (
    <div className={`mb-4 p-4 border rounded-lg ${colorEstado}`}>
      <div className="flex items-center gap-2 mb-3">
        {esJobActivo ? (
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        ) : job.estado === "completado" ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <span className="font-medium text-gray-900">
          {job.tipo === "backup" ? "Creación de backup" : "Restauración"} —{" "}
          {job.estado === "ejecutando"
            ? "en ejecución…"
            : job.estado === "pendiente"
              ? "en cola…"
              : job.estado === "completado"
                ? "completado"
                : "falló"}
        </span>
      </div>

      <ul className="space-y-1 text-sm">
        {job.pasos.map((paso) => (
          <li key={paso.paso} className="flex items-start gap-2">
            {paso.estado === "en_curso" ? (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin mt-0.5" />
            ) : paso.estado === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            ) : paso.estado === "advertencia" ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            ) : paso.estado === "error" ? (
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
            )}
            <span className="text-gray-800">
              {paso.paso.replace(/_/g, " ")}
              {paso.detalle && (
                <span className="text-gray-500"> — {paso.detalle}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {job.estado === "fallido" && (
        <p className="mt-3 text-sm text-red-700 bg-red-100 rounded p-2 leading-snug">
          {job.error}
        </p>
      )}

      {job.estado === "completado" && job.tipo === "restaurar" && (
        <p className="mt-3 text-sm text-green-800 bg-green-100 rounded p-2 leading-snug">
          Restauración aplicada ({job.resultado?.n_tablas} tablas). La BD anterior
          se conservó como
          <span className="font-mono"> {job.resultado?.bd_previa || "—"}</span>{" "}
          para rollback manual si hiciera falta.
        </p>
      )}
      {job.estado === "completado" && job.tipo === "backup" && (
        <p className="mt-3 text-sm text-green-800 bg-green-100 rounded p-2 leading-snug">
          Backup creado: {job.resultado?.archivo} (
          {formatoTamano(job.resultado?.tamano_bytes ?? 0)}).
        </p>
      )}
    </div>
  );
}

/**
 * Detalle de respaldos de UNA base de datos.
 * Una BD atiende N dependencias: el anclaje del módulo es la BD, no la
 * dependencia. `baseDatos` viene validado por el backend en cada operación.
 */
export function RespaldosBDPage() {
  const { baseDatos = "" } = useParams<{ baseDatos: string }>();
  const queryClient = useQueryClient();

  // UI local: modales de restaurar/eliminar + job en seguimiento
  const [restaurarModal, setRestaurarModal] = useState<{
    isOpen: boolean;
    backup: BackupInfo | null;
  }>({ isOpen: false, backup: null });
  const [textoConfirmacion, setTextoConfirmacion] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    backup: BackupInfo | null;
  }>({ isOpen: false, backup: null });
  const [seguimientoInfo, setSeguimientoInfo] = useState<{
    jobId: string;
    cerrado: boolean;
  } | null>(null);

  const { data: listado, isLoading: cargandoListado, error: errorListado } = useQuery({
    queryKey: ["backups", baseDatos],
    queryFn: () => backupsService.listar(baseDatos),
    enabled: !!baseDatos,
  });

  // Si hay un job lanzado, se hace polling de su estado hasta que termina y
  // entonces se recarga la lista de backups.
  const { data: job } = useQuery({
    queryKey: ["backup-job", seguimientoInfo?.jobId],
    queryFn: () => backupsService.getJob(seguimientoInfo!.jobId),
    refetchInterval: (query) =>
      query.state.data &&
      ["pendiente", "ejecutando"].includes(query.state.data.estado)
        ? 2000
        : false,
    enabled: !!seguimientoInfo?.jobId,
  });

  // Al terminar el job se recarga la lista de backups.
  useEffect(() => {
    if (job && !["pendiente", "ejecutando"].includes(job.estado)) {
      queryClient.invalidateQueries({ queryKey: ["backups", baseDatos] });
    }
  }, [job, baseDatos, queryClient]);

  const lanzarBackup = useMutation({
    mutationFn: () => backupsService.crear(baseDatos),
    onSuccess: (iniciado) => {
      setSeguimientoInfo({ jobId: iniciado.job_id, cerrado: false });
      toast.success("Backup lanzado");
    },
    onError: (error: any) => {
      toast.error(
        error?.message || "No se pudo lanzar el backup"
      );
    },
  });

  const lanzarRestaurar = useMutation({
    mutationFn: (archivo: string) => backupsService.restaurar(baseDatos, archivo),
    onSuccess: (iniciado) => {
      setRestaurarModal({ isOpen: false, backup: null });
      setTextoConfirmacion("");
      setSeguimientoInfo({ jobId: iniciado.job_id, cerrado: false });
      toast.success("Restauración lanzada");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo lanzar la restauración");
    },
  });

  const eliminarBackup = useMutation({
    mutationFn: (archivo: string) => backupsService.eliminar(archivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups", baseDatos] });
      setDeleteModal({ isOpen: false, backup: null });
      toast.success("Backup eliminado");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo eliminar el backup");
    },
  });

  const backups = listado?.backups ?? [];
  const bdsPrevias = listado?.bds_previas ?? [];
  // Confirmación de restauración: hay que teclear el nombre de la BD.
  const confirmacionValida = textoConfirmacion === baseDatos;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/respaldos">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Backups
            </Button>
          </Link>
          <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded shadow-lg">
            <DatabaseBackup className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Respaldos — {baseDatos}
            </h1>
            <p className="text-sm text-gray-500">
              Restaura toda la base de datos: cualquier dependencia que viva en
              ella queda respaldada con el dump.
            </p>
          </div>
        </div>
        <Button
          onClick={() => lanzarBackup.mutate()}
          disabled={lanzarBackup.isPending}
          isLoading={lanzarBackup.isPending}
          className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
        >
          <HardDriveDownload className="h-4 w-4" />
          Crear backup ahora
        </Button>
      </div>

      {errorListado && (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          No se pudieron listar los backups: {errorListado.message}
        </div>
      )}

      {/* Seguimiento del job en curso / último terminado */}
      {job && seguimientoInfo?.jobId && !seguimientoInfo.cerrado && (
        <Card>
          <CardContent className="pt-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setSeguimientoInfo({ ...seguimientoInfo, cerrado: true })}
            >
              <X className="h-4 w-4" />
            </Button>
            <PanelJob job={job} />
          </CardContent>
        </Card>
      )}

      {/* Copias de rollback (_prev_) dejadas por restores anteriores */}
      {bdsPrevias.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-medium text-blue-900 flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Copias de rollback disponibles ({bdsPrevias.length})
          </p>
          <p className="mt-1 text-blue-800">
            Tras cada restauración la BD activa anterior queda como copia
            genérica <span className="font-mono">_prev_&lt;fecha&gt;</span>. El
            rollback no se hace desde la UI: un administrador debe decidirlo y
            ejecutarlo — por ejemplo con{" "}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">
              ALTER DATABASE {baseDatos} RENAME TO {baseDatos}_cancelar; ALTER
              DATABASE {bdsPrevias[0]?.nombre} RENAME TO {baseDatos};
            </code>{" "}
            (deteniendo antes el backend).
          </p>
          <ul className="mt-2 space-y-1">
            {bdsPrevias.map((p) => (
              <li key={p.nombre} className="text-blue-700">
                <span className="font-mono">{p.nombre}</span>
                {p.fecha && (
                  <span className="text-blue-500 ml-2">
                    (del restore de {p.fecha})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla de backups */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-blue-600" />
            Backups disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cargandoListado ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Cargando backups…
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DatabaseBackup className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No hay backups para esta base de datos</p>
              <p className="text-xs text-gray-400 mt-1">
                Crea uno con el botón “Crear backup ahora”.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Integridad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.archivo} className="hover:bg-blue-50/50">
                    <TableCell className="whitespace-nowrap">
                      {backup.fecha}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{backup.archivo}</span>
                    </TableCell>
                    <TableCell>{formatoTamano(backup.tamano_bytes)}</TableCell>
                    <TableCell>
                      <BadgeIntegridad backup={backup} />
                      {backup.detalle_error && (
                        <span
                          className="text-xs text-red-600 ml-2"
                          title={backup.detalle_error}
                        >
                          {backup.detalle_error.slice(0, 40)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={backup.cabecera_ok === false}
                          onClick={() => {
                            setTextoConfirmacion("");
                            setRestaurarModal({ isOpen: true, backup });
                          }}
                          className="text-blue-600"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteModal({ isOpen: true, backup })}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de restauración con confirmación exigente */}
      {restaurarModal.isOpen && restaurarModal.backup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="flex items-start justify-between p-6 border-b rounded-t-2xl bg-gradient-to-r from-red-50 to-rose-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-red-600" />
                  Restaurar backup
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Operación destructiva: se reemplazará la base de datos
                  <span className="font-mono"> {baseDatos}</span> completa por el
                  contenido del backup.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRestaurarModal({ isOpen: false, backup: null })}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Archivo:</span>{" "}
                  <span className="font-mono">{restaurarModal.backup.archivo}</span>
                </p>
                <p>
                  <span className="text-gray-500">Fecha:</span>{" "}
                  {restaurarModal.backup.fecha}
                </p>
                <p>
                  <span className="text-gray-500">Tamaño:</span>{" "}
                  {formatoTamano(restaurarModal.backup.tamano_bytes)}
                </p>
              </div>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>
                  Se restaura a una BD temporal, se verifica el contenido
                  (tablas y filas) y SOLO entonces se hace el cambio.
                </li>
                <li>
                  La BD activa actual NO se borra: queda como copia de rollback
                  <span className="font-mono"> {baseDatos}_prev_&lt;fecha&gt;</span>.
                </li>
                <li>
                  Durante el swap se cierran las conexiones activas de la BD
                  (todos los usuarios de esta BD verán un error puntual).
                </li>
              </ul>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para confirmar, escriba el nombre de la base de datos{" "}
                  <span className="font-mono text-red-600">{baseDatos}</span>:
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none font-mono"
                  value={textoConfirmacion}
                  onChange={(e) => setTextoConfirmacion(e.target.value)}
                  placeholder={baseDatos}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setRestaurarModal({ isOpen: false, backup: null })}
              >
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!confirmacionValida || lanzarRestaurar.isPending}
                isLoading={lanzarRestaurar.isPending}
                onClick={() =>
                  lanzarRestaurar.mutate(restaurarModal.backup!.archivo)
                }
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restaurar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de backup */}
      <ConfirmModal
        isOpen={deleteModal.isOpen && !!deleteModal.backup}
        onClose={() => setDeleteModal({ isOpen: false, backup: null })}
        onConfirm={() => eliminarBackup.mutate(deleteModal.backup!.archivo)}
        title="Eliminar backup"
        message={`¿Eliminar definitivamente "${deleteModal.backup?.archivo}" (y sus archivos .sha256/.stats)? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}
