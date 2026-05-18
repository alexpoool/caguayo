import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { tareasEtapaService, etapasProyectoService, serviciosProyectoService, monedaService } from '../../services/api';
import type { TareaEtapa, TareaEtapaCreate, TareaEtapaUpdate, Etapa, Servicio, ServicioCreate } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, ListChecks, X, Eye, DollarSign, Hash, FileText, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function TareasEtapaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get('etapa');
  const [view, setView] = useState<View>('list');

  const [tareas, setTareas] = useState<TareaEtapa[]>([]);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [showDropdownServicio, setShowDropdownServicio] = useState(false);
  const [showNuevoServicioModal, setShowNuevoServicioModal] = useState(false);
  const [servicioFormData, setServicioFormData] = useState<Record<string, any>>({});
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  const dropdownServicioRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: TareaEtapa | null }>({ isOpen: false, item: null });
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

  const loadInitialData = async () => {
    try {
      const [serviciosRes, monedasRes] = await Promise.all([
        serviciosProyectoService.getServicios(0, 1000),
        monedaService.getMonedas(0, 100)
      ]);
      setServicios(serviciosRes);
      setMonedas(monedasRes);
      if (etapaParam) {
        const etapaData = await etapasProyectoService.getEtapa(Number(etapaParam));
        setEtapa(etapaData);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadTareas = async () => {
    if (!etapaParam) return;
    try {
      const data = await tareasEtapaService.getTareasByEtapa(Number(etapaParam));
      setTareas(data);
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list' && etapaParam) loadTareas(); }, [view, etapaParam]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownServicioRef.current && !dropdownServicioRef.current.contains(e.target as Node)) {
        setShowDropdownServicio(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    try {
      if (editingId) {
        const data: TareaEtapaUpdate = {
          id_servicio: formData.id_servicio ? Number(formData.id_servicio) : undefined,
          concepto_modificado: formData.concepto_modificado,
          unidad_medida: formData.unidad_medida,
          cantidad: formData.cantidad ? Number(formData.cantidad) : undefined,
          precio_ajustado: formData.precio_ajustado ? Number(formData.precio_ajustado) : undefined,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          observaciones_ajustadas: formData.observaciones_ajustadas
        };
        await tareasEtapaService.updateTareaEtapa(editingId, data);
        toast.success('Actualizado');
      } else {
        const data: TareaEtapaCreate = {
          id_etapa: Number(etapaParam),
          id_servicio: formData.id_servicio ? Number(formData.id_servicio) : undefined,
          concepto_modificado: formData.concepto_modificado,
          unidad_medida: formData.unidad_medida,
          cantidad: formData.cantidad ? Number(formData.cantidad) : 0,
          precio_ajustado: formData.precio_ajustado ? Number(formData.precio_ajustado) : 0,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          observaciones_ajustadas: formData.observaciones_ajustadas
        };
        await tareasEtapaService.createTareaEtapa(data);
        toast.success('Tarea creada');
      }
      setView('list');
      resetForm();
      loadTareas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, concepto: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar tarea?',
      message: `¿Está seguro de eliminar la tarea "${concepto || 'Sin concepto'}"?`,
      onConfirm: async () => {
        try {
          await tareasEtapaService.deleteTareaEtapa(id);
          toast.success('Eliminado');
          loadTareas();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const handleServicioChange = (servicioId: number) => {
    if (editingId) {
      setFormData({ ...formData, id_servicio: servicioId });
      return;
    }
    const servicio = servicios.find(s => s.id_servicio === servicioId);
    if (servicio) {
      const numeroEtapa = etapa?.numero_etapa || 'X';
      const codigoExtendido = `ETA${numeroEtapa}-SRV${servicioId}-${servicio.codigo_servicio || ''}`;
      
      setFormData({
        ...formData,
        id_servicio: servicioId,
        codigo_extendido: codigoExtendido,
        concepto_modificado: servicio.concepto || '',
        unidad_medida: servicio.unidad_medida || 'unidades',
        precio_ajustado: servicio.precio || 0,
        id_moneda: servicio.id_moneda || '',
        observaciones_ajustadas: servicio.observaciones || ''
      });
    }
  };

  const resetForm = () => {
    setFormData({ unidad_medida: 'unidades', cantidad: 1, id_moneda: etapa?.id_moneda || '' });
    setEditingId(null);
    setServicioSeleccionado(null);
    setBusquedaServicio('');
    setShowDropdownServicio(false);
  };

  const openForm = (item?: TareaEtapa) => {
    if (item) {
      setEditingId(item.id_tarea_etapa);
      setFormData({
        id_servicio: item.id_servicio,
        codigo_extendido: item.codigo_extendido,
        concepto_modificado: item.concepto_modificado,
        unidad_medida: item.unidad_medida,
        cantidad: item.cantidad,
        precio_ajustado: item.precio_ajustado,
        id_moneda: item.id_moneda,
        observaciones_ajustadas: item.observaciones_ajustadas
      });
      const servicio = servicios.find(s => s.id_servicio === item.id_servicio);
      if (servicio) {
        setServicioSeleccionado(servicio);
        setBusquedaServicio(servicio.concepto || servicio.codigo_servicio || '');
      }
    } else { resetForm(); }
    setView('form');
  };

  const filteredTareas = useMemo(() => {
    if (!searchTerm) return tareas;
    return tareas.filter(t =>
      t.codigo_extendido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.concepto_modificado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.observaciones_ajustadas?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tareas, searchTerm]);

  const serviciosFiltrados = useMemo(() => {
    if (!busquedaServicio.trim()) return servicios;
    const q = busquedaServicio.toLowerCase();
    return servicios.filter(s =>
      s.concepto?.toLowerCase().includes(q) ||
      s.codigo_servicio?.toLowerCase().includes(q) ||
      s.unidad_medida?.toLowerCase().includes(q)
    );
  }, [busquedaServicio, servicios]);

  const handleSeleccionarServicio = (s: Servicio) => {
    setServicioSeleccionado(s);
    setBusquedaServicio(s.concepto || s.codigo_servicio || '');
    setShowDropdownServicio(false);

    if (editingId) {
      setFormData(prev => ({ ...prev, id_servicio: s.id_servicio }));
      return;
    }

    const numeroEtapa = etapa?.numero_etapa || 'X';
    const codigoExtendido = `ETA${numeroEtapa}-SRV${s.id_servicio}-${s.codigo_servicio || ''}`;

    setFormData(prev => ({
      ...prev,
      id_servicio: s.id_servicio,
      codigo_extendido: codigoExtendido,
      concepto_modificado: s.concepto || '',
      unidad_medida: s.unidad_medida || 'unidades',
      precio_ajustado: s.precio || 0,
      id_moneda: s.id_moneda || '',
      observaciones_ajustadas: s.observaciones || ''
    }));
  };

  const resetServicioForm = () => {
    setServicioFormData({});
    setServicioSeleccionado(null);
    setBusquedaServicio('');
    setShowDropdownServicio(false);
  };

  const getServicioName = (id?: number) => {
    if (!id) return 'N/A';
    const s = servicios.find(sv => sv.id_servicio === id);
    return s?.concepto || `Servicio #${id}`;
  };

  const getMonedaSymbol = (id?: number) => {
    if (!id) return '';
    const m = monedas.find(mo => mo.id_moneda === id);
    return m?.simbolo || '';
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <ListChecks className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tareas de Etapa</h1>
            <p className="text-gray-500 mt-1">
              {etapa ? `Etapa: ${etapa.nombre_etapa || `#${etapa.numero_etapa}`}` : 'Cargando...'}
              {` · ${filteredTareas.length} tarea(s)`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-teal-600" />
                    Código Extendido
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    Concepto (modificado)
                  </div>
                </TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Precio Ajustado
                  </div>
                </TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Servicios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTareas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron tareas que coincidan con la búsqueda' : 'No hay tareas registradas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTareas.map((item) => (
                  <TableRow key={item.id_tarea_etapa} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Hash className="h-3 w-3" />
                        {item.codigo_extendido || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.concepto_modificado || 'Sin concepto'}</span>
                    </TableCell>
                    <TableCell className="text-gray-700">{item.cantidad}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {getMonedaSymbol(item.id_moneda)} {Number(item.precio_ajustado).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{getMonedaSymbol(item.id_moneda)}</span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {item.id_servicio ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/proyectos/servicios?servicio=${item.id_servicio}`)}
                          className="text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                        >
                          Ver
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin servicio</span>
                      )}
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
                          onClick={() => handleDelete(item.id_tarea_etapa, item.concepto_modificado || '')}
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
            <ListChecks className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            <p className="text-gray-500 mt-1">{etapa ? `Etapa: ${etapa.nombre_etapa || `#${etapa.numero_etapa}`}` : ''}</p>
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
            <ListChecks className="h-5 w-5 text-teal-600" />
            Información de la Tarea
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-2 items-start">
              <div ref={dropdownServicioRef} className="relative flex-1">
                <Label className="text-sm font-medium">Servicio</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar servicio..."
                    value={busquedaServicio}
                    disabled={!!servicioSeleccionado}
                    onChange={(e) => { setBusquedaServicio(e.target.value); setShowDropdownServicio(true); setServicioSeleccionado(null); }}
                    onFocus={() => setShowDropdownServicio(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-gray-100"
                  />
                  {servicioSeleccionado && (
                    <button
                      type="button"
                      onClick={() => { setServicioSeleccionado(null); setBusquedaServicio(''); setFormData(prev => ({ ...prev, id_servicio: '' })); resetServicioForm(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showDropdownServicio && serviciosFiltrados.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {serviciosFiltrados.map(s => (
                      <button
                        key={s.id_servicio}
                        type="button"
                        onClick={() => handleSeleccionarServicio(s)}
                        className="w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-medium text-gray-900">{s.concepto || 'Sin concepto'}</span>
                        <span className="text-gray-500 text-sm ml-2">{s.codigo_servicio}</span>
                        {s.unidad_medida && <span className="text-gray-400 text-xs ml-2">({s.unidad_medida})</span>}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdownServicio && serviciosFiltrados.length === 0 && busquedaServicio && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No se encontraron resultados
                  </div>
                )}
              </div>
              <div className="pt-7">
                <button
                  type="button"
                  onClick={() => setShowNuevoServicioModal(true)}
                  className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Servicio
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Concepto Modificado</Label>
              <Input value={formData.concepto_modificado || ''} onChange={(e: any) => setFormData({ ...formData, concepto_modificado: e.target.value })} className="mt-1" placeholder="Concepto modificado de la tarea" />
            </div>
            <div>
              <Label className="text-sm font-medium">Unidad de Medida</Label>
              <Input value={formData.unidad_medida || ''} onChange={(e: any) => setFormData({ ...formData, unidad_medida: e.target.value })} className="mt-1" placeholder="Unidad de medida" />
            </div>
            <div>
              <Label className="text-sm font-medium">Cantidad</Label>
              <Input type="number" value={formData.cantidad || ''} onChange={(e: any) => setFormData({ ...formData, cantidad: e.target.value })} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-sm font-medium">Precio Ajustado</Label>
              <Input type="number" step="0.01" value={formData.precio_ajustado || ''} onChange={(e: any) => setFormData({ ...formData, precio_ajustado: e.target.value })} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones Ajustadas</Label>
              <Input value={formData.observaciones_ajustadas || ''} onChange={(e: any) => setFormData({ ...formData, observaciones_ajustadas: e.target.value })} className="mt-1" placeholder="Observaciones" />
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
                    <ListChecks className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.concepto_modificado || 'Sin concepto'}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_extendido || 'Sin código'}</p>
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
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Precio Ajustado</p>
                  <p className="font-bold text-green-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {Number(detailModal.item.precio_ajustado).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Cantidad</p>
                  <p className="font-bold text-gray-900 text-xl">{detailModal.item.cantidad}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unidad de Medida</p>
                  <p className="font-bold text-gray-900">{detailModal.item.unidad_medida || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{getMonedaSymbol(detailModal.item.id_moneda) || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Servicio</p>
                <p className="font-bold text-gray-900">{getServicioName(detailModal.item.id_servicio)}</p>
              </div>
              {detailModal.item.observaciones_ajustadas && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones_ajustadas}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showNuevoServicioModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <Wrench className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Nuevo Servicio</h3>
                    <p className="text-sm text-gray-500">Crear nuevo servicio para asignar a la tarea</p>
                  </div>
                </div>
                <button onClick={() => setShowNuevoServicioModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Concepto</Label>
                  <Input value={servicioFormData.concepto || ''} onChange={(e: any) => setServicioFormData({...servicioFormData, concepto: e.target.value})} className="mt-1" placeholder="Concepto del servicio" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Unidad de Medida</Label>
                  <Input value={servicioFormData.unidad_medida || ''} onChange={(e: any) => setServicioFormData({...servicioFormData, unidad_medida: e.target.value})} className="mt-1" placeholder="Ej: Unidad, Metro, Hora" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Precio</Label>
                  <Input type="number" step="0.01" value={servicioFormData.precio || ''} onChange={(e: any) => setServicioFormData({...servicioFormData, precio: e.target.value})} className="mt-1" placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Moneda</Label>
                  <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={servicioFormData.id_moneda || ''} onChange={(e: any) => setServicioFormData({...servicioFormData, id_moneda: e.target.value})}>
                    <option value="">Seleccionar moneda</option>
                    {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Observaciones</Label>
                  <Input value={servicioFormData.observaciones || ''} onChange={(e: any) => setServicioFormData({...servicioFormData, observaciones: e.target.value})} className="mt-1" placeholder="Observaciones adicionales" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowNuevoServicioModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                disabled={guardandoServicio}
                onClick={async () => {
                  try {
                    setGuardandoServicio(true);
                    const nuevoServicio = await serviciosProyectoService.createServicio(servicioFormData as ServicioCreate);
                    setServicios(prev => [...prev, nuevoServicio]);
                    handleSeleccionarServicio(nuevoServicio);
                    setShowNuevoServicioModal(false);
                    setServicioFormData({});
                    toast.success('Servicio creado');
                  } catch (error: any) {
                    toast.error(error.message || 'Error al crear servicio');
                  } finally {
                    setGuardandoServicio(false);
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
              >
                {guardandoServicio ? 'Guardando...' : 'Guardar Servicio'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
