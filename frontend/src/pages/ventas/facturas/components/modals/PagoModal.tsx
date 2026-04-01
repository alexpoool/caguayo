import { createPortal } from 'react-dom';
import { X, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../../components/ui';
import type { FacturaWithDetails } from '../../../../../types/contrato';
import type { Pago } from '../../../../../types/pago';

interface PagoModalProps {
  isOpen: boolean;
  factura: FacturaWithDetails | null;
  pagos: Pago[];
  pagoForm: {
    fecha: string;
    monto: string;
    id_moneda: string;
    tipo_pago: string;
    referencia: string;
  };
  onPagoFormChange: (form: any) => void;
  onCreatePago: () => void;
  onDeletePago: (pago: Pago) => void;
  onClose: () => void;
}

export function PagoModal({
  isOpen,
  factura,
  pagos,
  pagoForm,
  onPagoFormChange,
  onCreatePago,
  onDeletePago,
  onClose,
}: PagoModalProps) {
  if (!isOpen || !factura) return null;

  const pendiente = Number(factura.monto) - Number(factura.pago_actual);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                <CreditCard className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Pagos</h3>
                <p className="text-sm text-gray-500 font-mono">
                  {factura.codigo_factura} — ${Number(factura.monto).toFixed(2)} — Pendiente: ${pendiente.toFixed(2)}
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
          {/* Formulario de nuevo pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input
                type="date"
                value={pagoForm.fecha}
                onChange={(e: any) =>
                  onPagoFormChange({ ...pagoForm, fecha: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Monto</Label>
              <Input
                type="number"
                step="0.01"
                value={pagoForm.monto}
                onChange={(e: any) =>
                  onPagoFormChange({ ...pagoForm, monto: e.target.value })
                }
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                value={pagoForm.tipo_pago}
                onChange={(e: any) =>
                  onPagoFormChange({ ...pagoForm, tipo_pago: e.target.value })
                }
              >
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            {pagoForm.tipo_pago === 'TRANSFERENCIA' && (
              <div>
                <Label className="text-sm font-medium">Número de cuenta</Label>
                <Input
                  value={pagoForm.referencia}
                  onChange={(e: any) =>
                    onPagoFormChange({ ...pagoForm, referencia: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Nro. cuenta"
                />
              </div>
            )}
          </div>

          {/* Botón registrar */}
          <Button
            onClick={onCreatePago}
            disabled={!pagoForm.monto}
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Registrar Pago
          </Button>

          {/* Historial de pagos */}
          {pagos.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium mb-2 block">
                Historial de Pagos
              </Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número de cuenta</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago: any) => (
                    <TableRow key={pago.id_pago}>
                      <TableCell className="text-gray-500">{pago.fecha}</TableCell>
                      <TableCell className="font-medium">
                        ${Number(pago.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {pago.tipo_pago}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {pago.referencia || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => onDeletePago(pago)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
