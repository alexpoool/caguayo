import { createPortal } from 'react-dom';
import { X, Receipt, DollarSign, Calendar } from 'lucide-react';
import type { FacturaWithDetails } from '../../../../../types/contrato';

interface FacturaDetailModalProps {
  isOpen: boolean;
  factura: FacturaWithDetails | null;
  onClose: () => void;
}

export function FacturaDetailModal({
  isOpen,
  factura,
  onClose,
}: FacturaDetailModalProps) {
  if (!isOpen || !factura) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <Receipt className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Factura</h3>
                <p className="text-sm text-gray-500 font-mono">
                  {factura.codigo_factura || 'Sin código'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                Monto
              </p>
              <p className="font-bold text-green-900 text-xl">
                ${Number(factura.monto).toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
                Pago Actual
              </p>
              <p className="font-bold text-blue-900 text-xl">
                ${Number(factura.pago_actual).toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Fecha
              </p>
              <p className="font-bold text-gray-900">{factura.fecha || 'N/A'}</p>
            </div>
          </div>

          {factura.descripcion && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Descripción
              </p>
              <p className="text-gray-700">{factura.descripcion}</p>
            </div>
          )}

          {factura.observaciones && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Observaciones
              </p>
              <p className="text-gray-700">{factura.observaciones}</p>
            </div>
          )}

          {factura.items && factura.items.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Items
              </p>
              <div className="space-y-2">
                {factura.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm bg-white p-2 rounded border border-gray-200"
                  >
                    <span className="text-gray-700">{item.nombre || 'Producto'}</span>
                    <span className="font-medium">
                      {item.cantidad} x ${Number(item.precio_venta).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
