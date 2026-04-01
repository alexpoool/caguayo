import { useState } from 'react';
import { pagosService } from '../../../../services/api';
import type { Pago, PagoCreate } from '../../../../types/pago';
import type { FacturaWithDetails } from '../../../../types/contrato';

interface PagoFormData {
  fecha: string;
  monto: string;
  id_moneda: string;
  tipo_pago: string;
  referencia: string;
}

export function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagoForm, setPagoForm] = useState<PagoFormData>({
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    id_moneda: '',
    tipo_pago: 'TRANSFERENCIA',
    referencia: '',
  });

  /**
   * Carga los pagos de una factura
   */
  const loadPagos = async (facturaId: number) => {
    try {
      const data = await pagosService.getPagosByFactura(facturaId);
      setPagos(data);
      return { success: true };
    } catch (error) {
      console.error('Error loading pagos:', error);
      setPagos([]);
      return { success: false };
    }
  };

  /**
   * Crea un nuevo pago
   */
  const handleCreatePago = async (facturaId: number) => {
    try {
      if (!pagoForm.monto) {
        return { success: false, message: 'Ingrese un monto' };
      }

      const data: PagoCreate = {
        id_factura: facturaId,
        fecha: pagoForm.fecha,
        monto: Number(pagoForm.monto),
        id_moneda: pagoForm.id_moneda ? Number(pagoForm.id_moneda) : undefined,
        tipo_pago: pagoForm.tipo_pago,
        referencia: pagoForm.referencia || undefined,
      };

      await pagosService.createPago(data);
      await loadPagos(facturaId);
      resetPagoForm();
      return { success: true, message: 'Pago registrado' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al registrar pago' };
    }
  };

  /**
   * Elimina un pago
   */
  const handleDeletePago = async (pago: Pago, facturaId: number) => {
    try {
      await pagosService.deletePago(pago.id_pago);
      await loadPagos(facturaId);
      return { success: true, message: 'Pago eliminado' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al eliminar pago' };
    }
  };

  /**
   * Abre el formulario de pago para una factura
   */
  const openPagoForm = (factura: FacturaWithDetails) => {
    resetPagoForm();
    setPagoForm({
      fecha: new Date().toISOString().split('T')[0],
      monto: '',
      id_moneda: String(factura.id_moneda || ''),
      tipo_pago: 'TRANSFERENCIA',
      referencia: '',
    });
  };

  /**
   * Resetea el formulario de pago
   */
  const resetPagoForm = () => {
    setPagoForm({
      fecha: new Date().toISOString().split('T')[0],
      monto: '',
      id_moneda: '',
      tipo_pago: 'TRANSFERENCIA',
      referencia: '',
    });
  };

  return {
    pagos,
    setPagos,
    pagoForm,
    setPagoForm,
    loadPagos,
    handleCreatePago,
    handleDeletePago,
    openPagoForm,
    resetPagoForm,
  };
}
