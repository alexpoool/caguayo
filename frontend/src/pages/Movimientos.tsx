import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import type { TipoMovimiento, MovimientoCreate } from '../types/index';
import { Button } from '../components/ui';
import {
  Truck,
  AlertCircle,
  Gift,
  RotateCcw,
  Package,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MovimientoRecepcionForm } from './movimientos/MovimientoForm';

export function MovimientosPage() {
  const [selectedTipo, setSelectedTipo] = useState<TipoMovimiento | null>(null);
  const [hoveredTipo, setHoveredTipo] = useState<string | null>(null);

  const { data: tiposMovimiento = [], isLoading: isLoadingTipos } = useQuery({
    queryKey: ['tipos-movimiento'],
    queryFn: () => movimientosService.getTiposMovimiento(),
  });

  const tiposDisponibles = tiposMovimiento
    .filter((tipo) => ['RECEPCION', 'MERMA', 'DONACION', 'DEVOLUCION'].includes(tipo.tipo))
    .sort((a, b) => {
      if (a.tipo === 'RECEPCION') return -1;
      if (b.tipo === 'RECEPCION') return 1;
      return 0;
    });

  const handleTipoSelect = (tipo: TipoMovimiento) => {
    setSelectedTipo(tipo);
  };

  const handleFormSubmit = (data: MovimientoCreate) => {
    // El formulario ya maneja la creación y los toast
    setSelectedTipo(null);
  };

  const handleFormCancel = () => {
    setSelectedTipo(null);
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
          shadowColor: 'shadow-green-200',
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
          shadowColor: 'shadow-red-200',
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
          shadowColor: 'shadow-purple-200',
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
          shadowColor: 'shadow-orange-200',
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
          shadowColor: 'shadow-gray-200',
          impacto: '',
          impactoIcon: Package,
          impactoColor: 'text-gray-600',
          descripcion: '',
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Panel Superior - Selector de Tipos */}
      <div className="flex-shrink-0">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
          <div className="flex gap-3 overflow-x-auto">
            {tiposDisponibles.map((tipo) => {
              const config = getTipoConfig(tipo.tipo);
              const Icon = config.icon;
              const ImpactoIcon = config.impactoIcon;
              const isSelected = selectedTipo?.id_tipo_movimiento === tipo.id_tipo_movimiento;
              const isHovered = hoveredTipo === tipo.tipo;

              return (
                <button
                  key={tipo.id_tipo_movimiento}
                  onClick={() => handleTipoSelect(tipo)}
                  onMouseEnter={() => setHoveredTipo(tipo.tipo)}
                  onMouseLeave={() => setHoveredTipo(null)}
                  className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 text-left group relative overflow-hidden min-w-[200px] ${
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} shadow-md ring-2 ring-offset-2 ring-opacity-50 ${config.borderColor.replace('border-', 'ring-')}`
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Barra de color izquierda */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.gradient} transition-all duration-300 ${
                    isSelected || isHovered ? 'opacity-100' : 'opacity-0'
                  }`} />

                  <div className={`p-2 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg transform transition-all duration-300 ${
                    isHovered ? 'scale-110' : ''
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm ${isSelected ? config.textColor : 'text-gray-800'}`}>
                        {tipo.tipo}
                      </h3>
                      <div className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.impactoColor}`}>
                        <ImpactoIcon className="h-3 w-3" />
                        {config.impacto}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel Inferior - Contenido */}
      <div className="flex-1 min-h-0 overflow-auto">
        {!selectedTipo ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                <Info className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                Bienvenido al Registro de Movimientos
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Seleccione un tipo de movimiento del panel superior para comenzar.
                Cada tipo tiene un propósito específico para el control de inventario.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Sistema listo para registrar movimientos</span>
              </div>
            </div>
          </div>
        ) : (
          <MovimientoRecepcionForm
            key={selectedTipo.id_tipo_movimiento}
            tipoMovimiento={selectedTipo.tipo as 'RECEPCION' | 'MERMA' | 'DONACION' | 'DEVOLUCION'}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        )}
      </div>
    </div>
  );
}
