import { Receipt, DollarSign, Calendar, CreditCard, Edit, Trash2, Eye, Printer, CheckCircle2 } from 'lucide-react';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, IconButton, MobileRecordCard } from '@/shared/ui/components';
import type { FacturaWithDetails, ContratoWithDetails } from '@/types/contrato';
import { formatFecha } from '@/utils/fecha';

interface FacturasTableProps {
  facturas: FacturaWithDetails[];
  contratos: ContratoWithDetails[];
  onEdit: (factura: FacturaWithDetails) => void;
  onDelete: (id: number, codigo: string) => void;
  onViewDetails: (factura: FacturaWithDetails) => void;
  onOpenPagos: (factura: FacturaWithDetails) => void;
  onAprobar?: (factura: FacturaWithDetails) => void;
  onViewDocument: (factura: FacturaWithDetails) => void;
  onPrintDocument: (factura: FacturaWithDetails) => void;
  tipo?: "FACTURA" | "PREFACTURA";
}

export function FacturasTable({
  facturas,
  contratos,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenPagos,
  onAprobar,
  onViewDocument,
  onPrintDocument,
  tipo = "FACTURA",
}: FacturasTableProps) {
  const esPreFactura = tipo === "PREFACTURA";

  // La factura no guarda moneda propia: se toma la del contrato.
  const getMonedaSimbolo = (idContrato: number) => {
    const contrato = contratos.find((c) => c.id_contrato === idContrato);
    return contrato?.moneda?.simbolo || '';
  };
  console.log('[FacturasTable] Render:', {
    facturasCount: facturas.length,
    hasOnViewDocument: typeof onViewDocument,
    hasOnPrintDocument: typeof onPrintDocument,
    hasOnEdit: typeof onEdit,
  });
  return (
    <>
      {/* Listado móvil: tarjetas en lugar de tabla ancha */}
      <div className="space-y-3 md:hidden">
        {facturas.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
            {esPreFactura ? 'No hay pre-facturas' : 'No hay facturas'}
          </div>
        ) : (
          facturas.map((item) => {
            const moneda = getMonedaSimbolo(item.id_contrato) || '$';
            const pendiente = item.monto > item.pago_actual;
            return (
              <MobileRecordCard
                key={item.id_factura}
                title={item.codigo_factura || 'N/A'}
                subtitle={formatFecha(item.fecha)}
                icon={<Receipt className="h-4 w-4" />}
                badges={
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      pendiente ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {pendiente ? 'Pendiente' : 'Pagada'}
                  </span>
                }
                fields={[
                  { label: 'Monto', value: `${moneda}${Number(item.monto).toFixed(2)}` },
                  { label: 'Pago actual', value: `${moneda}${Number(item.pago_actual).toFixed(2)}` },
                ]}
                onOpen={() => onViewDetails(item)}
                openLabel={`Ver detalle de ${item.codigo_factura || 'la factura'}`}
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenPagos(item)}
                      className="gap-1 text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Ver pagos
                    </Button>
                    <IconButton
                      label="Visualizar documento"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => onViewDocument?.(item)}
                      className="text-brand-600 hover:bg-brand-50 hover:text-brand-800"
                    />
                    <IconButton
                      label="Imprimir documento"
                      icon={<Printer className="h-4 w-4" />}
                      onClick={() => onPrintDocument?.(item)}
                      className="text-brand-600 hover:bg-brand-50 hover:text-brand-800"
                    />
                    {esPreFactura && onAprobar && (
                      <IconButton
                        label="Aprobar como factura"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => onAprobar(item)}
                        className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                      />
                    )}
                    <IconButton
                      label="Editar"
                      icon={<Edit className="h-4 w-4" />}
                      onClick={() => onEdit(item)}
                      className="text-green-600 hover:bg-green-50 hover:text-green-800"
                    />
                    <IconButton
                      label="Eliminar"
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                      onClick={() => onDelete(item.id_factura, item.codigo_factura)}
                    />
                  </>
                }
              />
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader className={`bg-gradient-to-r ${esPreFactura ? 'from-brand-50 to-brand-50' : 'from-brand-50 to-brand-50'}`}>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <Receipt className={`h-4 w-4 ${esPreFactura ? 'text-brand-600' : 'text-brand-600'}`} />
                Código
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <DollarSign className={`h-4 w-4 ${esPreFactura ? 'text-brand-600' : 'text-brand-600'}`} />
                Monto
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <DollarSign className={`h-4 w-4 ${esPreFactura ? 'text-brand-600' : 'text-brand-600'}`} />
                Pago Actual
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${esPreFactura ? 'text-brand-600' : 'text-brand-600'}`} />
                Fecha
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <CreditCard className={`h-4 w-4 ${esPreFactura ? 'text-brand-600' : 'text-brand-600'}`} />
                Pago
              </div>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facturas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                {esPreFactura ? 'No hay pre-facturas' : 'No hay facturas'}
              </TableCell>
            </TableRow>
          ) : (
            facturas.map((item) => (
              <TableRow
                key={item.id_factura}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => onViewDetails(item)}
              >
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-sm font-mono font-medium ${esPreFactura ? 'bg-brand-50 text-brand-700' : 'bg-brand-50 text-brand-700'}`}>
                    <Receipt className="h-3 w-3" />
                    {item.codigo_factura || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  <span className="text-gray-500 mr-1">
                    {getMonedaSimbolo(item.id_contrato) || '$'}
                  </span>
                  {Number(item.monto).toFixed(2)}
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  <span className="text-gray-500 mr-1">
                    {getMonedaSimbolo(item.id_contrato) || '$'}
                  </span>
                  {Number(item.pago_actual).toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-500">{formatFecha(item.fecha)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPagos(item)}
                    className="gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Ver pagos
                  </Button>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-2">
                    {/* Botón de pago si está pendiente */}
                    {item.monto > item.pago_actual && (
                      <IconButton
                        label="Registrar pago"
                        icon={<CreditCard className="h-4 w-4" />}
                        onClick={() => onOpenPagos(item)}
                        className="text-green-600 hover:bg-green-50 hover:text-green-800"
                      />
                    )}

                    <IconButton
                      label="Visualizar documento"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => onViewDocument?.(item)}
                      className="text-brand-600 hover:bg-brand-50 hover:text-brand-800"
                    />

                    <IconButton
                      label="Imprimir documento"
                      icon={<Printer className="h-4 w-4" />}
                      onClick={() => onPrintDocument?.(item)}
                      className="text-brand-600 hover:bg-brand-50 hover:text-brand-800"
                    />

                    {esPreFactura && onAprobar && (
                      <IconButton
                        label="Aprobar como factura"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => onAprobar(item)}
                        className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                      />
                    )}

                    <IconButton
                      label="Editar"
                      icon={<Edit className="h-4 w-4" />}
                      onClick={() => onEdit(item)}
                      className="text-green-600 hover:bg-green-50 hover:text-green-800"
                    />

                    <IconButton
                      label="Eliminar"
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                      onClick={() => onDelete(item.id_factura, item.codigo_factura)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
