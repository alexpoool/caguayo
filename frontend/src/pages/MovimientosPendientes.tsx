import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';

import { Card, CardContent, ConfirmModal } from '../components/ui';
import {
  Truck,
  AlertCircle,
  Gift,
  RotateCcw,
  Package,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MovimientoPendiente {
  id_movimiento: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  estado: string;
  codigo?: string;
  id_producto: number;
  tipo_movimiento?: {
    tipo: string;
    factor: number;
  };
  producto?: {
    nombre: string;
  };
  dependencia?: {
    nombre: string;
  };
  provedor?: {
    nombre: string;
  };
  convenio?: {
    nombre_convenio: string;
  };
  anexo?: {
    nombre_anexo: string;
    numero_anexo: string;
  };
  precio_compra?: number;
  precio_venta?: number;
}

export function MovimientosPendientesPage() {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
  });

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    movimiento: MovimientoPendiente | null;
  }>({
    isOpen: false,
    movimiento: null,
  });

  const [stockErrorModal, setStockErrorModal] = useState<{
    isOpen: boolean;
    movimiento: MovimientoPendiente | null;
    productoNombre: string;
    stockDisponible: number;
    cantidadSolicitada: number;
  }>({
    isOpen: false,
    movimiento: null,
    productoNombre: '',
    stockDisponible: 0,
    cantidadSolicitada: 0,
  });

  const queryClient = useQueryClient();

  const { data: movimientosPendientes = [], isLoading: isLoadingPendientes } = useQuery({
    queryKey: ['movimientos-pendientes'],
    queryFn: () => movimientosService.getMovimientosPendientes(),
  });

  const confirmarMutation = useMutation({
    mutationFn: (id: number) => movimientosService.confirmarMovimiento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      toast.success('Movimiento confirmado exitosamente');
    },
    onError: (error: any, variables: number) => {
      const errorMessage = error?.message || '';

      // Detectar error de stock insuficiente
      const stockMatch = errorMessage.match(/Stock insuficiente para ['"](.+?)['"]\. Disponible: (\d+), Solicitado: (\d+)/);

      if (stockMatch) {
        const [, productoNombre, stockDisponible, cantidadSolicitada] = stockMatch;
        const movimiento = movimientosPendientes.find(m => m.id_movimiento === variables);

        setStockErrorModal({
          isOpen: true,
          movimiento: movimiento || null,
          productoNombre,
          stockDisponible: parseInt(stockDisponible),
          cantidadSolicitada: parseInt(cantidadSolicitada),
        });
      } else {
        toast.error(errorMessage || 'Error al confirmar movimiento');
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => movimientosService.deleteMovimiento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      toast.success('Movimiento eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar movimiento');
    },
  });

  const handleConfirmarMovimiento = async (id: number) => {
    try {
      await confirmarMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error al confirmar movimiento:', error);
    }
  };

  const handleEliminarMovimiento = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Movimiento',
      message: '¿Está seguro de que desea eliminar este movimiento? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await eliminarMutation.mutateAsync(id);
        } catch (error) {
          console.error('Error al eliminar movimiento:', error);
        }
      },
      type: 'danger',
    });
  };

  const handleVerDetalle = (movimiento: MovimientoPendiente) => {
    setDetailModal({
      isOpen: true,
      movimiento,
    });
  };

  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'RECEPCION':
        return {
          icon: Truck,
          gradient: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          impacto: 'Entrada',
          impactoIcon: TrendingUp,
          impactoColor: 'text-green-600',
          descripcion: 'Registro de entrada de nuevos productos al inventario',
        };
      case 'MERMA':
        return {
          icon: AlertCircle,
          gradient: 'from-red-500 to-rose-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de pérdidas, deterioro o productos dañados',
        };
      case 'DONACION':
        return {
          icon: Gift,
          gradient: 'from-purple-500 to-violet-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de donaciones de productos',
        };
      case 'DEVOLUCION':
        return {
          icon: RotateCcw,
          gradient: 'from-orange-500 to-amber-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de devoluciones a proveedores',
        };
      default:
        return {
          icon: Package,
          gradient: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          impacto: '',
          impactoIcon: Package,
          impactoColor: 'text-gray-600',
          descripcion: '',
        };
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <Card className="flex-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Movimientos Pendientes</h2>
                <p className="text-sm text-gray-500">Movimientos en espera de confirmación</p>
              </div>
            </div>
          </div>

          {isLoadingPendientes ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600"></div>
            </div>
          ) : movimientosPendientes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">¡Todo al día!</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No hay movimientos pendientes de confirmación. El inventario está actualizado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientosPendientes.map((mov: MovimientoPendiente) => {
                const config = getTipoConfig(mov.tipo_movimiento?.tipo || 'RECEPCION');
                const Icon = config.icon;
                return (
                  <div
                    key={mov.id_movimiento}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.textColor}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {mov.tipo_movimiento?.tipo || 'Movimiento'}
                          </h4>
                          <p className="text-sm text-gray-500">{mov.producto?.nombre || 'Producto no disponible'}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>Cantidad: {mov.cantidad}</span>
                            <span>Fecha: {new Date(mov.fecha).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Botón Ver Detalle */}
                        <button
                          onClick={() => handleVerDetalle(mov)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {/* Botón Confirmar */}
                        <button
                          onClick={() => handleConfirmarMovimiento(mov.id_movimiento)}
                          disabled={confirmarMutation.isPending}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Confirmar movimiento"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleEliminarMovimiento(mov.id_movimiento)}
                          disabled={eliminarMutation.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Modal de Error de Stock */}
      {stockErrorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Stock Insuficiente
              </h3>
              <p className="text-gray-600 text-center mb-6">
                No hay suficiente stock para confirmar este movimiento.
              </p>

              <div className="space-y-3 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Producto</p>
                  <p className="font-medium text-gray-900">{stockErrorModal.productoNombre}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 uppercase tracking-wider">Stock Disponible</p>
                    <p className="font-bold text-green-900 text-lg">{stockErrorModal.stockDisponible}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 uppercase tracking-wider">Cantidad Solicitada</p>
                    <p className="font-bold text-red-900 text-lg">{stockErrorModal.cantidadSolicitada}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStockErrorModal({ ...stockErrorModal, isOpen: false })}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    if (stockErrorModal.movimiento) {
                      handleEliminarMovimiento(stockErrorModal.movimiento.id_movimiento);
                    }
                    setStockErrorModal({ ...stockErrorModal, isOpen: false });
                  }}
                  disabled={eliminarMutation.isPending}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Movimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {detailModal.isOpen && detailModal.movimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = getTipoConfig(detailModal.movimiento?.tipo_movimiento?.tipo || 'RECEPCION');
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-6 w-6 ${config.textColor}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {detailModal.movimiento?.tipo_movimiento?.tipo}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Movimiento #{detailModal.movimiento?.id_movimiento}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setDetailModal({ isOpen: false, movimiento: null })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Producto</p>
                  <p className="font-medium text-gray-900">{detailModal.movimiento?.producto?.nombre || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Cantidad</p>
                  <p className="font-medium text-gray-900">{detailModal.movimiento?.cantidad}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha</p>
                  <p className="font-medium text-gray-900">
                    {new Date(detailModal.movimiento?.fecha || '').toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Dependencia</p>
                  <p className="font-medium text-gray-900">{detailModal.movimiento?.dependencia?.nombre || 'N/A'}</p>
                </div>
              </div>

              {/* Información de Proveedor (solo para RECEPCION) */}
              {detailModal.movimiento?.tipo_movimiento?.tipo === 'RECEPCION' && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Información del Proveedor</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Proveedor</p>
                      <p className="font-medium text-gray-900">{detailModal.movimiento?.provedor?.nombre || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Convenio</p>
                      <p className="font-medium text-gray-900">{detailModal.movimiento?.convenio?.nombre_convenio || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Anexo</p>
                      <p className="font-medium text-gray-900">
                        {detailModal.movimiento?.anexo
                          ? `${detailModal.movimiento.anexo.nombre_anexo} - ${detailModal.movimiento.anexo.numero_anexo}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Código</p>
                      <p className="font-medium text-gray-900">{detailModal.movimiento?.codigo || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 uppercase tracking-wider">Precio de Compra</p>
                      <p className="font-bold text-blue-900 text-lg">
                        {detailModal.movimiento?.precio_compra
                          ? `$${detailModal.movimiento.precio_compra.toFixed(2)}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                      <p className="text-xs text-green-600 uppercase tracking-wider">Precio de Venta</p>
                      <p className="font-bold text-green-900 text-lg">
                        {detailModal.movimiento?.precio_venta
                          ? `$${detailModal.movimiento.precio_venta.toFixed(2)}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observación */}
              {detailModal.movimiento?.observacion && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Observación</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {detailModal.movimiento.observacion}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setDetailModal({ isOpen: false, movimiento: null })}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleConfirmarMovimiento(detailModal.movimiento!.id_movimiento);
                  setDetailModal({ isOpen: false, movimiento: null });
                }}
                disabled={confirmarMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
