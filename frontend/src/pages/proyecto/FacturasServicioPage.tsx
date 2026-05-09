import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { facturasServicioService, etapasProyectoService, monedaService, solicitudesService, tareasEtapaService, dependenciasService, cuentasService, clientesService } from '../../services/api';
import type { FacturaServicio, FacturaServicioCreate, FacturaServicioUpdate, Etapa, TareaEtapa, SolicitudServicio } from '../../types/servicio';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Receipt, X, Eye, DollarSign, Hash, Calendar, FileText, Check, ChevronDown, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';

type View = 'list' | 'form';

function SearchSelect({
  label,
  placeholder,
  items,
  selectedId,
  getLabel,
  getId,
  onSelect,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  items: any[];
  selectedId: number | null;
  getLabel: (item: any) => string;
  getId: (item: any) => number;
  onSelect: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? items.filter(i => getLabel(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  const selectedItem = selectedId ? items.find(i => getId(i) === selectedId) : null;

  return (
    <div className="relative" ref={ref}>
      <Label className="text-sm font-medium">{label}</Label>
      {selectedItem ? (
        <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
          <span className="flex-1 text-sm text-teal-800 font-medium truncate">{getLabel(selectedItem)}</span>
          <button onClick={() => { onSelect(null); setSearch(''); }} className="p-0.5 hover:bg-teal-200 rounded">
            <X className="h-3.5 w-3.5 text-teal-600" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            className="w-full mt-1 pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white"
            placeholder={placeholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
        </div>
      )}
      {open && !selectedItem && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 20).map(item => (
            <button
              key={getId(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 flex items-center gap-2"
              onClick={() => { onSelect(getId(item)); setSearch(''); setOpen(false); }}
            >
              <span className="truncate">{getLabel(item)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FacturasServicioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get('etapa');
  const solicitudParam = searchParams.get('solicitud');
  const [view, setView] = useState<View>('list');

  const [facturas, setFacturas] = useState<FacturaServicio[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);

  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(solicitudParam ? Number(solicitudParam) : null);
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | null>(etapaParam ? Number(etapaParam) : null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<number | null>(etapaParam ? Number(etapaParam) : null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: FacturaServicio | null }>({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  

  const [cuentasDependencia, setCuentasDependencia] = useState<any[]>([]);
  const user = authService.getUser();
  const dependenciaId = user?.dependencia?.id_dependencia;

  useEffect(() => {
    if (dependenciaId) {
      dependenciasService.getCuentasByDependencia(dependenciaId)
        .then(setCuentasDependencia)
        .catch(() => setCuentasDependencia([]));
    }
  }, [dependenciaId]);

  

  const { data: clientesData = [] } = useQuery({
    queryKey: ['clientes-all'],
    queryFn: () => clientesService.getClientes(0, 10000)
  });

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (solicitudParam) {
      loadEtapasBySolicitud(Number(solicitudParam));
    }
  }, [solicitudParam]);

  const loadInitialData = async () => {
    try {
      const [monedasRes, solicitudesRes, etapasRes] = await Promise.all([
        monedaService.getMonedas(0, 100),
        solicitudesService.getSolicitudes(0, 1000),
        etapasProyectoService.getAllEtapas()
      ]);
      setMonedas(monedasRes);
      setSolicitudes(solicitudesRes);
      setEtapas(etapasRes);
      if (etapaParam) {
        const etapaData = await etapasProyectoService.getEtapa(Number(etapaParam));
        setCurrentEtapa(etapaData);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadEtapasBySolicitud = async (solicitudId: number) => {
    try {
      const etapasData = await etapasProyectoService.getEtapasBySolicitud(solicitudId);
      setEtapas(etapasData);
    } catch (error) { console.error('Error:', error); setEtapas([]); }
  };

  const loadFacturas = async () => {
    try {
      if (filtroEtapa) {
        const data = await facturasServicioService.getFacturasByEtapa(filtroEtapa);
        setFacturas(data);
      } else if (solicitudParam) {
        const etapasData = await etapasProyectoService.getEtapasBySolicitud(Number(solicitudParam));
        const etapaIds = etapasData.map((e: Etapa) => e.id_etapa).filter(Boolean);
        const todasLasFacturas = await facturasServicioService.getFacturasServicio(0, 1000);
        const filtradas = todasLasFacturas.filter((f: FacturaServicio) => f.id_etapa && etapaIds.includes(f.id_etapa));
        setFacturas(filtradas);
      } else {
        const data = await facturasServicioService.getFacturasServicio(0, 1000);
        setFacturas(data);
      }
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list') loadFacturas(); }, [view, filtroEtapa, solicitudParam]);

  const handleSave = async () => {
    try {
      if (editingId) {
        const data: FacturaServicioUpdate = {
          id_etapa: formData.id_etapa ? Number(formData.id_etapa) : undefined,
          alcance: formData.alcance,
          codigo_factura: formData.codigo_factura,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          precio: formData.precio ? Number(formData.precio) : undefined,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined
        };
        await facturasServicioService.updateFacturaServicio(editingId, data);
      } else {
        const data: FacturaServicioCreate = {
          id_etapa: selectedEtapaId || (etapaParam ? Number(etapaParam) : undefined),
          alcance: formData.alcance || 'TOTAL',
          codigo_factura: formData.codigo_factura,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          descripcion: formData.descripcion,
          cantidad: formData.cantidad ? Number(formData.cantidad) : 1,
          precio: formData.precio ? Number(formData.precio) : 0,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined
        };
        await facturasServicioService.createFacturaServicio(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, codigo: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar factura?',
      message: `¿Está seguro de eliminar la factura "${codigo || 'Sin código'}"?`,
      onConfirm: async () => {
        try {
          await facturasServicioService.deleteFacturaServicio(id);
          toast.success('Eliminado');
          loadFacturas();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
    if (!etapaParam) {
      setSelectedSolicitudId(null);
      setSelectedEtapaId(null);
    }
  };

  const openForm = (item?: FacturaServicio) => {
    if (item) {
      setEditingId(item.id_factura_servicio);
      setFormData({
        alcance: item.alcance,
        codigo_factura: item.codigo_factura,
        id_moneda: item.id_moneda,
        fecha: item.fecha,
        descripcion: item.descripcion,
        precio: item.precio,
        observaciones: item.observaciones,
        cuenta_factura: item.cuenta_factura || ''
      });
      if (item.id_etapa) setSelectedEtapaId(item.id_etapa);
    } else {
      resetForm();
      if (etapaParam) {
        setSelectedEtapaId(Number(etapaParam));
        if (currentEtapa) {
          setFormData(prev => ({
            ...prev,
            id_moneda: currentEtapa.id_moneda,
            descripcion: currentEtapa.descripcion || ''
          }));
        }
      }
    }
    setView('form');
  };

  const handleSelectSolicitud = (id: number | null) => {
    setSelectedSolicitudId(id);
    setSelectedEtapaId(null);
    if (id) loadEtapasBySolicitud(id);
  };

  const handleSelectEtapa = (id: number | null) => {
    setSelectedEtapaId(id);
  };

  const filteredFacturas = useMemo(() => {
    if (!searchTerm) return facturas;
    const term = searchTerm.toLowerCase();
    return facturas.filter(f =>
      f.codigo_factura?.toLowerCase().includes(term)
    );
  }, [facturas, searchTerm]);

  const getMonedaSymbol = (id?: number) => {
    if (!id) return '';
    const m = monedas.find(mo => mo.id_moneda === id);
    return m?.simbolo || '';
  };

  const getEtapaName = (id?: number) => {
    if (!id) return 'N/A';
    const e = etapas.find(et => et.id_etapa === id);
    return e?.nombre_etapa || `Etapa #${e?.numero_etapa || 'N/A'}`;
  };

  const getFacturaServicioDocument = (
    factura: FacturaServicio,
    etapasData: Etapa[],
    tareasData: TareaEtapa[],
    solicitudesData: SolicitudServicio[],
    autorizadoPor: string,
    revisadoPor: string,
    cuentaSeleccionada: any,
    clientesData: Cliente[] = [],
    cuentasClientesData: any[] = [],
    monedasData: Moneda[] = []
  ) => {
    console.log('DEBUG getFacturaServicioDocument INPUT:', { factura, etapasData, solicitudesData, clientesData });
    
    const etapa = etapasData.find(e => e.id_etapa === factura.id_etapa);
    console.log('DEBUG etapa:', etapa);
    const solicitud = solicitudesData.find(s => s.id_solicitud_servicio === etapa?.id_solicitud_servicio);
    console.log('DEBUG solicitud:', solicitud);
    const moneda = monedas.find(m => m.id_moneda === factura.id_moneda);
    
    const user = authService.getUser();
    const elaboradoPor = user ? `${user.nombre || ''} ${user.primer_apellido || ''}`.trim() : '';
    const cargoUsuario = user?.cargo || '';
    
    const empresa = user?.dependencia;
    const empresaNombre = empresa?.nombre || 'CAGUAYO S.A.';
    const empresaDireccion = empresa?.direccion || '';
    const empresaTelefono = empresa?.telefono || '';
    const empresaWeb = empresa?.web || '';
    const empresaEmail = empresa?.email || '';
    
    // Datos del cliente
    const clienteId = solicitud?.id_cliente;
    console.log('DEBUG clienteId:', clienteId);
    const cliente = clientesData.find(c => Number(c.id_cliente) === Number(clienteId));
    console.log('DEBUG cliente:', cliente);
    const codigoProyecto = solicitud?.codigo_proyecto || 'N/A';
    const nombreCliente = cliente?.nombre || 'N/A';
    const codigoCliente = cliente?.numero_cliente || 'N/A';
    const provinciaCliente = cliente?.provincia?.nombre || 'N/A';
    const municipioCliente = cliente?.municipio?.nombre || 'N/A';
    const direccionCliente = cliente?.direccion || 'N/A';
    
    // Cuentas del cliente
    const cuentaCliente = cuentasClientesData && cuentasClientesData.length > 0 ? cuentasClientesData[0] : null;
    
    const nombreEtapa = etapa?.nombre_etapa || `Etapa #${etapa?.numero_etapa || 'N/A'}`;
    const codigoSolicitud = solicitud?.codigo_solicitud || 'N/A';
    const nombreMoneda = moneda?.nombre || '';
    const simboloMoneda = moneda?.simbolo || '';
    
    const tareasEtapa = tareasData.filter(t => t.id_etapa === factura.id_etapa);
    const tareasRows = tareasEtapa.map((tarea) => {
      const importe = Number(tarea.cantidad || 0) * Number(tarea.precio_ajustado || 0);
      return `
        <tr>
          <td>${tarea.concepto_modificado || 'N/A'}</td>
          <td>${tarea.unidad_medida || '-'}</td>
          <td class="cantidad">${tarea.cantidad || 0}</td>
          <td class="precio">${Number(tarea.precio_ajustado || 0).toFixed(2)}</td>
          <td class="importe">${importe.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    
    const subtotalTareas = tareasEtapa.reduce((sum, t) => sum + (Number(t.cantidad || 0) * Number(t.precio_ajustado || 0)), 0);
    const montoFactura = Number(factura.monto || 0);
    
    const fechaEmision = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : 'N/A';
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>Factura de Servicio | ${factura.codigo_factura || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
    .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.4; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 0.6rem; padding-bottom: 0.4rem; gap: 15px; }
    .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
    .header-logo img { width: 200px; height: 200px; object-fit: contain; filter: grayscale(100%) brightness(0); }
    .header-center { text-align: center; flex: 1; }
    .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: black; }
    .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.35; }
    .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .web { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .email { font-size: 12px; color: black; }
    .header-box { border: 2px solid black; background: white; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
    .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: black; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
    .header-box-row { font-size: 11px; margin-bottom: 3px; }
    .header-box-row strong { font-weight: 700; }
    .fila-fechas { display: flex; justify-content: space-between; margin: 18px 0 12px 0; border-bottom: 1px dashed #aaa; padding-bottom: 12px; }
    .bloque-fecha { font-weight: 600; font-size: 13px; }
    .info-pago { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .pago-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .pago-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .pago-izquierda, .pago-derecha { display: flex; flex-direction: column; gap: 4px; }
    .info-cliente { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .cliente-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .cliente-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .cliente-izquierda, .cliente-derecha { display: flex; flex-direction: column; gap: 4px; }
    .tabla-tareas { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .tabla-tareas th, .tabla-tareas td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-tareas th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .tabla-tareas td:nth-child(1) { width: 5%; text-align: center; }
    .tabla-tareas td:nth-child(2) { width: 45%; }
    .tabla-tareas td:nth-child(3) { width: 10%; text-align: center; }
    .tabla-tareas td:nth-child(4) { width: 10%; text-align: right; }
    .tabla-tareas td:nth-child(5) { width: 15%; text-align: right; }
    .tabla-tareas td:nth-child(6) { width: 15%; text-align: right; }
    .totales { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .cuadro-totales { width: 280px; border: 1px solid black; background: white; padding: 12px 15px; font-size: 13px; font-family: monospace; }
    .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
    .firmas { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; margin-bottom: 12px; }
    .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
    .bloque-firma { flex: 1; border-top: none; padding-top: 8px; font-size: 11px; text-align: left; }
    .bloque-firma p { margin: 2px 0; }
    .cargo { font-size: 10px; color: black; }
    @media (max-width: 650px) { .documento { padding: 0.6rem; } .tabla-tareas th, .tabla-tareas td { padding: 3px 2px; font-size: 10px; } .firmas { flex-direction: column; gap: 6px; } .fila-firmas { flex-direction: column; gap: 10px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 10px; } }
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
        ${empresaWeb ? `<div class="web">Web: ${empresaWeb}</div>` : ''}
        ${empresaEmail ? `<div class="email">${empresaEmail}</div>` : ''}
      </div>
      <div class="header-box">
        <div class="header-box-title">Factura de Servicio</div>
        <div class="header-box-row"><strong>No.:</strong> ${factura.codigo_factura || 'N/A'}</div>
        <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
        <div class="header-box-row"><strong>Moneda:</strong> ${nombreMoneda || 'N/A'}</div>
      </div>
    </div>

    <div class="fila-fechas">
      <span class="bloque-fecha"><strong>Fecha Emisión:</strong> ${fechaEmision}</span>
    </div>

    ${cuentaSeleccionada ? `
    <div class="info-pago">
      <div class="pago-titulo">PAGUESE A: ${empresaNombre}</div>
      <div class="pago-grid">
        <div class="pago-izquierda">
          <div><strong>CUENTA:</strong> ${monedasData.find(m => m.id_moneda === cuentaSeleccionada.id_moneda)?.simbolo || 'N/A'}</div>
          <div><strong>Cuenta:</strong> ${cuentaSeleccionada.numero_cuenta || 'N/A'}</div>
          <div><strong>Sucursal:</strong> ${cuentaSeleccionada.sucursal || 'N/A'}</div>
        </div>
        <div class="pago-derecha">
          <div><strong>Banco:</strong> ${cuentaSeleccionada.banco || 'N/A'}</div>
          <div><strong>Titular:</strong> ${cuentaSeleccionada.titular || 'N/A'}</div>
          <div><strong>Dirección:</strong> ${cuentaSeleccionada.direccion || 'N/A'}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="info-cliente">
      <div class="cliente-titulo">PROYECTO ${codigoProyecto} con el cliente</div>
      <div class="cliente-grid">
        <div class="cliente-izquierda">
          <div><strong>Nombre:</strong> ${nombreCliente}</div>
          <div><strong>Código:</strong> ${codigoCliente}</div>
          <div><strong>NIT:</strong> ${cliente?.cedula_rif || ''}</div>
          ${cuentaCliente ? `
          <div><strong>CUENTA:</strong> ${monedasData.find(m => m.id_moneda === cuentaCliente.id_moneda)?.simbolo || 'N/A'}</div>
          <div><strong>Cuenta:</strong> ${cuentaCliente.numero_cuenta || 'N/A'}</div>
          <div><strong>Sucursal:</strong> ${cuentaCliente.sucursal || 'N/A'}</div>
          ` : ''}
        </div>
        <div class="cliente-derecha">
          <div><strong>Provincia:</strong> ${provinciaCliente}</div>
          <div><strong>Municipio:</strong> ${municipioCliente}</div>
          <div><strong>Dirección:</strong> ${direccionCliente}</div>
          ${cuentaCliente ? `
          <div><strong>Banco:</strong> ${cuentaCliente.banco || 'N/A'}</div>
          <div><strong>Titular:</strong> ${cuentaCliente.titular || 'N/A'}</div>
          ` : ''}
        </div>
      </div>
    </div>

    <div style="margin: 8px 0 6px 0; font-weight: bold; font-size: 14px;">${nombreEtapa}</div>

    <table class="tabla-tareas">
      <thead>
        <tr>
          <th>Descripción/Tarea</th>
          <th>Und</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        ${tareasRows || '<tr><td colspan="5" style="text-align:center;">Sin tareas registradas</td></tr>'}
      </tbody>
    </table>

    <div class="totales">
      <div class="cuadro-totales">
        <div class="linea-total total-final"><span>Total:</span><span>${simboloMoneda} ${subtotalTareas.toFixed(2)}</span></div>
      </div>
    </div>

    <div class="firmas">
      <div class="fila-firmas">
        <div class="bloque-firma">
          <p><strong>Confeccionado por:</strong></p>
          <p>${elaboradoPor}</p>
          <p class="cargo">${cargoUsuario}</p>
          <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
          <p style="margin-top: 8px;">Firma</p>
        </div>
        <div class="bloque-firma">
          <p><strong>Recibido por:</strong></p>
          <p><strong>Nombre:</strong> </p>
          <p><strong>Cargo:</strong> </p>
          <p><strong>Fecha:</strong> </p>
          <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
          <p style="margin-top: 8px;">Firma</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintDirect = async (factura: FacturaServicio) => {
    // Obtener las cuentas del cliente de la factura
    const etapaFactura = etapas.find(e => e.id_etapa === factura.id_etapa);
    const solicitudFactura = solicitudes.find(s => s.id_solicitud_servicio === etapaFactura?.id_solicitud_servicio);
    const clienteId = solicitudFactura?.id_cliente;
    
    let cuentasCliente = [];
    if (clienteId) {
      try {
        cuentasCliente = await cuentasService.getCuentasByClienteAll(clienteId);
      } catch (e) {
        console.error('Error loading cliente cuentas:', e);
      }
    }
    
    // Cargar las tareas de la etapa de la factura
    let tareasEtapa = [];
    if (factura.id_etapa) {
      try {
        tareasEtapa = await tareasEtapaService.getTareasByEtapa(factura.id_etapa);
      } catch (e) {
        console.error('Error loading tareas:', e);
      }
    }
    
    const cuentaFactura = factura.cuenta_factura ? cuentasDependencia.find(c => c.numero_cuenta === factura.cuenta_factura) : null;
    const cuentaSel = cuentaFactura || cuentasDependencia[0] || null;
    const html = getFacturaServicioDocument(
      factura,
      etapas,
      tareasEtapa,
      solicitudes,
      '',
      '',
      cuentaSel || null,
      clientesData,
      cuentasCliente,
      monedas
    );
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleViewDocument = async (factura: FacturaServicio) => {
    // Obtener las cuentas del cliente de la factura
    const etapaFactura = etapas.find(e => e.id_etapa === factura.id_etapa);
    const solicitudFactura = solicitudes.find(s => s.id_solicitud_servicio === etapaFactura?.id_solicitud_servicio);
    const clienteId = solicitudFactura?.id_cliente;
    
    let cuentasCliente = [];
    if (clienteId) {
      try {
        cuentasCliente = await cuentasService.getCuentasByClienteAll(clienteId);
      } catch (e) {
        console.error('Error loading cliente cuentas:', e);
      }
    }
    
    // Cargar las tareas de la etapa de la factura
    let tareasEtapa = [];
    if (factura.id_etapa) {
      try {
        tareasEtapa = await tareasEtapaService.getTareasByEtapa(factura.id_etapa);
      } catch (e) {
        console.error('Error loading tareas:', e);
      }
    }
    
    const cuentaFacturaPreview = factura.cuenta_factura ? cuentasDependencia.find(c => c.numero_cuenta === factura.cuenta_factura) : null;
    const cuentaDefault = cuentaFacturaPreview || cuentasDependencia[0] || null;
    
    console.log('DEBUG handleViewDocument:', {
      factura,
      etapas,
      solicitudes,
      clientesData,
      cuentaDefault
    });
    
    const html = getFacturaServicioDocument(factura, etapas, tareasEtapa, solicitudes, '', '', cuentaDefault, clientesData, cuentasCliente, monedas);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {etapaParam && (
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas de Servicio</h1>
            <p className="text-gray-500 mt-1">
              {currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Gestión de facturas de servicio'}
              {` · ${filteredFacturas.length} factura(s)`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-teal-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Monto
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Fecha
                  </div>
                </TableHead>
                <TableHead>Pagos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron facturas que coincidan con la búsqueda' : 'No hay facturas registradas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacturas.map((item) => (
                  <TableRow key={item.id_factura_servicio} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Hash className="h-3 w-3" />
                        {item.codigo_factura || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.alcance === 'TOTAL' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {item.alcance || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {getMonedaSymbol(item.id_moneda)} {Number(item.monto || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {item.fecha || 'N/A'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/proyectos/pagos-factura-servicio?factura=${item.id_factura_servicio}`)}
                        className="gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Pagos
                      </Button>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDocument(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintDirect(item)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 h-8 w-8"
                          title="Imprimir"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id_factura_servicio, item.codigo_factura || '')}
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
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Factura' : 'Nueva Factura'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos de la factura de servicio</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { setView('list'); resetForm(); }} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-teal-600" />
            Información de la Factura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!etapaParam && (
              <>
                <SearchSelect
                  label="Solicitud de Servicio"
                  placeholder="Buscar solicitud..."
                  items={solicitudes}
                  selectedId={selectedSolicitudId}
                  getLabel={(s) => s.codigo_solicitud || `Solicitud #${s.id_solicitud_servicio}`}
                  getId={(s) => s.id_solicitud_servicio}
                  onSelect={handleSelectSolicitud}
                />
                <SearchSelect
                  label="Etapa"
                  placeholder={selectedSolicitudId ? 'Buscar etapa...' : 'Primero seleccione una solicitud'}
                  items={etapas}
                  selectedId={selectedEtapaId}
                  getLabel={(e) => e.nombre_etapa || `Etapa #${e.numero_etapa}`}
                  getId={(e) => e.id_etapa}
                  onSelect={handleSelectEtapa}
                  disabled={!selectedSolicitudId}
                />
              </>
            )}
            <div>
              <Label className="text-sm font-medium">Alcance</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.alcance || 'TOTAL'} onChange={(e: any) => setFormData({ ...formData, alcance: e.target.value })}>
                <option value="TOTAL">TOTAL</option>
                <option value="PARCIAL">PARCIAL</option>
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Cuenta</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.cuenta_factura || ''} onChange={(e: any) => {
                const selectedCuenta = cuentasDependencia.find(c => c.numero_cuenta === e.target.value);
                setFormData({ 
                  ...formData, 
                  cuenta_factura: e.target.value,
                  id_moneda: selectedCuenta?.id_moneda || null
                });
              }}>
                <option value="">Seleccionar cuenta</option>
                {cuentasDependencia.map(c => <option key={c.id_cuenta} value={c.numero_cuenta}>{c.numero_cuenta} - {c.banco} ({monedas.find(m => m.id_moneda === c.id_moneda)?.simbolo || 'N/A'})</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({ ...formData, fecha: e.target.value })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({ ...formData, descripcion: e.target.value })} className="mt-1" placeholder="Descripción de la factura" />
            </div>
            <div>
              <Label className="text-sm font-medium">Precio</Label>
              <Input type="number" step="0.01" value={formData.precio || ''} onChange={(e: any) => setFormData({ ...formData, precio: e.target.value })} className="mt-1" placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones</Label>
              <Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({ ...formData, observaciones: e.target.value })} className="mt-1" placeholder="Observaciones" />
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
              <Save className="h-4 w-4" />
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

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
                    <h3 className="text-2xl font-bold text-gray-900">Factura {detailModal.item.codigo_factura || ''}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Monto Total</p>
                  <p className="font-bold text-green-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {Number(detailModal.item.monto || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Alcance</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${detailModal.item.alcance === 'TOTAL' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                    {detailModal.item.alcance || 'N/A'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Precio</p>
                  <p className="font-bold text-gray-900">{getMonedaSymbol(detailModal.item.id_moneda)} {Number(detailModal.item.precio).toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-gray-700">{detailModal.item.descripcion}</p>
                </div>
              )}
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/proyectos/pagos-factura-servicio?factura=${detailModal.item?.id_factura_servicio}`)}
                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <DollarSign className="h-4 w-4" />
                Pagos
              </Button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      </div>
  );
}
