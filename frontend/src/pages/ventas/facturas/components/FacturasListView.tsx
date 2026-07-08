import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Receipt, Loader2, Search } from 'lucide-react';
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
  const [contratoSearch, setContratoSearch] = useState('');
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const contratoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contratoRef.current && !contratoRef.current.contains(e.target as Node)) {
        setShowContratoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredContratos = useMemo(() => {
    if (!contratoSearch) return contratos;
    const term = contratoSearch.toLowerCase();
    return contratos.filter((c) => c.nombre?.toLowerCase().includes(term));
  }, [contratos, contratoSearch]);

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

      {/* Filtro por contrato (buscador) */}
      <div ref={contratoRef} className="relative max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={
              selectedContratoId
                ? (contratos.find((c) => c.id_contrato === selectedContratoId)?.nombre || '')
                : contratoSearch
            }
            onChange={(e) => {
              setContratoSearch(e.target.value);
              onSelectedContratoChange(null);
              setShowContratoDropdown(true);
            }}
            onFocus={() => setShowContratoDropdown(true)}
            placeholder="Buscar contrato..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
          />
        </div>
        {showContratoDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredContratos.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No se encontraron contratos</div>
            ) : (
              filteredContratos.map((c) => (
                <button
                  key={c.id_contrato}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 transition-colors"
                  onClick={() => {
                    onSelectedContratoChange(c.id_contrato);
                    setContratoSearch('');
                    setShowContratoDropdown(false);
                  }}
                >
                  {c.nombre}
                </button>
              ))
            )}
          </div>
        )}
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
