import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Check,
  XCircle,
  Filter,
  Eye,
  DollarSign,
  FileText,
  ScrollText,
  Tag,
  Calendar,
  User,
  X,
  Printer
} from 'lucide-react';
import { 
  liquidacionService, 
  productosEnLiquidacionService,
  type Liquidacion, 
  type LiquidacionCreate,
  type ProductosEnLiquidacion 
} from '../../services/api';
import { clientesService, type Cliente } from '../../services/api';
import { anexosService, type Anexo } from '../../services/api';
import { monedaService, type Moneda } from '../../services/api';
import { authService } from '../../services/auth';

type TabType = 'todas' | 'pendientes' | 'liquidadas';

export function LiquidacionesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedorId = searchParams.get('proveedor');

  const [activeTab, setActiveTab] = useState<TabType>('todas');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<Liquidacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: Liquidacion | null }>({ isOpen: false, item: null });
  const [printModal, setPrintModal] = useState<{ isOpen: boolean; liquidacion: Liquidacion | null; autorizado_por: string; cargo_autorizado: string; revisado_por: string }>({ isOpen: false, liquidacion: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' });
  
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialProveedorId ? Number(initialProveedorId) : null);
  const [filtroAnexo, setFiltroAnexo] = useState<number | null>(null);
  
  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [formData, setFormData] = useState<LiquidacionCreate>({
    id_cliente: 0,
    id_convenio: undefined,
    id_anexo: undefined,
    id_moneda: 1,
    devengado: 0,
    tributario: 0,
    comision_bancaria: 0,
    gasto_empresa: 0,
    tipo_pago: 'TRANSFERENCIA',
    observaciones: '',
    producto_ids: []
  });

  const { data: liquidaciones = [], isLoading } = useQuery({
    queryKey: ['liquidaciones', activeTab, filtroCliente],
    queryFn: async () => {
      if (filtroCliente) {
        return liquidacionService.getLiquidacionesByCliente(filtroCliente);
      }
      if (activeTab === 'pendientes') {
        return liquidacionService.getLiquidacionesPendientes();
      } else if (activeTab === 'liquidadas') {
        return liquidacionService.getLiquidacionesLiquidadas();
      }
      return liquidacionService.getLiquidaciones();
    }
  });

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

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas()
  });

  const { data: productosPendientes = [] } = useQuery({
    queryKey: ['productos-pendientes', filtroCliente, filtroAnexo],
    queryFn: () => {
      if (!filtroCliente) return Promise.resolve([]);
      return liquidacionService.getProductosPendientesByCliente(filtroCliente, filtroAnexo || undefined);
    },
    enabled: !!filtroCliente
  });

  const createMutation = useMutation({
    mutationFn: (data: LiquidacionCreate) => liquidacionService.createLiquidacion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pendientes'] });
      toast.success('Liquidación creada correctamente');
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al crear liquidación');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => liquidacionService.deleteLiquidacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidación eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar liquidación');
    }
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      id_convenio: undefined,
      id_anexo: undefined,
      id_moneda: 1,
      devengado: 0,
      tributario: 0,
      comision_bancaria: 0,
      gasto_empresa: 0,
      tipo_pago: 'TRANSFERENCIA',
      observaciones: '',
      producto_ids: []
    });
    setFiltroCliente(null);
    setFiltroAnexo(null);
    setSelectedProductos([]);
  };

  const handleClienteChange = (clienteId: number) => {
    setFiltroCliente(clienteId);
    setFiltroAnexo(null);
    setFormData(prev => ({
      ...prev,
      id_cliente: clienteId,
      id_anexo: undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleAnexoChange = (anexoId: number | null) => {
    setFiltroAnexo(anexoId);
    setFormData(prev => ({
      ...prev,
      id_anexo: anexoId || undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleProductoSelect = (productoId: number) => {
    setSelectedProductos(prev => {
      if (prev.includes(productoId)) {
        return prev.filter(id => id !== productoId);
      }
      return [...prev, productoId];
    });
    setFormData(prev => ({
      ...prev,
      producto_ids: prev.producto_ids.includes(productoId)
        ? prev.producto_ids.filter(id => id !== productoId)
        : [...prev.producto_ids, productoId]
    }));
  };

  const handleSelectAll = () => {
    const allIds = productosPendientes.map((p: ProductosEnLiquidacion) => p.id_producto_en_liquidacion);
    setSelectedProductos(allIds);
    setFormData(prev => ({ ...prev, producto_ids: allIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData(prev => ({ ...prev, producto_ids: [] }));
  };

  const calculateImporte = () => {
    return productosPendientes
      .filter((p: ProductosEnLiquidacion) => selectedProductos.includes(p.id_producto_en_liquidacion))
      .reduce((sum: number, p: ProductosEnLiquidacion) => {
        return sum + (p.precio * p.cantidad);
      }, 0);
  };

  const calculateNetoPagar = () => {
    const importe = calculateImporte();
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    const tributario = Number(formData.tributario) || 0;
    
    const devengado = importe - (importe * gasto_empresa / 100) - (importe * comision / 100);
    const neto = devengado - (devengado * tributario / 100);
    return neto;
  };

  const calculateDevengado = () => {
    const importe = calculateImporte();
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    return importe - (importe * gasto_empresa / 100) - (importe * comision / 100);
  };

  const filteredLiquidaciones = liquidaciones.filter((l: Liquidacion) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return l.codigo?.toLowerCase().includes(search) || 
           l.cliente?.nombre?.toLowerCase().includes(search);
  });

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || 'N/A';
  };

  const getAnexoInfo = (anexoId: number) => {
    const anexo = anexos.find((a: Anexo) => a.id_anexo === anexoId);
    return anexo?.nombre_anexo || 'N/A';
  };

  const generateLiquidacionHTML = (liquidacion: Liquidacion, autorizadoPor: string, cargoAutorizado: string, revisadoPor: string) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === liquidacion.id_cliente);
    const user = authService.getUser();
    const confectionadoPor = user ? `${user.nombre || ''} ${user.primer_apellido || ''}`.trim() : '';
    
    const empresa = user?.dependencia;
    const empresaNombre = empresa?.nombre || 'Empresa';
    const empresaDireccion = empresa?.direccion || '';
    const empresaTelefono = empresa?.telefono || '';
    const empresaEmail = empresa?.email || '';
    
    const nombreProveedor = cliente?.nombre || 'N/A';
    const codigoProveedor = cliente?.numero_cliente || 'N/A';
    const cedulaProveedor = cliente?.cedula_rif || 'N/A';
    const direccionProveedor = cliente?.direccion || '';
    const provinciaProveedor = cliente?.provincia?.nombre || '';
    const municipioProveedor = cliente?.municipio?.nombre || '';
    const localidadProveedor = provinciaProveedor || municipioProveedor ? `${provinciaProveedor}, ${municipioProveedor}`.trim() : 'N/A';

    const isNatural = cliente?.tipo_persona === 'NATURAL';
    const isTCP = cliente?.tipo_persona === 'TCP';

    const tipoConvenio = liquidacion.convenio?.tipo_convenio?.nombre || '';
    const codigoConvenio = liquidacion.convenio?.codigo || '';
    const moneda = liquidacion.moneda?.nombre || '';

    const numeroAnexo = liquidacion.anexo?.numero_anexo || '';
    const infoConvenioFila = codigoConvenio 
      ? `<tr style="background:#f3f0e6;"><td colspan="5"><strong>CONVENIO: ${codigoConvenio}</strong></td></tr>` 
      : '';

    // Agrupar productos por id_anexo
    const productosPorAnexo: Record<number, any[]> = {};
    liquidacion.productos_en_liquidacion?.forEach((p: any) => {
      const idAnexo = p.id_anexo || 0;
      if (!productosPorAnexo[idAnexo]) {
        productosPorAnexo[idAnexo] = [];
      }
      productosPorAnexo[idAnexo].push(p);
    });

    // Generar filas con separadores y totales por anexo
    const productosRows = Object.entries(productosPorAnexo).map(([idAnexo, productos]) => {
      const nombreAnexo = productos[0]?.anexo?.nombre_anexo || `Anexo ${idAnexo}`;
      const totalAnexo = productos.reduce((sum, p) => sum + Number(p.precio * p.cantidad || 0), 0);
      const filasProductos = productos.map((p: any) => `
        <tr>
          <td>${p.codigo || 'N/A'}</td>
          <td>${p.producto?.nombre || 'Producto'}</td>
          <td class="cantidad">${p.cantidad || 0}</td>
          <td class="precio">${Number(p.precio || 0).toFixed(2)}</td>
          <td class="devengado-col">${Number(p.precio * p.cantidad || 0).toFixed(2)}</td>
        </tr>
      `).join('');
      
      return `
        <tr style="background:#f3f0e6; font-weight:bold;">
          <td colspan="5">ANEXO: ${nombreAnexo} - Total: ${totalAnexo.toFixed(2)}</td>
        </tr>
        ${filasProductos}
      `;
    }).join('');

    const subtotalDevengado = Number(liquidacion.devengado || 0).toFixed(2);
    const importeCaguayo = Number(liquidacion.importe_caguayo || (liquidacion.importe * (liquidacion.porcentaje_caguayo || 10) / 100)).toFixed(2);
    const valorTributario = Number(liquidacion.tributario_monto || (liquidacion.devengado * liquidacion.tributario / 100) || 0).toFixed(2);
    const subtotal = Number(liquidacion.devengado - (liquidacion.tributario_monto || liquidacion.devengado * liquidacion.tributario / 100) || 0).toFixed(2);
    const valorEmpresa = Number(liquidacion.gasto_empresa || 0).toFixed(2);
    const valorComision = Number(liquidacion.comision_bancaria || 0).toFixed(2);
    const netoCobrar = Number(liquidacion.neto_pagar || 0).toFixed(2);
    const devengadoTotal = Number(liquidacion.importe - (liquidacion.importe_caguayo || liquidacion.importe * (liquidacion.porcentaje_caguayo || 10) / 100) || 0).toFixed(2);

    const fechaEmision = liquidacion.fecha_emision ? new Date(liquidacion.fecha_emision).toLocaleDateString('es-ES') : 'N/A';
    const fechaLiquidacion = liquidacion.fecha_liquidacion ? new Date(liquidacion.fecha_liquidacion).toLocaleDateString('es-ES') : 'N/A';

    const notaDocumento = codigoConvenio || numeroAnexo 
      ? `Documento generado según Convenio No. ${codigoConvenio || '---'} - Anexo No. ${numeroAnexo || '---'} · Liquidación válida como comprobante de pago.`
      : 'Liquidación válida como comprobante de pago.';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Liquidación | ${liquidacion.codigo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
        .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1.8rem 2rem 2rem 2rem; border-radius: 4px; }
        .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.4; color: #111; }
        .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 1.2rem; padding-bottom: 0.6rem; gap: 20px; }
        .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
        .header-logo img { width: 180px; height: 180px; object-fit: contain; }
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
        .info-cliente { display: flex; flex-wrap: wrap; justify-content: space-between; background: #f9f9f0; padding: 12px; border: 1px solid #ccc; margin-bottom: 20px; font-size: 12.5px; }
        .cliente-header { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #1a5c1a; width: 100%; text-align: center; }
        .cliente-item { min-width: 180px; margin-bottom: 6px; }
        .cliente-item strong { font-weight: 800; }
        .tabla-wrapper { display: flex; gap: 20px; align-items: flex-start; margin: 18px 0 14px 0; }
        .tabla-productos { flex: 1; width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .tabla-productos th, .tabla-productos td { border: 1px solid #222; padding: 8px 6px; vertical-align: top; }
        .tabla-productos th { background-color: #eae7db; font-weight: 700; text-align: center; }
        .tabla-productos td { text-align: left; }
        .cantidad, .precio, .devengado-col { text-align: right; }
        .devengado-fila { font-weight: bold; background-color: #f4f1e6; }
        .resumen-derecha { display: flex; justify-content: flex-end; margin-top: 8px; margin-bottom: 20px; }
        .cuadro-totales { width: 280px; border: 1px solid #111; background: #fefcf5; padding: 12px 15px; font-size: 13px; font-family: monospace; }
        .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
        .devengado-total-row { font-weight: bold; border-top: 1px solid #333; margin-top: 6px; padding-top: 4px; }
        .firmas { display: flex; flex-direction: column; gap: 20px; margin-top: 32px; margin-bottom: 16px; }
        .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
        .bloque-firma { flex: 1; border-top: 1px dotted #222; padding-top: 8px; font-size: 11px; text-align: left; }
        .bloque-firma p { margin: 2px 0; }
        .cargo { font-size: 10px; color: #2c2c2c; }
        .nota-revisado { margin-top: 18px; font-size: 10px; text-align: right; border-top: 1px solid #ddd; padding-top: 8px; font-style: italic; }
        @media (max-width: 650px) { .documento { padding: 1rem; } .tabla-productos th, .tabla-productos td { padding: 5px 3px; font-size: 11px; } .cuadro-totales { width: 100%; } .firmas { flex-direction: column; gap: 20px; } .fila-firmas { flex-direction: column; gap: 20px; } .info-cliente { flex-direction: column; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 15px; } .tabla-wrapper { flex-direction: column; } }
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
            <div class="header-box-title">Liquidación</div>
            <div class="header-box-row"><strong>Concepto:</strong> ${tipoConvenio || 'N/A'}</div>
            <div class="header-box-row"><strong>Número:</strong> ${codigoConvenio || 'N/A'}</div>
            <div class="header-box-row"><strong>Moneda:</strong> ${moneda || 'N/A'}</div>
        </div>
    </div>

    <div class="fila-fechas">
        <span class="bloque-fecha"><strong>Fecha Emisión:</strong> ${fechaEmision}</span>
        <span class="bloque-fecha"><strong>Fecha Liquidación:</strong> ${fechaLiquidacion}</span>
    </div>

    <div class="info-cliente">
        <div class="cliente-header">Cliente</div>
        <div class="cliente-item"><strong>Nombre:</strong> ${nombreProveedor}</div>
        <div class="cliente-item"><strong>Código:</strong> ${codigoProveedor}</div>
        <div class="cliente-item"><strong>Cuenta:</strong> Localidad: ${localidadProveedor}</div>
        <div class="cliente-item"><strong>Cl.:</strong> ${cedulaProveedor}</div>
        <div class="cliente-item"><strong>Registro:</strong> ${isNatural || isTCP ? '1' : 'N/A'}</div>
        <div class="cliente-item"></div>
    </div>

    <div style="margin: 8px 0 6px 0; font-weight: bold; font-size: 14px;">Pago por la compra de los siguientes productos:</div>

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
                ${infoConvenioFila}
                ${productosRows}
                <tr class="devengado-fila">
                    <td colspan="4" style="text-align: right;">Devengado</td>
                    <td class="devengado-col">${subtotalDevengado}</td>
                </tr>
            </tbody>
        </table>

        <div class="cuadro-totales">
            <div class="linea-total"><span>IMPORTE:</span><span>${Number(liquidacion.importe || 0).toFixed(2)}</span></div>
            <div class="linea-total" style="color: #666;"><span>&nbsp;&nbsp;(-) Importe Caguayo(${Number(liquidacion.porcentaje_caguayo || 10)}%):</span><span>-${importeCaguayo}</span></div>
            <div class="linea-total" style="font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px;"><span>DEVENGADO:</span><span>${subtotalDevengado}</span></div>
            <div class="linea-total" style="color: #666;"><span>&nbsp;&nbsp;(-) Tributario(${Number(liquidacion.tributario || 5)}%):</span><span>-${valorTributario}</span></div>
            <div class="linea-total" style="font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px;"><span>SUBTOTAL:</span><span>${subtotal}</span></div>
            <div class="linea-total" style="color: #666;"><span>&nbsp;&nbsp;(-) Gasto Empresa:</span><span>-${valorEmpresa}</span></div>
            <div class="linea-total" style="color: #666;"><span>&nbsp;&nbsp;(-) Comisión:</span><span>-${valorComision}</span></div>
            <div class="linea-total total-final"><span>NETO A COBRAR:</span><span>${netoCobrar}</span></div>
            <div class="devengado-total-row linea-total" style="margin-top: 12px;"><span><strong>DEVENGADO TOTAL</strong></span><span><strong>${devengadoTotal}</strong></span></div>
        </div>
    </div>

    <div class="firmas">
        <div class="fila-firmas">
            <div class="bloque-firma">
                <p><strong>Confeccionado por:</strong></p>
                <p>${confectionadoPor}</p>
                <p class="cargo">Cargo: </p>
            </div>
            <div class="bloque-firma">
                <p><strong>Autorizado por:</strong></p>
                <p>${autorizadoPor || '___'}</p>
                <p class="cargo">Cargo: ${cargoAutorizado || '_________________'}</p>
            </div>
        </div>
        <div class="fila-firmas">
            <div class="bloque-firma">
                <p><strong>Artista:</strong></p>
                <p>${nombreProveedor}</p>
            </div>
            <div class="bloque-firma">
                <p><strong>Revisado por:</strong></p>
                <p>${revisadoPor || '___'}</p>
            </div>
        </div>
    </div>

    <div class="nota-revisado">
        ${notaDocumento}
    </div>
</div>
</body>
</html>`;
  };

  const handlePrint = () => {
    if (!printModal.liquidacion) return;
    const html = generateLiquidacionHTML(printModal.liquidacion, printModal.autorizado_por, printModal.cargo_autorizado || '', printModal.revisado_por);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    setPrintModal({ isOpen: false, liquidacion: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' });
  };

  const handleViewDocument = (liquidacion: Liquidacion) => {
    const html = generateLiquidacionHTML(liquidacion, '', '', '');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const clienteAnexos = productosPendientes
    .filter((p: any) => p.id_anexo)
    .reduce((unique: any[], p: any) => {
      if (!unique.find((a: any) => a.id_anexo === p.id_anexo)) {
        unique.push({ id_anexo: p.id_anexo, nombre_anexo: p.nombre_anexo });
      }
      return unique;
    }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl shadow-lg animate-bounce-subtle">
            <ScrollText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
            <p className="text-gray-500 mt-1">Gestión de liquidaciones a proveedores</p>
          </div>
        </div>
        <Button
          onClick={() => {
            const url = filtroCliente 
              ? `/compra/liquidaciones/crear?proveedor=${filtroCliente}`
              : '/compra/liquidaciones/crear';
            navigate(url);
          }}
          className="gap-2 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
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
                ? 'text-lime-600 border-b-2 border-lime-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar liquidaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-lime-50 to-green-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-lime-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-lime-600" />
                    Proveedor
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-lime-600" />
                    Anexo
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-lime-600" />
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">Cargando...</TableCell>
                </TableRow>
              ) : filteredLiquidaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">No hay liquidaciones</TableCell>
                </TableRow>
              ) : (
                filteredLiquidaciones.map((liquidacion: Liquidacion) => (
                  <TableRow key={liquidacion.id_liquidacion} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item: liquidacion })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-lime-50 text-lime-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {liquidacion.codigo}
                      </span>
                    </TableCell>
                    <TableCell>{getClienteNombre(liquidacion.id_cliente)}</TableCell>
                    <TableCell className="text-gray-500">{liquidacion.id_anexo ? getAnexoInfo(liquidacion.id_anexo) : '-'}</TableCell>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle>Nueva Liquidación</CardTitle>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="ml-auto text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label>Proveedor *</Label>
                  {filtroCliente ? (
                    <div className="w-full p-2 border rounded bg-gray-50 text-gray-700 font-medium">
                      {clientes.find((c: Cliente) => c.id_cliente === filtroCliente)?.nombre || 'Proveedor'}
                    </div>
                  ) : (
                    <select
                      value={filtroCliente || ''}
                      onChange={(e) => handleClienteChange(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {clientes.map((cliente: Cliente) => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                          {cliente.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <Label>Anexo</Label>
                  <select
                    value={filtroAnexo || ''}
                    onChange={(e) => handleAnexoChange(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 border rounded"
                    disabled={!filtroCliente}
                  >
                    <option value="">Todos los anexos</option>
                    {clienteAnexos.map((anexo: Anexo) => (
                      <option key={anexo.id_anexo} value={anexo.id_anexo}>
                        {anexo.nombre_anexo}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.id_moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_moneda: Number(e.target.value) }))}
                    className="w-full p-2 border rounded"
                  >
                    {monedas.map((moneda: Moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Tipo de Pago</Label>
                  <select
                    value={formData.tipo_pago}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_pago: e.target.value }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {filtroCliente && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-700">Productos Pendientes</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Deseleccionar todos
                      </button>
                    </div>
                  </div>
                  
                  {productosPendientes.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No hay productos pendientes para este proveedor</p>
                  ) : (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left"></th>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-right">A Liquidar</th>
                            <th className="px-3 py-2 text-right">Por Liquidar</th>
                            <th className="px-3 py-2 text-right">Precio Venta</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productosPendientes.map((prod: ProductosEnLiquidacion) => (
                            <tr key={prod.id_producto_en_liquidacion} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedProductos.includes(prod.id_producto_en_liquidacion)}
                                  onChange={() => handleProductoSelect(prod.id_producto_en_liquidacion)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-3 py-2">{prod.codigo}</td>
                              <td className="px-3 py-2">{prod.producto_nombre || prod.producto?.nombre || `Producto ${prod.id_producto}`}</td>
                              <td className="px-3 py-2 text-right">{prod.cantidad}</td>
                              <td className="px-3 py-2 text-right">
                                {((prod.cantidad_original || 0) - (prod.cantidad_liquidada || 0)) > 0 
                                  ? (prod.cantidad_original || 0) - (prod.cantidad_liquidada || 0) 
                                  : 0}
                              </td>
                              <td className="px-3 py-2 text-right">{prod.precio?.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {(prod.precio * prod.cantidad).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div>
                  <Label>Tributario (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tributario}
                    onChange={(e) => setFormData(prev => ({ ...prev, tributario: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Comisión Bancaria (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.comision_bancaria}
                    onChange={(e) => setFormData(prev => ({ ...prev, comision_bancaria: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Gasto Empresa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.gasto_empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, gasto_empresa: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                {/* Sección 1: Devengado */}
                <div className="mb-4 pb-4 border-b border-gray-300">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculo del Devengado</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Importe Total:</span>
                      <span className="font-medium">{calculateImporte().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Gasto Empresa ({Number(formData.gasto_empresa || 0)}%):</span>
                      <span>- {(calculateImporte() * (Number(formData.gasto_empresa) || 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Comisión ({Number(formData.comision_bancaria || 0)}%):</span>
                      <span>- {(calculateImporte() * (Number(formData.comision_bancaria) || 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Devengado:</span>
                      <span className="font-bold text-blue-600 text-lg">{calculateDevengado().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Neto a Pagar */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculo del Neto a Pagar</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Devengado:</span>
                      <span className="font-medium">{calculateDevengado().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Tributario ({Number(formData.tributario || 0)}%):</span>
                      <span>- {(calculateDevengado() * (Number(formData.tributario) || 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Neto a Pagar:</span>
                      <span className="font-bold text-green-600 text-xl">{calculateNetoPagar().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Observaciones</Label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border rounded resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!formData.id_cliente || selectedProductos.length === 0) {
                    toast.error('Seleccione un proveedor y al menos un producto');
                    return;
                  }
                  createMutation.mutate({
                    ...formData,
                    id_cliente: filtroCliente!
                  });
                }}
                disabled={createMutation.isPending || selectedProductos.length === 0}
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Liquidación'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedLiquidacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Detalle de Liquidación</h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedLiquidacion(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
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
                  <p className="font-medium">{getClienteNombre(selectedLiquidacion.id_cliente)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Anexo</p>
                  <p className="font-medium">{selectedLiquidacion.id_anexo ? getAnexoInfo(selectedLiquidacion.id_anexo) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Emisión</p>
                  <p className="font-medium">{new Date(selectedLiquidacion.fecha_emision).toLocaleDateString()}</p>
                </div>
                {selectedLiquidacion.fecha_liquidacion && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha Liquidación</p>
                    <p className="font-medium">{new Date(selectedLiquidacion.fecha_liquidacion).toLocaleDateString()}</p>
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
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-lime-50 to-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg">
                    <ScrollText className="h-7 w-7" />
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
                  <p className="font-bold text-gray-900">{getClienteNombre(detailModal.item.id_cliente)}</p>
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
                  <p className="font-bold text-gray-900">{new Date(detailModal.item.fecha_emision).toLocaleDateString()}</p>
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
    </div>
  );
}
