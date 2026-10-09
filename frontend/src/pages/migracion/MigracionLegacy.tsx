import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  PlayCircle,
} from "lucide-react";

import { Button, Card } from "../../components/ui";
import { migracionService } from "../../services/administracion";
import type { InformeMigracion } from "../../types/index";

const ROLES: { id: "comercial" | "principal"; etiqueta: string; ayuda: string }[] = [
  {
    id: "comercial",
    etiqueta: "Base caguayo_comercial",
    ayuda: "Artistas, clientes, usuarios y grupos. Es el fichero grande.",
  },
  {
    id: "principal",
    etiqueta: "Base caguayo (principal)",
    ayuda: "Tipos de convenio, contratos y solicitudes. El pequeño.",
  },
];

const RECUENTOS: [string, string][] = [
  ["clientes", "Clientes"],
  ["clientes_persona_natural", "Personas naturales"],
  ["clientes_persona_juridica", "Personas jurídicas"],
  ["cuenta", "Cuentas bancarias"],
  ["usuarios", "Usuarios"],
  ["grupo", "Grupos"],
  ["especialidades_artisticas", "Especialidades"],
  ["tipo_contrato", "Tipos de contrato"],
  ["tipo_convenio", "Tipos de convenio"],
];

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MigracionLegacy: React.FC = () => {
  const queryClient = useQueryClient();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: estado, isLoading: cargandoEstado } = useQuery({
    queryKey: ["migracion-estado"],
    queryFn: () => migracionService.getEstado(),
  });

  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [informe, setInforme] = useState<InformeMigracion | null>(null);

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["migracion-estado"] });
  };

  const subir = useMutation({
    mutationFn: async ({ rol, fichero }: { rol: string; fichero: File }) => {
      setSubiendo(rol);
      return await migracionService.subirFichero(rol, fichero);
    },
    onSuccess: (info) => {
      setInforme(null);
      toast.success(`${info.etiqueta}: ${tamanoLegible(info.bytes)}`);
      refrescar();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el fichero");
    },
    onSettled: () => setSubiendo(null),
  });

  const quitar = useMutation({
    mutationFn: (rol: string) => migracionService.quitarFichero(rol),
    onSuccess: () => {
      setInforme(null);
      const el = inputs.current;
      if (el) Object.values(el).forEach((i) => { if (i) i.value = ""; });
      refrescar();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo quitar"),
  });

  const analizar = useMutation({
    mutationFn: () => migracionService.analizar(),
    onSuccess: (r) => {
      setInforme(r);
      if (!r.ok) toast.error("El análisis ha salido con errores");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo analizar"),
  });

  const ejecutar = useMutation({
    mutationFn: () => migracionService.ejecutar(),
    onSuccess: (r) => {
      setInforme(r);
      refrescar();
      if (r.ok) {
        toast.success(
          r.total_a_insertar > 0
            ? `Migración hecha: ${r.total_a_insertar} fila(s) insertada(s)`
            : "Migración hecha: no había nada que insertar"
        );
      } else {
        toast.error("La migración ha salido con errores. Mira el log.");
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo ejecutar"),
  });

  const Occupation = subir.isPending || analizar.isPending || ejecutar.isPending;
  const todosSubidos =
    !!estado?.ficheros && ROLES.every((r) => estado.ficheros[r.id]?.subido);

  return (
    <div className="space-y-4">
      {/* ---- Los dos ficheros del legacy ---------------------------------- */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Ficheros del legacy
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          El legacy no está en un fichero sino en dos bases distintas. Se
          necesitan las dos: la comercial no tiene ni una fila de tipo de
          convenio.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {ROLES.map(({ id, etiqueta, ayuda }) => {
            const info = estado?.ficheros?.[id];
            return (
              <div
                key={id}
                className="rounded-md border border-gray-200 p-3 bg-gray-50/50"
              >
                <p className="text-sm font-medium text-gray-800">{etiqueta}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ayuda}</p>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={(el) => { inputs.current[id] = el; }}
                    type="file"
                    accept=".sql,.dump"
                    disabled={ Occupation || !estado?.identidad.coherente}
                    onChange={(e) => {
                      const fichero = e.target.files?.[0];
                      if (fichero) subir.mutate({ rol: id, fichero });
                    }}
                    className="w-full text-sm text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-white file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-100 disabled:opacity-50"
                  />
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  {subiendo === id ? (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      subiendo
                    </span>
                  ) : info?.subido ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-700">
                        {tamanoLegible(info.bytes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitar.mutate(id)}
                        className="ml-auto inline-flex items-center gap-1 text-gray-500 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        quitar
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400">sin subir</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---- Avería de identidad de bases -------------------------------- */}
      {estado && !estado.identidad.coherente && (
        <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-medium">No se puede migrar con la configuración actual</p>
            <ul className="mt-1 list-disc list-inside">
              {estado.identidad.detalle.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="mt-1">
              El ETL migraría una base que la aplicación no está sirviendo.
            </p>
          </div>
        </div>
      )}

      {/* ---- Ejecutar ---------------------------------------------------- */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Ejecutar</h3>
        <p className="text-sm text-gray-500 mb-4">
          Primero analiza, que no escribe nada. Sólo se habilita ejecutar con
          los dos ficheros subidos y un análisis previo.
        </p>

        {estado?.operacion_en_curso && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hay una migración en marcha.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => analizar.mutate()}
            disabled={
              !todosSubidos ||
              Occupation ||
              !estado?.identidad.coherente ||
              estado?.operacion_en_curso
            }
            isLoading={analizar.isPending}
            leftIcon={<FileUp className="h-4 w-4" />}
          >
            Analizar
          </Button>
          <Button
            onClick={() => ejecutar.mutate()}
            disabled={
              !informe ||
              !todosSubidos ||
              !informe.ok ||
              Occupation ||
              estado?.operacion_en_curso
            }
            isLoading={ejecutar.isPending}
            leftIcon={<PlayCircle className="h-4 w-4" />}
          >
            Ejecutar migración
          </Button>
        </div>
      </Card>

      {/* ---- Informe ----------------------------------------------------- */}
      {informe && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">
              {informe.commit ? "Resultado" : "Análisis previo"}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${
                informe.ok
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {informe.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {informe.resultado || (informe.ok ? "Sin incidencias" : "Con errores")}
            </span>
            <span className="text-sm text-gray-600">
              {informe.total_a_insertar} fila(s) a insertar
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Fase</th>
                  <th className="px-3 py-2 text-left">A insertar</th>
                </tr>
              </thead>
              <tbody>
                {informe.fases.map((f) => (
                  <tr key={f.letra} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800">
                        {f.letra}. {f.titulo}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        f.a_insertar > 0 ? "text-amber-700" : "text-gray-400"
                      }`}
                    >
                      {f.a_insertar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {informe.total_a_insertar === 0 && (
            <p className="mt-3 text-sm text-gray-500">
              No hay nada pendiente: todo lo del fichero ya está en la base.
            </p>
          )}

          {informe.log.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600">
                Ver el log completo
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                {informe.log.join("\n")}
              </pre>
            </details>
          )}
        </Card>
      )}

      {/* ---- Estado de la base ------------------------------------------- */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Estado</h3>
          {estado?.revision && (
            <span className="text-xs text-gray-500">
              revisión {estado.revision}
            </span>
          )}
        </div>

        {cargandoEstado ? (
          <p className="mt-3 text-sm text-gray-500">Cargando…</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {RECUENTOS.map(([clave, etiqueta]) => (
              <div key={clave} className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-gray-600">{etiqueta}</span>
                <span className="text-sm font-medium tabular-nums text-gray-800">
                  {estado?.recuentos?.[clave] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {estado && estado.errores_migracion > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {estado.errores_migracion} error(es) en el registro de migración
          </p>
        )}
      </Card>
    </div>
  );
};
