import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  contratosService,
  productosService,
  clientesService,
  dependenciasService,
  cuentasService,
} from "../../../services/api";
import type {
  ContratoWithDetails,
  OfertaTiendaWithDetails,
} from "../../../types/contrato";
import type { Productos } from "../../../types";
import type { Dependencia } from "../../../types/dependencia";
import type { Cliente } from "../../../types/ventas";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { Button, FormModal } from "../../../components/ui";
import { ShoppingBag } from "lucide-react";

// Componentes
import { OfertasListView } from "./components/OfertasListView";
import { OfertaForm } from "./components/OfertaForm";
import { OfertaDetailModal } from "./components/modals/OfertaDetailModal";
import { ConfirmDeleteModal } from "../facturas/components/modals/ConfirmDeleteModal";

// Hooks
import { useOfertas } from "./hooks/useOfertas";
import { useProductSelection } from "../facturas/hooks/useProductSelection";
import { formatFecha } from "../../../utils/fecha";
import { empresaActual } from '../../../config/branding';

const OFERTA_FORM_ID = "oferta-form";

/**
 * Documento HTML de la oferta de tienda (vista previa / impresión).
 * Misma estructura del documento de factura adaptada a una oferta.
 */
export function getOfertaDocumento(
  oferta: any,
  contratos: any[],
  dependencias: any[],
  user: any,
  clienteCompleto: any = null,
) {
  const contrato = contratos.find(
    (c: any) => c.id_contrato === oferta.id_contrato,
  );
  const dependencia =
    user?.dependencia ||
    dependencias.find((d: any) => d.id_dependencia === contrato?.id_dependencia);

  const empresaNombre = dependencia?.nombre || empresaActual().razonSocial;
  const empresaDireccion = dependencia?.direccion || "";
  const empresaTelefono = dependencia?.telefono || "";
  const empresaWeb = dependencia?.web || "";
  const empresaEmail = dependencia?.email || "";
  const empresaReeup = dependencia?.reeup || "";

  const numeroContrato = contrato?.codigo || "";
  const cliente = clienteCompleto || contrato?.cliente;
  const nombreCliente = cliente?.nombre || "N/A";
  const nitCliente = cliente?.nit || "";
  const direccionCliente = cliente?.direccion || "";
  const provinciaCliente = cliente?.provincia?.nombre || "";
  const municipioCliente = cliente?.municipio?.nombre || "";
  const direccionCompleta = [direccionCliente, municipioCliente, provinciaCliente]
    .filter(Boolean)
    .join(", ");

  const items = oferta.items || [];
  const itemsRows = items
    .map((item: any) => {
      const importe = Number(item.cantidad || 0) * Number(item.precio_venta || 0);
      return `
        <tr>
          <td>${item.producto?.codigo || "N/A"}</td>
          <td>${item.producto?.nombre || "Producto"}</td>
          <td class="cantidad">${item.cantidad || 0}</td>
          <td class="precio">${Number(item.precio_venta || 0).toFixed(2)}</td>
          <td class="importe">${importe.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  const total = Number(oferta.monto || 0).toFixed(2);
  const fechaEmision = formatFecha(oferta.fecha) || "N/A";

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
  <title>Oferta ${oferta.codigo_oferta || "#" + oferta.id_oferta_tienda}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
    .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0,0,0,.2); padding: 1rem 1.5rem 1.5rem; border-radius: 4px; }
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.2; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; }
    .header-logo img { width: 160px; height: 160px; object-fit: contain; }
    .header-center { text-align: center; flex: 1; }
    .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
    .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .direccion-contacto { font-size: 11.5px; margin-top: 6px; }
    .telefonos, .reeup, .web { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .email { font-size: 12px; }
    .header-box { border: 2px solid black; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
    .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
    .header-box-row { font-size: 11px; margin-bottom: 3px; }

    .info-cliente { padding: 8px; border: 1px solid black; margin: 14px 0 10px; font-size: 11.5px; }
    .cliente-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; }
    .cliente-grid .full-row { grid-column: 1 / -1; }

    .tabla-productos { width: 100%; border-collapse: collapse; font-size: 12px; margin: 14px 0 16px; }
    .tabla-productos th, .tabla-productos td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-productos th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .cantidad { text-align: center; }
    .precio, .importe { text-align: right; }
    .total-row td { font-weight: 800; font-size: 13px; border-top: 2px solid #222; }

    .firmas { display: flex; justify-content: space-between; gap: 20px; margin-top: 40px; font-size: 11px; }
    .bloque-firma { flex: 1; }
    @media print { body { background: white; } .documento { box-shadow: none; } .tabla-productos th { background-color: #ccc !important; print-color-adjust: exact; } }
    @page { margin: 1cm; }
  </style>
</head>
<body>
  <div class="documento texto">
    <div class="header-tcp">
      <div class="header-logo">
        <img src="/empresa/logo-black.png" alt="Logo empresa" />
      </div>
      <div class="header-center">
        <div class="tcp-title">${empresaNombre.toUpperCase()}</div>
        <div class="nombre-titular">${empresaNombre}</div>
        <div class="direccion-contacto">${empresaDireccion}</div>
        <div class="telefonos">Tel: ${empresaTelefono}</div>
        ${empresaWeb ? `<div class="web">Web: ${empresaWeb}</div>` : ''}
        ${empresaEmail ? `<div class="email">${empresaEmail}</div>` : ''}
        ${empresaReeup ? `<div class="reeup">Código: ${empresaReeup}</div>` : ''}
      </div>
      <div class="header-box">
        <div class="header-box-title">Oferta de Tienda</div>
        <div class="header-box-row"><strong>No.:</strong> ${oferta.codigo_oferta || "#" + oferta.id_oferta_tienda}</div>
        <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
      </div>
    </div>

    <div class="info-cliente">
      <div class="cliente-grid">
        <div><strong>Cliente:</strong> ${nombreCliente}</div>
        <div><strong>NIT/CI:</strong> ${nitCliente || ''}</div>
        <div><strong>Contrato:</strong> ${numeroContrato || oferta.id_contrato}</div>
        <div class="full-row"><strong>Dirección:</strong> ${direccionCompleta}</div>
      </div>
    </div>

    ${oferta.descripcion ? `<div style="margin: 8px 0 4px; font-size: 13px;"><strong>Descripción:</strong> ${oferta.descripcion}</div>` : ''}

    <table class="tabla-productos">
      <thead>
        <tr>
          <th style="width:12%">Código</th>
          <th style="width:46%">Descripción</th>
          <th style="width:10%">Cantidad</th>
          <th style="width:15%">Precio</th>
          <th style="width:17%">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="5" style="text-align:center;">Sin productos registrados</td></tr>'}
        <tr class="total-row">
          <td colspan="4" style="text-align:right;"><strong>Total</strong></td>
          <td style="text-align:right;"><strong>${total}</strong></td>
        </tr>
      </tbody>
    </table>

    ${oferta.observaciones?.trim() ? `<div style="margin: 8px 0 6px; font-size: 13px;"><strong>Observaciones:</strong> ${oferta.observaciones}</div>` : ''}

    <div class="firmas">
      <div class="bloque-firma">
        <p><strong>Confeccionado por:</strong></p>
        <p>${nombreUsuario}</p>
        <p style="font-size:10px;">${cargoUsuario}</p>
        <br><br>
        <div style="border-bottom: 1px solid #222;"></div>
        <p style="margin-top: 8px;">Firma</p>
      </div>
      <div class="bloque-firma">
        <p><strong>Recibido por:</strong></p>
        <p><strong>Nombre:</strong> </p>
        <p><strong>Cargo:</strong> </p>
        <p><strong>Fecha:</strong> </p>
        <br><br>
        <div style="border-bottom: 1px solid #222;"></div>
        <p style="margin-top: 8px;">Firma</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * OfertasPage - Componente principal orquestador de ofertas de tienda
 */
export function OfertasTiendaPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get("contrato");

  const [isSavingOferta, setIsSavingOferta] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Datos maestros
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [itemsAnexo, setItemsAnexo] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);

  // Modales
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: OfertaTiendaWithDetails | null;
  }>({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info" | "success";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "danger" });

  // Hooks
  const ofertasHook = useOfertas(initialContratoId);
  const productSelectionHook = useProductSelection();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && ofertasHook.hasMore && !ofertasHook.isFetchingMore) {
          ofertasHook.loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertasHook.hasMore, ofertasHook.isFetchingMore, ofertasHook.loadMore]);

  // Cargar datos maestros
  useEffect(() => {
    (async () => {
      try {
        const [contratosRes, depsRes, itemsRes] = await Promise.all([
          contratosService.getContratos(0, 1000),
          dependenciasService.getDependencias(undefined, 0, 1000),
          productosService.getProductosConStockItemAnexo(),
        ]);
        setContratos(contratosRes);
        setDependencias(depsRes);
        setItemsAnexo(itemsRes);
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Error al cargar datos iniciales");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ofertasHook.selectedContratoId) {
      const contrato = contratos.find(
        (c) => c.id_contrato === ofertasHook.selectedContratoId
      );
      if (contrato?.id_moneda) {
        ofertasHook.setFormData((prev: Record<string, any>) => ({
          ...prev,
          id_moneda: contrato.id_moneda,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertasHook.selectedContratoId, contratos]);

  const productosSource = useMemo(() => itemsAnexo, [itemsAnexo]);
  const productosFiltrados =
    productSelectionHook.getProductosFiltrados(productosSource as Productos[]);

  /**
   * Guardado de oferta
   */
  const handleSaveOferta = async () => {
    setIsSavingOferta(true);
    try {
      const result = await ofertasHook.handleSave(
        productSelectionHook.selectedProducts,
      );
      if (result.success) {
        toast.success(result.message);
        productSelectionHook.resetSelection();
        ofertasHook.setSelectedContratoId(initialContratoId ? Number(initialContratoId) : null);
        setIsFormOpen(false);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSavingOferta(false);
    }
  };

  const [isFormOpen, setIsFormOpen] = useState(false);

  /**
   * Anulación
   */
  const handleDeleteOferta = (id: number, codigo: string | null | undefined) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Anular oferta?",
      message: `¿Está seguro de anular la oferta "${codigo || "#" + id}"? La oferta dejará de aparecer en el listado.`,
      type: "danger",
      onConfirm: async () => {
        const result = await ofertasHook.handleDelete(id);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  /**
   * Conversión a factura
   */
  const handleConvertirOferta = (oferta: OfertaTiendaWithDetails) => {
    if (oferta.estado !== "ACTIVA") {
      toast.error("Solo se pueden convertir ofertas en estado ACTIVA");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "¿Convertir en factura?",
      message: `La oferta "${oferta.codigo_oferta || "#" + oferta.id_oferta_tienda}" se convertirá en factura. Validará el stock y creará los movimientos de venta pendientes.`,
      type: "info",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsConverting(true);
        try {
          const result = await ofertasHook.handleConvertir(oferta.id_oferta_tienda);
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        } finally {
          setIsConverting(false);
        }
      },
    });
  };

  /**
   * Documento (vista previa e impresión)
   */
  const buildDocumento = async (oferta: any) => {
    let contrato = contratos.find(
      (c: any) => c.id_contrato === oferta.id_contrato,
    );
    if (!contrato && oferta.id_contrato) {
      try {
        contrato = await contratosService.getContrato(oferta.id_contrato);
      } catch (error) {
        console.error("Error loading contrato:", error);
      }
    }

    let clienteCompleto: any = null;
    const idCliente = contrato?.id_cliente || contrato?.cliente?.id_cliente;
    if (idCliente) {
      try {
        clienteCompleto = await clientesService.getCliente(idCliente);
        await cuentasService.getCuentasByCliente(idCliente);
      } catch (error) {
        console.error("Error loading client data:", error);
      }
    } else if (contrato?.cliente) {
      clienteCompleto = contrato.cliente;
    }

    return getOfertaDocumento(
      oferta,
      contratos,
      dependencias,
      user,
      clienteCompleto,
    );
  };

  const handleViewDocument = async (oferta: any) => {
    const html = await buildDocumento(oferta);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handlePrintDocument = async (oferta: any) => {
    const html = await buildDocumento(oferta);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  /**
   * Abrir/cerrar formulario
   */
  const handleOpenForm = (oferta?: OfertaTiendaWithDetails) => {
    if (oferta) {
      ofertasHook.openForm(oferta);
      productSelectionHook.loadSelectedProducts(oferta.items || []);
    } else {
      ofertasHook.resetForm();
      productSelectionHook.resetSelection();
      if (initialContratoId) {
        ofertasHook.setSelectedContratoId(Number(initialContratoId));
      }
    }
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    ofertasHook.resetForm();
    ofertasHook.setSelectedContratoId(initialContratoId ? Number(initialContratoId) : null);
    productSelectionHook.resetSelection();
  };

  return (
    <div className="p-6">
      <OfertasListView
        ofertas={ofertasHook.ofertas}
        isLoading={ofertasHook.isLoading}
        contratos={contratos}
        selectedContratoId={ofertasHook.selectedContratoId}
        onSelectedContratoChange={(id: number | null) =>
          ofertasHook.setSelectedContratoId(id)
        }
        onAddNew={() => handleOpenForm()}
        onEdit={(oferta) => handleOpenForm(oferta)}
        onDelete={handleDeleteOferta}
        onViewDetails={(oferta) => setDetailModal({ isOpen: true, item: oferta })}
        onViewDocument={handleViewDocument}
        onPrintDocument={handlePrintDocument}
        onConvertir={handleConvertirOferta}
        loadMoreRef={loadMoreRef}
        isFetchingMore={ofertasHook.isFetchingMore}
      />

      {/* Modales */}
      <OfertaDetailModal
        isOpen={detailModal.isOpen}
        oferta={detailModal.item}
        onClose={() => setDetailModal({ isOpen: false, item: null })}
      />

      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={handleCancelForm}
        title={ofertasHook.editingId ? "Editar Oferta" : "Nueva Oferta"}
        subtitle="Complete los datos de la oferta de tienda"
        icon={<ShoppingBag className="h-6 w-6" />}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelForm}
              disabled={isSavingOferta || isConverting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={OFERTA_FORM_ID}
              disabled={isSavingOferta || isConverting}
              isLoading={isSavingOferta}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Guardar
            </Button>
          </>
        }
      >
        <OfertaForm
          formId={OFERTA_FORM_ID}
          formData={ofertasHook.formData}
          selectedProducts={productSelectionHook.selectedProducts}
          productSearch={productSelectionHook.productSearch}
          productosFiltrados={productosFiltrados}
          total={productSelectionHook.getTotal()}
          productos={productosSource as Productos[]}
          selectedContratoId={ofertasHook.selectedContratoId}
          contratos={contratos}
          onFormDataChange={(data: Record<string, any>) =>
            ofertasHook.setFormData(data)
          }
          onProductSearchChange={(search: string) =>
            productSelectionHook.setProductSearch(search)
          }
          onAddProduct={(id: number) => productSelectionHook.addProduct(id, productosSource as Productos[])}
          onUpdateCantidad={(id: number, cant: number) =>
            productSelectionHook.updateCantidad(id, cant)
          }
          onUpdatePrecio={(id: number, precio: number) =>
            productSelectionHook.updatePrecioVenta(id, precio)
          }
          onRemoveProduct={(id: number) => productSelectionHook.removeProduct(id)}
          onSelectedContratoChange={(id: number | null) =>
            ofertasHook.setSelectedContratoId(id)
          }
          onSave={handleSaveOferta}
        />
      </FormModal>
    </div>
  );
}
