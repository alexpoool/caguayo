import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { facturasServicioService, etapasProyectoService, monedaService, contratosService, solicitudesService } from '../../services/api';
import type { FacturaServicio, FacturaServicioCreate, FacturaServicioUpdate, Etapa } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import type { ContratoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Receipt, X, Eye, DollarSign, Hash, Calendar, FileText, Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const contratoParam = searchParams.get('contrato');
  const [view, setView] = useState<View>('list');

  const [facturas, setFacturas] = useState<FacturaServicio[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);

  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(contratoParam ? Number(contratoParam) : null);
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

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (contratoParam && contratos.length > 0) {
      loadEtapasByContrato(Number(contratoParam));
    }
  }, [contratoParam, contratos]);

  const loadInitialData = async () => {
    try {
      const [monedasRes, contratosRes] = await Promise.all([
        monedaService.getMonedas(0, 100),
        contratosService.getContratos(0, 1000)
      ]);
      setMonedas(monedasRes);
      setContratos(contratosRes);
      if (etapaParam) {
        const etapaData = await etapasProyectoService.getEtapa(Number(etapaParam));
        setCurrentEtapa(etapaData);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadEtapasByContrato = async (contratoId: number) => {
    try {
      const solicitudes = await solicitudesService.getSolicitudesByContrato(contratoId);
      const allEtapas: Etapa[] = [];
      for (const sol of solicitudes) {
        const etapasData = await etapasProyectoService.getEtapasBySolicitud(sol.id_solicitud_servicio).catch(() => []);
        allEtapas.push(...etapasData);
      }
      setEtapas(allEtapas);
    } catch (error) { console.error('Error:', error); setEtapas([]); }
  };

  const loadFacturas = async () => {
    try {
      if (filtroEtapa) {
        const data = await facturasServicioService.getFacturasByEtapa(filtroEtapa);
        setFacturas(data);
      } else if (contratoParam) {
        const contratosData = await contratosService.getContratos(0, 1000);
        const contrato = contratosData.find((c: ContratoWithDetails) => c.id_contrato === Number(contratoParam));
        if (contrato?.solicitudes) {
          const etapaIds: number[] = [];
          for (const sol of contrato.solicitudes) {
            if (sol.etapas) {
              for (const etapa of sol.etapas) {
                if (etapa.id_etapa) etapaIds.push(etapa.id_etapa);
              }
            }
          }
          const todasLasFacturas = await facturasServicioService.getFacturasServicio(0, 1000);
          const filtradas = todasLasFacturas.filter((f: FacturaServicio) => f.id_etapa && etapaIds.includes(f.id_etapa));
          setFacturas(filtradas);
        } else {
          setFacturas([]);
        }
      } else {
        const data = await facturasServicioService.getFacturasServicio(0, 1000);
        setFacturas(data);
      }
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list') loadFacturas(); }, [view, filtroEtapa, contratoParam]);

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
          cantidad: formData.cantidad ? Number(formData.cantidad) : undefined,
          precio: formData.precio ? Number(formData.precio) : undefined,
          observaciones: formData.observaciones
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
          cantidad: formData.cantidad ? Number(formData.cantidad) : 0,
          precio: formData.precio ? Number(formData.precio) : 0,
          observaciones: formData.observaciones
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
      setSelectedContratoId(null);
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
        cantidad: item.cantidad,
        precio: item.precio,
        observaciones: item.observaciones
      });
      if (item.id_etapa) setSelectedEtapaId(item.id_etapa);
    } else {
      resetForm();
      if (etapaParam) {
        setSelectedEtapaId(Number(etapaParam));
      }
    }
    setView('form');
  };

  const handleSelectContrato = (id: number | null) => {
    setSelectedContratoId(id);
    setSelectedEtapaId(null);
    if (id) loadEtapasByContrato(id);
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
    return e?.nombre_etapa || `Etapa #${e.numero_etapa}`;
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
                      {getMonedaSymbol(item.id_moneda)} {(Number(item.precio) * Number(item.cantidad)).toFixed(2)}
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
                  label="Contrato"
                  placeholder="Buscar contrato..."
                  items={contratos}
                  selectedId={selectedContratoId}
                  getLabel={(c) => c.nombre || `Contrato #${c.id_contrato}`}
                  getId={(c) => c.id_contrato}
                  onSelect={handleSelectContrato}
                />
                <SearchSelect
                  label="Etapa"
                  placeholder={selectedContratoId ? 'Buscar etapa...' : 'Primero seleccione un contrato'}
                  items={etapas}
                  selectedId={selectedEtapaId}
                  getLabel={(e) => e.nombre_etapa || `Etapa #${e.numero_etapa}`}
                  getId={(e) => e.id_etapa}
                  onSelect={handleSelectEtapa}
                  disabled={!selectedContratoId}
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
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
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
              <Label className="text-sm font-medium">Cantidad</Label>
              <Input type="number" value={formData.cantidad || ''} onChange={(e: any) => setFormData({ ...formData, cantidad: e.target.value })} className="mt-1" placeholder="0" />
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
                  <p className="font-bold text-green-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {(Number(detailModal.item.precio) * Number(detailModal.item.cantidad)).toFixed(2)}</p>
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
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Cantidad</p>
                  <p className="font-bold text-gray-900 text-xl">{detailModal.item.cantidad}</p>
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
