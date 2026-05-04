import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  contratosService,
  productosService,
  monedaService,
  dependenciasService,
  pagosService,
  facturasService,
  clientesService,
  cuentasService,
} from '../../../services/api';
import type { ContratoWithDetails, FacturaWithDetails as FacturaType, ItemFactura } from '../../../types/contrato';
import type { Productos } from '../../../types';
import type { Dependencia } from '../../../types/dependencia';
import type { Cuenta } from '../../../types/cuenta';
import type { Pago } from '../../../types/pago';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

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

export function getFacturaDocument(factura: any, contratos: any[], dependencias: any[], user: any, clienteCompleto: any = null, clienteCuentas: any[] = [], autorizadoPor: string = '', revisadoPor: string = '') {
  const contrato = contratos.find((c: any) => c.id_contrato === factura.id_contrato);
  const dependencia = user?.dependencia || dependencias.find((d: any) => d.id_dependencia === factura.id_dependencia);
  const cliente = clienteCompleto || contrato?.cliente;

  const empresaNombre = dependencia?.nombre || 'CAGUAYO S.A.';
  const empresaDireccion = dependencia?.direccion || '';
  const empresaTelefono = dependencia?.telefono || '';
  const empresaEmail = dependencia?.email || '';

  const numeroContrato = contrato?.codigo || '';
  const nombreCliente = cliente?.nombre || 'N/A';
  const codigoCliente = cliente?.numero_cliente || '';
  const nitCliente = codigoCliente;
  const direccionCliente = cliente?.direccion || '';
  const provinciaCliente = cliente?.provincia?.nombre || '';
  const municipioCliente = cliente?.municipio?.nombre || '';
  const direccionCompleta = [direccionCliente, provinciaCliente, municipioCliente].filter(Boolean).join(', ');

  const cuentaCUP = clienteCuentas.find((c: any) => c.moneda?.nombre === 'CUP');
  const cuentaNumero = cuentaCUP?.numero_cuenta || '';
  const cuentaBanco = cuentaCUP?.banco || '';
  const cuentaSucursal = cuentaCUP?.sucursal || '';
  const cuentaDireccion = cuentaCUP?.direccion || '';

  const moneda = contrato?.moneda?.nombre || '';
  const items = factura.items || [];

  const itemsRows = items.map((item: any) => `
    <tr>
      <td>${item.producto?.codigo || 'N/A'}</td>
      <td>${item.producto?.descripcion || item.producto?.nombre || 'Producto'}</td>
      <td class="cantidad">${item.cantidad || 0}</td>
      <td class="precio">${Number(item.precio_venta || 0).toFixed(2)}</td>
      <td class="importe-col">${Number(item.precio_venta * item.cantidad || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const descripcionItems = items.length > 0
    ? items.map((item: any) => item.producto?.nombre || item.producto?.descripcion || 'Producto').join(', ')
    : '';
  const descripcionGeneral = descripcionItems || 'Ver detalle de productos en tabla adjunta';

  const total = Number(factura.monto || 0).toFixed(2);
  const fechaEmision = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : 'N/A';

  const nombreUsuario = user ? [user.nombre, user.primer_apellido, user.segundo_apellido].filter(Boolean).join(' ').trim() : 'Sistema';
  const cargoUsuario = user?.grupo?.nombre || 'Administrador';
  const nombreAutorizado = autorizadoPor || '';
  const nombreRevisado = revisadoPor || '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>Factura | ${factura.codigo_factura}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
    .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.4; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 0.6rem; padding-bottom: 0.4rem; gap: 15px; }
    .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
    .header-logo img { width: 100px; height: 100px; object-fit: contain; }
    .header-center { text-align: center; flex: 1; }
    .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #1a5c1a; }
    .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.35; }
    .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .email { font-size: 12px; color: #1a1a1a; }
    .header-box { border: 2px solid #1a5c1a; background: #f0f7f0; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
    .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #1a5c1a; margin-bottom: 6px; border-bottom: 1px solid #1a5c1a; padding-bottom: 4px; }
    .header-box-row { font-size: 11px; margin-bottom: 3px; }
    .header-box-row strong { font-weight: 700; }
    .fila-fechas { display: flex; justify-content: space-between; margin: 18px 0 12px 0; border-bottom: 1px dashed #aaa; padding-bottom: 12px; }
    .bloque-fecha { font-weight: 600; font-size: 13px; }
    .info-cliente { display: grid; grid-template-columns: 14ch 16ch 1fr; gap: 8px 16px; background: #f9f9f0; padding: 8px; border: 1px solid #ccc; margin-bottom: 12px; font-size: 11.5px; align-items: center; }
    .contrato-titulo { grid-column: 1 / -1; font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: #1a5c1a; }
    .fila-datos { display: contents; }
    .campo { min-width: 0; }
    .fila-banco-titulo { grid-column: 1 / -1; font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: center; color: #1a5c1a; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 4px; }
    .fila-cuenta { grid-column: 1 / -1; }
    .info-pago { display: flex; flex-wrap: wrap; justify-content: space-between; background: #f0f7f0; padding: 6px; border: 1px solid #1a5c1a; margin-bottom: 10px; font-size: 12px; }
    .pago-header { font-size: 13px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #1a5c1a; width: 100%; text-align: center; margin-top: 6px; }
    .descripcion-general { background: #fffef5; padding: 6px; border: 1px solid #ccc; margin-bottom: 8px; font-size: 12px; }
    .tabla-wrapper { display: flex; gap: 20px; align-items: flex-start; margin: 18px 0 14px 0; }
    .tabla-productos { flex: 1; width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
    .tabla-productos th, .tabla-productos td { border: 1px solid #222; padding: 4px 3px; vertical-align: top; word-wrap: break-word; white-space: normal; }
    .tabla-productos th:nth-child(1), .tabla-productos td:nth-child(1) { width: 8%; }
    .tabla-productos th:nth-child(2), .tabla-productos td:nth-child(2) { width: 65%; }
    .tabla-productos th:nth-child(3), .tabla-productos td:nth-child(3) { width: 9%; text-align: right; }
    .tabla-productos th:nth-child(4), .tabla-productos td:nth-child(4) { width: 9%; text-align: right; }
    .tabla-productos th:nth-child(5), .tabla-productos td:nth-child(5) { width: 9%; text-align: right; }
    .tabla-productos th { background-color: #eae7db; font-weight: 700; text-align: center; }
    .cantidad, .precio, .importe-col { text-align: right; }
    .importe-fila { font-weight: bold; background-color: #f4f1e6; }
    .firmas { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; margin-bottom: 12px; }
    .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
    .bloque-firma { flex: 1; border-top: 1px dotted #222; padding-top: 8px; font-size: 11px; text-align: left; }
    .bloque-firma p { margin: 2px 0; }
    .cargo { font-size: 10px; color: #2c2c2c; }
    @media (max-width: 650px) { .documento { padding: 0.6rem; } .tabla-productos th, .tabla-productos td { padding: 3px 2px; font-size: 10px; } .firmas { flex-direction: column; gap: 6px; } .fila-firmas { flex-direction: column; gap: 10px; } .info-cliente { flex-direction: column; } .info-pago { flex-direction: column; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 10px; } .tabla-wrapper { flex-direction: column; } }
  </style>
</head>
<body>
  <div class="documento texto">
    <div class="header-tcp">
      <div class="header-logo">
        <img src="/favicon.ico" alt="Logo CAGUAYO S.A." />
      </div>
      <div class="header-center">
        <div class="tcp-title">CAGUAYO S.A.</div>
        <div class="nombre-titular">${empresaNombre}</div>
        <div class="direccion-contacto">${empresaDireccion}</div>
        <div class="telefonos">Tel: ${empresaTelefono}</div>
        <div class="email">${empresaEmail}</div>
      </div>
      <div class="header-box">
        <div class="header-box-title">Factura</div>
        <div class="header-box-row"><strong>No.:</strong> ${factura.codigo_factura || 'N/A'}</div>
        <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
        <div class="header-box-row"><strong>Moneda:</strong> ${moneda || 'N/A'}</div>
      </div>
    </div>

    <div class="info-cliente">
      <div class="contrato-titulo">CONTRATO Nº ${numeroContrato} <span></span> Cliente: ${nombreCliente}</div>
      <div class="fila-datos">
        <span class="campo"><strong>Código:</strong> ${codigoCliente}</span>
        <span class="campo"><strong>NIT/CI:</strong> ${nitCliente}</span>
        <span class="campo"><strong>Dirección:</strong> ${direccionCompleta}</span>
      </div>
      <div class="fila-banco-titulo">BANCO:</div>
      <div class="fila-datos">
        <span class="campo"><strong>Banco:</strong> ${cuentaBanco}</span>
        <span class="campo"><strong>Sucursal:</strong> ${cuentaSucursal}</span>
        <span class="campo"><strong>Dirección:</strong> ${cuentaDireccion}</span>
      </div>
      <div class="fila-cuenta"><strong>Número de cuenta:</strong> ${cuentaNumero} (${moneda})</div>
    </div>

    <div class="descripcion-general">
      <strong>Descripción:</strong> ${descripcionGeneral}
    </div>

    <div class="tabla-wrapper">
      <table class="tabla-productos">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          <tr class="importe-fila">
            <td colspan="4" style="text-align: right;">Total</td>
            <td class="importe-col">${total}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="firmas">
      <div class="fila-firmas">
        <div class="bloque-firma">
          <p><strong>Confeccionado por:</strong></p>
          <p>${nombreUsuario}</p>
          <p class="cargo">Cargo: ${cargoUsuario}</p>
        </div>
        <div class="bloque-firma">
          <p><strong>Autorizado por:</strong></p>
          <p>${nombreAutorizado}</p>
        </div>
      </div>
      <div class="fila-firmas">
        <div class="bloque-firma">
          <p><strong>Cliente:</strong></p>
          <p>${nombreCliente}</p>
        </div>
        <div class="bloque-firma">
          <p><strong>Revisado por:</strong></p>
          <p>${nombreRevisado}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * FacturasPage - Componente principal orquestador
 * Coordina todos los subcomponentes y gestiona el flujo de datos
 */
export function FacturasPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get('contrato');

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
   * Visualizar documento de factura
   */
  const handleViewDocument = async (factura: any) => {
    console.log('[DEBUG] handleViewDocument - factura:', factura);
    console.log('[DEBUG] handleViewDocument - id_contrato:', factura.id_contrato);
    
    // Primero buscar en la lista local
    let contrato = contratos.find((c: any) => c.id_contrato === factura.id_contrato);
    console.log('[DEBUG] handleViewDocument - contrato encontrado en lista local:', contrato);
    
    // Si no está en la lista local, cargar desde la API
    if (!contrato && factura.id_contrato) {
      console.log('[DEBUG] handleViewDocument - Contrato no local, cargando desde API');
      try {
        contrato = await contratosService.getContrato(factura.id_contrato);
        console.log('[DEBUG] handleViewDocument - contrato desde API:', contrato);
      } catch (error) {
        console.error('Error loading contrato:', error);
      }
    }
    
    console.log('[DEBUG] handleViewDocument - contrato.id_cliente:', contrato?.id_cliente);
    console.log('[DEBUG] handleViewDocument - contrato.cliente:', contrato?.cliente);
    
    let clienteCompleto: any = null;
    let clienteCuentas: any[] = [];

    // Obtener id_cliente del contrato o del objeto cliente anidado
    const idCliente = contrato?.id_cliente || contrato?.cliente?.id_cliente;
    
    if (idCliente) {
      console.log('[DEBUG] handleViewDocument - id_cliente:', idCliente);
      try {
        clienteCompleto = await clientesService.getCliente(idCliente);
        console.log('[DEBUG] handleViewDocument - clienteCompleto:', clienteCompleto);
        
        clienteCuentas = await cuentasService.getCuentasByCliente(idCliente);
        console.log('[DEBUG] handleViewDocument - clienteCuentas:', clienteCuentas);
      } catch (error) {
        console.error('Error loading client data:', error);
      }
    } else if (contrato?.cliente) {
      console.log('[DEBUG] handleViewDocument - Usando cliente del contrato directamente');
      clienteCompleto = contrato.cliente;
    }

    console.log('[DEBUG] handleViewDocument - clienteFinal:', clienteCompleto);
    console.log('[DEBUG] handleViewDocument - cuentasFinal:', clienteCuentas);

    const html = getFacturaDocument(
      factura,
      contratos,
      dependencias,
      user,
      clienteCompleto,
      clienteCuentas,
      '',
      ''
    );
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

/**
   * Imprimir documento de factura
   */
  const handlePrintDocument = async (factura: any) => {
    console.log('[FacturasPage] handlePrintDocument called');
    
    // Primero buscar en la lista local
    let contrato = contratos.find((c: any) => c.id_contrato === factura.id_contrato);
    
    // Si no está en la lista local, cargar desde la API
    if (!contrato && factura.id_contrato) {
      try {
        contrato = await contratosService.getContrato(factura.id_contrato);
      } catch (error) {
        console.error('Error loading contrato:', error);
      }
    }
    
    let clienteCompleto: any = null;
    let clienteCuentas: any[] = [];

    const idCliente = contrato?.id_cliente || contrato?.cliente?.id_cliente;
    
    if (idCliente) {
      try {
        clienteCompleto = await clientesService.getCliente(idCliente);
        clienteCuentas = await cuentasService.getCuentasByCliente(idCliente);
      } catch (error) {
        console.error('Error loading client data:', error);
      }
    } else if (contrato?.cliente) {
      clienteCompleto = contrato.cliente;
    }

    const html = getFacturaDocument(
      factura,
      contratos,
      dependencias,
      user,
      clienteCompleto,
      clienteCuentas,
      '',
      ''
    );
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
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
      // Preseleccionar contrato desde URL
      if (initialContratoId) {
        facturasHook.setSelectedContratoId(Number(initialContratoId));
      }
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
          onViewDetails={(item: any) => {
              console.log('[FacturasPage] onViewDetails called with item:', item?.codigo_factura);
              setDetailModal({ isOpen: true, item });
            }}
          onOpenPagos={(factura: any) => handleOpenPagoModal(factura)}
          onViewDocument={(factura: any) => handleViewDocument(factura)}
          onPrintDocument={(factura: any) => handlePrintDocument(factura)}
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
          selectedContratoId={facturasHook.selectedContratoId}
          contratos={contratos}
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
          onSelectedContratoChange={(id: number | null) =>
            facturasHook.setSelectedContratoId(id)
          }
          onSave={handleSaveFactura}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return null;
}
