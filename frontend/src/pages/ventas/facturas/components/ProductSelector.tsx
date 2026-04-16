import { Search, X } from 'lucide-react';
import { Input, Label } from '../../../../components/ui';
import type { Productos } from '../../../../types';
import type { SelectedProduct } from '../hooks/useProductSelection';

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[];
  productSearch: string;
  onProductSearchChange: (search: string) => void;
  productosFiltrados: Productos[];
  onAddProduct: (id: number) => void;
  onUpdateCantidad: (id: number, cantidad: number) => void;
  onUpdatePrecio: (id: number, precio: number) => void;
  onRemoveProduct: (id: number) => void;
  productos: Productos[];
  total: number;
}

export function ProductSelector({
  selectedProducts,
  productSearch,
  onProductSearchChange,
  productosFiltrados,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onRemoveProduct,
  productos,
  total,
}: ProductSelectorProps) {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <Label className="mb-2 block">Productos</Label>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar producto para agregar..."
          value={productSearch}
          onChange={(e) => onProductSearchChange(e.target.value)}
          className="pl-9"
        />

        {/* Dropdown de búsqueda */}
        {productSearch.trim() && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {productosFiltrados.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No se encontraron productos
              </div>
            ) : (
              productosFiltrados.map((p) => (
                <button
                  key={p.id_producto}
                  onClick={() => {
                    onAddProduct(p.id_producto);
                    onProductSearchChange('');
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 flex justify-between items-center transition-colors"
                >
                  <span>{p.nombre}</span>
                  <span className="text-gray-400 text-xs">
                    ${Number(p.precio_venta).toFixed(2)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lista de productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded font-semibold text-sm border border-gray-200">
            <span className="flex-1">Producto</span>
            <span className="w-20 text-center">Cantidad</span>
            <span className="w-24 text-center">Precio</span>
            <span className="w-20 text-right">Subtotal</span>
            <span className="w-6"></span>
          </div>

          {/* Fila de producto */}
          {selectedProducts.map((p) => {
            const pr = productos.find((pr) => pr.id_producto === p.id_producto);
            const subtotal = p.cantidad * p.precio_venta;

            return (
              <div
                key={p.id_producto}
                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-violet-300 transition-colors"
              >
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {pr?.nombre}
                </span>
                <Input
                  type="number"
                  min="1"
                  value={p.cantidad}
                  onChange={(e: any) =>
                    onUpdateCantidad(p.id_producto, Number(e.target.value) || 1)
                  }
                  className="w-20 text-center"
                  placeholder="Cantidad"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={p.precio_venta}
                  onChange={(e: any) =>
                    onUpdatePrecio(p.id_producto, Number(e.target.value) || 0)
                  }
                  className="w-24 text-center"
                  placeholder="Precio"
                />
                <span className="w-20 text-right text-gray-600 text-sm font-medium">
                  ${subtotal.toFixed(2)}
                </span>
                <button
                  onClick={() => onRemoveProduct(p.id_producto)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                  title="Eliminar producto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

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
