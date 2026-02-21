import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';

import { Card, CardContent, ConfirmModal } from '../components/ui';
import {
  Truck,
  AlertCircle,
  Gift,
  RotateCcw,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Trash2,
  X,
  Sparkles,
  Calendar,
  Hash,
  MapPin,
  Building,
  FileText,
  ClipboardList,
  PackageCheck
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
          badgeBg: 'bg-green-100',
          buttonBg: 'hover:bg-green-50',
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
          badgeBg: 'bg-red-100',
          buttonBg: 'hover:bg-red-50',
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
          badgeBg: 'bg-purple-100',
          buttonBg: 'hover:bg-purple-50',
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
          badgeBg: 'bg-orange-100',
          buttonBg: 'hover:bg-orange-50',
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
          badgeBg: 'bg-gray-100',
          buttonBg: 'hover:bg-gray-50',
        };
    }
  };

  const content = (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in-up">
      <Card className="flex-1 shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg animate-bounce-subtle">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Movimientos Pendientes</h2>
                <p className="text-sm text-gray-500">Movimientos en espera de confirmación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                {movimientosPendientes.length} pendientes
              </span>
            </div>
          </div>

          {isLoadingPendientes ? (
            <div className="flex items-center justify-center h-64">
              <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full">
                <Clock className="h-12 w-12 text-amber-600 animate-spin" />
              </div>
            </div>
          ) : movimientosPendientes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <PackageCheck className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo al día!</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No hay movimientos pendientes de confirmación. El inventario está actualizado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Producto</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Dependencia</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosPendientes.map((mov: MovimientoPendiente) => {
                    const config = getTipoConfig(mov.tipo_movimiento?.tipo || 'RECEPCION');
                    return (
                      <tr
                        key={mov.id_movimiento}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleVerDetalle(mov)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className={`font-semibold text-sm ${config.textColor}`}>
                                {mov.tipo_movimiento?.tipo || 'Movimiento'}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${config.badgeBg} ${config.impactoColor}`}>
                                {config.impacto}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900 font-medium">{mov.producto?.nombre || 'Producto no disponible'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-gray-900">{mov.cantidad}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(mov.fecha).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {mov.dependencia?.nombre || 'Sin dependencia'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmarMovimiento(mov.id_movimiento);
                              }}
                              disabled={confirmarMutation.isPending}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                              title="Confirmar movimiento"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarMovimiento(mov.id_movimiento);
                              }}
                              disabled={eliminarMutation.isPending}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                              title="Eliminar movimiento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    </div>
  );

  const ModalStockError = () => createPortal(
    stockErrorModal.isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Stock Insuficiente
            </h3>
            <p className="text-gray-600 text-center mb-6">
              No hay suficiente stock para confirmar este movimiento.
            </p>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Producto</p>
                <p className="font-bold text-gray-900">{stockErrorModal.productoNombre}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <p className="text-xs text-green-600 uppercase tracking-wider">Stock Disponible</p>
                  <p className="font-bold text-green-900 text-2xl">{stockErrorModal.stockDisponible}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200">
                  <p className="text-xs text-red-600 uppercase tracking-wider">Cantidad Solicitada</p>
                  <p className="font-bold text-red-900 text-2xl">{stockErrorModal.cantidadSolicitada}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStockErrorModal({ ...stockErrorModal, isOpen: false })}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Movimiento
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    document.body
  );

  const ModalDetalle = () => createPortal(
    detailModal.isOpen && detailModal.movimiento && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
          {(() => {
            const config = getTipoConfig(detailModal.movimiento?.tipo_movimiento?.tipo || 'RECEPCION');
            const Icon = config.icon;
            const ImpactoIcon = config.impactoIcon;
            return (
              <>
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {detailModal.movimiento?.tipo_movimiento?.tipo}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Movimiento #{detailModal.movimiento?.id_movimiento}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${config.bgColor} ${config.impactoColor}`}>
                        <ImpactoIcon className="h-4 w-4" />
                        {config.impacto}
                      </span>
                      <button
                        onClick={() => setDetailModal({ isOpen: false, movimiento: null })}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <X className="h-6 w-6 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <p className="flex items-center gap-2 text-xs text-blue-600 uppercase tracking-wider mb-1">
                        <Package className="h-3 w-3" />
                        Producto
                      </p>
                      <p className="font-bold text-gray-900">{detailModal.movimiento?.producto?.nombre || 'N/A'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                      <p className="flex items-center gap-2 text-xs text-orange-600 uppercase tracking-wider mb-1">
                        <Hash className="h-3 w-3" />
                        Cantidad
                      </p>
                      <p className="font-bold text-gray-900 text-lg">{detailModal.movimiento?.cantidad}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                      <p className="flex items-center gap-2 text-xs text-purple-600 uppercase tracking-wider mb-1">
                        <Calendar className="h-3 w-3" />
                        Fecha
                      </p>
                      <p className="font-bold text-gray-900">
                        {new Date(detailModal.movimiento?.fecha || '').toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
                      <p className="flex items-center gap-2 text-xs text-red-600 uppercase tracking-wider mb-1">
                        <MapPin className="h-3 w-3" />
                        Dependencia
                      </p>
                      <p className="font-bold text-gray-900">{detailModal.movimiento?.dependencia?.nombre || 'N/A'}</p>
                    </div>
                  </div>

                  {detailModal.movimiento?.tipo_movimiento?.tipo === 'RECEPCION' && (
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} text-white`}>
                          <Truck className="h-4 w-4" />
                        </div>
                        Información del Proveedor
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-1">
                            <Building className="h-3 w-3" />
                            Proveedor
                          </p>
                          <p className="font-bold text-gray-900">{detailModal.movimiento?.provedor?.nombre || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-1">
                            <FileText className="h-3 w-3" />
                            Convenio
                          </p>
                          <p className="font-bold text-gray-900">{detailModal.movimiento?.convenio?.nombre_convenio || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-1">
                            <ClipboardList className="h-3 w-3" />
                            Anexo
                          </p>
                          <p className="font-bold text-gray-900">
                            {detailModal.movimiento?.anexo
                              ? `${detailModal.movimiento.anexo.nombre_anexo} - ${detailModal.movimiento.anexo.numero_anexo}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-1">
                            <Hash className="h-3 w-3" />
                            Código
                          </p>
                          <p className="font-bold text-gray-900 font-mono">{detailModal.movimiento?.codigo || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                          <p className="flex items-center gap-2 text-xs text-blue-600 uppercase tracking-wider mb-1">
                            <TrendingDown className="h-3 w-3" />
                            Precio de Compra
                          </p>
                          <p className="font-bold text-blue-900 text-xl">
                            {detailModal.movimiento?.precio_compra
                              ? `$${detailModal.movimiento.precio_compra.toFixed(2)}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                          <p className="flex items-center gap-2 text-xs text-green-600 uppercase tracking-wider mb-1">
                            <TrendingUp className="h-3 w-3" />
                            Precio de Venta
                          </p>
                          <p className="font-bold text-green-900 text-xl">
                            {detailModal.movimiento?.precio_venta
                              ? `$${detailModal.movimiento.precio_venta.toFixed(2)}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailModal.movimiento?.observacion && (
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-gray-500" />
                        Observación
                      </h4>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {detailModal.movimiento.observacion}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => setDetailModal({ isOpen: false, movimiento: null })}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      handleConfirmarMovimiento(detailModal.movimiento!.id_movimiento);
                      setDetailModal({ isOpen: false, movimiento: null });
                    }}
                    disabled={confirmarMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg font-bold"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirmar
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    ),
    document.body
  );

  return (
    <>
      {content}
      <ModalStockError />
      <ModalDetalle />
    </>
  );
}
