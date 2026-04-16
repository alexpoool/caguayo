import { Receipt, DollarSign, Calendar, CreditCard, Edit, Trash2 } from 'lucide-react';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui';
import type { FacturaWithDetails } from '../../../../types/contrato';

interface FacturasTableProps {
  facturas: FacturaWithDetails[];
  onEdit: (factura: FacturaWithDetails) => void;
  onDelete: (id: number, codigo: string) => void;
  onViewDetails: (factura: FacturaWithDetails) => void;
  onOpenPagos: (factura: FacturaWithDetails) => void;
}

export function FacturasTable({
  facturas,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenPagos,
}: FacturasTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-violet-600" />
                Código
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-violet-600" />
                Monto
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-violet-600" />
                Pago Actual
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-600" />
                Fecha
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-600" />
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
                No hay facturas
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-violet-700 rounded text-sm font-mono font-medium">
                    <Receipt className="h-3 w-3" />
                    {item.codigo_factura || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  ${Number(item.monto).toFixed(2)}
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  ${Number(item.pago_actual).toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-500">{item.fecha}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenPagos(item)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8 transition-colors"
                        title="Registrar pago"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Botón Editar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8 transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Botón Eliminar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onDelete(item.id_factura, item.codigo_factura)
                      }
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
