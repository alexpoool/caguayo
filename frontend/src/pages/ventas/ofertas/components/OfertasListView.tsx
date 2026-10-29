import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ShoppingBag, Loader2, Search } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { OfertasTable } from './OfertasTable';
import type {
  OfertaTiendaWithDetails,
  ContratoWithDetails,
} from '../../../../types/contrato';
import type { EstadoOfertaFiltro } from '../hooks/useOfertas';

interface OfertasListViewProps {
  ofertas: OfertaTiendaWithDetails[];
  isLoading?: boolean;
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  estadoFiltro: EstadoOfertaFiltro;
  onEstadoFiltroChange: (estado: EstadoOfertaFiltro) => void;
  onSelectedContratoChange: (id: number | null) => void;
  onAddNew: () => void;
  onEdit: (oferta: OfertaTiendaWithDetails) => void;
  onDelete: (id: number, codigo: string | null | undefined) => void;
  onViewDetails: (oferta: OfertaTiendaWithDetails) => void;
  onViewDocument: (oferta: OfertaTiendaWithDetails) => void;
  onPrintDocument: (oferta: OfertaTiendaWithDetails) => void;
  onConvertir: (oferta: OfertaTiendaWithDetails) => void;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingMore: boolean;
}

const ESTADOS_OFERTA: { valor: EstadoOfertaFiltro; label: string }[] = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'ACTIVA', label: 'Activas' },
  { valor: 'CONVERTIDA', label: 'Convertidas' },
  { valor: 'ANULADA', label: 'Anuladas' },
];

export function OfertasListView({
  ofertas,
  isLoading = false,
  contratos,
  selectedContratoId,
  estadoFiltro,
  onEstadoFiltroChange,
  onSelectedContratoChange,
  onAddNew,
  onEdit,
  onDelete,
  onViewDetails,
  onViewDocument,
  onPrintDocument,
  onConvertir,
  loadMoreRef,
  isFetchingMore,
}: OfertasListViewProps) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded shadow-lg animate-bounce-subtle">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Ofertas de Tienda</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Ventas por oferta ({ofertas.length} registros)
            </p>
          </div>
        </div>
        <Button
          onClick={onAddNew}
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Oferta
        </Button>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        {ESTADOS_OFERTA.map(({ valor, label }) => (
          <button
            key={valor}
            type="button"
            onClick={() => onEstadoFiltroChange(valor)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              estadoFiltro === valor
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
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
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white"
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
                  className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 transition-colors"
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

      {/* Tabla de ofertas o skeleton inicial */}
      {isLoading && ofertas.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <span className="ml-3 text-sm text-gray-500">Cargando ofertas...</span>
        </div>
      ) : (
        <OfertasTable
          ofertas={ofertas}
          contratos={contratos}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
          onViewDocument={onViewDocument}
          onPrintDocument={onPrintDocument}
          onConvertir={onConvertir}
        />
      )}

      {/* Sentinel para infinite scroll */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingMore && (
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
        )}
      </div>
    </div>
  );
}
