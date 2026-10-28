import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { rrhhService } from '../../services/rrhh';
import type { RrhhPeriodoEvaluacion } from '../../types/rrhh';
import { Button, Input, Label, Modal } from '../ui';

interface ModalNuevoPeriodoProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe el periodo creado para que el formulario lo seleccione. */
  onCreado: (periodo: RrhhPeriodoEvaluacion) => void;
}

/**
 * Alta rápida de un periodo de evaluación desde los formularios que lo
 * seleccionan (evaluación, nómina y pago por resultado). Reutiliza el mismo
 * endpoint del catálogo (`/rrhh/catalogos/periodos-evaluacion`).
 */
export function ModalNuevoPeriodo({
  isOpen,
  onClose,
  onCreado,
}: ModalNuevoPeriodoProps) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNombre('');
    setDescripcion('');
    setError('');
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data: { nombre: string; descripcion: string | null }) =>
      rrhhService.crearPeriodoEvaluacion(data),
    onSuccess: (periodo) => {
      toast.success('Periodo creado');
      // Se inserta en la lista ya cargada para que el selector lo muestre
      // seleccionado al instante; la invalidación confirma contra el servidor.
      queryClient.setQueryData<RrhhPeriodoEvaluacion[]>(
        ['rrhh', 'catalogos', 'periodos-evaluacion', 'activos'],
        (prev) => (prev ? [...prev, periodo] : prev)
      );
      queryClient.invalidateQueries({
        queryKey: ['rrhh', 'catalogos', 'periodos-evaluacion'],
      });
      onCreado(periodo);
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo crear el periodo'
      );
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setError('El nombre es obligatorio');
      return;
    }
    if (limpio.length > 100) {
      setError('Máximo 100 caracteres');
      return;
    }
    setError('');
    mutation.mutate({
      nombre: limpio,
      descripcion: descripcion.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-sky-50 to-sky-100 px-6 py-4 pr-12">
        <div className="rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 p-2">
          <CalendarRange className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-900">
            Nuevo periodo
          </h2>
          <p className="text-xs text-slate-500">
            Al guardarlo quedará seleccionado en el formulario.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <Label htmlFor="nuevo-periodo-nombre">Nombre *</Label>
          <Input
            id="nuevo-periodo-nombre"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ej. Octubre 2026"
            maxLength={100}
            autoFocus
          />
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <p className="text-xs text-slate-400">{nombre.length}/100 caracteres</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nuevo-periodo-descripcion">Descripción</Label>
          <textarea
            id="nuevo-periodo-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué representa este periodo (opcional)"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="gap-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg transition-all duration-300 hover:from-sky-600 hover:to-sky-700"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar periodo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
