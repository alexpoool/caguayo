import { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Label, Input, DateInput } from '../../../../components/ui';
import { ProductSelector } from '../../facturas/components/ProductSelector';
import type { SelectedProduct } from '../../facturas/hooks/useProductSelection';
import type { Productos } from '../../../../types';
import type { ContratoWithDetails } from '../../../../types/contrato';

interface OfertaFormProps {
  formId: string;
  formData: Record<string, any>;
  selectedProducts: SelectedProduct[];
  productSearch: string;
  productosFiltrados: Productos[];
  total: number;
  productos: Productos[];
  selectedContratoId: number | null;
  contratos: ContratoWithDetails[];
  onFormDataChange: (data: Record<string, any>) => void;
  onProductSearchChange: (search: string) => void;
  onAddProduct: (id: number) => void;
  onUpdateCantidad: (id: number, cantidad: number) => void;
  onUpdatePrecio: (id: number, precio: number) => void;
  onRemoveProduct: (id: number) => void;
  onSelectedContratoChange: (id: number | null) => void;
  onSave: () => void;
}

export function OfertaForm({
  formId,
  formData,
  selectedProducts,
  productSearch,
  productosFiltrados,
  total,
  productos,
  selectedContratoId,
  contratos,
  onFormDataChange,
  onProductSearchChange,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onRemoveProduct,
  onSelectedContratoChange,
  onSave,
}: OfertaFormProps) {
  const [contratoSearch, setContratoSearch] = useState('');
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const contratoRef = useRef<HTMLDivElement>(null);

  const filteredContratos = useMemo(() => {
    if (!contratoSearch) return contratos;
    const q = contratoSearch.toLowerCase();
    return contratos.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.cliente?.nombre?.toLowerCase().includes(q)
    );
  }, [contratos, contratoSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contratoRef.current && !contratoRef.current.contains(e.target as Node)) {
        setShowContratoDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      className="p-4 md:p-6"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contrato (buscador) */}
          <div ref={contratoRef} className="relative">
            <Label className="text-sm font-medium">Contrato *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={
                  editingContratoLabel(selectedContratoId, contratos) || contratoSearch
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
                      {c.nombre} ({c.cliente?.nombre || 'Sin cliente'})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <Label htmlFor="fecha" className="text-sm font-medium">
              Fecha
            </Label>
            <div className="flex gap-2 mt-1">
              <DateInput
                id="fecha"
                className="flex-1 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                value={formData.fecha || new Date().toISOString().split('T')[0]}
                onChange={(fecha: string) =>
                  onFormDataChange({ ...formData, fecha })
                }
              />
              <button
                type="button"
                onClick={() => onFormDataChange({ ...formData, fecha: new Date().toISOString().split('T')[0] })}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Hoy
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <Label htmlFor="descripcion" className="text-sm font-medium">
              Descripción
            </Label>
            <Input
              id="descripcion"
              value={formData.descripcion || ''}
              onChange={(e: any) =>
                onFormDataChange({ ...formData, descripcion: e.target.value })
              }
              className="mt-1"
              placeholder="Descripción de la oferta"
            />
          </div>
        </div>

        {/* Selector de productos */}
        <ProductSelector
          selectedProducts={selectedProducts}
          productSearch={productSearch}
          onProductSearchChange={onProductSearchChange}
          productosFiltrados={productosFiltrados}
          onAddProduct={onAddProduct}
          onUpdateCantidad={onUpdateCantidad}
          onUpdatePrecio={onUpdatePrecio}
          onRemoveProduct={onRemoveProduct}
          productos={productos}
          total={total}
        />

        {/* Observaciones */}
        <div className="mt-6">
          <Label htmlFor="observaciones" className="text-sm font-medium">
            Observaciones
          </Label>
          <Input
            id="observaciones"
            value={formData.observaciones || ''}
            onChange={(e: any) =>
              onFormDataChange({ ...formData, observaciones: e.target.value })
            }
            className="mt-1"
            placeholder="Observaciones adicionales"
          />
        </div>
      </div>
    </form>
  );
}

function editingContratoLabel(
  selectedContratoId: number | null,
  contratos: ContratoWithDetails[]
): string {
  if (!selectedContratoId) return '';
  return contratos.find((c) => c.id_contrato === selectedContratoId)?.nombre || '';
}
