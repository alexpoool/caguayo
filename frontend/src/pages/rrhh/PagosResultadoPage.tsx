import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import type { RrhhPagoResultadoListado } from '../../types/rrhh';
import {
  AlertCircle,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmModal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui';

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtNumero = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        maximumFractionDigits: 4,
      }).format(Number(v));

const fmtFecha = (v: string | null | undefined) => {
  if (!v) return '—';
  const [anio, mes, dia] = v.split('-');
  if (!anio || !mes || !dia) return v;
  return `${dia}/${mes}/${anio}`;
};

const GRADIENTE =
  'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

/** Listado de lotes de pago por resultado (independiente de la nómina). */
export function PagosResultadoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] =
    useState<RrhhPagoResultadoListado | null>(null);

  const {
    data: pagos = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['rrhh', 'pagos-resultado'],
    queryFn: () => rrhhService.listarPagosResultado({ limit: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarPagoResultado(id),
    onSuccess: () => {
      toast.success('Pago por resultado eliminado');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'pagos-resultado'] });
      setConfirmDelete(null);
    },
    onError: (err: any) =>
      toast.error(err?.message || 'No se pudo eliminar el pago'),
  });

  const totalRepartido = pagos.reduce(
    (acc, p) => acc + Number(p.total_pagado),
    0
  );
  const totalEmpleados = pagos.reduce(
    (acc, p) => acc + Number(p.empleados_count),
    0
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded bg-gradient-to-br from-sky-500 to-sky-600 p-2 shadow-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Pago por resultado
            </h1>
            <p className="text-sm text-slate-500">
              Reparte un monto entre los empleados evaluados en un periodo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Actualizar"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            onClick={() => navigate('/rrhh/pagos-resultado/nuevo')}
            className={`gap-2 ${GRADIENTE}`}
          >
            <Plus className="h-4 w-4" />
            Nuevo pago
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Lotes
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {pagos.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Empleados pagados
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalEmpleados}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total repartido
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {fmtMoneda(totalRepartido)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Historial de pagos
          </h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando pagos...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">
                {error instanceof Error
                  ? error.message
                  : 'No se pudieron cargar los pagos.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : pagos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Target className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-600">
                Aún no hay pagos por resultado. Crea el primero eligiendo un
                periodo de evaluación.
              </p>
              <Button
                onClick={() => navigate('/rrhh/pagos-resultado/nuevo')}
                className={`gap-2 ${GRADIENTE}`}
              >
                <Plus className="h-4 w-4" />
                Nuevo pago
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead className="text-center">Empleados</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Promedio</TableHead>
                    <TableHead className="text-right">Repartido</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.id_pago_x_resultado}>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {pago.periodo_nombre || 'Periodo eliminado'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {pago.descripcion || `Lote #${pago.id_pago_x_resultado}`}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        {fmtFecha(pago.inicio_periodo)} –{' '}
                        {fmtFecha(pago.fin_periodo)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          <Users className="h-3 w-3" />
                          {pago.empleados_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-900">
                        {fmtMoneda(pago.monto)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">
                        {fmtNumero(pago.promedio_general)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                        {fmtMoneda(pago.total_pagado)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Ver detalle"
                            onClick={() =>
                              navigate(
                                `/rrhh/pagos-resultado/${pago.id_pago_x_resultado}`
                              )
                            }
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            onClick={() => setConfirmDelete(pago)}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Eliminar pago por resultado"
        message={
          confirmDelete
            ? `¿Seguro que quieres eliminar el pago del periodo «${
                confirmDelete.periodo_nombre || '—'
              }»? Esta acción no se puede deshacer.`
            : ''
        }
        type="danger"
        onConfirm={() =>
          confirmDelete &&
          deleteMutation.mutate(confirmDelete.id_pago_x_resultado)
        }
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
