import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  contratosService,
  productosService,
  monedaService,
  dependenciasService,
  pagosService,
  facturasService,
  clientesService,
  cuentasService,
} from "../../../services/api";
import type { Cliente } from "../../../types/ventas";
import type {
  ContratoWithDetails,
  FacturaWithDetails as FacturaType,
  ItemFactura,
} from "../../../types/contrato";
import type { Productos } from "../../../types";
import type { Dependencia } from "../../../types/dependencia";
import type { Cuenta } from "../../../types/cuenta";
import type { Pago } from "../../../types/pago";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

// Componentes nuevos
import { FacturasListView } from "./components/FacturasListView";
import { FacturaForm } from "./components/FacturaForm";
import { FacturaDetailModal } from "./components/modals/FacturaDetailModal";
import { PagoModal } from "./components/modals/PagoModal";
import { ConfirmDeleteModal } from "./components/modals/ConfirmDeleteModal";

// Hooks personalizados
import { useFacturas } from "./hooks/useFacturas";
import { usePagos } from "./hooks/usePagos";
import { useProductSelection } from "./hooks/useProductSelection";
import { useStock } from "../../../hooks/useStock";

type View = "list" | "form";

export function getFacturaDocument(
  factura: any,
  contratos: any[],
  dependencias: any[],
  user: any,
  clienteCompleto: any = null,
  clienteCuentas: any[] = [],
  depCuentas: any[] = [],
  autorizadoPor: string = "",
  revisadoPor: string = "",
) {
  const contrato = contratos.find(
    (c: any) => c.id_contrato === factura.id_contrato,
  );
  const dependencia =
    user?.dependencia ||
    dependencias.find((d: any) => d.id_dependencia === factura.id_dependencia);
  const cliente = clienteCompleto || contrato?.cliente;

  const empresaNombre = dependencia?.nombre || "CAGUAYO S.A.";
  const empresaDireccion = dependencia?.direccion || "";
  const empresaTelefono = dependencia?.telefono || "";
  const empresaWeb = dependencia?.web || "";
  const empresaEmail = dependencia?.email || "";
  const empresaNit = dependencia?.nit || "";
  const empresaReeup = dependencia?.reeup || "";

  const numeroContrato = contrato?.codigo || "";
  const nombreCliente = cliente?.nombre || "N/A";
  const codigoCliente = cliente?.codigo || cliente?.id_cliente?.toString() || "N/A";
  const nitCliente = cliente?.nit || "";
  const direccionCliente = cliente?.direccion || "";
  const provinciaCliente = cliente?.provincia?.nombre || "";
  const municipioCliente = cliente?.municipio?.nombre || "";
  const direccionCompleta = [direccionCliente, municipioCliente, provinciaCliente].filter(Boolean).join(", ");

  const moneda = contrato?.moneda?.nombre || "";
  const simboloMoneda = contrato?.moneda?.simbolo || "";

  const cuentaDep = depCuentas.find((c: any) => c.moneda?.nombre === moneda);
  const items = factura.items || [];

  const itemsRows = items
    .map(
      (item: any) => {
        const importe = Number(item.cantidad || 0) * Number(item.precio_venta || 0);
        return `
          <tr>
            <td>${item.producto?.codigo || "N/A"}</td>
            <td>${item.producto?.descripcion || item.producto?.nombre || "Producto"}</td>
            <td class="cantidad">${item.cantidad || 0}</td>
            <td class="precio">${simboloMoneda} ${Number(item.precio_venta || 0).toFixed(2)}</td>
            <td class="importe">${simboloMoneda} ${importe.toFixed(2)}</td>
          </tr>
        `;
      },
    )
    .join("");

  const total = Number(factura.monto || 0).toFixed(2);
  const fechaEmision = factura.fecha
    ? new Date(factura.fecha).toLocaleDateString("es-ES")
    : "N/A";

  const nombreUsuario = user
    ? [user.nombre, user.primer_apellido, user.segundo_apellido]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "Sistema";
  const cargoUsuario = user?.cargo || "";

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
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.2; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; gap: 15px; }
    .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
    .header-logo img { width: 160px; height: 160px; object-fit: contain; }
    .header-center { text-align: center; flex: 1; }
    .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: black; }
    .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.2; }
    .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .reeup { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .web { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .email { font-size: 12px; color: black; }
    .header-box { border: 2px solid black; background: white; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
    .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: black; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
    .header-box-row { font-size: 11px; margin-bottom: 3px; }
    .header-box-row strong { font-weight: 700; }

    .info-pago { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .pago-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .pago-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; }

    .info-cliente { background: white; padding: 8px; border: 1px solid black; margin-bottom: 10px; font-size: 11.5px; }
    .cliente-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; }
    .cliente-grid .full-row { grid-column: 1 / -1; }
    .cliente-cuenta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; padding-top: 6px; }

    .tabla-productos { width: 100%; border-collapse: collapse; font-size: 12px; margin: 14px 0 16px 0; }
    .tabla-productos th, .tabla-productos td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-productos th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .tabla-productos td:nth-child(1) { width: 10%; }
    .tabla-productos td:nth-child(2) { width: 48%; }
    .tabla-productos td:nth-child(3) { width: 9%; text-align: center; }
    .tabla-productos td:nth-child(4) { width: 16%; text-align: right; }
    .tabla-productos td:nth-child(5) { width: 17%; text-align: right; }
    .tabla-productos .total-row td { font-weight: 800; font-size: 13px; border-top: 2px solid #222; }
    .tabla-productos .total-row td:nth-child(4), .tabla-productos .total-row td:nth-child(5) { border-top: 2px solid #222; }

    .firmas { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; margin-bottom: 12px; }
    .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
    .bloque-firma { flex: 1; padding-top: 8px; font-size: 11px; text-align: left; }
    .bloque-firma p { margin: 2px 0; }
    .cargo { font-size: 10px; color: black; }
    @media (max-width: 650px) { .documento { padding: 0.6rem; } .tabla-productos th, .tabla-productos td { padding: 3px 2px; font-size: 10px; } .firmas { flex-direction: column; gap: 6px; } .fila-firmas { flex-direction: column; gap: 10px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 10px; } }
    @page { margin: 0; }
    @media print {
      body { background: white; display: block; padding: 0; min-height: auto; align-items: flex-start; }
      .documento { max-width: none; box-shadow: none; border-radius: 0; padding: 1cm; padding-top: 160px; padding-bottom: 105px; }
      .tabla-productos th { background-color: #cccccc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0 1cm 0 1cm; }
      .print-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0 1cm 0.3cm 1cm; }
    }
  </style>
</head>
<body>
  <div class="documento texto">
    <div class="print-header">
      <div class="header-tcp">
        <div class="header-logo">
          <img src="/logo-black.png" alt="Logo CAGUAYO S.A." />
        </div>
        <div class="header-center">
          <div class="tcp-title">CAGUAYO S.A.</div>
          <div class="nombre-titular">${empresaNombre}</div>
          <div class="direccion-contacto">${empresaDireccion}</div>
          <div class="telefonos">Tel: ${empresaTelefono}</div>
          ${empresaWeb ? `<div class="web">Web: ${empresaWeb}</div>` : ''}
          ${empresaEmail ? `<div class="email">${empresaEmail}</div>` : ''}
          ${empresaReeup ? `<div class="reeup">Código: ${empresaReeup}</div>` : ''}
        </div>
        <div class="header-box">
          <div class="header-box-title">Factura</div>
          <div class="header-box-row"><strong>No.:</strong> ${factura.codigo_factura || "N/A"}</div>
          <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
          <div class="header-box-row"><strong>Moneda:</strong> ${moneda || "N/A"}</div>
        </div>
      </div>
    </div>

    ${cuentaDep ? `
    <div class="info-pago">
      <div class="pago-titulo">PAGUESE A: ${empresaNombre}</div>
      <div class="pago-grid">
        <div><strong>Cuenta:</strong> ${cuentaDep.numero_cuenta || 'N/A'}</div>
        <div><strong>Moneda:</strong> ${moneda || 'N/A'}</div>
        <div><strong>Titular:</strong> ${cuentaDep.titular || empresaNombre}</div>
        <div><strong>Banco:</strong> ${cuentaDep.banco || 'N/A'}</div>
        <div><strong>Sucursal:</strong> ${cuentaDep.sucursal || 'N/A'}</div>
        <div><strong>Dirección:</strong> ${cuentaDep.direccion || 'N/A'}</div>
      </div>
    </div>
    ` : ''}

    <div class="info-cliente">
      <div class="cliente-grid">
        <div><strong>Cliente:</strong> ${nombreCliente}</div>
        <div><strong>NIT/CI:</strong> ${nitCliente || ''}</div>
        <div><strong>Código:</strong> ${codigoCliente}</div>
        <div class="full-row"><strong>Dirección:</strong> ${direccionCompleta}</div>
      </div>
      ${clienteCuentas && clienteCuentas.length > 0 ? `
      <div class="cliente-cuenta-grid">
        <div class="full-row" style="font-weight:800;text-align:center;padding-top:6px;">DATOS BANCARIOS (${nombreCliente}):</div>
        ${clienteCuentas.map((cc: any) => `
          <div><strong>Cuenta:</strong> ${cc.numero_cuenta || 'N/A'}</div>
          <div><strong>Moneda:</strong> ${cc.moneda?.nombre || cc.id_moneda || 'N/A'}</div>
          <div><strong>Banco:</strong> ${cc.banco || 'N/A'}</div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    <div style="margin: 10px 0 6px 0; font-weight: bold; font-size: 14px;">Contrato Nº ${numeroContrato}${contrato?.nombre ? ` - ${contrato.nombre}` : ''}</div>
    ${factura.descripcion ? `<div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Descripción:</strong> ${factura.descripcion}</div>` : ''}

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
        ${itemsRows || '<tr><td colspan="5" style="text-align:center;">Sin productos registrados</td></tr>'}
        <tr class="total-row">
          <td colspan="4" style="text-align: right;"><strong>Total</strong></td>
          <td style="text-align: right;"><strong>${simboloMoneda} ${total}</strong></td>
        </tr>
      </tbody>
    </table>

    ${factura.observaciones?.trim() ? `<br><div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Observaciones:</strong> ${factura.observaciones}</div>` : ''}

    <div class="print-footer">
      <div class="firmas">
        <div class="fila-firmas">
          <div class="bloque-firma">
            <p><strong>Confeccionado por:</strong></p>
            <p>${nombreUsuario}</p>
            <p class="cargo">${cargoUsuario}</p>
            <br><br>
            <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
            <p style="margin-top: 8px;">Firma</p>
          </div>
          <div class="bloque-firma">
            <p><strong>Recibido por:</strong></p>
            <p><strong>Nombre:</strong> </p>
            <p><strong>Cargo:</strong> </p>
            <p><strong>Fecha:</strong> </p>
            <br>
            <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
            <p style="margin-top: 8px;">Firma</p>
          </div>
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
  const initialContratoId = searchParams.get("contrato");

  // Vista actual (list o form)
  const [view, setView] = useState<View>("list");

  // Datos maestros
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [itemsAnexo, setItemsAnexo] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Modales
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
  });
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoModalFactura, setPagoModalFactura] = useState<any | null>(null);

  // Hooks personalizados
  const facturasHook = useFacturas(initialContratoId);
  const pagosHook = usePagos();
  const productSelectionHook = useProductSelection();

  const currentDependenciaId = user?.dependencia?.id_dependencia ?? null;
  const { data: stockData = [] } = useStock({ idDependencia: currentDependenciaId });
  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    stockData.forEach((item: any) => map.set(item.id_producto, item.stock));
    return map;
  }, [stockData]);

  /**
   * Infinite scroll: sentinel ref + IntersectionObserver
   */
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && facturasHook.hasMore && !facturasHook.isFetchingMore) {
          facturasHook.loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [facturasHook.hasMore, facturasHook.isFetchingMore, facturasHook.loadMore]);

  /**
   * Cargar datos iniciales (contratos, productos desde item_anexo, monedas, dependencias, clientes)
   */
  const loadInitialData = async () => {
    try {
      const [contratosRes, monedasRes, depsRes, clientesRes, itemsRes] =
        await Promise.all([
          contratosService.getContratos(0, 1000),
          monedaService.getMonedas(0, 100),
          dependenciasService.getDependencias(undefined, 0, 1000),
          clientesService.getClientes(),
          productosService.getProductosConStockItemAnexo(),
        ]);
      setContratos(contratosRes);
      setMonedas(monedasRes);
      setDependencias(depsRes);
      setClientes(clientesRes);
      setItemsAnexo(itemsRes);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Error al cargar datos iniciales");
    }
  };

  // Cargar datos iniciales y facturas cuando cambian
  const productosSource = useMemo(() => {
    if (!facturasHook.selectedContratoId) return itemsAnexo;
    const contrato = contratos.find(c => c.id_contrato === facturasHook.selectedContratoId);
    if (!contrato) return itemsAnexo;
    const monedaContrato = contrato.id_moneda;
    return itemsAnexo
      .filter((item: any) => {
        if (item.id_moneda === monedaContrato) return true;
        return item.precios?.some((p: any) => p.id_moneda === monedaContrato);
      })
      .map((item: any) => {
        if (item.id_moneda === monedaContrato) return item;
        const alt = item.precios?.find((p: any) => p.id_moneda === monedaContrato);
        if (!alt) return item;
        return {
          ...item,
          precio_venta: alt.precio_venta ?? item.precio_venta,
          precio_compra: alt.precio_compra ?? item.precio_compra,
          id_moneda: monedaContrato,
        };
      });
  }, [itemsAnexo, facturasHook.selectedContratoId, contratos]);

	useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (facturasHook.selectedContratoId) {
      const contrato = contratos.find(c => c.id_contrato === facturasHook.selectedContratoId);
      const monedaId = contrato?.id_moneda;
      if (monedaId) {
        facturasHook.setFormData((prev: Record<string, any>) => ({ ...prev, id_moneda: monedaId }));
      }
    }
  }, [facturasHook.selectedContratoId, contratos]);

  /**
   * Obtener productos filtrados según búsqueda
   */
  const productosFiltrados =
    productSelectionHook.getProductosFiltrados(productosSource as Productos[]);

  /**
   * Manejar guardado de factura
   */
  const handleSaveFactura = async () => {
    const stockErrors = productSelectionHook.selectedProducts.filter((p) => {
      const stock = stockMap.get(p.id_producto) ?? 0;
      return p.cantidad > stock;
    });
    if (stockErrors.length > 0) {
      const names = stockErrors.map((p) => {
        const pr = productosSource.find((pr: any) => pr.id_producto === p.id_producto);
        return pr?.nombre || `ID ${p.id_producto}`;
      });
      toast.error(`Stock insuficiente para: ${names.join(", ")}`);
      return;
    }
    const result = await facturasHook.handleSave(
      productSelectionHook.selectedProducts,
      contratos,
      user?.dependencia?.id_dependencia,
    );
    if (result.success) {
      toast.success(result.message);
      setView("list");
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
      title: "¿Eliminar factura?",
      message: `¿Está seguro de eliminar la factura "${codigo}"?`,
      type: "danger",
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
    const result = await pagosHook.handleCreatePago(
      pagoModalFactura.id_factura,
    );
    if (result.success) {
      toast.success(result.message);
      facturasHook.refresh();
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Eliminar pago
   */
  const handleDeletePago = async (pago: Pago) => {
    if (!pagoModalFactura) return;
    const result = await pagosHook.handleDeletePago(
      pago,
      pagoModalFactura.id_factura,
    );
    if (result.success) {
      toast.success(result.message);
      facturasHook.refresh();
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Visualizar documento de factura
   */
  const handleViewDocument = async (factura: any) => {
    console.log("[DEBUG] handleViewDocument - factura:", factura);
    console.log(
      "[DEBUG] handleViewDocument - id_contrato:",
      factura.id_contrato,
    );

    // Primero buscar en la lista local
    let contrato = contratos.find(
      (c: any) => c.id_contrato === factura.id_contrato,
    );
    console.log(
      "[DEBUG] handleViewDocument - contrato encontrado en lista local:",
      contrato,
    );

    // Si no está en la lista local, cargar desde la API
    if (!contrato && factura.id_contrato) {
      console.log(
        "[DEBUG] handleViewDocument - Contrato no local, cargando desde API",
      );
      try {
        contrato = await contratosService.getContrato(factura.id_contrato);
        console.log(
          "[DEBUG] handleViewDocument - contrato desde API:",
          contrato,
        );
      } catch (error) {
        console.error("Error loading contrato:", error);
      }
    }

    console.log(
      "[DEBUG] handleViewDocument - contrato.id_cliente:",
      contrato?.id_cliente,
    );
    console.log(
      "[DEBUG] handleViewDocument - contrato.cliente:",
      contrato?.cliente,
    );

    let clienteCompleto: any = null;
    let clienteCuentas: any[] = [];

    // Obtener id_cliente del contrato o del objeto cliente anidado
    const idCliente = contrato?.id_cliente || contrato?.cliente?.id_cliente;

    if (idCliente) {
      console.log("[DEBUG] handleViewDocument - id_cliente:", idCliente);
      try {
        clienteCompleto = await clientesService.getCliente(idCliente);
        console.log(
          "[DEBUG] handleViewDocument - clienteCompleto:",
          clienteCompleto,
        );

        clienteCuentas = await cuentasService.getCuentasByCliente(idCliente);
        console.log(
          "[DEBUG] handleViewDocument - clienteCuentas:",
          clienteCuentas,
        );
      } catch (error) {
        console.error("Error loading client data:", error);
      }
    } else if (contrato?.cliente) {
      console.log(
        "[DEBUG] handleViewDocument - Usando cliente del contrato directamente",
      );
      clienteCompleto = contrato.cliente;
    }

    const depId = user?.dependencia?.id_dependencia;
    const depCuentas = depId ? await dependenciasService.getCuentasByDependencia(depId) : [];

    console.log("[DEBUG] handleViewDocument - clienteFinal:", clienteCompleto);
    console.log("[DEBUG] handleViewDocument - cuentasFinal:", clienteCuentas);

    const html = getFacturaDocument(
      factura,
      contratos,
      dependencias,
      user,
      clienteCompleto,
      clienteCuentas,
      depCuentas,
      "",
      "",
    );
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  /**
   * Imprimir documento de factura
   */
  const handlePrintDocument = async (factura: any) => {
    console.log("[FacturasPage] handlePrintDocument called");

    // Primero buscar en la lista local
    let contrato = contratos.find(
      (c: any) => c.id_contrato === factura.id_contrato,
    );

    // Si no está en la lista local, cargar desde la API
    if (!contrato && factura.id_contrato) {
      try {
        contrato = await contratosService.getContrato(factura.id_contrato);
      } catch (error) {
        console.error("Error loading contrato:", error);
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
        console.error("Error loading client data:", error);
      }
    } else if (contrato?.cliente) {
      clienteCompleto = contrato.cliente;
    }

    const depId = user?.dependencia?.id_dependencia;
    const depCuentas = depId ? await dependenciasService.getCuentasByDependencia(depId) : [];

    const html = getFacturaDocument(
      factura,
      contratos,
      dependencias,
      user,
      clienteCompleto,
      clienteCuentas,
      depCuentas,
      "",
      "",
    );
    const printWindow = window.open("", "_blank");
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
    setView("form");
  };

  /**
   * Cerrar formulario
   */
  const handleCancelForm = () => {
    setView("list");
    facturasHook.resetForm();
    facturasHook.setSelectedContratoId(initialContratoId ? Number(initialContratoId) : null);
    productSelectionHook.resetSelection();
  };

  // Render según vista actual
  if (view === "list") {
    return (
      <div className="p-6">
<FacturasListView
          facturas={facturasHook.facturas}
          isLoading={facturasHook.isLoading}
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
          onViewDetails={(factura: any) => setDetailModal({ isOpen: true, item: factura })}
          onOpenPagos={handleOpenPagoModal}
          onViewDocument={handleViewDocument}
          onPrintDocument={handlePrintDocument}
          loadMoreRef={loadMoreRef}
          isFetchingMore={facturasHook.isFetchingMore}
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
  if (view === "form") {
    return (
      <div className="p-6">
        <FacturaForm
          editingId={facturasHook.editingId}
          formData={facturasHook.formData}
          selectedProducts={productSelectionHook.selectedProducts}
          productSearch={productSelectionHook.productSearch}
          productosFiltrados={productosFiltrados}
          total={productSelectionHook.getTotal()}
          productos={productosSource as Productos[]}
          monedas={monedas}
          selectedContratoId={facturasHook.selectedContratoId}
          contratos={contratos}
          clientes={clientes}
          onFormDataChange={(data: Record<string, any>) =>
            facturasHook.setFormData(data)
          }
          onProductSearchChange={(search: string) =>
            productSelectionHook.setProductSearch(search)
          }
          onAddProduct={(id: number) => {
            const stock = stockMap.get(id) ?? 0;
            if (stock < 1) {
              const pr = productosSource.find((p: any) => p.id_producto === id);
              toast.error(`"${pr?.nombre || pr?.nombre || `ID ${id}`}" no tiene stock disponible`);
              return;
            }
            productSelectionHook.addProduct(id, productosSource as Productos[]);
          }}
          onUpdateCantidad={(id: number, cant: number) =>
            productSelectionHook.updateCantidad(id, cant)
          }
          onUpdatePrecio={(id: number, precio: number) =>
            productSelectionHook.updatePrecioVenta(id, precio)
          }
          onUpdatePrecioCompra={(id: number, precio: number) =>
            productSelectionHook.updatePrecioCompra(id, precio)
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
