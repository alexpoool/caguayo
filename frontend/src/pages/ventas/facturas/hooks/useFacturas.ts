import { useState, useEffect } from 'react';
import { facturasService, existenciaService } from '../../../../services/api';
import type { FacturaWithDetails } from '../../../../types/contrato';
import { prepararFacturaParaAPI, validarFactura } from '../utils/facturasUtils';

export function useFacturas(initialContratoId?: string | null) {
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(
    initialContratoId ? Number(initialContratoId) : null
  );
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
    const data = prepararFacturaParaAPI(formData, selectedProducts, selectedContratoId);
    const validacionGeneral = validarFactura(data);
    if (!validacionGeneral.valid) {
      return { success: false, message: validacionGeneral.errors.join('\n• ') };
    }
    try {
      // Validar stock antes de crear/actualizar
      if (!editingId && selectedProducts.length > 0) {
        const idDependencia = formData.id_dependencia;
        
        const validacion = await existenciaService.validarMultiple(
          selectedProducts.map((p: any) => ({
            id_producto: p.id_producto,
            cantidad: p.cantidad
          })),
          idDependencia ? Number(idDependencia) : undefined
        );
        
        if (!validacion.valido) {
          const erroresMsg = validacion.errores
            .map((e: any) => `• ${e.mensaje}`)
            .join('\n');
          return { success: false, message: `Stock insuficiente:\n${erroresMsg}` };
        }
      }
      
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
