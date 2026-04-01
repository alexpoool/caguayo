import { useState, useMemo } from 'react';
import { calcularTotal } from '../utils/facturasUtils';
import type { Productos } from '../../../../types';

export interface SelectedProduct {
  id_producto: number;
  cantidad: number;
  precio_venta: number;
}

export function useProductSelection() {
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');

  /**
   * Retorna una función que filtra productos según búsqueda
   */
  const getProductosFiltrados = (productos: Productos[]) => {
    if (!productSearch.trim()) return [];
    const search = productSearch.toLowerCase();
    return productos
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(search) &&
          !selectedProducts.some((sp) => sp.id_producto === p.id_producto)
      )
      .slice(0, 10);
  };

  /**
   * Agrega un producto a la selección
   */
  const addProduct = (id: number, productos: Productos[]) => {
    const producto = productos.find((p) => p.id_producto === id);
    if (!selectedProducts.find((p) => p.id_producto === id)) {
      setSelectedProducts([
        ...selectedProducts,
        {
          id_producto: id,
          cantidad: 1,
          precio_venta: producto ? Number(producto.precio_venta) : 0,
        },
      ]);
    }
  };

  /**
   * Actualiza la cantidad de un producto
   */
  const updateCantidad = (id: number, cantidad: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id_producto === id ? { ...p, cantidad } : p
      )
    );
  };

  /**
   * Actualiza el precio de venta de un producto
   */
  const updatePrecioVenta = (id: number, precio: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id_producto === id ? { ...p, precio_venta: precio } : p
      )
    );
  };

  /**
   * Elimina un producto de la selección
   */
  const removeProduct = (id: number) => {
    setSelectedProducts(
      selectedProducts.filter((p) => p.id_producto !== id)
    );
  };

  /**
   * Resetea la selección de productos
   */
  const resetSelection = () => {
    setSelectedProducts([]);
    setProductSearch('');
  };

  /**
   * Obtiene el total de los productos seleccionados
   */
  const getTotal = (): number => {
    return calcularTotal(selectedProducts);
  };

  /**
   * Carga productos pre-seleccionados (al editar)
   */
  const loadSelectedProducts = (items: any[]) => {
    setSelectedProducts(
      items.map((p: any) => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_venta: p.precio_venta || 0,
      }))
    );
  };

  return {
    selectedProducts,
    setSelectedProducts,
    productSearch,
    setProductSearch,
    getProductosFiltrados,
    addProduct,
    updateCantidad,
    updatePrecioVenta,
    removeProduct,
    resetSelection,
    getTotal,
    loadSelectedProducts,
  };
}
