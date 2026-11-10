import {
  Pencil,
  Trash2,
  Eye,
  FileText,
  Printer,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { formatFecha } from '@/utils/fecha';
import { IconButton, MobileRecordCard } from '@/shared/ui/components';
import type { OfertaTiendaWithDetails, ContratoWithDetails } from '@/types/contrato';

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
    <>
      {/* Listado móvil: tarjetas en lugar de tabla ancha */}
      <div className="space-y-3 md:hidden">
        {ofertas.map((oferta) => {
          const contrato = contratos.find(
            (c) => c.id_contrato === oferta.id_contrato
          );
          return (
            <MobileRecordCard
              key={oferta.id_oferta_tienda}
              title={oferta.codigo_oferta || `#${oferta.id_oferta_tienda}`}
              subtitle={formatFecha(oferta.fecha)}
              icon={<ShoppingBag className="h-4 w-4" />}
              badges={
                oferta.estado === 'CONVERTIDA' ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Convertida
                  </span>
                ) : oferta.estado === 'ANULADA' ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    Anulada
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Activa
                  </span>
                )
              }
              fields={[
                {
                  label: 'Contrato',
                  value: contrato?.nombre || `#${oferta.id_contrato}`,
                },
                {
                  label: 'Monto',
                  value: `${contrato?.moneda?.simbolo || '$'}${Number(oferta.monto || 0).toFixed(2)}`,
                },
              ]}
              onOpen={() => onViewDetails(oferta)}
              openLabel={`Ver detalle de ${oferta.codigo_oferta || 'la oferta'}`}
              actions={
                <>
                  {oferta.estado === 'ACTIVA' && (
                    <>
                      <IconButton
                        label="Editar"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => onEdit(oferta)}
                        className="text-brand-600 hover:bg-brand-50 hover:text-brand-800"
                      />
                      <IconButton
                        label="Confirmar oferta"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => onConvertir(oferta)}
                        className="text-green-600 hover:bg-green-50 hover:text-green-800"
                      />
                    </>
                  )}
                  <IconButton
                    label="Ver documento"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() => onViewDocument(oferta)}
                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                  />
                  <IconButton
                    label="Imprimir"
                    icon={<Printer className="h-4 w-4" />}
                    onClick={() => onPrintDocument(oferta)}
                    className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                  />
                  {oferta.estado === 'ACTIVA' && (
                    <IconButton
                      label="Anular oferta"
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                      onClick={() =>
                        onDelete(oferta.id_oferta_tienda, oferta.codigo_oferta)
                      }
                    />
                  )}
                </>
              }
            />
          );
        })}
      </div>

      <div className="hidden overflow-hidden overflow-x-auto rounded-lg bg-white shadow-md md:block">
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
                    <IconButton
                      label="Ver detalles"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => onViewDetails(oferta)}
                      className="text-gray-500 hover:bg-brand-50 hover:text-brand-600"
                    />
                    {oferta.estado === 'ACTIVA' && (
                      <>
                        <IconButton
                          label="Editar"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => onEdit(oferta)}
                          className="text-gray-500 hover:bg-brand-50 hover:text-brand-600"
                        />
                        <IconButton
                          label="Confirmar oferta"
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => onConvertir(oferta)}
                          className="text-gray-500 hover:bg-green-50 hover:text-green-600"
                        />
                      </>
                    )}
                    <IconButton
                      label="Ver documento"
                      icon={<FileText className="h-4 w-4" />}
                      onClick={() => onViewDocument(oferta)}
                      className="text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                    />
                    <IconButton
                      label="Imprimir"
                      icon={<Printer className="h-4 w-4" />}
                      onClick={() => onPrintDocument(oferta)}
                      className="text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
                    />
                    {oferta.estado === 'ACTIVA' && (
                      <IconButton
                        label="Anular oferta"
                        icon={<Trash2 className="h-4 w-4" />}
                        variant="danger"
                        onClick={() => onDelete(oferta.id_oferta_tienda, oferta.codigo_oferta)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
