import { Package, Search, Filter } from 'lucide-react';
import { useProductos } from '../../hooks/useProductos';
import { useState } from 'react';
import { 
  Button, 
  Input, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Loader2
} from '../../components/ui';

export function CompraProductosPage() {
  const {
    productos,
    isLoading,
    isError,
    refresh,
    searchTerm,
    setSearch
  } = useProductos();

  const [categoriaFilter, setCategoriaFilter] = useState<string>('');

  const filteredProductos = productos.filter(p => 
    !categoriaFilter || 
    (p.subcategoria?.categoria?.nombre === categoriaFilter)
  );

  const categorias = [...new Set(productos.map(p => p.subcategoria?.categoria?.nombre).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar productos</p>
          <Button onClick={refresh} variant="secondary" className="mt-4 gap-2">
            <Package className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Package className="w-6 h-6" />
            </div>
            Productos
          </h1>
          <p className="text-gray-500 mt-1">
            Catálogo de productos disponibles para compra
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat: any) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[40%]">Producto</TableHead>
                <TableHead>Precio Compra</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Precio Mínimo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm || categoriaFilter 
                      ? 'No se encontraron productos' 
                      : 'No hay productos registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductos.map((producto) => (
                  <TableRow key={producto.id_producto} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{producto.nombre}</span>
                          {producto.codigo && (
                            <span className="text-xs text-gray-500">Código: {producto.codigo}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${producto.precio_compra.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      ${producto.precio_venta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      ${producto.precio_minimo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {producto.subcategoria?.categoria?.nombre || producto.subcategoria?.nombre || `Cat: ${producto.id_subcategoria}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (producto.stock || producto.cantidad || 0) > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.stock || producto.cantidad || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
