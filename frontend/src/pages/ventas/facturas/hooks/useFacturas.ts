import { useState, useEffect } from 'react';
import { facturasService, existenciaService } from '../../../../services/api';
import type { FacturaWithDetails } from '../../../../types/contrato';
import { useInfiniteList } from '../../../../hooks/useInfiniteList';
import { prepararFacturaParaAPI, validarFactura } from '../utils/facturasUtils';

export type TipoFactura = 'FACTURA' | 'PREFACTURA';

export function useFacturas(
  tipo: TipoFactura = 'FACTURA',
  initialContratoId?: string | null,
) {
  const esPreFactura = tipo === 'PREFACTURA';
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(
    initialContratoId ? Number(initialContratoId) : null
  );
  const [formData, setFormData] = useState<Record<string, any>>({});

  /**
   * Lista infinita de facturas o pre-facturas según el contrato seleccionado
   */
  const infinite = useInfiniteList<FacturaWithDetails>({
    queryKeyBase: esPreFactura ? 'prefacturas' : 'facturas',
    queryFn: async (skip: number, limit: number) => {
      if (selectedContratoId) {
        // getFacturasByContrato no soporta paginación; se obtienen todas de una vez
        return facturasService.getFacturasByContrato(selectedContratoId, tipo);
      }
      return facturasService.getFacturas(skip, limit, tipo);
    },
    extraQueryKeyParams: [selectedContratoId, tipo],
    limit: 100,
  });

  /**
   * Resetea la lista cuando cambia el filtro de contrato
   */
  useEffect(() => {
    console.log('[useFacturas] reset triggered selectedContratoId=', selectedContratoId);
    infinite.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContratoId]);

  /**
   * Guarda una factura (crear o actualizar)
   */
  const handleSave = async (selectedProducts: any[], contratos: any[] = [], userDependenciaId?: number | null) => {
    const data = prepararFacturaParaAPI(formData, selectedProducts, selectedContratoId, contratos, userDependenciaId);
    const validacionGeneral = validarFactura(data);
    if (!validacionGeneral.valid) {
      return { success: false, message: validacionGeneral.errors.join('\n• ') };
    }
    try {
      // La pre-factura no toca stock: el backend lo valida al aprobarla.
      if (!esPreFactura && !editingId && selectedProducts.length > 0) {
        const idDependencia = userDependenciaId;
        
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
        await facturasService.createFactura({ ...data, tipo });
      }
      
      infinite.refresh();
      resetForm();
      const etiqueta = esPreFactura ? 'Pre-factura' : 'Factura';
      return {
        success: true,
        message: editingId ? `${etiqueta} actualizada` : `${etiqueta} creada`,
      };
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
      infinite.refresh();
      return { success: true, message: 'Eliminado' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al eliminar factura' };
    }
  };

  /**
   * Aprueba una pre-factura: se convierte en factura en el backend.
   */
  const handleAprobar = async (id: number) => {
    try {
      await facturasService.aprobarFactura(id);
      infinite.refresh();
      return { success: true, message: 'Pre-factura aprobada como factura' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al aprobar la pre-factura' };
    }
  };

  /**
   * Resetea el formulario
   */
  const resetForm = () => {
    setFormData({ fecha: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  return {
    facturas: infinite.items,
    isLoading: infinite.isLoading,
    isError: infinite.isError,
    error: infinite.error,
    hasMore: infinite.hasMore,
    loadMore: infinite.loadMore,
    isFetchingMore: infinite.isFetchingMore,
    refresh: infinite.refresh,
    editingId,
    setEditingId,
    selectedContratoId,
    setSelectedContratoId,
    formData,
    setFormData,
    handleSave,
    handleDelete,
    handleAprobar,
    openForm,
    resetForm,
  };
}
