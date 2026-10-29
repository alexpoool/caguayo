import { formatFecha } from '../../../../../utils/fecha';
import type { ItemOfertaTienda, OfertaTiendaWithDetails } from '../../../../../types/contrato';

interface OfertaDetailModalProps {
  isOpen: boolean;
  oferta: OfertaTiendaWithDetails | null;
  onClose: () => void;
}

export function OfertaDetailModal({
  isOpen,
  oferta,
  onClose,
}: OfertaDetailModalProps) {
  if (!isOpen || !oferta) return null;

  const items = oferta.items || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Oferta {oferta.codigo_oferta || `#${oferta.id_oferta_tienda}`}
              </h2>
              <p className="text-sm text-gray-500">
                Estado: {oferta.estado}
                {oferta.id_factura ? ` · Factura #${oferta.id_factura}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500">Fecha</p>
                <p className="text-gray-900">{formatFecha(oferta.fecha)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Contrato</p>
                <p className="text-gray-900">#{oferta.id_contrato}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Monto</p>
                <p className="text-gray-900 font-semibold">
                  {Number(oferta.monto || 0).toFixed(2)}
                </p>
              </div>
              {oferta.descripcion && (
                <div className="md:col-span-3">
                  <p className="font-medium text-gray-500">Descripción</p>
                  <p className="text-gray-900">{oferta.descripcion}</p>
                </div>
              )}
              {oferta.observaciones && (
                <div className="md:col-span-3">
                  <p className="font-medium text-gray-500">Observaciones</p>
                  <p className="text-gray-900">{oferta.observaciones}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">Producto</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase text-xs">Cantidad</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Precio</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                        Sin productos
                      </td>
                    </tr>
                  ) : (
                    items.map((item: ItemOfertaTienda) => (
                      <tr key={item.id_item_oferta_tienda}>
                        <td className="px-3 py-2 text-gray-900">
                          {item.producto?.nombre || `#${item.id_producto}`}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {Number(item.precio_venta || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {(Number(item.cantidad || 0) * Number(item.precio_venta || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
