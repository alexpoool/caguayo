import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { serviciosProyectoService, monedaService } from '../../services/api';
import type { Servicio, ServicioCreate, ServicioUpdate } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Wrench, DollarSign, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function ServiciosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servicioParam = searchParams.get('servicio');
  const [view, setView] = useState<View>('list');

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: Servicio | null }>({ isOpen: false, item: null });
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
      const monedasRes = await monedaService.getMonedas(0, 100);
      setMonedas(monedasRes);
    } catch (error) { console.error('Error:', error); }
  };

  const loadServicios = async () => {
    try { 
      const data = await serviciosProyectoService.getServicios(); 
      if (servicioParam) {
        setServicios(data.filter(s => s.id_servicio === Number(servicioParam)));
      } else {
        setServicios(data);
      }
    }
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list') loadServicios(); }, [view]);

  const handleSave = async () => {
    try {
      if (editingId) {
        const data: ServicioUpdate = {
          codigo_servicio: formData.codigo_servicio,
          concepto: formData.concepto,
          unidad_medida: formData.unidad_medida,
          precio: formData.precio ? Number(formData.precio) : undefined,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          observaciones: formData.observaciones
        };
        await serviciosProyectoService.updateServicio(editingId, data);
      } else {
        const data: ServicioCreate = {
          concepto: formData.concepto,
          unidad_medida: formData.unidad_medida,
          precio: formData.precio ? Number(formData.precio) : 0,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
          observaciones: formData.observaciones
        };
        await serviciosProyectoService.createServicio(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadServicios();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, concepto: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar servicio?',
      message: `¿Está seguro de eliminar el servicio "${concepto}"?`,
      onConfirm: async () => {
        try {
          await serviciosProyectoService.deleteServicio(id);
          toast.success('Eliminado');
          loadServicios();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => { setFormData({ unidad_medida: 'unidades' }); setEditingId(null); };

  const openForm = (item?: Servicio) => {
    if (item) {
      setEditingId(item.id_servicio);
      setFormData({
        codigo_servicio: item.codigo_servicio,
        concepto: item.concepto,
        unidad_medida: item.unidad_medida,
        precio: item.precio,
        id_moneda: item.id_moneda,
        observaciones: item.observaciones
      });
    } else { resetForm(); }
    setView('form');
  };

  const filteredServicios = useMemo(() => {
    if (!searchTerm) return servicios;
    return servicios.filter(s =>
      s.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.codigo_servicio?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [servicios, searchTerm]);

  const getMonedaNombre = (id?: number) => {
    if (!id) return 'N/A';
    return monedas.find(m => m.id_moneda === id)?.nombre || 'N/A';
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {servicioParam && (
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
            <p className="text-gray-500 mt-1">
              {filteredServicios.length === servicios.length
                ? `Gestión de servicios (${servicios.length} items)`
                : `Mostrando ${filteredServicios.length} de ${servicios.length} servicios`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar servicios..."
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
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-teal-600" />
                    Concepto
                  </div>
                </TableHead>
                <TableHead>Unidad Medida</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Precio
                  </div>
                </TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServicios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron servicios que coincidan con la búsqueda' : 'No hay servicios'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServicios.map((item) => (
                  <TableRow key={item.id_servicio} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo_servicio || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.concepto || 'N/A'}</span>
                    </TableCell>
                    <TableCell>{item.unidad_medida || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.precio).toFixed(2)}
                    </TableCell>
                    <TableCell>{getMonedaNombre(item.id_moneda)}</TableCell>
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
                          onClick={() => handleDelete(item.id_servicio, item.concepto || 'N/A')}
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
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos del servicio</p>
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
            <Wrench className="h-5 w-5 text-teal-600" />
            Información del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Concepto</Label>
              <Input value={formData.concepto || ''} onChange={(e: any) => setFormData({...formData, concepto: e.target.value})} className="mt-1" placeholder="Concepto del servicio" />
            </div>
            <div>
              <Label className="text-sm font-medium">Unidad de Medida</Label>
              <Input value={formData.unidad_medida || ''} onChange={(e: any) => setFormData({...formData, unidad_medida: e.target.value})} className="mt-1" placeholder="Ej: Unidad, Metro, Hora" />
            </div>
            <div>
              <Label className="text-sm font-medium">Precio</Label>
              <Input type="number" step="0.01" value={formData.precio || ''} onChange={(e: any) => setFormData({...formData, precio: e.target.value})} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones</Label>
              <Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})} className="mt-1" placeholder="Observaciones adicionales" />
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
                    <Wrench className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.concepto || 'Sin concepto'}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_servicio || 'Sin código'}</p>
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
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Precio</p>
                  <p className="font-bold text-gray-900 text-xl">${Number(detailModal.item.precio).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{getMonedaNombre(detailModal.item.id_moneda)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Código</p>
                  <p className="font-bold text-gray-900 font-mono">{detailModal.item.codigo_servicio || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unidad de Medida</p>
                  <p className="font-bold text-gray-900">{detailModal.item.unidad_medida || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones}</p>
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
    </div>
  );
}
