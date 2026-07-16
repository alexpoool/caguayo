import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Eye } from 'lucide-react';
import { Input, Label } from '../../../../components/ui';
import type { Productos } from '../../../../types';
import type { SelectedProduct } from '../hooks/useProductSelection';
import { useStock } from '../../../../hooks/useStock';
import { authHelpers } from '../../../../lib/api';
import { mul, toNumber } from '../../../../utils/decimal';

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[];
  productSearch: string;
  onProductSearchChange: (search: string) => void;
  productosFiltrados: Productos[];
  onAddProduct: (id: number) => void;
  onUpdateCantidad: (id: number, cantidad: number) => void;
  onUpdatePrecio: (id: number, precio: number) => void;
  onUpdatePrecioCompra?: (id: number, precio: number) => void;
  onRemoveProduct: (id: number) => void;
  productos: Productos[];
  total: number;
  monedas?: any[];
}

export function ProductSelector({
  selectedProducts,
  productSearch,
  onProductSearchChange,
  productosFiltrados,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onUpdatePrecioCompra,
  onRemoveProduct,
  productos,
  total,
  monedas,
}: ProductSelectorProps) {
  const [showAllModal, setShowAllModal] = useState(false);
  const user = authHelpers.getUser() ?? {};
  const currentDependenciaId = user.dependencia?.id_dependencia ?? null;
  const { data: stockData = [], isLoading: isStockLoading } = useStock({ 
    idDependencia: currentDependenciaId 
  });

  // Create a map for quick stock lookup
  const stockMap = new Map<number, number>();
  stockData.forEach(item => {
    stockMap.set(item.id_producto, item.stock);
  });

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <Label className="mb-2 block">Productos</Label>

      {/* Lista de productos seleccionados - arriba */}
      {selectedProducts.length > 0 && (
        <div className="overflow-x-auto mb-3">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr className="divide-x divide-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Cantidad</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Precio</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Moneda</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Subtotal</th>
                <th className="px-4 py-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedProducts.map((p) => {
                const pr = productos.find((pr) => pr.id_producto === p.id_producto);
                const subtotal = toNumber(mul(p.cantidad, p.precio_venta));
                const stock = stockMap.get(p.id_producto) ?? 0;
                const tieneStockSuficiente = stock >= p.cantidad;

                return (
                  <tr key={p.id_producto} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{pr?.nombre || `Producto #${p.id_producto}`}</span>
                        {!tieneStockSuficiente && (
                          <span className="text-[11px] text-red-500 font-medium">sin stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          min="1"
                          value={p.cantidad}
                          onChange={(e: any) =>
                            onUpdateCantidad(p.id_producto, Number(e.target.value) || 1)
                          }
                          className="w-16 h-8 text-center text-sm"
                          placeholder="Cant"
                          style={{ 
                            borderColor: !tieneStockSuficiente && stock > 0 ? '#fca5a5' : undefined
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          step="0.01"
                          value={p.precio_venta}
                          onChange={(e: any) =>
                            onUpdatePrecio(p.id_producto, Number(e.target.value) || 0)
                          }
                          className="w-24 h-8 text-center text-sm"
                          placeholder="Precio"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                      {p.id_moneda
                        ? (monedas?.find((m: any) => m.id_moneda === p.id_moneda)?.simbolo || `#${p.id_moneda}`)
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium tabular-nums text-gray-800">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => onRemoveProduct(p.id_producto)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Eliminar producto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
            <div className="bg-gray-50 px-5 py-2.5 rounded-lg">
              <span className="text-sm text-gray-500">Total </span>
              <span className="text-lg font-bold text-gray-800 tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto para agregar..."
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAllModal(true)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          title="Ver todos los productos disponibles"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de resultados - debajo del buscador */}
      {productSearch.trim() && (
        <div className="w-full bg-white border rounded-lg shadow-sm max-h-64 overflow-y-auto">
          {productosFiltrados.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No se encontraron productos
            </div>
          ) : (
            productosFiltrados.slice(0, 50).map((p) => {
              const stock = (p as any).cantidad ?? 0;
              const stockStatus = stock === 0 ? 'text-red-500' : stock < 5 ? 'text-yellow-500' : 'text-green-500';
              const stockText = `${stock}`;
              
              return (
                <button
                  key={p.id_producto}
                  onClick={() => {
                    onAddProduct(p.id_producto);
                    onProductSearchChange('');
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 flex items-center gap-3 transition-colors"
                >
                  <span className="truncate text-sm font-medium text-gray-800 min-w-0 flex-1">{p.nombre}</span>
                  <span className="text-xs text-gray-400 w-16 truncate">{p.codigo || '-'}</span>
                  <span className={`text-xs font-medium w-16 text-center ${stockStatus}`}>{stockText}</span>
                  <span className="text-xs text-gray-400 w-8 text-center">{(p as any).moneda_simbolo || '-'}</span>
                  <span className="text-sm font-medium text-gray-700 tabular-nums w-24 text-right">
                    ${Number(p.precio_venta).toFixed(2)}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Mensaje cuando no hay productos */}
      {selectedProducts.length === 0 && !productSearch.trim() && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Busca y agrega productos para continuar
        </div>
      )}

      {/* Modal de todos los productos */}
      {showAllModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Todos los productos disponibles</h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {productos.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No hay productos disponibles con stock
                </div>
              ) : (
                productos.map((p) => {
                  const stock = (p as any).cantidad ?? 0;
                  const stockText = `${stock}`;
                  const stockColor = stock === 0 ? 'text-red-500' : stock < 5 ? 'text-yellow-600' : 'text-green-600';
                  return (
                    <button
                      key={p.id_producto}
                      onClick={() => {
                        onAddProduct(p.id_producto);
                        onProductSearchChange('');
                        setShowAllModal(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-violet-50 flex items-center gap-3 transition-colors rounded-lg"
                    >
                      <span className="truncate text-sm font-medium text-gray-800 min-w-0 flex-1">{p.nombre}</span>
                      <span className="text-xs text-gray-400 w-16 truncate">{p.codigo || '-'}</span>
                      <span className={`text-xs font-medium w-16 text-center ${stockColor}`}>{stockText}</span>
                      <span className="text-xs text-gray-400 w-8 text-center">{(p as any).moneda_simbolo || '-'}</span>
                      <span className="text-sm font-medium text-gray-700 tabular-nums w-24 text-right">
                        ${Number(p.precio_venta).toFixed(2)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
