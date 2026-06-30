
import { Package, Edit, Trash2, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import type { Productos } from '../../types/index';
import { 
  Button, 
  Input, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../ui';
import { RefObject } from 'react';

interface ProductListViewProps {
  productos: Productos[];
  totalProductos: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit: (product: Productos) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
  isLoading: boolean;
  isFetchingMore?: boolean;
  isError: boolean;
  onRetry: () => void;
  loadMoreRef?: RefObject<HTMLDivElement>;
}

export function ProductListView({
  productos,
  totalProductos,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onCreateNew,
  isLoading,
  isFetchingMore,
  isError,
  onRetry,
  loadMoreRef
}: ProductListViewProps) {

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">Cargando...</p>
          </div>
        </div>
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                <TableRow>
                  <TableHead className="w-[40%]">Nombre</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Precio Mínimo</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar productos</p>
          <Button onClick={onRetry} className="mt-4 gap-2" variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {productos.length === totalProductos 
                ? `Gestión de inventario (${totalProductos} items)`
                : `Mostrando ${productos.length} de ${totalProductos} productos`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={onCreateNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead className="w-[40%]">Nombre</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Precio Mínimo</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No se encontraron productos'}
                   </TableCell>
                </TableRow>
              ) : (
                productos.map((producto) => (
                  <TableRow key={producto.id_producto} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                           <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{producto.nombre}</span>
                          {producto.descripcion && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px] block">{producto.descripcion}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${producto.precio_venta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      ${producto.precio_minimo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-gray-800">
                        {producto.subcategoria?.nombre || `ID: ${producto.id_subcategoria}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(producto)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('¿Estás seguro de eliminar este producto?')) {
                                onDelete(producto.id_producto);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Elemento para scroll infinito */}
        {loadMoreRef && (
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {isFetchingMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Cargando más productos...</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
