import { Search, X } from 'lucide-react';
import { Input, Label } from '../../../../components/ui';
import type { Productos } from '../../../../types';
import type { SelectedProduct } from '../hooks/useProductSelection';
import { useStock } from '../../../../hooks/useStock';
import { authHelpers } from '../../../../lib/api';
import { mul, toNumber, toFixed } from '../../../../utils/decimal';

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

      {/* Buscador con lista de productos siempre visible */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto para agregar..."
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de productos - siempre visible */}
        <div className="w-full mt-1 bg-white border rounded-lg shadow-sm max-h-64 overflow-y-auto">
            {productosFiltrados.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No se encontraron productos
              </div>
            ) : (
              (productSearch.trim() ? productosFiltrados : productos.filter(p => !selectedProducts.some(sp => sp.id_producto === p.id_producto))).slice(0, 50).map((p) => {
                const stock = stockMap.get(p.id_producto) ?? 0;
                const stockStatus = stock === 0 ? 'text-red-500' : stock < 5 ? 'text-yellow-500' : 'text-green-500';
                const stockText = stock === 0 ? 'AGOTADO' : stock < 5 ? 'BAJO' : `${stock}`;
                
                return (
                  <button
                    key={p.id_producto}
                    onClick={() => {
                      onAddProduct(p.id_producto);
                      onProductSearchChange('');
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 flex justify-between items-center transition-colors"
                  >
                    <div className="flex-1">
                      <span className="truncate">{p.nombre}</span>
                      <span className={`ml-2 text-xs ${stockStatus}`}>({stockText})</span>
                    </div>
                    <span className="text-gray-400 text-xs ml-2">
                      ${Number(p.precio_venta).toFixed(2)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
      </div>

      {/* Lista de productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b">Nombre</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 border-b w-24">Cantidad</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 border-b w-28">Precio</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 border-b w-20">Moneda</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700 border-b w-28">Subtotal</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 border-b w-12"></th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts.map((p) => {
                const pr = productos.find((pr) => pr.id_producto === p.id_producto);
                const subtotal = toNumber(mul(p.cantidad, p.precio_venta));
                const stock = stockMap.get(p.id_producto) ?? 0;
                const tieneStockSuficiente = stock >= p.cantidad;

                return (
                  <tr key={p.id_producto} className="border-t hover:bg-violet-50 transition-colors">
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {pr?.nombre || `Producto #${p.id_producto}`}
                      {stock === 0 ? (
                        <span className="ml-2 text-xs text-red-600 font-bold">AGOTADO</span>
                      ) : (
                        <span className={`ml-2 text-xs font-medium ${stock >= 5 ? 'text-green-600' : 'text-yellow-600'}`}>
                          Stock: {stock}
                        </span>
                      )}
                      {stock > 0 && !tieneStockSuficiente && (
                        <span className="ml-2 text-xs text-red-500">(excede)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="1"
                        value={p.cantidad}
                        onChange={(e: any) =>
                          onUpdateCantidad(p.id_producto, Number(e.target.value) || 1)
                        }
                        className="w-20 h-8 text-center"
                        placeholder="Cantidad"
                        style={{ 
                          borderColor: !tieneStockSuficiente && stock > 0 ? 'red' : undefined,
                          backgroundColor: !tieneStockSuficiente && stock === 0 ? '#fef2f2' : undefined
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={p.precio_venta}
                        onChange={(e: any) =>
                          onUpdatePrecio(p.id_producto, Number(e.target.value) || 0)
                        }
                        className="w-24 h-8 text-center"
                        placeholder="Precio"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {p.id_moneda
                        ? (monedas?.find((m: any) => m.id_moneda === p.id_moneda)?.simbolo || `#${p.id_moneda}`)
                        : '-'}
                      {p.precios && p.precios.length > 0 && (
                        <span className="block text-[10px] text-gray-400">
                          +{p.precios.length} alt.
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm font-medium">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onRemoveProduct(p.id_producto)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
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
          <div className="text-right font-bold text-lg mt-3 pt-3 border-t border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 p-3 rounded">
            Monto Total: ${total.toFixed(2)}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay productos */}
      {selectedProducts.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Busca y agrega productos para continuar
        </div>
      )}
    </div>
  );
}
