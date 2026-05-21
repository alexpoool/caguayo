import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { facturasServicioService, etapasProyectoService, monedaService, solicitudesService, tareasEtapaService, dependenciasService, cuentasService, clientesService, certificacionesService, contratosService } from '../../services/api';
import type { FacturaServicio, FacturaServicioCreate, FacturaServicioUpdate, Etapa, TareaEtapa, SolicitudServicio, ItemFacturaServicio, Certificacion } from '../../types/servicio';
import type { Cliente, Cuenta } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Receipt, X, Eye, DollarSign, Hash, Tag, FileText, Check, ChevronDown, Printer, ListChecks, List } from 'lucide-react';
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
  const [itemsModal, setItemsModal] = useState<{ isOpen: boolean; factura: FacturaServicio | null; items: ItemFacturaServicio[] }>({ isOpen: false, factura: null, items: [] });
  const [loadingItems, setLoadingItems] = useState(false);
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
    onConfirm: () => { },
    type: 'danger'
  });



  const [tareasDeEtapa, setTareasDeEtapa] = useState<TareaEtapa[]>([]);
  const [selectedTareas, setSelectedTareas] = useState<number[]>([]);
  const [tareaModifiers, setTareaModifiers] = useState<Record<number, { cantidad: number; precio: number }>>({});
  const [certificacionesDeEtapa, setCertificacionesDeEtapa] = useState<Certificacion[]>([]);
  const [selectedCertificacion, setSelectedCertificacion] = useState<number | null>(null);

  const [cuentasDependencia, setCuentasDependencia] = useState<any[]>([]);
  const user = authService.getUser();
  const dependenciaId = user?.dependencia?.id_dependencia;

  useEffect(() => {
    if (dependenciaId) {
      dependenciasService.getCuentasByDependencia(dependenciaId)
        .then(setCuentasDependencia)
        .catch(() => {
          setCuentasDependencia([]);
          toast.error('Error al cargar cuentas de la dependencia');
        });
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

  useEffect(() => {
    if (selectedEtapaId) {
      const etapa = etapas.find(e => e.id_etapa === selectedEtapaId);
      if (etapa?.tipo_etapa === 'CERTIFICACIONES') {
        setTareasDeEtapa([]);
        certificacionesService.getCertificacionesByEtapa(selectedEtapaId)
          .then(setCertificacionesDeEtapa)
          .catch(() => setCertificacionesDeEtapa([]));
      } else {
        setFormData(prev => ({ ...prev, descripcion: etapa?.descripcion || '' }));
        setCertificacionesDeEtapa([]);
        setSelectedCertificacion(null);
        tareasEtapaService.getTareasByEtapa(selectedEtapaId)
          .then(setTareasDeEtapa)
          .catch(() => setTareasDeEtapa([]));
      }
    } else {
      setTareasDeEtapa([]);
      setSelectedTareas([]);
      setCertificacionesDeEtapa([]);
      setSelectedCertificacion(null);
    }
  }, [selectedEtapaId, etapas]);

  useEffect(() => {
    if (selectedCertificacion) {
      const cert = certificacionesDeEtapa.find(c => c.id_certificacion === selectedCertificacion);
      if (cert) {
        setFormData(prev => ({
          ...prev,
          importe: cert.a_cobrar,
          descripcion: [cert.constructor, cert.obra, cert.objeto_obra].filter(Boolean).join(', ')
        }));
      }
    }
  }, [selectedCertificacion, certificacionesDeEtapa]);

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
      const etapa = selectedEtapaId ? etapas.find(e => e.id_etapa === selectedEtapaId) : null;
      const esCertificaciones = etapa?.tipo_etapa === 'CERTIFICACIONES';

      if (esCertificaciones) {
        if (certificacionesDeEtapa.length === 0) {
          toast.error('No hay certificaciones registradas para esta etapa');
          return;
        }
        if (!selectedCertificacion) {
          toast.error('Debe seleccionar una certificación');
          return;
        }
      } else {
        if (tareasDeEtapa.length === 0) {
          toast.error('No hay tareas registradas para esta etapa');
          return;
        }
        if (selectedTareas.length === 0) {
          toast.error('Debe seleccionar al menos una tarea');
          return;
        }
      }

      if (etapa && etapa.valor > 0) {
        let importeCalculado = 0;
        if (esCertificaciones && selectedCertificacion) {
          const cert = certificacionesDeEtapa.find(c => c.id_certificacion === selectedCertificacion);
          if (cert) importeCalculado = Number(cert.a_cobrar);
        } else if (selectedTareas.length > 0) {
          importeCalculado = selectedTareas.reduce((sum, tareaId) => {
            const tarea = tareasDeEtapa.find(t => t.id_tarea_etapa === tareaId);
            if (!tarea) return sum;
            const mod = tareaModifiers[tareaId];
            const cant = mod?.cantidad ?? Number(tarea.cantidad || 0);
            const prec = mod?.precio ?? Number(tarea.precio_ajustado || 0);
            return sum + (cant * prec);
          }, 0);
        }
        if (importeCalculado > Number(etapa.valor)) {
          toast.error(`El importe de la factura (${importeCalculado.toFixed(2)}) no puede ser mayor al valor de la etapa (${Number(etapa.valor).toFixed(2)})`);
          return;
        }
      }
      if (editingId) {
        const data: FacturaServicioUpdate = {
          id_etapa: formData.id_etapa ? Number(formData.id_etapa) : undefined,
          id_certificacion: selectedCertificacion || undefined,
          alcance: 'TOTAL',
          codigo_factura: formData.codigo_factura,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined,
          tareas_seleccionadas: selectedTareas.length > 0 ? selectedTareas : undefined
        };
        const modifiers = Object.keys(tareaModifiers).length > 0 ? { tarea_modifiers: tareaModifiers } : {};
        await facturasServicioService.updateFacturaServicio(editingId, { ...data, ...modifiers });
      } else {
        const data: FacturaServicioCreate = {
          id_etapa: selectedEtapaId || (etapaParam ? Number(etapaParam) : undefined),
          id_certificacion: selectedCertificacion || undefined,
          alcance: 'TOTAL',
          codigo_factura: formData.codigo_factura,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined,
          tareas_seleccionadas: selectedTareas
        };
        const modifiers = Object.keys(tareaModifiers).length > 0 ? { tarea_modifiers: tareaModifiers } : {};
        await facturasServicioService.createFacturaServicio({ ...data, ...modifiers });
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
    setTareasDeEtapa([]);
    setSelectedTareas([]);
    if (!etapaParam) {
      setSelectedSolicitudId(null);
      setSelectedEtapaId(null);
    }
  };

  const openForm = async (item?: FacturaServicio) => {
    if (item) {
      setEditingId(item.id_factura_servicio);
      setFormData({
        codigo_factura: item.codigo_factura,
        id_moneda: item.id_moneda,
        fecha: item.fecha,
        descripcion: item.descripcion,
        observaciones: item.observaciones,
        cuenta_factura: item.cuenta_factura || ''
      });
      if (item.id_etapa) {
        setSelectedEtapaId(item.id_etapa);
        try {
          const [tareas, facturaItems] = await Promise.all([
            tareasEtapaService.getTareasByEtapa(item.id_etapa),
            facturasServicioService.getItemsByFactura(item.id_factura_servicio)
          ]);
          setTareasDeEtapa(tareas);
          setSelectedTareas(facturaItems.map((fi: ItemFacturaServicio) => fi.id_tarea_etapa));
        } catch (e) {
          console.error('Error loading items:', e);
        }
      }
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
        const etapa = etapas.find(e => e.id_etapa === Number(etapaParam));
        if (etapa?.tipo_etapa === 'CERTIFICACIONES') {
          certificacionesService.getCertificacionesByEtapa(Number(etapaParam))
            .then(setCertificacionesDeEtapa)
            .catch(() => setCertificacionesDeEtapa([]));
        } else {
          tareasEtapaService.getTareasByEtapa(Number(etapaParam))
            .then(setTareasDeEtapa)
            .catch(() => setTareasDeEtapa([]));
        }
      }
    }
    setView('form');
  };

  const handleSelectSolicitud = (id: number | null) => {
    setSelectedSolicitudId(id);
    setSelectedEtapaId(null);
    setSelectedTareas([]);
    if (id) loadEtapasBySolicitud(id);
  };

  const handleSelectEtapa = (id: number | null) => {
    setSelectedTareas([]);
    setSelectedCertificacion(null);
    setSelectedEtapaId(id);
    if (id) {
      const etapa = etapas.find(e => e.id_etapa === id);
      if (etapa?.id_moneda) {
        setFormData(prev => ({ ...prev, id_moneda: etapa.id_moneda }));
      }
    }
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

  const isEtapaCertificaciones = (id?: number) => {
    if (!id) return false;
    const e = etapas.find(et => et.id_etapa === id);
    return e?.tipo_etapa === 'CERTIFICACIONES';
  };

  const getEtapaTipo = (id?: number) => {
    if (!id) return 'N/A';
    const e = etapas.find(et => et.id_etapa === id);
    if (!e?.tipo_etapa) return 'N/A';
    return e.tipo_etapa === 'CERTIFICACIONES' ? 'Certificación' : 'Tareas';
  };

  const getFacturaServicioDocument = (
    factura: FacturaServicio,
    etapasData: Etapa[],
    itemsData: ItemFacturaServicio[],
    solicitudesData: SolicitudServicio[],
    autorizadoPor: string,
    revisadoPor: string,
    cuentaSeleccionada: any,
    clientesData: Cliente[] = [],
    cuentasClientesData: any[] = [],
    monedasData: Moneda[] = [],
    contratoNombre: string = '',
    certificacion?: Certificacion
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
    const provinciaCliente = cliente?.provincia?.nombre || 'N/A';
    const municipioCliente = cliente?.municipio?.nombre || 'N/A';
    const direccionCliente = cliente?.direccion || 'N/A';

    const cuentaCliente = cuentasClientesData && cuentasClientesData.length > 0 ? cuentasClientesData[0] : null;

    const nombreEtapa = etapa?.nombre_etapa || `Etapa #${etapa?.numero_etapa || 'N/A'}`;
    const codigoSolicitud = solicitud?.codigo_solicitud || 'N/A';
    const nombreMoneda = moneda?.nombre || '';
    const simboloMoneda = moneda?.simbolo || '';

    const aCobrar = Number(certificacion?.a_cobrar || 0);
    const impuestoOnat = Number(certificacion?.impuesto_venta_onat || 0);
    const total = aCobrar + impuestoOnat;

    const fechaEmision = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : 'N/A';

    return `<!DOCTYPE html>
<html lang="es">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>Factura de Certificación | ${factura.codigo_factura || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
    .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.4; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.3rem; padding-bottom: 0.2rem; gap: 15px; }
    .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
    .header-logo img { width: 160px; height: 160px; object-fit: contain; }
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

    .info-pago { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .pago-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .pago-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .pago-izquierda, .pago-derecha { display: flex; flex-direction: column; gap: 4px; }
    .info-cliente { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .cliente-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .cliente-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .cliente-izquierda, .cliente-derecha { display: flex; flex-direction: column; gap: 4px; }
    .cert-data { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .cert-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .cert-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
    .cert-row { display: flex; gap: 8px; }
    .cert-label { font-weight: 700; min-width: 140px; }
    .cert-value { flex: 1; }
    .tabla-totales { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .tabla-totales th, .tabla-totales td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-totales th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .tabla-totales td:nth-child(1) { width: 70%; }
    .tabla-totales td:nth-child(2) { width: 30%; text-align: right; }
    .tabla-totales .total-row td { font-weight: 800; font-size: 14px; }
    .totales { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .cuadro-totales { width: 280px; border: 1px solid black; background: white; padding: 12px 15px; font-size: 13px; font-family: monospace; }
    .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
    .firmas { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; margin-bottom: 12px; }
    .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
    .bloque-firma { flex: 1; border-top: none; padding-top: 8px; font-size: 11px; text-align: left; }
    .bloque-firma p { margin: 2px 0; }
    .cargo { font-size: 10px; color: black; }
    @media (max-width: 650px) { .documento { padding: 0.6rem; } .tabla-totales th, .tabla-totales td { padding: 3px 2px; font-size: 10px; } .firmas { flex-direction: column; gap: 6px; } .fila-firmas { flex-direction: column; gap: 10px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 10px; } }
    @page { margin: 0; }
    @media print {
      body { background: white; display: block; padding: 0; min-height: auto; align-items: flex-start; }
      .documento { max-width: none; box-shadow: none; border-radius: 0; padding: 0.5in; }
      .tabla-totales th { background-color: #cccccc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="documento texto">
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
      </div>
      <div class="header-box">
        <div class="header-box-title">Factura de Certificación</div>
        <div class="header-box-row"><strong>No.:</strong> ${factura.codigo_factura || 'N/A'}</div>
        <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
        <div class="header-box-row"><strong>Moneda:</strong> ${nombreMoneda || 'N/A'}</div>
      </div>
    </div>

    ${cuentaSeleccionada ? `
    <div class="info-pago">
      <div class="pago-titulo">PAGUESE A: CAGUAYO S.A.</div>
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
      <div class="cliente-titulo">Cliente</div>
      <div class="cliente-grid">
        <div class="cliente-izquierda">
          <div><strong>Nombre:</strong> ${nombreCliente}</div>
          <div><strong>NIT:</strong> ${cliente?.nit || ''}</div>
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

    <div style="margin: 8px 0 6px 0; font-weight: bold; font-size: 14px;">${contratoNombre || nombreEtapa}</div>
    ${factura.descripcion ? `<div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Descripción:</strong> ${factura.descripcion}</div>` : ''}

    <table class="tabla-totales">
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Actividad</td>
          <td>${simboloMoneda} ${aCobrar.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Impuesto Venta ONAT</td>
          <td>${simboloMoneda} ${impuestoOnat.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td>${simboloMoneda} ${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    ${factura.observaciones?.trim() ? `<br><div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Observaciones:</strong> ${factura.observaciones}</div>` : ''}

    <div class="firmas">
      <div class="fila-firmas">
        <div class="bloque-firma">
          <p><strong>Confeccionado por:</strong></p>
          <p>${elaboradoPor}</p>
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
</body>
</html>`;
  };

  const getCertificacionFacturaDocument = (
    factura: FacturaServicio,
    etapasData: Etapa[],
    solicitudesData: SolicitudServicio[],
    certificacion: Certificacion,
    autorizadoPor: string,
    revisadoPor: string,
    cuentaSeleccionada: any,
    clientesData: Cliente[] = [],
    cuentasClientesData: any[] = [],
    monedasData: Moneda[] = [],
    contratoNombre: string = ''
  ) => {
    return getFacturaServicioDocument(
      factura, etapasData, [], solicitudesData,
      autorizadoPor, revisadoPor, cuentaSeleccionada,
      clientesData, cuentasClientesData, monedasData,
      contratoNombre, certificacion
    );
  };

  const handlePrintDirect = async (factura: FacturaServicio) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de popups detectado. Permita ventanas emergentes para este sitio.');
      return;
    }

    const etapaFactura = etapas.find(e => e.id_etapa === factura.id_etapa);
    const solicitudFactura = solicitudes.find(s => s.id_solicitud_servicio === etapaFactura?.id_solicitud_servicio);
    const clienteId = solicitudFactura?.id_cliente;

    let cuentasCliente: Cuenta[] = [];
    if (clienteId) {
      try {
        cuentasCliente = await cuentasService.getCuentasByClienteAll(clienteId);
      } catch (e) {
        console.error('Error loading cliente cuentas:', e);
      }
    }

    let contratoNombre = '';
    if (solicitudFactura?.id_contrato) {
      try {
        const contrato = await contratosService.getContrato(solicitudFactura.id_contrato);
        contratoNombre = contrato.nombre || '';
      } catch (e) {
        console.error('Error loading contrato:', e);
      }
    }

    const cuentaFactura = factura.cuenta_factura ? cuentasDependencia.find(c => c.numero_cuenta === factura.cuenta_factura) : null;
    const cuentaSel = cuentaFactura || cuentasDependencia[0] || null;

    if (factura.id_certificacion) {
      try {
        const certificacion = await certificacionesService.getCertificacion(factura.id_certificacion);
        const html = getCertificacionFacturaDocument(
          factura, etapas, solicitudes, certificacion, '', '', cuentaSel || null, clientesData, cuentasCliente, monedas, contratoNombre
        );
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        return;
      } catch (e) {
        console.error('Error loading certificacion:', e);
      }
    }

    let itemsFactura: ItemFacturaServicio[] = [];
    try {
      itemsFactura = await facturasServicioService.getItemsByFactura(factura.id_factura_servicio);
    } catch (e) {
      console.error('Error loading items:', e);
    }

    const html = getFacturaServicioDocument(
      factura, etapas, itemsFactura, solicitudes, '', '', cuentaSel || null, clientesData, cuentasCliente, monedas, contratoNombre
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleViewDocument = async (factura: FacturaServicio) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de popups detectado. Permita ventanas emergentes para este sitio.');
      return;
    }

    const etapaFactura = etapas.find(e => e.id_etapa === factura.id_etapa);
    const solicitudFactura = solicitudes.find(s => s.id_solicitud_servicio === etapaFactura?.id_solicitud_servicio);
    const clienteId = solicitudFactura?.id_cliente;

    let cuentasCliente: Cuenta[] = [];
    if (clienteId) {
      try {
        cuentasCliente = await cuentasService.getCuentasByClienteAll(clienteId);
      } catch (e) {
        console.error('Error loading cliente cuentas:', e);
      }
    }

    let contratoNombre = '';
    if (solicitudFactura?.id_contrato) {
      try {
        const contrato = await contratosService.getContrato(solicitudFactura.id_contrato);
        contratoNombre = contrato.nombre || '';
      } catch (e) {
        console.error('Error loading contrato:', e);
      }
    }

    const cuentaFacturaPreview = factura.cuenta_factura ? cuentasDependencia.find(c => c.numero_cuenta === factura.cuenta_factura) : null;
    const cuentaDefault = cuentaFacturaPreview || cuentasDependencia[0] || null;

    if (factura.id_certificacion) {
      try {
        const certificacion = await certificacionesService.getCertificacion(factura.id_certificacion);
        const html = getCertificacionFacturaDocument(
          factura, etapas, solicitudes, certificacion, '', '', cuentaDefault, clientesData, cuentasCliente, monedas, contratoNombre
        );
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        return;
      } catch (e) {
        console.error('Error loading certificacion:', e);
      }
    }

    let itemsFactura: ItemFacturaServicio[] = [];
    try {
      itemsFactura = await facturasServicioService.getItemsByFactura(factura.id_factura_servicio);
    } catch (e) {
      console.error('Error loading items:', e);
    }

    const html = getFacturaServicioDocument(factura, etapas, itemsFactura, solicitudes, '', '', cuentaDefault, clientesData, cuentasCliente, monedas, contratoNombre);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
                <TableHead>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-teal-600" />
                    Etapa
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-teal-600" />
                    Tipo
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-teal-600" />
                    Estado
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Pagos
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
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
                    <TableCell className="font-medium text-gray-900">
                      {getEtapaName(item.id_etapa)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getEtapaTipo(item.id_etapa) === 'Certificación'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-cyan-100 text-cyan-700'
                        }`}>
                        {getEtapaTipo(item.id_etapa)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${Number(item.pagado || 0) >= Number(item.importe || 0)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                        {Number(item.pagado || 0) >= Number(item.importe || 0) ? 'Pagada' : 'Por pagar'}
                      </span>
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
          {!etapaParam && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          )}

          {(tareasDeEtapa.length > 0) && (
            <div className="mt-6 border-t pt-6">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <ListChecks className="h-5 w-5 text-teal-600" />
                Tareas de la Etapa
              </Label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left w-10"></th>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-center w-20">Und</th>
                      <th className="px-3 py-2 text-right w-24">Cantidad</th>
                      <th className="px-3 py-2 text-right w-24">Precio</th>
                      <th className="px-3 py-2 text-right w-28">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tareasDeEtapa.map((tarea) => {
                      const mod = tareaModifiers[tarea.id_tarea_etapa];
                      const cant = mod?.cantidad ?? Number(tarea.cantidad || 0);
                      const prec = mod?.precio ?? Number(tarea.precio_ajustado || 0);
                      const importe = cant * prec;
                      const isSelected = selectedTareas.includes(tarea.id_tarea_etapa);
                      const isFacturada = tarea.facturada && !isSelected;
                      return (
                        <tr key={tarea.id_tarea_etapa} className={`hover:bg-gray-50 transition-colors ${isFacturada ? 'opacity-50 bg-gray-50' : ''}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={tarea.facturada && !isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTareas(prev => [...prev, tarea.id_tarea_etapa]);
                                  setTareaModifiers(prev => ({
                                    ...prev,
                                    [tarea.id_tarea_etapa]: { cantidad: Number(tarea.cantidad || 0), precio: Number(tarea.precio_ajustado || 0) }
                                  }));
                                } else {
                                  setSelectedTareas(prev => prev.filter(id => id !== tarea.id_tarea_etapa));
                                  setTareaModifiers(prev => {
                                    const next = { ...prev };
                                    delete next[tarea.id_tarea_etapa];
                                    return next;
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-900">{tarea.concepto_modificado || 'N/A'}</span>
                            {isFacturada && <span className="ml-2 text-xs text-gray-400">(ya facturada)</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{tarea.unidad_medida || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 outline-none"
                                value={cant}
                                onChange={(e) => setTareaModifiers(prev => ({
                                  ...prev,
                                  [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], cantidad: Number(e.target.value) || 0 }
                                }))}
                              />
                            ) : (
                              <span className="text-gray-900">{Number(tarea.cantidad || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 outline-none"
                                value={prec}
                                onChange={(e) => setTareaModifiers(prev => ({
                                  ...prev,
                                  [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], precio: Number(e.target.value) || 0 }
                                }))}
                              />
                            ) : (
                              <span className="text-gray-900">{getMonedaSymbol(formData.id_moneda)} {Number(tarea.precio_ajustado || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{getMonedaSymbol(formData.id_moneda)} {importe.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-3">
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-5 py-3 text-right">
                  <span className="text-sm text-teal-700 font-medium">Total seleccionado: </span>
                  <span className="text-lg font-bold text-teal-900">
                    {getMonedaSymbol(formData.id_moneda)} {tareasDeEtapa
                      .filter(t => selectedTareas.includes(t.id_tarea_etapa))
                      .reduce((sum, t) => {
                        const mod = tareaModifiers[t.id_tarea_etapa];
                        const cant = mod?.cantidad ?? Number(t.cantidad || 0);
                        const prec = mod?.precio ?? Number(t.precio_ajustado || 0);
                        return sum + (cant * prec);
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(certificacionesDeEtapa.length > 0) && (
            <div className="mt-6 border-t pt-6">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-teal-600" />
                Certificación a Facturar
              </Label>
              <div className="mt-1 space-y-2">
                {certificacionesDeEtapa.filter(c => !c.facturado || c.id_certificacion === selectedCertificacion).map((cert) => {
                  const isSelected = selectedCertificacion === cert.id_certificacion;
                  const isYaFacturada = cert.facturado && !isSelected;
                  return (
                    <label
                      key={cert.id_certificacion}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : isYaFacturada
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                        }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        disabled={isYaFacturada}
                        onChange={() => {
                          if (!isYaFacturada) {
                            setSelectedCertificacion(isSelected ? null : cert.id_certificacion);
                          }
                        }}
                        className="h-4 w-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{cert.nombre}</span>
                          {cert.constructor || cert.obra ? (
                            <span className="text-sm text-gray-500 ml-2">{cert.constructor ? `${cert.constructor} - ` : ''}{cert.obra || ''}</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{getMonedaSymbol(formData.id_moneda)} {Number(cert.a_cobrar || 0).toFixed(2)}</span>
                          {isYaFacturada && <span className="text-xs text-red-500 font-medium">Ya facturada</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
                {certificacionesDeEtapa.filter(c => !c.facturado).length === 0 && (
                  <p className="text-sm text-gray-500">Todas las certificaciones de esta etapa ya están facturadas</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {(() => {
                const importe = Number(detailModal.item.importe || 0);
                const pagado = Number(detailModal.item.pagado || 0);
                const saldo = importe - pagado;
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                      <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Importe Total</p>
                      <p className="font-bold text-green-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {importe.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Pagado</p>
                      <p className="font-bold text-blue-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {pagado.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${saldo > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`text-xs uppercase tracking-wider mb-1 ${saldo > 0 ? 'text-red-600' : 'text-gray-500'}`}>Saldo Pendiente</p>
                      <p className={`font-bold text-xl ${saldo > 0 ? 'text-red-700' : 'text-gray-900'}`}>{getMonedaSymbol(detailModal.item.id_moneda)} {saldo.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Alcance</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${detailModal.item.alcance === 'TOTAL' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                  {detailModal.item.alcance || 'N/A'}
                </span>
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

      {itemsModal.isOpen && itemsModal.factura && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <List className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Items de Factura {itemsModal.factura.codigo_factura || ''}</h3>
                    <p className="text-sm text-gray-500 font-mono">{itemsModal.factura.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>
                <button onClick={() => setItemsModal({ isOpen: false, factura: null, items: [] })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {itemsModal.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <List className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay items registrados en esta factura</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">Concepto</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border border-gray-300 w-20">Und</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-300 w-24">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-300 w-28">Precio</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-300 w-28">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsModal.items.map((item) => {
                        const importe = Number(item.cantidad || 0) * Number(item.precio || 0);
                        return (
                          <tr key={item.id_item_factura_servicio} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border border-gray-300 text-gray-900">{item.concepto || 'N/A'}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-gray-600">{item.unidad_medida || '-'}</td>
                            <td className="px-3 py-2 border border-gray-300 text-right text-gray-900">{Number(item.cantidad || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 border border-gray-300 text-right text-gray-900">{getMonedaSymbol(itemsModal.factura?.id_moneda)} {Number(item.precio || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 border border-gray-300 text-right font-medium text-gray-900">{getMonedaSymbol(itemsModal.factura?.id_moneda)} {importe.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {itemsModal.items.length > 0 && (
                <div className="flex justify-end mt-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg px-5 py-3 text-right">
                    <span className="text-sm text-teal-700 font-medium">Total: </span>
                    <span className="text-lg font-bold text-teal-900">
                      {getMonedaSymbol(itemsModal.factura?.id_moneda)} {itemsModal.items.reduce((sum, item) => sum + (Number(item.cantidad || 0) * Number(item.precio || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between gap-2">
              <button onClick={() => setItemsModal({ isOpen: false, factura: null, items: [] })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleViewDocument(itemsModal.factura!)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Ver Documento
                </Button>
                <Button variant="outline" onClick={() => handlePrintDirect(itemsModal.factura!)} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
