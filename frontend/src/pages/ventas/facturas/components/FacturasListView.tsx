import { Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Label } from '../../../../components/ui';
import { FacturasTable } from './FacturasTable';
import type { FacturaWithDetails } from '../../../../types/contrato';
import type { ContratoWithDetails } from '../../../../types/contrato';

interface FacturasListViewProps {
  facturas: FacturaWithDetails[];
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  onSelectedContratoChange: (id: number | null) => void;
  onAddNew: () => void;
  onEdit: (factura: FacturaWithDetails) => void;
  onDelete: (id: number, codigo: string) => void;
  onViewDetails: (factura: FacturaWithDetails) => void;
  onOpenPagos: (factura: FacturaWithDetails) => void;
}

export function FacturasListView({
  facturas,
  contratos,
  selectedContratoId,
  onSelectedContratoChange,
  onAddNew,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenPagos,
}: FacturasListViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Facturas</h2>
        <Button
          onClick={onAddNew}
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Filtro por contrato */}
      <Card className="bg-white">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg">Filtrar por Contrato</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contrato-filter" className="text-sm font-medium">
                Contrato
              </Label>
              <select
                id="contrato-filter"
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                value={selectedContratoId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  onSelectedContratoChange(value ? Number(value) : null);
                }}
              >
                <option value="">Todos los contratos</option>
                {contratos.map((c) => (
                  <option key={c.id_contrato} value={c.id_contrato}>
                    {c.codigo || c.nombre} - {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Resumen */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-100">
              <p className="text-xs text-violet-600 uppercase tracking-wider mb-1">
                Total de Facturas
              </p>
              <p className="text-2xl font-bold text-violet-900">{facturas.length}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                Monto Total
              </p>
              <p className="text-2xl font-bold text-green-900">
                $
                {facturas
                  .reduce((sum, f) => sum + Number(f.monto), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de facturas */}
      <Card>
        <CardContent className="p-6">
          <FacturasTable
            facturas={facturas}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
            onOpenPagos={onOpenPagos}
          />
        </CardContent>
      </Card>
    </div>
  );
}
