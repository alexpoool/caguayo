import { Eye, ExternalLink, FileText, Printer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, ModalOverlay } from "../../../../../components/ui";
import { formatCifra } from "../../../../../utils/decimal";
import { formatFecha } from "../../../../../utils/fecha";
import type {
  ItemOfertaTienda,
  OfertaTiendaWithDetails,
} from "../../../../../types/contrato";

interface OfertaDetailModalProps {
  isOpen: boolean;
  oferta: OfertaTiendaWithDetails | null;
  onClose: () => void;
  onViewDocument?: (oferta: OfertaTiendaWithDetails) => void;
  onPrintDocument?: (oferta: OfertaTiendaWithDetails) => void;
}

export function OfertaDetailModal({
  isOpen,
  oferta,
  onClose,
  onViewDocument,
  onPrintDocument,
}: OfertaDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !oferta) return null;

  const items = oferta.items || [];
  const confirmada = oferta.estado === "CONVERTIDA";
  const anulada = oferta.estado === "ANULADA";
  const esPreFactura = oferta.tipo_factura === "PREFACTURA";

  const abrirDocumentoGenerado = () => {
    if (!oferta.id_factura) return;
    const ruta = esPreFactura ? "/ventas/pre-facturas" : "/ventas/facturas";
    navigate(`${ruta}?contrato=${oferta.id_contrato}`);
    onClose();
  };

  return (
    <ModalOverlay
      isOpen={true}
      onClose={onClose}
      ariaLabel={`Detalle de la oferta ${oferta.codigo_oferta || ""}`}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <FileText className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-gray-900 truncate">
                  Oferta {oferta.codigo_oferta || `#${oferta.id_oferta_tienda}`}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {oferta.descripcion || "Sin descripción"}
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
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">
                Importe total
              </p>
              <p className="font-bold text-amber-900 text-xl">
                {formatCifra(Number(oferta.monto || 0))}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Fecha
              </p>
              <p className="font-bold text-gray-900">
                {formatFecha(oferta.fecha) || "N/A"}
              </p>
            </div>
            <div
              className={`p-4 rounded-xl border ${
                anulada
                  ? "bg-red-50 border-red-100"
                  : confirmada
                    ? "bg-green-50 border-green-100"
                    : "bg-amber-50 border-amber-100"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-wider mb-1 ${
                  anulada
                    ? "text-red-600"
                    : confirmada
                      ? "text-green-600"
                      : "text-amber-600"
                }`}
              >
                Estado
              </p>
              <p
                className={`font-bold text-xl ${
                  anulada
                    ? "text-red-700"
                    : confirmada
                      ? "text-green-700"
                      : "text-amber-700"
                }`}
              >
                {anulada ? "Anulada" : confirmada ? "Convertida" : "Activa"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Contrato
              </p>
              <p className="font-bold text-gray-900 truncate">
                #{oferta.id_contrato}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Documento generado
              </p>
              {oferta.id_factura ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {esPreFactura ? "Pre-factura" : "Factura"}
                    </p>
                    <p className="text-sm font-mono text-gray-600 truncate">
                      {oferta.codigo_factura || `#${oferta.id_factura}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={abrirDocumentoGenerado}
                    className="gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 shrink-0"
                    title="Abrir en su página"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Button>
                </div>
              ) : (
                <p className="font-bold text-gray-900">—</p>
              )}
            </div>
            {oferta.observaciones && (
              <div className="bg-gray-50 p-4 rounded-xl sm:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Observaciones
                </p>
                <p className="text-gray-700">{oferta.observaciones}</p>
              </div>
            )}
          </div>

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
                  items.map((item: ItemOfertaTienda) => (
                    <tr key={item.id_item_oferta_tienda}>
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
                          Number(item.cantidad || 0) *
                            Number(item.precio_venta || 0),
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-2">
          {onViewDocument && (
            <Button
              variant="outline"
              onClick={() => onViewDocument(oferta)}
              className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              <Eye className="h-4 w-4" />
              Ver Documento
            </Button>
          )}
          {onPrintDocument && (
            <Button
              variant="outline"
              onClick={() => onPrintDocument(oferta)}
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
