import { CheckCircle2, Eye, Printer, Receipt, X } from 'lucide-react';
import { Button, ModalOverlay } from '../../../../../components/ui';
import { formatFecha } from '../../../../../utils/fecha';
import { formatCifra } from '../../../../../utils/decimal';
import type {
  ContratoWithDetails,
  FacturaWithDetails,
  ItemFactura,
} from '../../../../../types/contrato';

interface FacturaDetailModalProps {
  isOpen: boolean;
  factura: FacturaWithDetails | null;
  contrato?: ContratoWithDetails | null;
  onClose: () => void;
  onViewDocument?: (factura: FacturaWithDetails) => void;
  onPrintDocument?: (factura: FacturaWithDetails) => void;
  onAprobar?: (factura: FacturaWithDetails) => void;
}

const ESTADOS: Record<
  string,
  { label: string; card: string; text: string; sub: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    card: 'bg-amber-50 border-amber-100',
    text: 'text-amber-700',
    sub: 'text-amber-600',
  },
  PAGADA: {
    label: 'Pagada',
    card: 'bg-green-50 border-green-100',
    text: 'text-green-700',
    sub: 'text-green-600',
  },
  ANULADA: {
    label: 'Anulada',
    card: 'bg-red-50 border-red-100',
    text: 'text-red-700',
    sub: 'text-red-600',
  },
};

export function FacturaDetailModal({
  isOpen,
  factura,
  contrato,
  onClose,
  onViewDocument,
  onPrintDocument,
  onAprobar,
}: FacturaDetailModalProps) {
  if (!isOpen || !factura) return null;

  const esPreFactura = (factura.tipo || 'FACTURA').toUpperCase() === 'PREFACTURA';
  const etiqueta = esPreFactura ? 'Pre-factura' : 'Factura';
  const items = factura.items || [];
  const moneda = contrato?.moneda?.simbolo || '';

  const estadoRaw = (factura.estado || 'ACTIVA').toUpperCase();
  const monto = Number(factura.monto || 0);
  const pagado = Number(factura.pago_actual || 0);
  const estadoKey =
    estadoRaw === 'ANULADA'
      ? 'ANULADA'
      : monto > 0 && pagado >= monto
        ? 'PAGADA'
        : 'PENDIENTE';
  const estado = ESTADOS[estadoKey];

  return (
    <ModalOverlay isOpen={true} onClose={onClose} ariaLabel={`Detalle de ${etiqueta.toLowerCase()}`}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-scale-in">
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 bg-gradient-to-r ${esPreFactura ? 'from-blue-50 to-indigo-50' : 'from-violet-50 to-purple-50'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`p-3 rounded-xl text-white shadow-lg bg-gradient-to-br ${esPreFactura ? 'from-blue-500 to-indigo-600' : 'from-violet-500 to-purple-600'}`}>
                <Receipt className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-gray-900 truncate">
                  {etiqueta} {factura.codigo_factura || 'Sin código'}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {factura.descripcion || 'Sin descripción'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-100">
              <p className="text-xs text-violet-600 uppercase tracking-wider mb-1">
                Monto total
              </p>
              <p className="font-bold text-violet-900 text-xl">
                {moneda} {formatCifra(monto)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                Pago actual
              </p>
              <p className="font-bold text-green-900 text-xl">
                {moneda} {formatCifra(pagado)}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${estado.card}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${estado.sub}`}>
                Estado
              </p>
              <p className={`font-bold text-xl ${estado.text}`}>{estado.label}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Fecha
              </p>
              <p className="font-bold text-gray-900">
                {formatFecha(factura.fecha) || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Contrato
              </p>
              <p className="font-bold text-gray-900 truncate">
                {contrato?.nombre || `#${factura.id_contrato}`}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Cliente
              </p>
              <p className="font-bold text-gray-900 truncate">
                {contrato?.cliente?.nombre || 'N/A'}
              </p>
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

          {/* Items */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase text-xs">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">
                    Precio
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      Sin productos
                    </td>
                  </tr>
                ) : (
                  items.map((item: ItemFactura) => (
                    <tr key={item.id_item_factura}>
                      <td className="px-3 py-2 text-gray-900">
                        {item.producto?.nombre || `#${item.id_producto}`}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCifra(item.precio_venta)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatCifra(
                          Number(item.cantidad || 0) * Number(item.precio_venta || 0),
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {items.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-700">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatCifra(monto)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-2">
          {esPreFactura && onAprobar && (
            <Button
              onClick={() => onAprobar(factura)}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar como factura
            </Button>
          )}
          {onViewDocument && (
            <Button
              variant="outline"
              onClick={() => onViewDocument(factura)}
              className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              <Eye className="h-4 w-4" />
              Ver Documento
            </Button>
          )}
          {onPrintDocument && (
            <Button
              variant="outline"
              onClick={() => onPrintDocument(factura)}
              className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-100"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
