import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DatabaseBackup,
  Database,
  HardDriveDownload,
  Eye,
  AlertTriangle,
  Loader2,
  Clock,
  Server,
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
} from "../components/ui";
import { backupsService } from "../services/administracion";

/** Formatea un tamaño en bytes a texto legible. */
function formatoTamano(bytes: number): string {
  if (!bytes) return "—";
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Listado de bases de datos operables (todas las no-template del servidor,
 * central incluida) con el resumen de sus backups. Una BD atiende N
 * dependencias: por eso el módulo está anclado a la BD, no a la dependencia.
 */
export function RespaldosPage() {
  const queryClient = useQueryClient();
  const [backupEnCurso, setBackupEnCurso] = useState<string | null>(null);

  const { data: bases = [], isLoading, error } = useQuery({
    queryKey: ["bases-datos-backups"],
    queryFn: () => backupsService.getBasesDatos(),
  });

  const lanzarBackup = useMutation({
    mutationFn: (baseDatos: string) => backupsService.crear(baseDatos),
    onSuccess: (_iniciado, baseDatos) => {
      toast.success(`Backup de ${baseDatos} lanzado — será visible en unos segundos`);
      // El dump y sidecars aparecen en el disco; al terminar el job el usuario
      // ve el detalle en la página de la BD. Refrescar el contador aquí.
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["bases-datos-backups"] }),
        1500,
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo lanzar el backup");
    },
    onSettled: (_data, _error, baseDatos) => {
      setBackupEnCurso((actual) => (actual === baseDatos ? null : actual));
    },
  });

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded shadow-lg">
            <DatabaseBackup className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Backups</h1>
            <p className="text-sm text-gray-500">
              Respaldos y restauración por base de datos (todas las BDs del
              servidor)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          No se pudieron obtener las bases de datos: {error.message}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            Bases de datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Cargando bases de datos…
            </div>
          ) : bases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No hay bases de datos operables en el servidor</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
                <TableRow>
                  <TableHead>Base de datos</TableHead>
                  <TableHead>Backups</TableHead>
                  <TableHead>Más reciente</TableHead>
                  <TableHead>Tamaño dumps</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bases.map((base) => (
                  <TableRow key={base.nombre_database} className="hover:bg-blue-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="font-mono">{base.nombre_database}</span>
                        {base.es_central && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                            Central
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{base.n_backups}</TableCell>
                    <TableCell>
                      {base.backup_mas_reciente ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {base.backup_mas_reciente.replace("T", " ").slice(0, 16)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">nunca</span>
                      )}
                    </TableCell>
                    <TableCell>{formatoTamano(base.tamano_total_bytes)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBackupEnCurso(base.nombre_database);
                            lanzarBackup.mutate(base.nombre_database);
                          }}
                          disabled={lanzarBackup.isPending && backupEnCurso === base.nombre_database}
                          className="text-green-600"
                          title="Crear backup de esta BD ahora"
                        >
                          {lanzarBackup.isPending &&
                          backupEnCurso === base.nombre_database ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <HardDriveDownload className="h-4 w-4 mr-1" />
                          )}
                          Backup
                        </Button>
                        <Link to={`/respaldos/${base.nombre_database}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver respaldos
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500 px-1">
        La restauración de una BD reemplaza TODA su información: todas las
        dependencias que atiende. Por eso, dentro del detalle, se pide
        confirmación tecleando el nombre de la base de datos y se conserva
        siempre una copia de la BD anterior (_prev_) para rollback.
      </p>
    </div>
  );
}
