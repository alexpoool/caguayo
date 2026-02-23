import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { movimientosService } from '../services/api';
import type { TipoMovimiento } from '../types/index';
import { useMovimientos } from '../hooks/useMovimientos';
import { MovimientoRecepcionForm } from './movimientos/MovimientoForm';
import {
  Truck,
  AlertCircle,
  Gift,
  RotateCcw,
  Package,
  Search,
  RefreshCw,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Building,
  FileText,
  ClipboardList,
  Hash,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
} from '../components/ui';

export function MovimientosPage() {
  const navigate = useNavigate();
  const [selectedTipoForm, setSelectedTipoForm] = useState<TipoMovimiento | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; movimiento: any | null }>({
    isOpen: false,
    movimiento: null,
  });
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
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: tiposMovimiento = [], isLoading: isLoadingTipos } = useQuery({
    queryKey: ['tipos-movimiento'],
    queryFn: () => movimientosService.getTiposMovimiento(),
    staleTime: 0,
  });

  const {
    movimientos,
    isLoading,
    isFetchingMore,
    isError,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    deleteMovimiento,
    refresh,
    isDeleting
  } = useMovimientos();

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  const handleTipoSelect = (tipo: string) => {
    if (tipo === 'AJUSTE') {
      navigate('/movimientos/ajuste');
      return;
    }
    // Buscar el tipo en la lista, si no existe crear uno con la estructura mínima
    let tipoObj = tiposMovimiento.find((t: any) => t.tipo === tipo);
    
    if (!tipoObj) {
      // Crear un objeto temporal si no se ha cargado la lista
      tipoObj = {
        id_tipo_movimiento: tipo === 'RECEPCION' ? 1 : 
                           tipo === 'MERMA' ? 2 : 
                           tipo === 'DONACION' ? 3 : 4,
        tipo: tipo,
        factor: tipo === 'RECEPCION' ? 1 : -1
      };
    }
    
    setSelectedTipoForm(tipoObj);
    setView('form');
  };

  const handleFormSubmit = () => {
    setView('list');
    setSelectedTipoForm(null);
    refresh();
  };

  const handleFormCancel = () => {
    setView('list');
    setSelectedTipoForm(null);
  };

  const handleVerDetalle = (movimiento: any) => {
    setDetailModal({
      isOpen: true,
      movimiento,
    });
  };

  const handleEliminarMovimiento = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Movimiento',
      message: '¿Está seguro de que desea eliminar este movimiento? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        deleteMovimiento(id);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
      type: 'danger',
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
        };
      case 'AJUSTE_AGREGAR':
        return {
          icon: Package,
          gradient: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          impacto: 'Entrada',
          impactoIcon: TrendingUp,
          impactoColor: 'text-green-600',
        };
      case 'AJUSTE_QUITAR':
        return {
          icon: Package,
          gradient: 'from-amber-500 to-orange-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-700',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
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
        };
    }
  };

  if (isLoadingTipos) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (view === 'form' && selectedTipoForm) {
    return (
      <MovimientoRecepcionForm
        key={selectedTipoForm.id_tipo_movimiento}
        tipoMovimiento={selectedTipoForm.tipo as 'RECEPCION' | 'MERMA' | 'DONACION' | 'DEVOLUCION'}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-gray-500 mt-1">
            Gestión de movimientos de inventario ({movimientos.length} registros)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleTipoSelect('RECEPCION')}
            className="gap-2 shadow-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            <Truck className="h-4 w-4" />
            Recepción
          </Button>
          <Button
            onClick={() => handleTipoSelect('MERMA')}
            className="gap-2 shadow-sm bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
          >
            <AlertCircle className="h-4 w-4" />
            Merma
          </Button>
          <Button
            onClick={() => handleTipoSelect('DONACION')}
            className="gap-2 shadow-sm bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
          >
            <Gift className="h-4 w-4" />
            Donación
          </Button>
          <Button
            onClick={() => handleTipoSelect('DEVOLUCION')}
            className="gap-2 shadow-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Devolución
          </Button>
          <Button
            onClick={() => handleTipoSelect('AJUSTE')}
            className="gap-2 shadow-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Ajuste
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-gray-500">Cargando movimientos...</div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 text-center">
            <p className="font-bold text-lg mb-2">Error al cargar movimientos</p>
            <Button onClick={refresh} className="mt-4 gap-2" variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Card className="overflow-hidden shadow-sm border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Producto</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Dependencia</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        {searchTerm ? 'No se encontraron movimientos que coincidan con la búsqueda' : 'No se encontraron movimientos'}
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov) => {
                      const config = getTipoConfig(mov.tipo_movimiento?.tipo || 'RECEPCION');
                      const ImpactoIcon = config.impactoIcon;
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
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.impactoColor}`}>
                                  <ImpactoIcon className="h-3 w-3 inline mr-1" />
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              mov.estado === 'CONFIRMADO' 
                                ? 'bg-green-100 text-green-800'
                                : mov.estado === 'PENDIENTE'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {mov.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarMovimiento(mov.id_movimiento);
                                }}
                                disabled={isDeleting}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                title="Eliminar movimiento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div ref={loadMoreRef} className="h-4" />
          </Card>
        </>
      )}
    </div>
  );

  const ModalConfirmacion = () => createPortal(
    confirmModal.isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">
              {confirmModal.title}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
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
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100 col-span-2">
                      <p className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider mb-1">
                        <CheckCircle className="h-3 w-3" />
                        Estado
                      </p>
                      <p className="font-bold text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          detailModal.movimiento?.estado === 'CONFIRMADO' 
                            ? 'bg-green-100 text-green-800'
                            : detailModal.movimiento?.estado === 'PENDIENTE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {detailModal.movimiento?.estado}
                        </span>
                      </p>
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

                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                  <button
                    onClick={() => setDetailModal({ isOpen: false, movimiento: null })}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cerrar
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
      <ModalConfirmacion />
      <ModalDetalle />
    </>
  );
}
