import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { suplementosService, contratosService, configuracionService } from '../../services/api';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import type { ContratoWithDetails } from '../../types/contrato';
import type { SuplementoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Layers, FileText, DollarSign, Calendar, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { required } from '../../utils/validacionFormularios';

type View = 'list' | 'form';

export function SuplementosPage() {
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get('contrato');

  const [view, setView] = useState<View>('list');
  
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [estados, setEstados] = useState<{id_estado_contrato: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(initialContratoId ? Number(initialContratoId) : null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [contratoSearch, setContratoSearch] = useState('');
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const contratoRef = useRef<HTMLDivElement | null>(null);
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

  // ── Infinite scroll ──────────────────────────────────────────────────────

  const {
    items: suplementos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    refresh,
    reset,
  } = useInfiniteList<SuplementoWithDetails>({
    queryKeyBase: 'suplementos',
    queryFn: (skip, limit) =>
      initialContratoId
        ? suplementosService.getSuplementosByContrato(Number(initialContratoId), skip, limit)
        : suplementosService.getSuplementos(skip, limit),
    extraQueryKeyParams: [initialContratoId],
    limit: 100,
  });

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [contratosRes, estadosRes] = await Promise.all([
        contratosService.getContratos(0, 1000),
        configuracionService.getEstadosContrato()
      ]);
      setContratos(contratosRes);
      setEstados(estadosRes);
    } catch (error) { console.error('Error:', error); }
  };

  const filteredContratos = useMemo(() => {
    if (!contratoSearch) return contratos;
    const term = contratoSearch.toLowerCase();
    return contratos.filter(c => c.nombre.toLowerCase().includes(term));
  }, [contratos, contratoSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contratoRef.current && !contratoRef.current.contains(e.target as Node)) {
        setShowContratoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuplementos = useMemo(() => {
    if (!searchTerm) return suplementos;
    const term = searchTerm.toLowerCase();
    return suplementos.filter(s =>
      s.codigo?.toLowerCase().includes(term) ||
      s.nombre?.toLowerCase().includes(term)
    );
  }, [suplementos, searchTerm]);

  const handleSave = async () => {
    if (!selectedContratoId) {
      toast.error('Debe seleccionar un contrato');
      return;
    }
    const nombreErr = required(formData.nombre, 'Nombre');
    if (nombreErr) {
      toast.error(nombreErr);
      return;
    }
    try {
      const data = { 
        id_contrato: selectedContratoId, 
        nombre: formData.nombre || '',
        id_estado: Number(formData.id_estado) || (estados.length > 0 ? estados[0].id_estado_contrato : 1), 
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        monto: formData.monto ? Number(formData.monto) : 0,
        documento: formData.documento
      };
      editingId ? await suplementosService.updateSuplemento(editingId, data as any) : await suplementosService.createSuplemento(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      refresh();
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
          refresh();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
    setSelectedContratoId(initialContratoId ? Number(initialContratoId) : null);
  };

  const openForm = (item?: SuplementoWithDetails) => {
    if (item) {
      setEditingId(item.id_suplemento);
      setSelectedContratoId(item.id_contrato);
      setFormData({ 
        nombre: item.nombre, 
        id_estado: item.id_estado, 
        fecha: item.fecha, 
        monto: item.monto,
        documento: item.documento,
        id_contrato: item.id_contrato
      });
    } else { resetForm(); }
    setView('form');
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Suplementos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de suplementos ({suplementos.length} registrados)
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          disabled={contratos.length === 0}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
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
                      <FileText className="h-4 w-4 text-teal-600" />
                      Nombre
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-teal-600" />
                      Monto
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        Cargando suplementos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-red-500">
                      Error al cargar suplementos: {(error as Error)?.message || 'Error desconocido'}
                    </TableCell>
                  </TableRow>
                ) : filteredSuplementos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      {searchTerm ? 'No se encontraron suplementos que coincidan con la búsqueda' : 'No hay suplementos'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuplementos.map((item) => (
                    <TableRow key={item.id_suplemento} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
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
                          <Button variant="ghost" size="icon" onClick={() => openForm(item)} className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8" title="Editar">
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
          {/* Sentinel para infinite scroll */}
          {!isLoading && filteredSuplementos.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center py-3 border-t border-gray-100">
              {isFetchingMore ? (
                <span className="text-sm text-teal-600 flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Cargando más...
                </span>
              ) : hasMore ? (
                <span className="text-sm text-gray-400">Desplázate para cargar más</span>
              ) : (
                <span className="text-sm text-gray-400">— Fin de los resultados —</span>
              )}
            </div>
          )}
        </Card>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Suplemento' : 'Nuevo Suplemento'}</h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">Complete los datos del suplemento</p>
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
            Información del Suplemento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} className="mt-1" placeholder="Nombre del suplemento" />
            </div>
            <div ref={contratoRef}>
              <Label className="text-sm font-medium">Contrato *</Label>
              {selectedContratoId && editingId ? (
                <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {contratos.find(c => c.id_contrato === Number(selectedContratoId))?.nombre || `Contrato #${selectedContratoId}`}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input
                    value={selectedContratoId ? (contratos.find(c => c.id_contrato === selectedContratoId)?.nombre || '') : contratoSearch}
                    onChange={(e: any) => {
                      setContratoSearch(e.target.value);
                      setSelectedContratoId(null);
                      setShowContratoDropdown(true);
                    }}
                    onFocus={() => setShowContratoDropdown(true)}
                    placeholder="Buscar contrato..."
                  />
                  {showContratoDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredContratos.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No se encontraron contratos</div>
                      ) : (
                        filteredContratos.map(c => (
                          <button
                            key={c.id_contrato}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 transition-colors"
                            onClick={() => {
                              setSelectedContratoId(c.id_contrato);
                              setContratoSearch('');
                              setShowContratoDropdown(false);
                            }}
                          >
                            {c.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Monto</Label>
              <Input type="number" step="0.01" min="0" value={formData.monto ?? ''} onChange={(e: any) => setFormData({...formData, monto: e.target.value})} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>
                {estados.map(e => <option key={e.id_estado_contrato} value={e.id_estado_contrato}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="flex-1 mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors" 
                  value={formData.fecha || ''} 
                  onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, fecha: new Date().toISOString().split('T')[0]})} 
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Documento</Label>
              <Input value={formData.documento || ''} onChange={(e: any) => setFormData({...formData, documento: e.target.value})} className="mt-1" placeholder="Número de documento" />
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
