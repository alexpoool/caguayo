import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService, clienteNaturalService, clienteTCPService, cuentasService } from '../services/api';
import type { Cliente, ClienteCreate, ClienteUpdate, ClienteNatural, ClienteTCP, ClienteJuridica, Cuenta, CuentaCreate } from '../types/index';
import toast from 'react-hot-toast';

export function useClientes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: ClienteCreate) => clientesService.createCliente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear cliente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteUpdate }) => clientesService.updateCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar cliente');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientesService.deleteCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar cliente');
    }
  });

  return {
    clientes: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createCliente: createMutation.mutate,
    updateCliente: updateMutation.mutate,
    deleteCliente: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useClienteNatural(idCliente: number) {
  return useQuery({
    queryKey: ['cliente-natural', idCliente],
    queryFn: () => clienteNaturalService.getClienteNaturalByCliente(idCliente),
    enabled: !!idCliente,
  });
}

export function useClienteTCP(idCliente: number) {
  return useQuery({
    queryKey: ['cliente-tcp', idCliente],
    queryFn: () => clienteTCPService.getClienteTCPByCliente(idCliente),
    enabled: !!idCliente,
  });
}

export function useCuentasByCliente(idCliente: number) {
  return useQuery({
    queryKey: ['cuentas-cliente', idCliente],
    queryFn: () => cuentasService.getCuentasByCliente(idCliente),
    enabled: !!idCliente,
  });
}
