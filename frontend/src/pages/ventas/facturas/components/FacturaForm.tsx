import { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Label, Input, DateInput } from '../../../../components/ui';
import { ProductSelector } from './ProductSelector';
import type { SelectedProduct } from '../hooks/useProductSelection';
import type { Productos } from '../../../../types';
import type { ContratoWithDetails } from '../../../../types/contrato';
import type { Cliente } from '../../../../types/ventas';

interface FacturaFormProps {
  formId: string;
  formData: Record<string, any>;
  selectedProducts: SelectedProduct[];
  productSearch: string;
  productosFiltrados: Productos[];
  total: number;
  productos: Productos[];
  monedas: any[];
  selectedContratoId: number | null;
  contratos: ContratoWithDetails[];
  clientes: Cliente[];
  onFormDataChange: (data: Record<string, any>) => void;
  onProductSearchChange: (search: string) => void;
  onAddProduct: (id: number) => void;
  onUpdateCantidad: (id: number, cantidad: number) => void;
  onUpdatePrecio: (id: number, precio: number) => void;
  onUpdatePrecioCompra?: (id: number, precio: number) => void;
  onRemoveProduct: (id: number) => void;
  onSelectedContratoChange: (id: number | null) => void;
  onSave: () => void;
  tipo?: "FACTURA" | "PREFACTURA";
}

export function FacturaForm({
  formId,
  formData,
  selectedProducts,
  productSearch,
  productosFiltrados,
  total,
  productos,
  monedas,
  selectedContratoId,
  contratos,
  clientes,
  onFormDataChange,
  onProductSearchChange,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onUpdatePrecioCompra,
  onRemoveProduct,
  onSelectedContratoChange,
  onSave,
  tipo = "FACTURA",
}: FacturaFormProps) {
  const esPreFactura = tipo === "PREFACTURA";
  const ringClass = esPreFactura
    ? "focus:ring-blue-500 focus:border-blue-500"
    : "focus:ring-violet-500 focus:border-violet-500";
  const accentBg = esPreFactura ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-600 hover:bg-violet-700";
  const etiqueta = esPreFactura ? "Pre-factura" : "Factura";
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [contratoSearch, setContratoSearch] = useState('');
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);
  const contratoRef = useRef<HTMLDivElement>(null);

  const selectedCliente = useMemo(() => {
    if (!selectedClienteId) return null;
    return clientes.find(c => c.id_cliente === selectedClienteId) || null;
  }, [selectedClienteId, clientes]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) || c.codigo?.toLowerCase().includes(q)
    );
  }, [clientes, clienteSearch]);

  const filteredContratos = useMemo(() => {
    let list = contratos;
    if (selectedClienteId) {
      list = list.filter(c => c.id_cliente === selectedClienteId);
    }
    if (!contratoSearch) return list;
    const q = contratoSearch.toLowerCase();
    return list.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.codigo?.toLowerCase().includes(q) ||
      c.cliente?.nombre?.toLowerCase().includes(q)
    );
  }, [contratos, selectedClienteId, contratoSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false);
      }
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
            {/* Cliente (buscador) */}
            <div ref={clienteRef} className="relative">
              <Label className="text-sm font-medium">Cliente</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={selectedCliente ? selectedCliente.nombre : clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    if (selectedCliente) {
                      setSelectedClienteId(null);
                      onSelectedContratoChange(null);
                    }
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  placeholder="Buscar cliente..."
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none bg-white ${ringClass}`}
                />
              </div>
              {showClienteDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {selectedClienteId && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors font-medium border-b border-gray-200"
                      onClick={() => {
                        setSelectedClienteId(null);
                        onSelectedContratoChange(null);
                        setShowClienteDropdown(false);
                      }}
                    >
                      ✕ Quitar filtro de cliente
                    </button>
                  )}
                  {filteredClientes.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No se encontraron clientes</div>
                  ) : (
                    filteredClientes.map((c) => (
                      <button
                        key={c.id_cliente}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-violet-50 transition-colors ${selectedClienteId === c.id_cliente ? 'bg-violet-100 font-medium' : ''}`}
                        onClick={() => {
                          setSelectedClienteId(c.id_cliente);
                          onSelectedContratoChange(null);
                          setClienteSearch('');
                          setShowClienteDropdown(false);
                        }}
                      >
                        {c.nombre} ({c.codigo})
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Contrato (buscador) */}
            <div ref={contratoRef} className="relative">
              <Label className="text-sm font-medium">Contrato</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={
                    selectedContratoId
                      ? (contratos.find(c => c.id_contrato === selectedContratoId)?.nombre || '')
                      : contratoSearch
                  }
                  onChange={(e) => {
                    setContratoSearch(e.target.value);
                    onSelectedContratoChange(null);
                    setShowContratoDropdown(true);
                  }}
                  onFocus={() => setShowContratoDropdown(true)}
                  placeholder="Buscar contrato..."
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none bg-white ${ringClass}`}
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
                          setSelectedClienteId(c.id_cliente);
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
                  className={`flex-1 focus:ring-2 ${ringClass}`}
                  value={formData.fecha || new Date().toISOString().split('T')[0]}
                  onChange={(fecha: string) =>
                    onFormDataChange({ ...formData, fecha })
                  }
                />
                <button
                  type="button"
                  onClick={() => onFormDataChange({ ...formData, fecha: new Date().toISOString().split('T')[0] })}
                  className={`px-3 py-2 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${accentBg}`}
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Descripción */}
            <div>
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
                placeholder={`Descripción de la ${etiqueta.toLowerCase()}`}
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
            onUpdatePrecioCompra={onUpdatePrecioCompra}
            onRemoveProduct={onRemoveProduct}
            productos={productos}
            monedas={monedas}
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
