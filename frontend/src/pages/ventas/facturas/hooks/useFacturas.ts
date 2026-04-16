import { useState, useEffect } from 'react';
import { facturasService } from '../../../../services/api';
import type { FacturaWithDetails } from '../../../../types/contrato';
import { prepararFacturaParaAPI } from '../utils/facturasUtils';

export function useFacturas() {
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  /**
   * Carga facturas según el contrato seleccionado
   */
  const loadFacturas = async () => {
    try {
      if (selectedContratoId) {
        const data = await facturasService.getFacturasByContrato(selectedContratoId);
        setFacturas(data);
      } else {
        const data = await facturasService.getFacturas();
        setFacturas(data);
      }
    } catch (error) {
      console.error('Error loading facturas:', error);
      setFacturas([]);
    }
  };

  /**
   * Guarda una factura (crear o actualizar)
   */
  const handleSave = async (selectedProducts: any[]) => {
    try {
      const data = prepararFacturaParaAPI(formData, selectedProducts, selectedContratoId);
      
      if (editingId) {
        await facturasService.updateFactura(editingId, data);
      } else {
        await facturasService.createFactura(data);
      }
      
      await loadFacturas();
      resetForm();
      return { success: true, message: editingId ? 'Actualizado' : 'Creado' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al guardar factura' };
    }
  };

  /**
   * Abre el formulario para editar una factura
   */
  const openForm = (factura?: FacturaWithDetails) => {
    if (factura) {
      setEditingId(factura.id_factura);
      setFormData({
        codigo_factura: factura.codigo_factura,
        descripcion: factura.descripcion,
        observaciones: factura.observaciones,
        fecha: factura.fecha,
        id_dependencia: factura.id_dependencia || '',
        id_moneda: factura.id_moneda || '',
      });
    } else {
      resetForm();
    }
  };

  /**
   * Elimina una factura
   */
  const handleDelete = async (id: number) => {
    try {
      await facturasService.deleteFactura(id);
      await loadFacturas();
      return { success: true, message: 'Eliminado' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al eliminar factura' };
    }
  };

  /**
   * Resetea el formulario
   */
  const resetForm = () => {
    setFormData({});
    setEditingId(null);
  };

  return {
    facturas,
    setFacturas,
    editingId,
    setEditingId,
    selectedContratoId,
    setSelectedContratoId,
    formData,
    setFormData,
    loadFacturas,
    handleSave,
    handleDelete,
    openForm,
    resetForm,
  };
}
