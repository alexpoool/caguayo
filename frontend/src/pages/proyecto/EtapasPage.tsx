import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { etapasProyectoService, solicitudesService, monedaService } from '../../services/api';
import type { Etapa, EtapaCreate, EtapaUpdate } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Layers, DollarSign, Tag, X, FileText, Users, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

type View = 'list' | 'form';

export function EtapasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solicitudId = searchParams.get('solicitud');
  const [view, setView] = useState<View>('list');

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [solicitudInfo, setSolicitudInfo] = useState<{ codigo_solicitud?: string; numero?: string } | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: Etapa | null }>({ isOpen: false, item: null });
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
    if (solicitudId) {
      solicitudesService.getSolicitud(Number(solicitudId))
        .then(s => setSolicitudInfo({ codigo_solicitud: s.codigo_solicitud, numero: s.numero }))
        .catch(() => setSolicitudInfo(null));
    }
  }, [solicitudId]);

  const loadInitialData = async () => {
    try {
      const monedasRes = await monedaService.getMonedas(0, 100);
      setMonedas(monedasRes);
    } catch (error) { console.error('Error:', error); }
  };

  const loadEtapas = async () => {
    if (!solicitudId) return;
    try { const data = await etapasProyectoService.getEtapasBySolicitud(Number(solicitudId)); setEtapas(data); }
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list' && solicitudId) loadEtapas(); }, [view, solicitudId]);

  const handleSave = async () => {
    try {
      if (editingId) {
        const data: EtapaUpdate = {
          nombre_etapa: formData.nombre_etapa,
          fecha_entrega: formData.fecha_entrega,
          fecha_pago: formData.fecha_pago,
          descripcion: formData.descripcion,
          valor: formData.valor ? Number(formData.valor) : undefined,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          pagada: formData.pagada === 'true' || formData.pagada === true
        };
        await etapasProyectoService.updateEtapa(editingId, data);
      } else {
        const data: EtapaCreate = {
          id_solicitud_servicio: Number(solicitudId),
          nombre_etapa: formData.nombre_etapa,
          fecha_entrega: formData.fecha_entrega,
          fecha_pago: formData.fecha_pago,
          descripcion: formData.descripcion,
          valor: formData.valor ? Number(formData.valor) : 0,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          pagada: formData.pagada === 'true' || formData.pagada === true
        };
        await etapasProyectoService.createEtapa(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadEtapas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar etapa?',
      message: `¿Está seguro de eliminar la etapa "${nombre}"?`,
      onConfirm: async () => {
        try {
          await etapasProyectoService.deleteEtapa(id);
          toast.success('Eliminado');
          loadEtapas();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: Etapa) => {
    if (item) {
      setEditingId(item.id_etapa);
      setFormData({
        numero_etapa: item.numero_etapa,
        nombre_etapa: item.nombre_etapa,
        fecha_entrega: item.fecha_entrega,
        fecha_pago: item.fecha_pago,
        descripcion: item.descripcion,
        valor: item.valor,
        id_moneda: item.id_moneda,
        pagada: item.pagada
      });
    } else { resetForm(); }
    setView('form');
  };

  const filteredEtapas = useMemo(() => {
    if (!searchTerm) return etapas;
    return etapas.filter(e =>
      e.nombre_etapa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.numero_etapa).includes(searchTerm)
    );
  }, [etapas, searchTerm]);

  const getMonedaNombre = (id?: number) => {
    if (!id) return 'N/A';
    return monedas.find(m => m.id_moneda === id)?.nombre || 'N/A';
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/proyectos/proyectos')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Proyectos
          </Button>
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Etapas</h1>
            <p className="text-gray-500 mt-1">
              {solicitudInfo ? `${solicitudInfo.codigo_solicitud || ''} ${solicitudInfo.numero || ''}`.trim() : 'Solicitud'} — {filteredEtapas.length} etapa{filteredEtapas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          disabled={!solicitudId}
        >
          <Plus className="h-4 w-4" />
          Nueva Etapa
        </Button>
      </div>

      {solicitudId && (
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm text-teal-700 font-medium">Solicitud seleccionada</p>
                <p className="text-lg font-bold text-teal-900">{solicitudInfo?.codigo_solicitud}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar etapas..."
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
                    <Tag className="h-4 w-4 text-teal-600" />
                    Nº Etapa
                  </div>
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Valor
                  </div>
                </TableHead>
                <TableHead>Pagada</TableHead>
                <TableHead>Facturas</TableHead>
                <TableHead>Realizadores</TableHead>
                <TableHead>Tareas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEtapas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron etapas que coincidan con la búsqueda' : 'No hay etapas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEtapas.map((item) => (
                  <TableRow key={item.id_etapa} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        {item.numero_etapa || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.nombre_etapa || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.valor).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.pagada ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pagada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/proyectos/facturas-servicio?etapa=${item.id_etapa}`)}
                        className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Facturas
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/proyectos/realizadores?etapa=${item.id_etapa}`)}
                        className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Realizadores
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/proyectos/tareas-etapa?etapa=${item.id_etapa}`)}
                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Tareas
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
                          onClick={() => handleDelete(item.id_etapa, item.nombre_etapa || String(item.numero_etapa) || 'N/A')}
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
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Etapa' : 'Nueva Etapa'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos de la etapa</p>
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
            <Layers className="h-5 w-5 text-teal-600" />
            Información de la Etapa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Nombre Etapa</Label>
              <Input value={formData.nombre_etapa || ''} onChange={(e: any) => setFormData({...formData, nombre_etapa: e.target.value})} className="mt-1" placeholder="Nombre de la etapa" />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha Entrega</Label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="flex-1 mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors" 
                  value={formData.fecha_entrega || ''} 
                  onChange={(e: any) => setFormData({...formData, fecha_entrega: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, fecha_entrega: new Date().toISOString().split('T')[0]})} 
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha Pago</Label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="flex-1 mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors" 
                  value={formData.fecha_pago || ''} 
                  onChange={(e: any) => setFormData({...formData, fecha_pago: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, fecha_pago: new Date().toISOString().split('T')[0]})} 
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Valor</Label>
              <Input type="number" step="0.01" value={formData.valor || ''} onChange={(e: any) => setFormData({...formData, valor: e.target.value})} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({...formData, descripcion: e.target.value})} className="mt-1" placeholder="Descripción de la etapa" />
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
                    <Layers className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre_etapa || `Etapa ${detailModal.item.numero_etapa || ''}`}</h3>
                    <p className="text-sm text-gray-500">Nº {detailModal.item.numero_etapa || 'N/A'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Valor</p>
                  <p className="font-bold text-gray-900 text-xl">${Number(detailModal.item.valor).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Estado Pago</p>
                  {detailModal.item.pagada ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Pagada</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{getMonedaNombre(detailModal.item.id_moneda)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Número Etapa</p>
                  <p className="font-bold text-gray-900">{detailModal.item.numero_etapa || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha Entrega</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_entrega || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Fecha Pago</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_pago || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-gray-700">{detailModal.item.descripcion}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-wrap">
              <button onClick={() => navigate(`/proyectos/facturas-servicio?etapa=${detailModal.item!.id_etapa}`)} className="px-4 py-2 text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm">Facturas</button>
              <button onClick={() => navigate(`/proyectos/realizadores?etapa=${detailModal.item!.id_etapa}`)} className="px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm">Realizadores</button>
              <button onClick={() => navigate(`/proyectos/tareas-etapa?etapa=${detailModal.item!.id_etapa}`)} className="px-4 py-2 text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors font-medium text-sm">Tareas</button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
