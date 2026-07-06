import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { contratosService, clientesService, monedaService, solicitudesService, configuracionService } from '../../services/api';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import type { ContratoWithDetails, ContratoCreate } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, FileText, User, DollarSign, Calendar, Tag, X, Eye, Layers, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function ContratosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClienteId = searchParams.get('cliente');
  const solicitudParam = searchParams.get('solicitud');
  const [view, setView] = useState<View>(searchParams.get('solicitud') ? 'form' : 'list');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [tiposContrato, setTiposContrato] = useState<{id_tipo_contrato: number, nombre: string}[]>([]);
  const [estados, setEstados] = useState<{id_estado_contrato: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialClienteId ? Number(initialClienteId) : null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    items: contratos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    refresh,
    reset,
  } = useInfiniteList<ContratoWithDetails>({
    queryKeyBase: 'contratos',
    queryFn: (skip, limit) =>
      contratosService.getContratos(skip, limit, filtroCliente || undefined),
    extraQueryKeyParams: [filtroCliente],
    limit: 100,
  });

  // Reiniciar scroll infinito cuando cambia el filtro de cliente
  useEffect(() => {
    reset();
  }, [filtroCliente]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: ContratoWithDetails | null }>({ isOpen: false, item: null });
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
      const [clientesRes, monedasRes, estadosRes, tiposRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100),
        configuracionService.getEstadosContrato(),
        configuracionService.getTiposContrato()
      ]);
      setClientes(clientesRes);
      setMonedas(monedasRes);
      setEstados(estadosRes);
      setTiposContrato(tiposRes);
    } catch (error) { console.error('Error:', error); }
  };

  const handleSave = async () => {
    try {
      const data: ContratoCreate = { 
        nombre: formData.nombre || '',
        id_cliente: Number(formData.id_cliente) || 0, 
        id_estado: estados.length > 0 ? estados[0].id_estado_contrato : 1, 
        id_tipo_contrato: Number(formData.id_tipo_contrato) || (tiposContrato.length > 0 ? tiposContrato[0].id_tipo_contrato : 1), 
        id_moneda: Number(formData.id_moneda) || 1,
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        vigencia: formData.vigencia || new Date().toISOString().split('T')[0],
        proforma: formData.proforma,
        documento_final: formData.documento_final
      };
      if (editingId) {
        await contratosService.updateContrato(editingId, data);
        toast.success('Actualizado');
      } else {
        const nuevoContrato = await contratosService.createContrato(data);
        if (solicitudParam) {
          try {
            await solicitudesService.updateSolicitud(Number(solicitudParam), {
              id_contrato: nuevoContrato.id_contrato,
              id_cliente: Number(formData.id_cliente) || 0
            });
          } catch (e) { console.error('Error updating solicitud:', e); }
        }
        toast.success('Creado');
      }
      setView('list');
      resetForm();
      refresh();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar contrato?',
      message: `¿Está seguro de eliminar el contrato "${nombre}"?`,
      onConfirm: async () => {
        try {
          await contratosService.deleteContrato(id);
          toast.success('Eliminado');
          refresh();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: ContratoWithDetails) => {
    if (item) {
      setEditingId(item.id_contrato);
      setFormData({ 
        nombre: item.nombre, 
        proforma: item.proforma, 
        id_cliente: item.id_cliente, 
        id_tipo_contrato: item.id_tipo_contrato, 
        fecha: item.fecha, 
        vigencia: item.vigencia, 
        id_moneda: item.id_moneda, 
        documento_final: item.documento_final 
      });
    } else { 
      resetForm();
      if (initialClienteId) {
        setFormData({ id_cliente: Number(initialClienteId) });
      }
    }
    setView('form');
  };

  const filteredContratos = useMemo(() => {
    let result = contratos;
    if (searchTerm) {
      result = result.filter(c => 
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.estado?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [contratos, searchTerm]);

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Contratos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredContratos.length === contratos.length 
                ? `Gestión de contratos (${contratos.length} items)`
                : `Mostrando ${filteredContratos.length} de ${contratos.length} contratos`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar contratos..."
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
                    <FileText className="h-4 w-4 text-teal-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
                    Cliente
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-teal-600" />
                    Facturas
                  </div>
                </TableHead>
                <TableHead>Suplementos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Cargando contratos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-red-500">
                    Error al cargar contratos: {(error as Error)?.message || 'Error desconocido'}
                  </TableCell>
                </TableRow>
              ) : filteredContratos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron contratos que coincidan con la búsqueda' : 'No hay contratos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContratos.map((item) => (
                  <TableRow key={item.id_contrato} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.nombre}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {item.cliente?.nombre || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ventas/facturas?contrato=${item.id_contrato}`)}
                        className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ventas/suplementos?contrato=${item.id_contrato}`)}
                        className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Suplemento
                      </Button>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
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
                          onClick={() => handleDelete(item.id_contrato, item.nombre)}
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
        {/* Sentinel para infinite scroll */}
        {!isLoading && filteredContratos.length > 0 && (
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
          {solicitudParam && (
            <Button variant="outline" onClick={() => navigate('/proyectos/solicitudes')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">Complete los datos del contrato</p>
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
            <FileText className="h-5 w-5 text-teal-600" />
            Información del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} className="mt-1" placeholder="Nombre del contrato" />
            </div>
            <div>
              <Label className="text-sm font-medium">Cliente *</Label>
              {initialClienteId ? (
                <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {clientes.find(c => c.id_cliente === Number(initialClienteId))?.nombre || `Cliente #${initialClienteId}`}
                </div>
              ) : (
                <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_cliente || ''} onChange={(e: any) => setFormData({...formData, id_cliente: e.target.value})}>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
                </select>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Proforma</Label>
              <Input value={formData.proforma || ''} onChange={(e: any) => setFormData({...formData, proforma: e.target.value})} className="mt-1" placeholder="Número de proforma" />
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_tipo_contrato || ''} onChange={(e: any) => setFormData({...formData, id_tipo_contrato: e.target.value})}>
                {tiposContrato.map(t => <option key={t.id_tipo_contrato} value={t.id_tipo_contrato}>{t.nombre}</option>)}
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
              <Label className="text-sm font-medium">Vigencia</Label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="flex-1 mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors" 
                  value={formData.vigencia || ''} 
                  onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, vigencia: new Date().toISOString().split('T')[0]})} 
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Documento Final</Label>
              <Input value={formData.documento_final || ''} onChange={(e: any) => setFormData({...formData, documento_final: e.target.value})} className="mt-1" placeholder="Número de documento" />
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
                    <FileText className="h-7 w-7" />
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Cliente</p>
                  <p className="font-bold text-gray-900">{detailModal.item.cliente?.nombre || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Monto</p>
                  <p className="font-bold text-green-900 text-xl">${Number(detailModal.item.monto).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tipo</p>
                  <p className="font-bold text-gray-900">{detailModal.item.tipo_contrato?.nombre || 'N/A'}</p>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Vigencia</p>
                  <p className="font-bold text-gray-900">{detailModal.item.vigencia || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.proforma && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Proforma</p>
                  <p className="text-gray-700">{detailModal.item.proforma}</p>
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
