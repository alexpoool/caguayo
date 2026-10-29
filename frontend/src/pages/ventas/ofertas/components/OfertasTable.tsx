import {
  Pencil,
  Trash2,
  Eye,
  FileText,
  Printer,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { formatFecha } from '../../../../utils/fecha';
import type { OfertaTiendaWithDetails, ContratoWithDetails } from '../../../../types/contrato';

interface OfertasTableProps {
  ofertas: OfertaTiendaWithDetails[];
  contratos: ContratoWithDetails[];
  onEdit: (oferta: OfertaTiendaWithDetails) => void;
  onDelete: (id: number, codigo: string | null | undefined) => void;
  onViewDetails: (oferta: OfertaTiendaWithDetails) => void;
  onViewDocument: (oferta: OfertaTiendaWithDetails) => void;
  onPrintDocument: (oferta: OfertaTiendaWithDetails) => void;
  onConvertir: (oferta: OfertaTiendaWithDetails) => void;
}

export function OfertasTable({
  ofertas,
  contratos,
  onEdit,
  onDelete,
  onViewDetails,
  onViewDocument,
  onPrintDocument,
  onConvertir,
}: OfertasTableProps) {
  if (ofertas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay ofertas registradas</p>
        <p className="text-sm text-gray-400 mt-1">
          Crea una oferta para un contrato con el botón "Nueva Oferta"
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contrato
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monto
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {ofertas.map((oferta) => {
            const contrato = contratos.find(
              (c) => c.id_contrato === oferta.id_contrato
            );
            return (
              <tr
                key={oferta.id_oferta_tienda}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => onViewDetails(oferta)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {oferta.codigo_oferta || `#${oferta.id_oferta_tienda}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatFecha(oferta.fecha)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {contrato?.nombre || `#${oferta.id_contrato}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  <span className="text-gray-500 mr-1">
                    {contrato?.moneda?.simbolo || '$'}
                  </span>
                  {Number(oferta.monto || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {oferta.estado === 'CONVERTIDA' ? (
                    <div className="flex flex-col items-start">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Convertida
                      </span>
                      {oferta.codigo_factura && (
                        <span
                          className="mt-1 text-xs text-gray-500 font-mono"
                          title={
                            oferta.tipo_factura === 'PREFACTURA'
                              ? 'Pre-factura generada'
                              : 'Factura generada'
                          }
                        >
                          {oferta.codigo_factura}
                        </span>
                      )}
                    </div>
                  ) : oferta.estado === 'ANULADA' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Anulada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Activa
                    </span>
                  )}
                </td>
                <td
                  className="px-4 py-3 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onViewDetails(oferta)}
                      title="Ver detalles"
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {oferta.estado === 'ACTIVA' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(oferta)}
                          title="Editar"
                          className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onConvertir(oferta)}
                          title="Confirmar oferta"
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewDocument(oferta)}
                      title="Ver documento"
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrintDocument(oferta)}
                      title="Imprimir"
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {oferta.estado === 'ACTIVA' && (
                      <button
                        type="button"
                        onClick={() => onDelete(oferta.id_oferta_tienda, oferta.codigo_oferta)}
                        title="Anular oferta"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
