import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Card, Label, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, FormModal } from '../../components/ui';
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Eye,
  DollarSign,
  FileText,
  Tag,
  User,
  X,
  Printer,
  Receipt,
  Loader2
} from 'lucide-react';
import { 
  liquidacionService, 
  type Liquidacion
} from '../../services/api';
import { clientesService, cuentasService, type Cliente } from '../../services/api';
import { anexosService, type Anexo } from '../../services/api';
import { authService } from '../../services/auth';
import { Decimal } from 'decimal.js';
import { mul, add, sub, percentToMultiplier, toFixed } from '../../utils/decimal';
import { escapeHtml } from '../../utils/sanitize';
import { DEFAULTS } from '../../config/defaults';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import { formatFecha } from '../../utils/fecha';
import { CrearLiquidacionForm } from './CrearLiquidacionPage';

type TabType = 'todas' | 'pendientes' | 'liquidadas';

const CREAR_LIQUIDACION_FORM_ID = 'crear-liquidacion-form';

export function LiquidacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProveedorId = searchParams.get('proveedor');

  const [activeTab, setActiveTab] = useState<TabType>('todas');
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [isSavingCrear, setIsSavingCrear] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<Liquidacion | null>(null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: Liquidacion | null }>({ isOpen: false, item: null });
  const [printModal, setPrintModal] = useState<{ isOpen: boolean; liquidacion: Liquidacion | null; autorizado_por: string; cargo_autorizado: string; revisado_por: string }>({ isOpen: false, liquidacion: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' });
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; id_liquidacion: number | null }>({ isOpen: false, id_liquidacion: null });
  
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialProveedorId ? Number(initialProveedorId) : null);

  const {
    items: liquidaciones,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
    reset,
    total: totalLiquidaciones,
  } = useInfiniteList<Liquidacion>({
    queryKeyBase: 'liquidaciones',
    queryFn: (skip, limit, _search, onTotal) => {
      if (activeTab === 'pendientes') {
        return liquidacionService.getLiquidacionesPendientes(skip, limit, undefined, onTotal);
      } else if (activeTab === 'liquidadas') {
        return liquidacionService.getLiquidacionesLiquidadas(skip, limit, undefined, onTotal);
      }
      return liquidacionService.getLiquidaciones(skip, limit, undefined, onTotal);
    },
    extraQueryKeyParams: [activeTab],
    limit: 100,
  });

  // Resetear paginación al cambiar de tab
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // IntersectionObserver para scroll infinito
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isFetchingMore]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-proveedores'],
    queryFn: async () => {
      const allClientes = await clientesService.getClientes();
      return allClientes.filter((c: Cliente) => 
        c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS'
      );
    }
  });

  const { data: anexos = [] } = useQuery({
    queryKey: ['anexos'],
    queryFn: () => anexosService.getAnexos()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => liquidacionService.deleteLiquidacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Liquidación eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar liquidación');
    }
  });

  const filteredLiquidaciones = liquidaciones.filter((l: Liquidacion) => {
    if (filtroCliente && l.id_cliente !== filtroCliente) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return l.codigo?.toLowerCase().includes(search) || 
           l.cliente?.nombre?.toLowerCase().includes(search);
  });

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || 'N/A';
  };

  // Quita el filtro por proveedor que llega desde la lista de Proveedores
  // (?proveedor=id) y vuelve a mostrar todas las liquidaciones.
  const limpiarFiltroProveedor = () => {
    setFiltroCliente(null);
    const params = new URLSearchParams(searchParams);
    params.delete('proveedor');
    setSearchParams(params, { replace: true });
  };

  const getAnexoInfo = (anexoId: number) => {
    const anexo = anexos.find((a: Anexo) => a.id_anexo === anexoId);
    return anexo?.nombre_anexo || 'N/A';
  };

  const generateLiquidacionHTML = (liquidacion: Liquidacion, autorizadoPor: string, cargoAutorizado: string, revisadoPor: string, cuentas: any[] = []) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === liquidacion.id_cliente)
      || liquidacion.cliente
      || { nombre: 'N/A', codigo: 'N/A' };
    const user = authService.getUser();
    const confectionadoPor = user ? `${user.nombre || ''} ${user.primer_apellido || ''}`.trim() : '';
    const cargoUsuario = user?.cargo || '';
    
    const empresa = user?.dependencia;
    const empresaNombre = escapeHtml(empresa?.nombre || 'Empresa');
    const empresaDireccion = escapeHtml(empresa?.direccion || '');
    const empresaTelefono = escapeHtml(empresa?.telefono || '');
    const empresaEmail = escapeHtml(empresa?.email || '');
    const empresaReeup = escapeHtml(empresa?.reeup || '');
    
    const nombreProveedor = escapeHtml(cliente?.nombre || 'N/A');
    const codigoProveedor = escapeHtml(cliente?.codigo || 'N/A');
    const cedulaProveedor = escapeHtml(cliente?.nit || 'N/A');
    const direccionProveedor = escapeHtml(cliente?.direccion || '');

    const cuentasHTML = cuentas.length > 0
      ? cuentas.map((c, i) => `
        ${i > 0 ? '<br>' : ''}<span>${escapeHtml(c.banco || '')}${c.numero_cuenta ? ' - ' + escapeHtml(String(c.numero_cuenta)) : ''}</span>
      `).join('')
      : '<span>No registrada</span>';

    const codigoConvenio = escapeHtml(liquidacion.convenio?.codigo || '');
    const moneda = escapeHtml(liquidacion.moneda?.nombre || '');
    const observacionLiquidacion = escapeHtml(liquidacion.observaciones || '');

    // Agrupar productos por id_anexo
    const productosPorAnexo: Record<number, any[]> = {};
    liquidacion.productos_en_liquidacion?.forEach((p: any) => {
      const idAnexo = p.id_anexo || 0;
      if (!productosPorAnexo[idAnexo]) {
        productosPorAnexo[idAnexo] = [];
      }
      productosPorAnexo[idAnexo].push(p);
    });

    // Generar filas con separadores y totales por anexo usando Decimal
    const productosRows = Object.entries(productosPorAnexo).map(([idAnexo, productos]) => {
      const nombreAnexo = escapeHtml(productos[0]?.anexo?.nombre_anexo || `Anexo ${idAnexo}`);
      const totalAnexo = toFixed(
        productos.reduce((acc: Decimal, p: any) => add(acc, mul(Number(p.precio || 0), p.cantidad || 0)), new Decimal(0)),
        2
      );
      const filasProductos = productos.map((p: any) => `
        <tr>
          <td>${escapeHtml(String(p.codigo || 'N/A'))}</td>
          <td>${escapeHtml(p.producto?.nombre || 'Producto')}</td>
          <td class="cantidad">${p.cantidad || 0}</td>
          <td class="precio">${Number(p.precio || 0).toFixed(2)}</td>
          <td class="devengado-col">${toFixed(mul(Number(p.precio || 0), p.cantidad || 0), 2)}</td>
        </tr>
      `).join('');
      
      return `
        <tr style="font-weight:bold;">
          <td colspan="5"><strong>ANEXO:</strong> ${nombreAnexo} — Total: ${totalAnexo}</td>
        </tr>
        ${filasProductos}
      `;
    }).join('');

    // Financial calculations with Decimal precision
    const importeDec = new Decimal(liquidacion.importe || 0);
    const porcentajeCaguayoDec = new Decimal(liquidacion.porcentaje_caguayo || DEFAULTS.PORCENTAJE_CAGUAYO);
    const importeCaguayoDec = mul(importeDec, percentToMultiplier(porcentajeCaguayoDec.toNumber()));
    const devengadoDec = sub(importeDec, importeCaguayoDec);
    const tributarioDec = new Decimal(liquidacion.tributario || 0);
    const tributarioMontoDec = mul(devengadoDec, percentToMultiplier(tributarioDec.toNumber()));
    const subtotalDec = sub(devengadoDec, tributarioMontoDec);
    const gastoEmpresaDec = new Decimal(liquidacion.gasto_empresa || 0);
    const comisionDec = new Decimal(liquidacion.comision_bancaria || 0);
    const netoDec = sub(sub(subtotalDec, gastoEmpresaDec), comisionDec);

    const subtotalDevengado = toFixed(devengadoDec, 2);
    const valorTributario = toFixed(tributarioMontoDec, 2);
    const subtotal = toFixed(subtotalDec, 2);
    const valorEmpresa = toFixed(gastoEmpresaDec, 2);
    const valorComision = toFixed(comisionDec, 2);
    const netoCobrar = toFixed(netoDec, 2);

    const fechaEmision = formatFecha(liquidacion.fecha_emision) || 'N/A';
    const fechaLiquidacion = formatFecha(liquidacion.fecha_liquidacion) || 'N/A';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Liquidación | ${escapeHtml(String(liquidacion.codigo))}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
        .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
        .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.2; color: #111; }
        .header-tcp { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; gap: 15px; }
        .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
        .header-logo img { width: 160px; height: 160px; object-fit: contain; }
        .header-center { text-align: center; flex: 1; }
        .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: black; }
        .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
        .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.2; }
        .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
        .email { font-size: 12px; color: black; }
        .reeup { font-size: 12px; font-weight: 500; margin-top: 4px; }
        .header-box { border: 2px solid black; background: white; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
        .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: black; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
        .header-box-row { font-size: 11px; margin-bottom: 3px; }
        .header-box-row strong { font-weight: 700; }
        .header-box-row.total-final { font-weight: 800; font-size: 13px; border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; }
        .fila-fechas { display: flex; justify-content: space-between; margin: 18px 0 12px 0; }
        .bloque-fecha { font-weight: 600; font-size: 13px; }
        .info-proyecto { display: flex; flex-wrap: wrap; justify-content: space-between; background: white; padding: 12px; border: 1px solid black; margin-bottom: 20px; font-size: 12.5px; }
        .proyecto-item { min-width: 180px; margin-bottom: 6px; }
        .proyecto-item strong { font-weight: 800; }
        .resumen-derecha { display: flex; justify-content: flex-end; margin-top: 8px; margin-bottom: 20px; }
        .cuadro-totales { width: 280px; border: 1px solid #111; background: #fefcf5; padding: 12px 15px; font-size: 13px; font-family: monospace; }
        .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
        .devengado-total-row { font-weight: bold; border-top: 1px solid #333; margin-top: 6px; padding-top: 4px; }
        .tabla-wrapper { margin: 14px 0; }
        .tabla-productos { flex: 1; width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .tabla-productos th, .tabla-productos td { border: 1px solid #222; padding: 8px 6px; vertical-align: top; }
        .tabla-productos th { background-color: #eae7db; font-weight: 700; text-align: center; }
        .tabla-productos td { text-align: left; }
        .cantidad, .precio, .devengado-col { text-align: right; }
        .firmas { display: flex; flex-direction: column; gap: 20px; margin-top: 32px; margin-bottom: 16px; }
        .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
        .bloque-firma { flex: 1; padding-top: 8px; font-size: 11px; text-align: left; }
        .bloque-firma p { margin: 2px 0; }
        .cargo { font-size: 10px; color: #2c2c2c; }
        @media (max-width: 650px) { .documento { padding: 1rem; } .cuadro-totales { width: 100%; } .firmas { flex-direction: column; gap: 20px; } .fila-firmas { flex-direction: column; gap: 20px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 15px; } .info-proyecto { flex-direction: column; } }
        @page { margin: 0; }
        @media print {
          body { background: white; display: block; padding: 0; min-height: auto; align-items: flex-start; }
          .documento { max-width: none; box-shadow: none; border-radius: 0; padding: 1cm; padding-top: 240px; padding-bottom: 160px; }
          .print-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0.3cm 1cm 0 1cm; }
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
            <div class="email">${empresaEmail}</div>
            ${empresaReeup ? `<div class="reeup">Código: ${empresaReeup}</div>` : ''}
        </div>
        <div class="header-box">
            <div class="header-box-title">Liquidación</div>
            <div class="header-box-row"><strong>Código:</strong> ${escapeHtml(String(liquidacion.codigo || 'N/A'))}</div>
            <div class="header-box-row"><strong>Moneda:</strong> ${moneda || 'N/A'}</div>
            <div class="header-box-row" style="border-top:1px solid black;padding-top:4px;margin-top:4px;"><strong>IMPORTE:</strong> ${toFixed(importeDec, 2)}</div>
            <div class="header-box-row"><span style="color:#666;">Importe Caguayo(${porcentajeCaguayoDec}%):</span> -${toFixed(importeCaguayoDec, 2)}</div>
            <div class="header-box-row" style="font-weight:bold;border-bottom:1px solid #333;padding-bottom:4px;"><strong>DEVENGADO:</strong> ${subtotalDevengado}</div>
            <div class="header-box-row"><span style="color:#666;">Tributario(${tributarioDec}%):</span> -${valorTributario}</div>
            <div class="header-box-row" style="font-weight:bold;border-bottom:1px solid #333;padding-bottom:4px;"><strong>SUBTOTAL:</strong> ${subtotal}</div>
            <div class="header-box-row"><span style="color:#666;">Gasto Empresa:</span> -${valorEmpresa}</div>
            <div class="header-box-row"><span style="color:#666;">Comisión:</span> -${valorComision}</div>
            <div class="header-box-row total-final"><strong>NETO A COBRAR:</strong> ${netoCobrar}</div>
        </div>
    </div>
    </div>

    <div class="fila-fechas">
        <span class="bloque-fecha"><strong>Fecha Emisión:</strong> ${fechaEmision}</span>
        <span class="bloque-fecha"><strong>Fecha Liquidación:</strong> ${fechaLiquidacion}</span>
    </div>

    <div class="info-proyecto">
        <div class="proyecto-item" style="width:100%;"><strong>Proveedor:</strong> ${nombreProveedor}, <strong>NIT:</strong> ${cedulaProveedor}, <strong>Código:</strong> ${codigoProveedor}</div>
        <div class="proyecto-item" style="width:100%;"><strong>Dirección:</strong> ${direccionProveedor}</div>
        <div class="proyecto-item" style="width:100%;"><strong>Cuenta:</strong> ${cuentasHTML}</div>
        ${codigoConvenio ? `<div class="proyecto-item" style="width:100%;"><strong>Convenio:</strong> ${codigoConvenio}</div>` : ''}
    </div>

    <div style="margin: 10px 0 8px 0; font-weight: bold; font-size: 13px;">Pago por la compra de los siguientes productos:</div>

    <div class="tabla-wrapper">
        <table class="tabla-productos">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Devengado</th>
                </tr>
            </thead>
            <tbody>
                ${codigoConvenio ? `<tr style="font-weight:bold;"><td colspan="5"><strong>CONVENIO:</strong> ${codigoConvenio}</td></tr>` : ''}
                ${productosRows}
                <tr style="font-weight:bold;">
                    <td colspan="4" style="text-align:right;">Devengado</td>
                    <td class="devengado-col">${subtotalDevengado}</td>
                </tr>
            </tbody>
        </table>
    </div>

    ${observacionLiquidacion ? `
    <div style="margin-top: 14px; padding: 10px 12px; border: 1px solid #ccc; font-size: 12px;">
        <strong>Observaciones:</strong> ${observacionLiquidacion}
    </div>` : ''}

    <div class="print-footer">
    <div class="firmas">
        <div class="fila-firmas" style="display: flex; justify-content: space-between; gap: 40px;">
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Confeccionado por:</strong></p>
                <p>${confectionadoPor}</p>
                <p class="cargo">${cargoUsuario}</p>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Proveedor:</strong></p>
                <p>${nombreProveedor}</p>
                <br>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
        </div>
        <div class="fila-firmas" style="display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;">
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Autorizado por:</strong></p>
                <p>${autorizadoPor || ' '}</p>
                <p class="cargo">${cargoAutorizado || ' '}</p>
                <br>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Revisado por:</strong></p>
                <p>${revisadoPor || ''}</p>
                <p>Economia SA</p>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
        </div>
    </div>
    </div>
</div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    if (!printModal.liquidacion) return;
    const liquidacion = printModal.liquidacion;
    const cuentas = liquidacion.id_cliente ? await cuentasService.getCuentasByCliente(liquidacion.id_cliente) : [];
    const html = generateLiquidacionHTML(liquidacion, printModal.autorizado_por, printModal.cargo_autorizado || '', printModal.revisado_por, cuentas);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    setPrintModal({ isOpen: false, liquidacion: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' });
  };

  const handleViewDocument = async (liquidacion: Liquidacion) => {
    const cuentas = liquidacion.id_cliente ? await cuentasService.getCuentasByCliente(liquidacion.id_cliente) : [];
    const html = generateLiquidacionHTML(liquidacion, '', '', '', cuentas);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de liquidaciones ({searchTerm ? filteredLiquidaciones.length : totalLiquidaciones ?? liquidaciones.length} registradas)
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCrearModal(true)}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      <div className="flex gap-4 border-b">
        {(['todas', 'pendientes', 'liquidadas'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar liquidaciones..."
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filtroCliente && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-sm font-medium text-teal-700">
            <User className="h-3.5 w-3.5" />
            Proveedor: {getClienteNombre(filtroCliente)}
            <button
              type="button"
              onClick={limpiarFiltroProveedor}
              aria-label="Quitar filtro por proveedor"
              title="Quitar filtro por proveedor"
              className="p-0.5 rounded-full text-teal-600 hover:bg-teal-100 hover:text-teal-900 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="text-xs text-gray-500">
            Solo se muestran las liquidaciones de este proveedor
          </span>
        </div>
      )}

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-teal-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
                    Proveedor
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Importe
                  </div>
                </TableHead>
                <TableHead>Neto Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">Cargando...</TableCell>
                </TableRow>
              ) : filteredLiquidaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">{filtroCliente ? 'No hay liquidaciones de este proveedor' : 'No hay liquidaciones'}</TableCell>
                </TableRow>
              ) : (
                filteredLiquidaciones.map((liquidacion: Liquidacion) => (
                  <TableRow key={liquidacion.id_liquidacion} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item: liquidacion })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {liquidacion.codigo}
                      </span>
                    </TableCell>
                    <TableCell>{liquidacion.cliente?.nombre || getClienteNombre(liquidacion.id_cliente) || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-gray-900">{liquidacion.importe?.toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-gray-900">{liquidacion.neto_pagar?.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        liquidacion.liquidada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {liquidacion.liquidada ? 'Liquidada' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDocument(liquidacion)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPrintModal({ isOpen: true, liquidacion: liquidacion, autorizado_por: '', cargo_autorizado: '', revisado_por: '' })}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 h-8 w-8"
                          title="Imprimir"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {/* Botón Aprobar - solo si está pendiente */}
                        {!liquidacion.liquidada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setApproveModal({ isOpen: true, id_liquidacion: liquidacion.id_liquidacion })}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Aprobar liquidación"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('¿Eliminar liquidación?')) {
                              deleteMutation.mutate(liquidacion.id_liquidacion);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Sentinel para scroll infinito */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      )}

      <FormModal
        isOpen={showCrearModal}
        onClose={() => { setShowCrearModal(false); setIsSavingCrear(false); }}
        title="Nueva Liquidación"
        subtitle="Liquidación de productos por proveedor"
        icon={<FileText className="h-6 w-6" />}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCrearModal(false); setIsSavingCrear(false); }}
              disabled={isSavingCrear}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={CREAR_LIQUIDACION_FORM_ID}
              disabled={isSavingCrear}
              isLoading={isSavingCrear}
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Guardar
            </Button>
          </>
        }
      >
        <CrearLiquidacionForm
          formId={CREAR_LIQUIDACION_FORM_ID}
          initialProveedorId={filtroCliente}
          onExit={() => { setShowCrearModal(false); setIsSavingCrear(false); refresh(); }}
          onPendingChange={setIsSavingCrear}
        />
      </FormModal>

      {showDetailModal && selectedLiquidacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-teal-50 to-cyan-50">
              <h2 className="text-xl font-bold">Detalle de Liquidación</h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedLiquidacion(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Código</p>
                  <p className="font-medium">{selectedLiquidacion.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedLiquidacion.liquidada 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedLiquidacion.liquidada ? 'Liquidada' : 'Pendiente'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Proveedor</p>
                  <p className="font-medium">{selectedLiquidacion.cliente?.nombre || getClienteNombre(selectedLiquidacion.id_cliente)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Anexo</p>
                  <p className="font-medium">{selectedLiquidacion.id_anexo ? getAnexoInfo(selectedLiquidacion.id_anexo) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Emisión</p>
                  <p className="font-medium">{formatFecha(selectedLiquidacion.fecha_emision)}</p>
                </div>
                {selectedLiquidacion.fecha_liquidacion && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha Liquidación</p>
                    <p className="font-medium">{formatFecha(selectedLiquidacion.fecha_liquidacion)}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="font-medium mb-3">Montos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Importe:</span>
                    <span>{selectedLiquidacion.importe?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tributario:</span>
                    <span>- {selectedLiquidacion.tributario?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comisión Bancaria:</span>
                    <span>- {selectedLiquidacion.comision_bancaria?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gasto Empresa:</span>
                    <span>- {selectedLiquidacion.gasto_empresa?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Neto a Pagar:</span>
                    <span className="text-green-600">{selectedLiquidacion.neto_pagar?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedLiquidacion.observaciones && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                  <p>{selectedLiquidacion.observaciones}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedLiquidacion(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Liquidación</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Proveedor</p>
                  <p className="font-bold text-gray-900">{detailModal.item.cliente?.nombre || getClienteNombre(detailModal.item.id_cliente)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Anexo</p>
                  <p className="font-bold text-gray-900">{detailModal.item.id_anexo ? getAnexoInfo(detailModal.item.id_anexo) : '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Importe</p>
                  <p className="font-bold text-green-900 text-xl">{detailModal.item.importe?.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-lime-50 to-green-50 p-4 rounded-xl border border-lime-100">
                  <p className="text-xs text-lime-600 uppercase tracking-wider mb-1">Neto a Pagar</p>
                  <p className="font-bold text-lime-900 text-xl">{detailModal.item.neto_pagar?.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${detailModal.item.liquidada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {detailModal.item.liquidada ? 'Liquidada' : 'Pendiente'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha Emisión</p>
                  <p className="font-bold text-gray-900">{formatFecha(detailModal.item.fecha_emision)}</p>
                </div>
              </div>
              {(detailModal.item.tributario || detailModal.item.comision_bancaria || detailModal.item.gasto_empresa) && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cálculo</p>
                  <div className="space-y-1 text-sm">
                    {detailModal.item.gasto_empresa ? <div className="flex justify-between"><span>Gasto Empresa (%)</span><span className="text-red-600">-{detailModal.item.gasto_empresa}%</span></div> : null}
                    {detailModal.item.comision_bancaria ? <div className="flex justify-between"><span>Comisión Bancaria (%)</span><span className="text-red-600">-{detailModal.item.comision_bancaria}%</span></div> : null}
                    {detailModal.item.devengado ? <div className="flex justify-between font-medium"><span>Devengado</span><span className="text-blue-600">{detailModal.item.devengado?.toLocaleString()}</span></div> : null}
                    {detailModal.item.tributario ? <div className="flex justify-between"><span>Tributario (%)</span><span className="text-red-600">-{detailModal.item.tributario}%</span></div> : null}
                  </div>
                </div>
              )}
              {detailModal.item.productos_en_liquidacion && detailModal.item.productos_en_liquidacion.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Productos</p>
                  <div className="divide-y divide-gray-100">
                    {detailModal.item.productos_en_liquidacion.map((pel: any) => (
                      <div key={pel.id_producto_en_liquidacion} className="py-2.5 flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{pel.producto?.nombre || `Producto ${pel.id_producto}`}</p>
                          <p className="text-xs text-gray-500">{pel.codigo} · {pel.cantidad} × {Number(pel.precio).toLocaleString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-gray-900">{(pel.cantidad * Number(pel.precio)).toLocaleString()}</p>
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">{pel.tipo_compra}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => detailModal.item && handleViewDocument(detailModal.item)}
                className="px-4 py-2 text-blue-700 bg-white border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Ver documento
              </button>
              <button 
                onClick={() => setPrintModal({ isOpen: true, liquidacion: detailModal.item, autorizado_por: '', cargo_autorizado: '', revisado_por: '' })} 
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {printModal.isOpen && printModal.liquidacion && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Printer className="h-6 w-6 text-gray-600" />
                <h3 className="text-xl font-bold text-gray-900">Imprimir Liquidación</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">Complete los datos para la impresión</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">Autorizado por</Label>
                <Input 
                  value={printModal.autorizado_por}
                  onChange={(e) => setPrintModal({ ...printModal, autorizado_por: e.target.value })}
                  placeholder="Nombre de quien autoriza"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Cargo del autorizado</Label>
                <Input 
                  value={printModal.cargo_autorizado}
                  onChange={(e) => setPrintModal({ ...printModal, cargo_autorizado: e.target.value })}
                  placeholder="Cargo del autorizado"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Revisado por</Label>
                <Input 
                  value={printModal.revisado_por}
                  onChange={(e) => setPrintModal({ ...printModal, revisado_por: e.target.value })}
                  placeholder="Nombre de quien revisa"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setPrintModal({ isOpen: false, liquidacion: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' })} 
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePrint} 
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {approveModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Aprobar Liquidación</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">¿Está seguro de aprobar esta liquidación?</p>
            </div>
            <div className="p-6 flex justify-end gap-3">
              <button
                onClick={() => setApproveModal({ isOpen: false, id_liquidacion: null })}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (approveModal.id_liquidacion) {
                    liquidacionService.aprobarLiquidacion(approveModal.id_liquidacion)
                      .then(() => {
                        toast.success('Liquidación aprobada correctamente');
                        refresh();
                      })
                      .catch((error: any) => toast.error(error.message || 'Error al aprobar liquidación'))
                      .finally(() => setApproveModal({ isOpen: false, id_liquidacion: null }));
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-medium flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
