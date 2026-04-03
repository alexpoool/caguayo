import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { suplementosService, contratosService } from '../../services/api';
import type { ContratoWithDetails } from '../../types/contrato';
import type { SuplementoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Layers, FileText, DollarSign, Calendar, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function SuplementosPage() {
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get('contrato');

  const [view, setView] = useState<View>('list');
  
  const [suplementos, setSuplementos] = useState<SuplementoWithDetails[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [estados, setEstados] = useState<{id: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(initialContratoId ? Number(initialContratoId) : null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: SuplementoWithDetails | null }>({ isOpen: false, item: null });
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
      const [contratosRes] = await Promise.all([
        contratosService.getContratos(0, 1000)
      ]);
      setContratos(contratosRes);
      setEstados([{ id: 1, nombre: 'ACTIVO' }, { id: 2, nombre: 'CANCELADO' }, { id: 3, nombre: 'FINALIZADO' }, { id: 4, nombre: 'PENDIENTE' }]);
    } catch (error) { console.error('Error:', error); }
  };

  const loadSuplementos = async () => {
    try {
      if (initialContratoId) {
        const data = await suplementosService.getSuplementosByContrato(Number(initialContratoId));
        setSuplementos(data);
      } else {
        const data = await suplementosService.getSuplementos();
        setSuplementos(data);
      }
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { 
    if (view === 'list') loadSuplementos(); 
  }, [view, initialContratoId]);

  const filteredSuplementos = suplementos.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.codigo?.toLowerCase().includes(term) || 
           s.nombre?.toLowerCase().includes(term);
  });

  const handleSave = async () => {
    try {
      const data = { 
        id_contrato: selectedContratoId, 
        nombre: formData.nombre || '',
        id_estado: Number(formData.id_estado) || 1, 
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        documento: formData.documento
      };
      editingId ? await suplementosService.updateSuplemento(editingId, data as any) : await suplementosService.createSuplemento(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadSuplementos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar suplemento?',
      message: `¿Está seguro de eliminar el suplemento "${nombre}"?`,
      onConfirm: async () => {
        try {
          await suplementosService.deleteSuplemento(id);
          toast.success('Eliminado');
          loadSuplementos();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: SuplementoWithDetails) => {
    if (item) {
      setEditingId(item.id_suplemento);
      setFormData({ 
        nombre: item.nombre, 
        id_estado: item.id_estado, 
        fecha: item.fecha, 
        documento: item.documento
      });
    } else { resetForm(); }
    setView('form');
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suplementos</h1>
            <p className="text-gray-500 mt-1">Gestión de suplementos de contratos</p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          disabled={contratos.length === 0}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
        >
          <Plus className="h-4 w-4" />
          Nuevo Suplemento
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600" />
                      Código
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      Nombre
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      Monto
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suplementos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      No hay suplementos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuplementos.map((item) => (
                    <TableRow key={item.id_suplemento} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded text-sm font-mono font-medium">
                          <Tag className="h-3 w-3" />
                          {item.codigo || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{item.nombre}</span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        ${Number(item.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.estado?.nombre === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                          item.estado?.nombre === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                          item.estado?.nombre === 'FINALIZADO' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.estado?.nombre || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{item.fecha}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openForm(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id_suplemento, item.nombre)} className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8" title="Eliminar">
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
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Suplemento' : 'Nuevo Suplemento'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos del suplemento</p>
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
            <Layers className="h-5 w-5 text-amber-600" />
            Información del Suplemento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} className="mt-1" placeholder="Nombre del suplemento" />
            </div>
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>
                {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Documento</Label>
              <Input value={formData.documento || ''} onChange={(e: any) => setFormData({...formData, documento: e.target.value})} className="mt-1" placeholder="Número de documento" />
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
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
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                    <Layers className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre}</h3>
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Monto</p>
                  <p className="font-bold text-green-900 text-xl">${Number(detailModal.item.monto).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    detailModal.item.estado?.nombre === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                    detailModal.item.estado?.nombre === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                    detailModal.item.estado?.nombre === 'FINALIZADO' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {detailModal.item.estado?.nombre || 'N/A'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
                {detailModal.item.documento && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Documento</p>
                    <p className="text-gray-700">{detailModal.item.documento}</p>
                  </div>
                )}
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
