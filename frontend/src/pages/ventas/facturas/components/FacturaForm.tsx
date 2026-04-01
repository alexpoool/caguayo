import { Save, ArrowLeft } from 'lucide-react';
import { Button, Label, Input, Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui';
import { ProductSelector } from './ProductSelector';
import type { Dependencia } from '../../../../types/dependencia';
import type { SelectedProduct } from '../hooks/useProductSelection';
import type { Productos } from '../../../../types';

interface FacturaFormProps {
  editingId: number | null;
  formData: Record<string, any>;
  selectedProducts: SelectedProduct[];
  productSearch: string;
  productosFiltrados: Productos[];
  total: number;
  dependencias: Dependencia[];
  monedas: any[];
  productos: Productos[];
  onFormDataChange: (data: Record<string, any>) => void;
  onProductSearchChange: (search: string) => void;
  onAddProduct: (id: number) => void;
  onUpdateCantidad: (id: number, cantidad: number) => void;
  onUpdatePrecio: (id: number, precio: number) => void;
  onRemoveProduct: (id: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function FacturaForm({
  editingId,
  formData,
  selectedProducts,
  productSearch,
  productosFiltrados,
  total,
  dependencias,
  monedas,
  productos,
  onFormDataChange,
  onProductSearchChange,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onRemoveProduct,
  onSave,
  onCancel,
}: FacturaFormProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Editar Factura' : 'Nueva Factura'}
          </h2>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg">Información de la Factura</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha */}
            <div>
              <Label htmlFor="fecha" className="text-sm font-medium">
                Fecha
              </Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha || ''}
                onChange={(e: any) =>
                  onFormDataChange({ ...formData, fecha: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {/* Código de factura */}
            <div>
              <Label htmlFor="codigo" className="text-sm font-medium">
                Código de Factura
              </Label>
              <Input
                id="codigo"
                value={formData.codigo_factura || ''}
                onChange={(e: any) =>
                  onFormDataChange({ ...formData, codigo_factura: e.target.value })
                }
                className="mt-1"
                placeholder="Ej: FAC-001"
              />
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
                placeholder="Descripción de la factura"
              />
            </div>

            {/* Dependencia */}
            <div>
              <Label htmlFor="dependencia" className="text-sm font-medium">
                Dependencia
              </Label>
              <select
                id="dependencia"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                value={formData.id_dependencia || ''}
                onChange={(e: any) =>
                  onFormDataChange({ ...formData, id_dependencia: e.target.value })
                }
              >
                <option value="">Seleccionar dependencia</option>
                {dependencias.map((d) => (
                  <option key={d.id_dependencia} value={d.id_dependencia}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Moneda */}
            <div>
              <Label htmlFor="moneda" className="text-sm font-medium">
                Moneda
              </Label>
              <select
                id="moneda"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                value={formData.id_moneda || ''}
                onChange={(e: any) =>
                  onFormDataChange({ ...formData, id_moneda: e.target.value })
                }
              >
                <option value="">Seleccionar moneda</option>
                {monedas.map((m) => (
                  <option key={m.id_moneda} value={m.id_moneda}>
                    {m.nombre} ({m.simbolo})
                  </option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
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

          {/* Botones de acción */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button
              onClick={onSave}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Save className="h-4 w-4" />
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="transition-colors hover:bg-gray-100"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
