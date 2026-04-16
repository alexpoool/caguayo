import { useEffect, useState } from 'react';
import { contratosService, productosService, monedaService, dependenciasService, pagosService } from '../../../services/api';
import type { ContratoWithDetails } from '../../../types/contrato';
import type { Productos } from '../../../types';
import type { Dependencia } from '../../../types/dependencia';
import type { Pago } from '../../../types/pago';
import toast from 'react-hot-toast';

// Componentes nuevos
import { FacturasListView } from './components/FacturasListView';
import { FacturaForm } from './components/FacturaForm';
import { FacturaDetailModal } from './components/modals/FacturaDetailModal';
import { PagoModal } from './components/modals/PagoModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';

// Hooks personalizados
import { useFacturas } from './hooks/useFacturas';
import { usePagos } from './hooks/usePagos';
import { useProductSelection } from './hooks/useProductSelection';

type View = 'list' | 'form';

/**
 * FacturasPage - Componente principal orquestador
 * Coordina todos los subcomponentes y gestiona el flujo de datos
 */
export function FacturasPage() {
  // Vista actual (list o form)
  const [view, setView] = useState<View>('list');

  // Datos maestros
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);

  // Modales
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: any | null }>({
    isOpen: false,
    item: null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
  });
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalFactura, setPagoModalFactura] = useState<any | null>(null);

  // Hooks personalizados
  const facturasHook = useFacturas();
  const pagosHook = usePagos();
  const productSelectionHook = useProductSelection();

  /**
   * Cargar datos iniciales (contratos, productos, monedas, dependencias)
   */
  const loadInitialData = async () => {
    try {
      const [contratosRes, productosRes, monedasRes, depsRes] = await Promise.all([
        contratosService.getContratos(0, 1000),
        productosService.getProductos(0, 1000),
        monedaService.getMonedas(0, 100),
        dependenciasService.getDependencias(undefined, 0, 1000),
      ]);
      setContratos(contratosRes);
      setProductos(productosRes);
      setMonedas(monedasRes);
      setDependencias(depsRes);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar datos iniciales');
    }
  };

  // Cargar datos iniciales y facturas cuando cambian
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    facturasHook.loadFacturas();
  }, [view, facturasHook.selectedContratoId]);

  /**
   * Obtener productos filtrados según búsqueda
   */
  const productosFiltrados = productSelectionHook.getProductosFiltrados(productos);

  /**
   * Manejar guardado de factura
   */
  const handleSaveFactura = async () => {
    const result = await facturasHook.handleSave(productSelectionHook.selectedProducts);
    if (result.success) {
      toast.success(result.message);
      setView('list');
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Manejar eliminación de factura
   */
  const handleDeleteFactura = (id: number, codigo: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar factura?',
      message: `¿Está seguro de eliminar la factura "${codigo}"?`,
      type: 'danger',
      onConfirm: async () => {
        const result = await facturasHook.handleDelete(id);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  /**
   * Abrir modal de pagos
   */
  const handleOpenPagoModal = async (factura: any) => {
    setPagoModalFactura(factura);
    await pagosHook.loadPagos(factura.id_factura);
    pagosHook.openPagoForm(factura);
    setPagoModalOpen(true);
  };

  /**
   * Crear pago
   */
  const handleCreatePago = async () => {
    if (!pagoModalFactura) return;
    const result = await pagosHook.handleCreatePago(pagoModalFactura.id_factura);
    if (result.success) {
      toast.success(result.message);
      facturasHook.loadFacturas();
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Eliminar pago
   */
  const handleDeletePago = async (pago: Pago) => {
    if (!pagoModalFactura) return;
    const result = await pagosHook.handleDeletePago(pago, pagoModalFactura.id_factura);
    if (result.success) {
      toast.success(result.message);
      facturasHook.loadFacturas();
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Abrir formulario de edición
   */
  const handleOpenForm = (factura?: any) => {
    if (factura) {
      facturasHook.openForm(factura);
      productSelectionHook.loadSelectedProducts(factura.items || []);
    } else {
      facturasHook.resetForm();
      productSelectionHook.resetSelection();
    }
    setView('form');
  };

  /**
   * Cerrar formulario
   */
  const handleCancelForm = () => {
    setView('list');
    facturasHook.resetForm();
    productSelectionHook.resetSelection();
  };

  // Render según vista actual
  if (view === 'list') {
    return (
      <div className="p-6">
        <FacturasListView
          facturas={facturasHook.facturas}
          contratos={contratos}
          selectedContratoId={facturasHook.selectedContratoId}
          onSelectedContratoChange={(id: number | null) =>
            facturasHook.setSelectedContratoId(id)
          }
          onAddNew={() => handleOpenForm()}
          onEdit={(factura: any) => handleOpenForm(factura)}
          onDelete={(id: number, codigo: string) =>
            handleDeleteFactura(id, codigo)
          }
          onViewDetails={(item: any) => setDetailModal({ isOpen: true, item })}
          onOpenPagos={(factura: any) => handleOpenPagoModal(factura)}
        />

        {/* Modales */}
        <FacturaDetailModal
          isOpen={detailModal.isOpen}
          factura={detailModal.item}
          onClose={() => setDetailModal({ isOpen: false, item: null })}
        />

        <PagoModal
          isOpen={pagoModalOpen}
          factura={pagoModalFactura}
          pagos={pagosHook.pagos}
          pagoForm={pagosHook.pagoForm}
          onPagoFormChange={(form) => pagosHook.setPagoForm(form)}
          onCreatePago={handleCreatePago}
          onDeletePago={handleDeletePago}
          onClose={() => {
            setPagoModalOpen(false);
            setPagoModalFactura(null);
          }}
        />

        <ConfirmDeleteModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      </div>
    );
  }

  // Vista de formulario
  if (view === 'form') {
    return (
      <div className="p-6">
        <FacturaForm
          editingId={facturasHook.editingId}
          formData={facturasHook.formData}
          selectedProducts={productSelectionHook.selectedProducts}
          productSearch={productSelectionHook.productSearch}
          productosFiltrados={productosFiltrados}
          total={productSelectionHook.getTotal()}
          dependencias={dependencias}
          monedas={monedas}
          productos={productos}
          onFormDataChange={(data: Record<string, any>) => facturasHook.setFormData(data)}
          onProductSearchChange={(search: string) =>
            productSelectionHook.setProductSearch(search)
          }
          onAddProduct={(id: number) =>
            productSelectionHook.addProduct(id, productos)
          }
          onUpdateCantidad={(id: number, cant: number) =>
            productSelectionHook.updateCantidad(id, cant)
          }
          onUpdatePrecio={(id: number, precio: number) =>
            productSelectionHook.updatePrecioVenta(id, precio)
          }
          onRemoveProduct={(id: number) =>
            productSelectionHook.removeProduct(id)
          }
          onSave={handleSaveFactura}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return null;
}
