import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conveniosService, anexosService } from '../services/api';
import type { Convenio, Anexo, AnexoCreate } from '../types/index';
import toast from 'react-hot-toast';

export function useConvenios(clienteId?: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['convenios', clienteId],
    queryFn: () => conveniosService.getConvenios(clienteId),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => conveniosService.createConvenio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear convenio');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => conveniosService.updateConvenio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar convenio');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conveniosService.deleteConvenio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar convenio');
    }
  });

  return {
    convenios: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createConvenio: createMutation.mutate,
    updateConvenio: updateMutation.mutate,
    deleteConvenio: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAnexos(convenioId?: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['anexos', convenioId],
    queryFn: () => anexosService.getAnexos(convenioId),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: AnexoCreate) => anexosService.createAnexo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear anexo');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => anexosService.updateAnexo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar anexo');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => anexosService.deleteAnexo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar anexo');
    }
  });

  return {
    anexos: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createAnexo: createMutation.mutate,
    updateAnexo: updateMutation.mutate,
    deleteAnexo: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
