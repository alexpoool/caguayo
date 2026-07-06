import { Plus, Receipt, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { FacturasTable } from './FacturasTable';
import type { FacturaWithDetails } from '../../../../types/contrato';
import type { ContratoWithDetails } from '../../../../types/contrato';

interface FacturasListViewProps {
  facturas: FacturaWithDetails[];
  isLoading?: boolean;
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  onSelectedContratoChange: (id: number | null) => void;
  onAddNew: () => void;
  onEdit: (factura: FacturaWithDetails) => void;
  onDelete: (id: number, codigo: string) => void;
  onViewDetails: (factura: FacturaWithDetails) => void;
  onOpenPagos: (factura: FacturaWithDetails) => void;
  onViewDocument: (factura: FacturaWithDetails) => void;
  onPrintDocument: (factura: FacturaWithDetails) => void;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingMore: boolean;
}

export function FacturasListView({
  facturas,
  isLoading = false,
  contratos,
  selectedContratoId,
  onSelectedContratoChange,
  onAddNew,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenPagos,
  onViewDocument,
  onPrintDocument,
  loadMoreRef,
  isFetchingMore,
}: FacturasListViewProps) {
  console.log('[FacturasListView] Render:', {
    facturasCount: facturas.length,
    hasOnViewDocument: typeof onViewDocument,
    hasOnPrintDocument: typeof onPrintDocument,
  });
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Facturas</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de facturas ({facturas.length} registros)
            </p>
          </div>
        </div>
        <Button
          onClick={onAddNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Filtro por contrato */}
      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <select
            id="contrato-filter"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
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
      </div>

      {/* Resumen stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
          <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">
            Total Facturas
          </p>
          <p className="text-2xl font-bold text-teal-900">{facturas.length}</p>
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

      {/* Tabla de facturas o skeleton inicial */}
      {isLoading && facturas.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          <span className="ml-3 text-sm text-gray-500">Cargando facturas...</span>
        </div>
      ) : (
        <FacturasTable
          facturas={facturas}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
          onOpenPagos={onOpenPagos}
          onViewDocument={onViewDocument}
          onPrintDocument={onPrintDocument}
        />
      )}

      {/* Sentinel para infinite scroll */}
      <div
        ref={loadMoreRef}
        className="flex justify-center py-4"
      >
        {isFetchingMore && (
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        )}
      </div>
    </div>
  );
}
