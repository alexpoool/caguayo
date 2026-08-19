import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { SignToggle } from '../../components/ui/SignToggle';
import { facturasServicioService, etapasProyectoService, monedaService, solicitudesService, tareasEtapaService, dependenciasService, cuentasService, clientesService, certificacionesService, contratosService } from '../../services/api';
import type { FacturaServicio, FacturaServicioCreate, FacturaServicioUpdate, Etapa, TareaEtapa, SolicitudServicio, ItemFacturaServicio, Certificacion } from '../../types/servicio';
import type { Cliente, Cuenta } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, FileText, X, Eye, DollarSign, Hash, Tag, ChevronDown, Printer, ListChecks, List, Loader2, CheckCircle2 } from 'lucide-react';
import { getFacturaServicioDocument, getCertificacionFacturaDocument } from './facturaDocumento';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import { formatCifra } from '../../utils/decimal';
import { useInfiniteList } from '../../hooks/useInfiniteList';

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
        <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="flex-1 text-sm text-blue-800 font-medium truncate">{getLabel(selectedItem)}</span>
          <button onClick={() => { onSelect(null); setSearch(''); }} className="p-0.5 hover:bg-blue-200 rounded">
            <X className="h-3.5 w-3.5 text-blue-600" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            className="w-full mt-1 pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
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
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
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

export function PreFacturasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get('etapa');
  const solicitudParam = searchParams.get('solicitud');
  const [view, setView] = useState<View>('list');

  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    items: facturasInfinitas,
    isLoading: isLoadingFacturas,
    isFetchingMore,
    refresh,
    hasMore,
    loadMore,
  } = useInfiniteList<FacturaServicio>({
    queryKeyBase: 'facturas-servicio',
    queryFn: (skip, limit) => facturasServicioService.getFacturasServicio(skip, limit),
  });

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(solicitudParam ? Number(solicitudParam) : null);
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | null>(etapaParam ? Number(etapaParam) : null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<number | null>(etapaParam ? Number(etapaParam) : null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: FacturaServicio | null }>({ isOpen: false, item: null });

  useEffect(() => {
    if (searchParams.has('_')) {
      setView('list');
      setEditingId(null);
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  });

  const [tareasDeEtapa, setTareasDeEtapa] = useState<TareaEtapa[]>([]);
  const [selectedTareas, setSelectedTareas] = useState<number[]>([]);
  const [tareaModifiers, setTareaModifiers] = useState<Record<number, { cantidad: number; precio: number; ajuste_porciento: number; ajuste_valor: number }>>({});
  const [certificacionesDeEtapa, setCertificacionesDeEtapa] = useState<Certificacion[]>([]);
  const [selectedCertificacion, setSelectedCertificacion] = useState<number | null>(null);
  const [certAjustePorciento, setCertAjustePorciento] = useState<number>(0);
  const [certAjusteValor, setCertAjusteValor] = useState<number>(0);

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
        setCertAjustePorciento(0);
        setCertAjusteValor(0);
        tareasEtapaService.getTareasByEtapa(selectedEtapaId)
          .then(setTareasDeEtapa)
          .catch(() => setTareasDeEtapa([]));
      }
    } else {
      setTareasDeEtapa([]);
      setSelectedTareas([]);
      setCertificacionesDeEtapa([]);
      setSelectedCertificacion(null);
      setCertAjustePorciento(0);
      setCertAjusteValor(0);
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

  useEffect(() => {
    if (solicitudParam && view === 'list') {
      loadEtapasBySolicitud(Number(solicitudParam));
    }
  }, [view, solicitudParam]);

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
          toast.error(`El importe de la pre-factura (${formatCifra(importeCalculado)}) no puede ser mayor al valor de la etapa (${formatCifra(etapa.valor)})`);
          return;
        }
      }
      const modifiers = Object.keys(tareaModifiers).length > 0 ? { tarea_modifiers: tareaModifiers } : {};
      const certAjustes = esCertificaciones ? { ajuste_porciento: certAjustePorciento, ajuste_valor: certAjusteValor } : {};

      if (editingId) {
        const data: FacturaServicioUpdate = {
          id_etapa: formData.id_etapa ? Number(formData.id_etapa) : undefined,
          id_certificacion: selectedCertificacion || undefined,
          alcance: 'TOTAL',
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined,
          tareas_seleccionadas: selectedTareas.length > 0 ? selectedTareas : undefined
        };
        await facturasServicioService.updateFacturaServicio(editingId, { ...data, ...modifiers, ...certAjustes });
      } else {
        const data: FacturaServicioCreate = {
          id_etapa: selectedEtapaId || (etapaParam ? Number(etapaParam) : undefined),
          id_certificacion: selectedCertificacion || undefined,
          alcance: 'TOTAL',
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          cuenta_factura: formData.cuenta_factura || undefined,
          tareas_seleccionadas: selectedTareas,
          estado: 'PENDIENTE'
        };
        await facturasServicioService.createFacturaServicio({ ...data, ...modifiers, ...certAjustes });
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      refresh();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (item: FacturaServicio) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar pre-factura?',
      message: `¿Está seguro de eliminar la pre-factura "${item.codigo_factura || 'Sin código'}"?`,
      onConfirm: async () => {
        try {
          await facturasServicioService.deleteFacturaServicio(item.id_factura_servicio);
          toast.success('Eliminado');
          refresh();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const handleConfirm = (item: FacturaServicio) => {
    if (item.estado === 'APROBADA') return;
    setConfirmModal({
      isOpen: true,
      title: '¿Aprobar pre-factura?',
      message: 'Al aprobar la pre-factura las tareas pasarán a estado facturado. ¿Desea continuar?',
      confirmText: 'Aprobar',
      type: 'info',
      onConfirm: async () => {
        try {
          await facturasServicioService.aprobarFacturaServicio(item.id_factura_servicio);
          toast.success('Pre-factura aprobada');
          refresh();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      }
    });
  };

  const resetForm = () => {
    setFormData({ fecha: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setTareasDeEtapa([]);
    setSelectedTareas([]);
    setSelectedCertificacion(null);
    setCertAjustePorciento(0);
    setCertAjusteValor(0);
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
    setCertAjustePorciento(0);
    setCertAjusteValor(0);
    setSelectedEtapaId(id);
    if (id) {
      const etapa = etapas.find(e => e.id_etapa === id);
      if (etapa?.id_moneda) {
        setFormData(prev => ({ ...prev, id_moneda: etapa.id_moneda }));
      }
    }
  };

  const filteredDocs = useMemo(() => {
    let result: FacturaServicio[] = facturasInfinitas.filter(f => f.estado === 'PENDIENTE' && f.tipo === 'PREFACTURA');

    if (filtroEtapa) {
      result = result.filter(f => f.id_etapa === filtroEtapa);
    }

    if (solicitudParam && etapas.length > 0) {
      const etapaIds = etapas.map(e => e.id_etapa).filter(Boolean);
      result = result.filter(f => f.id_etapa && etapaIds.includes(f.id_etapa));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.codigo_factura?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [facturasInfinitas, searchTerm, filtroEtapa, solicitudParam, etapas]);

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

  const getFormTitle = () => {
    const prefix = editingId ? 'Editar' : 'Nueva';
    return `${prefix} Pre-factura`;
  };

  const loadItemsForDoc = async (item: FacturaServicio): Promise<ItemFacturaServicio[]> => {
    return facturasServicioService.getItemsByFactura(item.id_factura_servicio);
  };

  const openDocument = async (item: FacturaServicio, print: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de popups detectado. Permita ventanas emergentes para este sitio.');
      return;
    }

    const etapaFactura = etapas.find(e => e.id_etapa === item.id_etapa);
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

    const cuentaFactura = item.cuenta_factura ? cuentasDependencia.find(c => c.numero_cuenta === item.cuenta_factura) : null;
    const cuentaSel = cuentaFactura || cuentasDependencia[0] || null;

    if (item.id_certificacion) {
      try {
        const certificacion = await certificacionesService.getCertificacion(item.id_certificacion);
        const html = getCertificacionFacturaDocument(
          item, etapas, solicitudes, certificacion, '', '', cuentaSel || null, clientesData, cuentasCliente, monedas, contratoNombre, 'PRE-FACTURA'
        );
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        if (print) printWindow.print();
        return;
      } catch (e) {
        console.error('Error loading certificacion:', e);
      }
    }

    let itemsFactura: ItemFacturaServicio[] = [];
    try {
      itemsFactura = await loadItemsForDoc(item);
    } catch (e) {
      console.error('Error loading items:', e);
    }

    const html = getFacturaServicioDocument(
      item, etapas, itemsFactura, solicitudes, '', '', cuentaSel || null, clientesData, cuentasCliente, monedas, contratoNombre, undefined, 'PRE-FACTURA'
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    if (print) printWindow.print();
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg animate-bounce-subtle">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pre-facturas</h1>
            <p className="text-gray-500 mt-1">
              {currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Gestión de pre-facturas de servicio'}
              {` · ${filteredDocs.length} pre-factura(s)`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Pre-factura
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
            <TableHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-blue-600" />
                    Etapa
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    Tipo
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Importe
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingFacturas ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cargando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                    {searchTerm
                      ? 'No se encontraron pre-facturas que coincidan con la búsqueda'
                      : 'No hay pre-facturas registradas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((item) => {
                  return (
                    <TableRow key={item.id_factura_servicio} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded text-sm font-mono font-medium">
                          <Hash className="h-3 w-3" />
                          {item.codigo_factura || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {getEtapaName(item.id_etapa)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                          Pre-factura
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {getMonedaSymbol(item.id_moneda)} {formatCifra(item.importe)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleConfirm(item)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Aprobar pre-factura"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDocument(item, false)}
                            className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 h-8 w-8"
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDocument(item, true)}
                            className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 h-8 w-8"
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openForm(item)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div ref={loadMoreRef} className="flex justify-center py-2">
          {isFetchingMore && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando más...</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg animate-bounce-subtle">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{getFormTitle()}</h2>
            <p className="text-gray-500 mt-1">Complete los datos de la pre-factura de servicio</p>
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
            <FileText className="h-5 w-5 text-blue-600" />
            Información de la Pre-factura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!etapaParam && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SearchSelect
                label="Proyecto"
                placeholder="Buscar proyecto..."
                items={solicitudes}
                selectedId={selectedSolicitudId}
                getLabel={(s) => s.codigo_proyecto || `Solicitud #${s.id_solicitud_servicio}`}
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
                <ListChecks className="h-5 w-5 text-blue-600" />
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
                      <th className="px-3 py-2 text-right w-20">Ajuste(%)</th>
                      <th className="px-3 py-2 text-right w-28">Ajuste($)</th>
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
                                    [tarea.id_tarea_etapa]: {
                                      cantidad: Number(tarea.cantidad || 0),
                                      precio: Number(tarea.precio_ajustado || 0),
                                      ajuste_porciento: 0,
                                      ajuste_valor: 0
                                    }
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
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={cant}
                                onChange={(e) => setTareaModifiers(prev => ({
                                  ...prev,
                                  [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], cantidad: Number(e.target.value) || 0 }
                                }))}
                              />
                            ) : (
                              <span className="text-gray-900">{formatCifra(tarea.cantidad)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={prec}
                                onChange={(e) => setTareaModifiers(prev => ({
                                  ...prev,
                                  [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], precio: Number(e.target.value) || 0 }
                                }))}
                              />
                            ) : (
                              <span className="text-gray-900">{getMonedaSymbol(formData.id_moneda)} {formatCifra(tarea.precio_ajustado)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-1">
                                <SignToggle
                                  value={mod?.ajuste_porciento ?? 0}
                                  onChange={(val) => setTareaModifiers(prev => ({
                                    ...prev,
                                    [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], ajuste_porciento: val }
                                  }))}
                                />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-16 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={mod?.ajuste_porciento ? Math.abs(mod.ajuste_porciento) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const sign = (mod?.ajuste_porciento ?? 0) >= 0 ? 1 : -1;
                                      setTareaModifiers(prev => ({
                                        ...prev,
                                        [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], ajuste_porciento: val ? Number(val) * sign : 0 }
                                      }));
                                    }}
                                  />
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-1">
                                <SignToggle
                                  value={mod?.ajuste_valor ?? 0}
                                  onChange={(val) => setTareaModifiers(prev => ({
                                    ...prev,
                                    [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], ajuste_valor: val }
                                  }))}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={mod?.ajuste_valor ? Math.abs(mod.ajuste_valor) : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const sign = (mod?.ajuste_valor ?? 0) >= 0 ? 1 : -1;
                                    setTareaModifiers(prev => ({
                                      ...prev,
                                      [tarea.id_tarea_etapa]: { ...prev[tarea.id_tarea_etapa], ajuste_valor: val ? Number(val) * sign : 0 }
                                    }));
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{getMonedaSymbol(formData.id_moneda)} {formatCifra(importe)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-right">
                  <span className="text-sm text-blue-700 font-medium">Total seleccionado: </span>
                  <span className="text-lg font-bold text-blue-900">
                    {getMonedaSymbol(formData.id_moneda)} {formatCifra(tareasDeEtapa
                      .filter(t => selectedTareas.includes(t.id_tarea_etapa))
                      .reduce((sum, t) => {
                        const mod = tareaModifiers[t.id_tarea_etapa];
                        const cant = mod?.cantidad ?? Number(t.cantidad || 0);
                        const prec = mod?.precio ?? Number(t.precio_ajustado || 0);
                        return sum + (cant * prec);
                      }, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(certificacionesDeEtapa.length > 0) && (
            <div className="mt-6 border-t pt-6">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-blue-600" />
                Certificación a Facturar
              </Label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left w-10"></th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-right w-28">A Cobrar</th>
                      <th className="px-3 py-2 text-right w-24">Ajuste(%)</th>
                      <th className="px-3 py-2 text-right w-28">Ajuste($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {certificacionesDeEtapa.filter(c => !c.facturado || c.id_certificacion === selectedCertificacion).map((cert) => {
                      const isSelected = selectedCertificacion === cert.id_certificacion;
                      const isYaFacturada = cert.facturado && !isSelected;
                      return (
                        <tr key={cert.id_certificacion} className={`hover:bg-gray-50 transition-colors ${isYaFacturada ? 'opacity-50 bg-gray-50' : ''}`}>
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              checked={isSelected}
                              disabled={isYaFacturada}
                              onChange={() => {
                                if (!isYaFacturada) {
                                  setSelectedCertificacion(isSelected ? null : cert.id_certificacion);
                                  setCertAjustePorciento(isSelected ? 0 : (cert.ajuste_porciento || 0));
                                  setCertAjusteValor(isSelected ? 0 : (cert.ajuste_valor || 0));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-900">{cert.nombre}</span>
                            {cert.constructor || cert.obra ? (
                              <span className="text-sm text-gray-500 ml-1">{cert.constructor ? `${cert.constructor} - ` : ''}{cert.obra || ''}</span>
                            ) : null}
                            {isYaFacturada && <span className="ml-2 text-xs text-red-500 font-medium">Ya facturada</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            {getMonedaSymbol(formData.id_moneda)} {formatCifra(cert.a_cobrar)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-1">
                                <SignToggle
                                  value={certAjustePorciento}
                                  onChange={(val) => setCertAjustePorciento(val)}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-16 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={certAjustePorciento ? Math.abs(certAjustePorciento) : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const sign = certAjustePorciento >= 0 ? 1 : -1;
                                    setCertAjustePorciento(val ? Number(val) * sign : 0);
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isSelected ? (
                              <div className="flex items-center justify-end gap-1">
                                <SignToggle
                                  value={certAjusteValor}
                                  onChange={(val) => setCertAjusteValor(val)}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={certAjusteValor ? Math.abs(certAjusteValor) : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const sign = certAjusteValor >= 0 ? 1 : -1;
                                    setCertAjusteValor(val ? Number(val) * sign : 0);
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {certificacionesDeEtapa.filter(c => !c.facturado).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                          Todas las certificaciones de esta etapa ya están facturadas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Cuenta</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.cuenta_factura || ''} onChange={(e: any) => {
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
              <Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({ ...formData, descripcion: e.target.value })} className="mt-1" placeholder="Descripción de la pre-factura" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones</Label>
              <Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({ ...formData, observaciones: e.target.value })} className="mt-1" placeholder="Observaciones" />
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
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
        confirmText={confirmModal.confirmText}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Pre-factura {detailModal.item.codigo_factura || ''}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Importe Total</p>
                  <p className="font-bold text-blue-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {formatCifra(detailModal.item.importe)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Pagado</p>
                  <p className="font-bold text-blue-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {formatCifra(detailModal.item.pagado)}</p>
                </div>
                <div className="p-4 rounded-xl border bg-amber-50 border-amber-100">
                  <p className="text-xs uppercase tracking-wider mb-1 text-amber-600">Estado</p>
                  <p className="font-bold text-xl text-amber-700">Pendiente</p>
                </div>
                <div className="p-4 rounded-xl border bg-blue-50 border-blue-100">
                  <p className="text-xs uppercase tracking-wider mb-1 text-blue-600">Tipo</p>
                  <p className="font-bold text-xl text-blue-700">{detailModal.item.tipo === 'FACTURA' ? 'Factura' : 'Pre-factura'}</p>
                </div>
              </div>
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
                onClick={() => openDocument(detailModal.item!, false)}
                className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50"
              >
                <Eye className="h-4 w-4" />
                Ver Documento
              </Button>
              <Button
                variant="outline"
                onClick={() => openDocument(detailModal.item!, true)}
                className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-100"
              >
                <Printer className="h-4 w-4" />
                Imprimir
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
