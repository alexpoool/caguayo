import React, { useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileWarning,
  PlayCircle,
} from "lucide-react";

import { Button, Card } from "../../components/ui";
import { migracionService } from "../../services/administracion";
import type { InformeMigracion } from "../../types/index";

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

export const MigracionLegacy: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: estado, isLoading: cargandoEstado } = useQuery({
    queryKey: ["migracion-estado"],
    queryFn: () => migracionService.getEstado(),
  });

  const [informe, setInforme] = useState<InformeMigracion | null>(null);

  const ejecutar = useMutation({
    mutationFn: () => migracionService.ejecutar(),
    onSuccess: (r) => {
      setInforme(r);
      queryClient.invalidateQueries({ queryKey: ["migracion-estado"] });
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

  // El botón sólo depende de que haya dump y que las bases coincidan. No hace
  // falta un análisis previo: el ETL es idempotente, así que ejecutarlo cuando
  // la base ya está migrada no rompe nada, sale con 0 inserciones.
  const bloqueado =
    ejecutar.isPending ||
    !!estado?.operacion_en_curso ||
    !estado?.dump_disponible ||
    !estado?.identidad.coherente;

  return (
    <div className="space-y-4">
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

{/* ---- Base del ETL sin comprobar ----------------------------------- */}
      {estado && estado.identidad.coherente && !estado.identidad.verificado && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">La migración sale sin comprobar la base</p>
            <ul className="mt-1 list-disc list-inside">
              {estado.identidad.detalle.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="mt-1">
              La aplicación está sirviendo <strong>{estado.identidad.base_app}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ---- Falta el volcado del legacy ---------------------------------- */}
      {estado && !estado.dump_disponible && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <FileWarning className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">No está el volcado del legacy</p>
            <p className="mt-1">
              El ETL lee el volcado que deja{" "}
              <code className="font-mono text-xs">main.py --generar-dumps</code>{" "}
              o <code className="font-mono text-xs">--adoptar</code>, no uno que
              se suba desde aquí.
            </p>
            {estado.dump_ruta && (
              <p className="mt-2 font-mono text-xs break-all">
                {estado.dump_ruta}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---- Ejecutar ---------------------------------------------------- */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Ejecutar</h3>
        <p className="text-sm text-gray-500 mb-4">
          Lee el dump del legacy y lo carga en{" "}
          <span className="font-medium text-gray-700">
            {estado?.identidad.base_etl ?? "la base"}
          </span>
          . Sólo inserta: no borra ni actualiza, y si la base ya está migrada
          sale con 0 inserciones.
        </p>

        {estado?.operacion_en_curso && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hay una migración en marcha.
          </div>
        )}

        <Button
          onClick={() => ejecutar.mutate()}
          disabled={bloqueado}
          isLoading={ejecutar.isPending}
          leftIcon={<PlayCircle className="h-4 w-4" />}
        >
          Ejecutar migración
        </Button>
      </Card>

      {/* ---- Informe ----------------------------------------------------- */}
      {informe && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Resultado</h3>
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
              {informe.total_a_insertar} fila(s) insertada(s)
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Fase</th>
                  <th className="px-3 py-2 text-left">Filas</th>
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
                        f.a_insertar > 0 ? "text-gray-700" : "text-gray-400"
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
              No había nada pendiente: todo lo del fichero ya está en la base.
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