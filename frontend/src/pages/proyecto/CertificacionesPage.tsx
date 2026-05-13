import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { certificacionesService, etapasProyectoService, solicitudesService } from '../../services/api';
import type { Certificacion, CertificacionCreate, CertificacionUpdate, Etapa } from '../../types/servicio';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, FileText, X, Check, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

type View = 'list' | 'form';

export function CertificacionesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const etapaIdParam = searchParams.get('etapa');
  
  const [view, setView] = useState<View>('list');
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [solicitudesMap, setSolicitudesMap] = useState<Record<number, { codigo_proyecto?: string; id_solicitud_servicio: number }>>({});
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: Certificacion | null }>({ isOpen: false, item: null });
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

  const filteredCertificaciones = useMemo(() => {
    if (!searchTerm) return certificaciones;
    const term = searchTerm.toLowerCase();
    return certificaciones.filter(c => 
      c.nombre.toLowerCase().includes(term) ||
      c.obra?.toLowerCase().includes(term) ||
      c.constructor?.toLowerCase().includes(term) ||
      c.inversionista?.toLowerCase().includes(term)
    );
  }, [certificaciones, searchTerm]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const precio = Number(formData.precio_servicio) || 0;
    const gasto = Number(formData.gasto_caguayo) || 10;
    const gastoLimitado = Math.min(gasto, 100);
    const aCobrar = precio + (precio * gastoLimitado / 100);
    setFormData(prev => ({ ...prev, gasto_caguayo: gastoLimitado, a_cobrar: aCobrar }));
  }, [formData.precio_servicio, formData.gasto_caguayo]);

  const loadData = async () => {
    try {
      const [certRes, etapasRes, solicRes] = await Promise.all([
        etapaIdParam ? certificacionesService.getCertificacionesByEtapa(Number(etapaIdParam)) : certificacionesService.getCertificaciones(),
        etapasProyectoService.getAllEtapas(),
        solicitudesService.getSolicitudes(0, 1000)
      ]);
      setCertificaciones(certRes);
      setEtapas(etapasRes);
      const map: Record<number, { codigo_proyecto?: string; id_solicitud_servicio: number }> = {};
      solicRes.forEach((s: any) => { map[s.id_solicitud_servicio] = s; });
      setSolicitudesMap(map);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      id_etapa: etapaIdParam ? Number(etapaIdParam) : '',
      nombre_constructor: '',
      inversionista: '',
      obra: '',
      objeto_obra: '',
      actividad: '',
      descripcion: '',
      observaciones: '',
      fecha: new Date().toISOString().split('T')[0],
      precio_servicio: 0,
      gasto_caguayo: 10,
      a_cobrar: 0
    });
    setEditingId(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (item: Certificacion) => {
    setFormData({
      nombre: item.nombre,
      id_etapa: item.id_etapa,
      nombre_constructor: item.constructor || '',
      inversionista: item.inversionista || '',
      obra: item.obra || '',
      objeto_obra: item.objeto_obra || '',
      actividad: item.actividad || '',
      descripcion: item.descripcion || '',
      observaciones: item.observaciones || '',
      fecha: item.fecha || '',
      precio_servicio: item.precio_servicio,
      gasto_caguayo: item.gasto_caguayo,
      a_cobrar: item.a_cobrar
    });
    setEditingId(item.id_certificacion);
    setView('form');
  };

  const handleSave = async () => {
    try {
      const data: CertificacionCreate = {
        nombre: formData.nombre,
        id_etapa: Number(formData.id_etapa),
        constructor: formData.nombre_constructor || undefined,
        inversionista: formData.inversionista || undefined,
        obra: formData.obra || undefined,
        objeto_obra: formData.objeto_obra || undefined,
        actividad: formData.actividad || undefined,
        descripcion: formData.descripcion || undefined,
        observaciones: formData.observaciones || undefined,
        fecha: formData.fecha || undefined,
        precio_servicio: Number(formData.precio_servicio) || 0,
        gasto_caguayo: Number(formData.gasto_caguayo) || 0,
        a_cobrar: Number(formData.a_cobrar) || 0
      };

      if (editingId) {
        const updateData: any = data;
        await certificacionesService.updateCertificacion(editingId, updateData);
        toast.success('Certificación actualizada');
      } else {
        await certificacionesService.createCertificacion(data);
        toast.success('Certificación creada');
      }
      await loadData();
      setView('list');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = (item: Certificacion) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Certificación',
      message: `¿Está seguro de eliminar la certificación "${item.nombre}"?`,
      onConfirm: async () => {
        try {
          await certificacionesService.deleteCertificacion(item.id_certificacion);
          toast.success('Certificación eliminada');
          await loadData();
        } catch (error) {
          toast.error('Error al eliminar');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      type: 'danger'
    });
  };

  const openDetail = (item: Certificacion) => {
    setDetailModal({ isOpen: true, item });
  };

  const getEtapaNombre = (idEtapa: number) => {
    const etapa = etapas.find(e => e.id_etapa === idEtapa);
    if (!etapa) return `Etapa ${idEtapa}`;
    const solic = solicitudesMap[etapa.id_solicitud_servicio];
    return `${solic?.codigo_proyecto || 'Proyecto'} - ${etapa.nombre_etapa || `Etapa ${etapa.numero_etapa}`}`;
  };

  if (view === 'form') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar' : 'Nueva'} Certificación</h2>
              <p className="text-gray-500 mt-1">Complete los datos de la certificación</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setView('list'); resetForm(); }} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card className="shadow-sm border-gray-200 mt-6">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-teal-600" />
              Información de la Certificación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nombre *</Label>
                <Input value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Nombre de la certificación" />
              </div>

              <div>
                <Label>Etapa *</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.id_etapa || ''}
                  onChange={e => setFormData({...formData, id_etapa: e.target.value})}
                >
                  <option value="">Seleccionar etapa</option>
                  {etapas.map(e => (
                    <option key={e.id_etapa} value={e.id_etapa}>{getEtapaNombre(e.id_etapa)}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Fecha</Label>
                <Input type="date" value={formData.fecha || ''} onChange={e => setFormData({...formData, fecha: e.target.value})} />
              </div>

              <div>
                <Label>Constructor</Label>
                <Input value={formData.nombre_constructor || ''} onChange={e => setFormData({...formData, nombre_constructor: e.target.value})} placeholder="Constructor" />
              </div>

              <div>
                <Label>Inversionista</Label>
                <Input value={formData.inversionista || ''} onChange={e => setFormData({...formData, inversionista: e.target.value})} placeholder="Inversionista" />
              </div>

              <div className="md:col-span-2">
                <Label>Obra</Label>
                <Input value={formData.obra || ''} onChange={e => setFormData({...formData, obra: e.target.value})} placeholder="Obra" />
              </div>

              <div className="md:col-span-2">
                <Label>Objeto de Obra</Label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  value={formData.objeto_obra || ''}
                  onChange={e => setFormData({...formData, objeto_obra: e.target.value})}
                  placeholder="Objeto de la obra"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Actividad</Label>
                <Input value={formData.actividad || ''} onChange={e => setFormData({...formData, actividad: e.target.value})} placeholder="Actividad" />
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  value={formData.descripcion || ''}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción de la certificación"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Observaciones</Label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  value={formData.observaciones || ''}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div>
                <Label>Precio Servicio ($)</Label>
                <Input type="number" placeholder="0.00" value={formData.precio_servicio || ''} onChange={e => setFormData({...formData, precio_servicio: e.target.value})} />
              </div>

              <div>
                <Label>Gasto Caguayo (%)</Label>
                <Input type="number" min={0} max={100} placeholder="10" value={formData.gasto_caguayo || ''} onChange={e => setFormData({...formData, gasto_caguayo: e.target.value})} />
              </div>

              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <Label className="text-teal-700 font-medium">A Cobrar ($)</Label>
                <p className="text-2xl font-bold text-teal-800 mt-1">${Number(formData.a_cobrar || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setView('list')}>Cancelar</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {etapaIdParam && (
            <button onClick={() => navigate(`/proyectos/etapas?solicitud=${etapas.find(e => e.id_etapa === Number(etapaIdParam))?.id_solicitud_servicio}`)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Certificaciones</h1>
            <p className="text-gray-500 mt-1">
              {filteredCertificaciones.length} certificación{filteredCertificaciones.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Certificación
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar certificaciones..."
            className="pl-10 pr-4 py-2 border rounded-lg w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Constructor</TableHead>
              <TableHead>Inversionista</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Precio Servicio</TableHead>
              <TableHead className="text-right">A Cobrar</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCertificaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No hay certificaciones registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredCertificaciones.map(cert => (
                <TableRow key={cert.id_certificacion} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(cert)}>
                  <TableCell className="font-medium">{cert.nombre}</TableCell>
                  <TableCell>{cert.constructor || '-'}</TableCell>
                  <TableCell>{cert.inversionista || '-'}</TableCell>
                  <TableCell>{cert.obra || '-'}</TableCell>
                  <TableCell>{cert.fecha ? new Date(cert.fecha).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">${Number(cert.precio_servicio).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${Number(cert.a_cobrar).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(cert); }} className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(cert); }} className="p-1 hover:bg-red-50 text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          type={confirmModal.type}
        />
      )}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre}</h3>
                    <p className="text-sm text-gray-500">Certificación</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Constructor</p>
                  <p className="font-bold text-gray-900">{detailModal.item.constructor || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Inversionista</p>
                  <p className="font-bold text-gray-900">{detailModal.item.inversionista || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.obra && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Obra</p>
                  <p className="font-bold text-gray-900">{detailModal.item.obra}</p>
                </div>
              )}
              {detailModal.item.objeto_obra && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objeto de Obra</p>
                  <p className="font-bold text-gray-900">{detailModal.item.objeto_obra}</p>
                </div>
              )}
              {detailModal.item.actividad && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Actividad</p>
                  <p className="font-bold text-gray-900">{detailModal.item.actividad}</p>
                </div>
              )}
              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="font-bold text-gray-900">{detailModal.item.descripcion}</p>
                </div>
              )}
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="font-bold text-gray-900">{detailModal.item.observaciones}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900 text-lg">{detailModal.item.fecha ? new Date(detailModal.item.fecha).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Gasto Caguayo</p>
                  <p className="font-bold text-gray-900 text-lg">{detailModal.item.gasto_caguayo}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Precio Servicio</p>
                  <p className="font-bold text-purple-900 text-xl">${Number(detailModal.item.precio_servicio).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">A Cobrar</p>
                  <p className="font-bold text-teal-900 text-xl">${Number(detailModal.item.a_cobrar).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}