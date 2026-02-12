import React, { useState, useEffect } from 'react';
import type { Productos, ProductosCreate } from '../../types';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../ui';

interface ProductFormProps {
  initialData?: Productos | null;
  onSubmit: (data: ProductosCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const defaultFormData: ProductosCreate = {
  id_subcategoria: 1,
  nombre: '',
  descripcion: '',
  moneda_compra: 1,
  precio_compra: 0,
  moneda_venta: 1,
  precio_venta: 0,
  precio_minimo: 0
};

export function ProductForm({ initialData, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductosCreate>(defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id_subcategoria: initialData.id_subcategoria,
        nombre: initialData.nombre,
        descripcion: initialData.descripcion || '',
        moneda_compra: initialData.moneda_compra,
        precio_compra: initialData.precio_compra,
        moneda_venta: initialData.moneda_venta,
        precio_venta: initialData.precio_venta,
        precio_minimo: initialData.precio_minimo
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{initialData ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
        <Button variant="ghost" onClick={onCancel}>
          Volver a la lista
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label>Nombre del Producto</Label>
            <Input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. iPhone 15 Pro"
            />
          </div>
          
          <div>
            <Label>Subcategoría (ID)</Label>
            <Input
              type="number"
              required
              value={formData.id_subcategoria}
              onChange={(e) => setFormData({ ...formData, id_subcategoria: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">1: Smartphones, 2: Laptops, etc.</p>
          </div>

          <div>
            <Label>Precio Compra</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.precio_compra}
              onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div>
            <Label>Precio Venta</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.precio_venta}
              onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div>
            <Label>Precio Mínimo</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.precio_minimo}
              onChange={(e) => setFormData({ ...formData, precio_minimo: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Detalles adicionales del producto..."
            />
          </div>

          <div className="flex gap-4 md:col-span-2 mt-4 pt-4 border-t">
            <Button type="submit" className="w-32" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : initialData ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
