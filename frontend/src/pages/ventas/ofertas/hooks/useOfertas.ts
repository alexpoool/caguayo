import { useState, useEffect } from 'react';
import { ofertasTiendaService } from '../../../../services/api';
import type {
  OfertaTiendaCreate,
  OfertaTiendaUpdate,
  OfertaTiendaWithDetails,
} from '../../../../types/contrato';
import { useInfiniteList } from '../../../../hooks/useInfiniteList';

export type EstadoOfertaFiltro = 'ACTIVA' | 'CONVERTIDA' | 'ANULADA' | 'TODAS';

export function useOfertas(
  initialContratoId?: string | null,
  estadoFiltro: EstadoOfertaFiltro = 'TODAS',
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(
    initialContratoId ? Number(initialContratoId) : null
  );
  const [formData, setFormData] = useState<Record<string, any>>({
    fecha: new Date().toISOString().split('T')[0],
  });

  /**
   * Lista de ofertas de tienda según el contrato y el estado seleccionados
   */
  const infinite = useInfiniteList<OfertaTiendaWithDetails>({
    queryKeyBase: 'ofertas-tienda',
    queryFn: async (skip: number, limit: number) => {
      if (selectedContratoId) {
        return ofertasTiendaService.getOfertasByContrato(
          selectedContratoId,
          estadoFiltro,
        );
      }
      return ofertasTiendaService.getOfertas(skip, limit, estadoFiltro);
    },
    extraQueryKeyParams: [selectedContratoId, estadoFiltro],
    limit: 100,
  });

  /**
   * Resetea la lista cuando cambia el filtro de contrato o de estado
   */
  useEffect(() => {
    infinite.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContratoId, estadoFiltro]);

  /**
   * Abre el formulario para crear (sin argumento) o editar una oferta
   */
  const openForm = (oferta?: OfertaTiendaWithDetails) => {
    if (oferta) {
      setEditingId(oferta.id_oferta_tienda);
      setFormData({
        descripcion: oferta.descripcion,
        observaciones: oferta.observaciones,
        fecha: oferta.fecha,
      });
      setSelectedContratoId(oferta.id_contrato);
    } else {
      resetForm();
      setEditingId(null);
    }
  };

  /**
   * Guarda una oferta (crear o actualizar)
   */
  const handleSave = async (selectedProducts: any[]) => {
    if (!selectedContratoId) {
      return { success: false, message: 'Debe seleccionar un contrato' };
    }
    if (selectedProducts.length === 0) {
      return { success: false, message: 'Debe agregar al menos un producto' };
    }
    if (!formData.fecha) {
      return { success: false, message: 'Debe indicar la fecha de la oferta' };
    }

    if (editingId) {
      const data: OfertaTiendaUpdate = {
        descripcion: formData.descripcion,
        observaciones: formData.observaciones,
        fecha: formData.fecha,
        items: selectedProducts.map((p) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
          id_moneda: p.id_moneda,
          id_anexo: p.id_anexo ?? null,
        })),
      };
      try {
        await ofertasTiendaService.updateOferta(editingId, data);
        infinite.refresh();
        resetForm();
        return { success: true, message: 'Oferta actualizada' };
      } catch (error: any) {
        return {
          success: false,
          message: error.message || 'Error al actualizar la oferta',
        };
      }
    }

    const data: OfertaTiendaCreate = {
      id_contrato: selectedContratoId,
      descripcion: formData.descripcion,
      observaciones: formData.observaciones,
      fecha: formData.fecha,
      items: selectedProducts.map((p) => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_venta: p.precio_venta,
        id_moneda: p.id_moneda,
        id_anexo: p.id_anexo ?? null,
      })),
    };
    try {
      await ofertasTiendaService.createOferta(data);
      infinite.refresh();
      resetForm();
      return { success: true, message: 'Oferta creada' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al crear la oferta',
      };
    }
  };

  /**
   * Anula una oferta (borrado lógico)
   */
  const handleDelete = async (id: number) => {
    try {
      await ofertasTiendaService.deleteOferta(id);
      infinite.refresh();
      return { success: true, message: 'Oferta anulada' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al anular la oferta',
      };
    }
  };

  /**
   * Convierte la oferta en factura o pre-factura.
   *
   * - FACTURA: crea factura + movimientos de venta (valida stock).
   * - PREFACTURA: crea pre-factura sin tocar stock; se aprueba después.
   */
  const handleConvertir = async (
    id: number,
    tipo: 'FACTURA' | 'PREFACTURA' = 'FACTURA',
  ) => {
    try {
      const factura = await ofertasTiendaService.convertirOferta(id, tipo);
      infinite.refresh();
      const etiqueta = tipo === 'PREFACTURA' ? 'Pre-factura' : 'Factura';
      return {
        success: true,
        message: `${etiqueta} ${factura.codigo_factura} creada correctamente`,
        factura,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al convertir la oferta',
      };
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
    ofertas: infinite.items,
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
    handleConvertir,
    openForm,
    resetForm,
  };
}
