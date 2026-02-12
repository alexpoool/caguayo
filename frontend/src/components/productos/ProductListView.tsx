import React from 'react';
import { Package, Edit, Trash2, Search, Plus } from 'lucide-react';
import type { Productos } from '../../types';
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

interface ProductListViewProps {
  productos: Productos[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit: (product: Productos) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ProductListView({
  productos,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onCreateNew,
  isLoading,
  isError,
  onRetry
}: ProductListViewProps) {

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar productos</p>
          <Button onClick={onRetry} className="mt-4" variant="secondary">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 mt-1">Gestión de inventario ({productos.length} items)</p>
        </div>
        <Button
          onClick={onCreateNew}
          className="gap-2 shadow-sm"
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
            <TableHeader className="bg-gray-50/50">
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
                      No se encontraron productos.
                   </TableCell>
                </TableRow>
              ) : (
                productos.map((producto) => (
                  <TableRow key={producto.id_producto} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {producto.subcategoria?.nombre || `ID: ${producto.id_subcategoria}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(producto)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
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
      </Card>
    </div>
  );
}
