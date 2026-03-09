import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Productos, ProductosCreate } from '../../types/index';
import { subcategoriasService, categoriasService, monedaService } from '../../services/api';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { ArrowLeft, Save, X } from 'lucide-react';

interface ProductFormProps {
  initialData?: Productos | null;
  onSubmit: (data: ProductosCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const defaultFormData: ProductosCreate = {
  codigo: '',
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
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);

  const { data: categorias = [], isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => categoriasService.getCategorias(),
  });

  const { data: subcategorias = [], isLoading: isLoadingSubcategorias } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: () => subcategoriasService.getSubcategorias(),
  });

  const { data: monedas = [], isLoading: isLoadingMonedas } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const subcategoriasFiltradas = selectedCategoria
    ? subcategorias.filter((sub) => sub.id_categoria === selectedCategoria)
    : [];

  useEffect(() => {
    if (initialData) {
      const subcategoria = subcategorias.find(
        (sub) => sub.id_subcategoria === initialData.id_subcategoria
      );
      if (subcategoria) {
        setSelectedCategoria(subcategoria.id_categoria);
      }

      setFormData({
        codigo: initialData.codigo || '',
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
      setSelectedCategoria(null);
    }
  }, [initialData, subcategorias]);

  const handleCategoriaChange = (categoriaId: number) => {
    setSelectedCategoria(categoriaId);
    setFormData({ ...formData, id_subcategoria: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Asegurar que los precios sean números válidos antes de enviar
    const dataToSubmit = {
      ...formData,
      precio_compra: formData.precio_compra || 0,
      precio_venta: formData.precio_venta || 0,
      precio_minimo: formData.precio_minimo || 0,
    };
    onSubmit(dataToSubmit);
  };

  // Helper para manejar cambios en campos numéricos sin el problema del cero inicial
  const handleNumberInputChange = (field: keyof ProductosCreate, value: string) => {
    // Si el campo está vacío, establecer como undefined (no 0)
    if (value === '' || value === '.') {
      setFormData({ ...formData, [field]: undefined as any });
      return;
    }
    // Convertir a número solo si hay un valor válido
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData({ ...formData, [field]: numValue });
    }
  };

  const isLoading = isLoadingCategorias || isLoadingSubcategorias || isLoadingMonedas;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
        <CardTitle className="text-lg">{initialData ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
        <Button variant="ghost" onClick={onCancel} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a la lista
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código y Nombre en una fila */}
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <Label className="text-sm mb-1.5 block">Código</Label>
              <Input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej. PROD-001"
                className="h-11"
              />
            </div>
            
            {/* Nombre */}
            <div>
              <Label className="text-sm mb-1.5 block">Nombre del Producto *</Label>
              <Input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. iPhone 15 Pro"
                className="h-11"
              />
            </div>
          </div>
          
          {/* Categoría y Subcategoría en una fila */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Categoría *</Label>
              <select
                required
                value={selectedCategoria || ''}
                onChange={(e) => handleCategoriaChange(parseInt(e.target.value) || 0)}
                disabled={isLoadingCategorias}
                className="w-full px-3 py-2 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="">{isLoadingCategorias ? 'Cargando...' : 'Seleccione una categoría'}</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id_categoria} value={categoria.id_categoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">Subcategoría *</Label>
              <select
                required
                value={formData.id_subcategoria || ''}
                onChange={(e) => setFormData({ ...formData, id_subcategoria: parseInt(e.target.value) || 0 })}
                disabled={!selectedCategoria || isLoadingSubcategorias}
                className="w-full px-3 py-2 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white disabled:bg-gray-100"
              >
                <option value="">{!selectedCategoria ? 'Primero seleccione una categoría' : 'Seleccione una subcategoría'}</option>
                {subcategoriasFiltradas.map((subcategoria) => (
                  <option key={subcategoria.id_subcategoria} value={subcategoria.id_subcategoria}>
                    {subcategoria.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Precios en una fila */}
          <div className="grid grid-cols-3 gap-4">
            {/* Precio Compra */}
            <div>
              <Label className="text-sm mb-1.5 block">Precio Compra</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio_compra === 0 ? '' : formData.precio_compra}
                  onChange={(e) => handleNumberInputChange('precio_compra', e.target.value)}
                  className="flex-1 h-11"
                  placeholder="0.00"
                />
                <select
                  value={formData.moneda_compra}
                  onChange={(e) => setFormData({ ...formData, moneda_compra: parseInt(e.target.value) || 1 })}
                  disabled={isLoadingMonedas}
                  className="w-24 px-2 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                >
                  {isLoadingMonedas ? (
                    <option value="1">...</option>
                  ) : (
                    monedas.map((moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.simbolo || moneda.denominacion}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            {/* Precio Venta */}
            <div>
              <Label className="text-sm mb-1.5 block">Precio Venta</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio_venta === 0 ? '' : formData.precio_venta}
                  onChange={(e) => handleNumberInputChange('precio_venta', e.target.value)}
                  className="flex-1 h-11"
                  placeholder="0.00"
                />
                <select
                  value={formData.moneda_venta}
                  onChange={(e) => setFormData({ ...formData, moneda_venta: parseInt(e.target.value) || 1 })}
                  disabled={isLoadingMonedas}
                  className="w-24 px-2 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                >
                  {isLoadingMonedas ? (
                    <option value="1">...</option>
                  ) : (
                    monedas.map((moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.simbolo || moneda.denominacion}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            {/* Precio Mínimo */}
            <div>
              <Label className="text-sm mb-1.5 block">Precio Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.precio_minimo === 0 ? '' : formData.precio_minimo}
                onChange={(e) => handleNumberInputChange('precio_minimo', e.target.value)}
                className="h-11"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label className="text-sm mb-1.5 block">Descripción</Label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Detalles adicionales del producto..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" className="w-32 gap-2" disabled={isSubmitting || isLoading}>
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Guardando...' : initialData ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
