import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { conveniosService, clientesService, tipoConvenioService } from '../../services/api';
import type { Cliente } from '../../types/ventas';
import { Plus, Save, Trash2, Edit, FileText, ArrowLeft, Calendar, Tag, User, ScrollText, Boxes, ExternalLink, X, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form' | 'detail';

export function CompraConveniosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedorId = searchParams.get('proveedor');

  const [view, setView] = useState<View>('list');
  
  const [convenios, setConvenios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposConvenio, setTiposConvenio] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialProveedorId ? Number(initialProveedorId) : null);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (view === 'list') loadConvenios(); }, [view]);

  const loadInitialData = async () => {
    try {
      const [clis, tconv] = await Promise.all([
        clientesService.getClientes(0, 1000),
        tipoConvenioService.getTiposConvenio()
      ]);
      setClientes(clis.filter(c => c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS'));
      setTiposConvenio(tconv);
    } catch (error) { console.error('Error:', error); }
  };

  const loadConvenios = async () => {
    try {
      const data = await conveniosService.getConvenios();
      setConvenios(data);
    } catch (error) { console.error('Error:', error); }
  };

  const handleSave = async () => {
    try {
      const data = {
        id_cliente: Number(formData.id_cliente),
        nombre_convenio: formData.nombre_convenio,
        fecha: formData.fecha,
        vigencia: formData.vigencia,
        id_tipo_convenio: Number(formData.id_tipo_convenio),
      };
      
      if (editingId) {
        await conveniosService.updateConvenio(editingId, data);
      } else {
        await conveniosService.createConvenio(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadConvenios();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar convenio?')) return;
    try {
      await conveniosService.deleteConvenio(id);
      toast.success('Eliminado');
      loadConvenios();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id_convenio);
      setFormData({
        id_cliente: item.id_cliente,
        nombre_convenio: item.nombre_convenio,
        fecha: item.fecha,
        vigencia: item.vigencia,
        id_tipo_convenio: item.id_tipo_convenio,
        codigo_convenio: item.codigo,
      });
    } else { resetForm(); }
    setView('form');
  };

  const isVigente = (vigencia: string) => {
    return new Date(vigencia) >= new Date();
  };

  const getClienteNombre = (id: number) => {
    const cliente = clientes.find(c => c.id_cliente === id);
    return cliente?.nombre || `Cliente ${id}`;
  };

  const getTipoConvenioNombre = (id: number) => {
    const tipo = tiposConvenio.find(t => t.id_tipo_convenio === id);
    return tipo?.nombre || `Tipo ${id}`;
  };

  const filteredConvenios = useMemo(() => {
    let result = convenios;
    if (filtroCliente) {
      result = result.filter(c => c.id_cliente === filtroCliente);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.nombre_convenio?.toLowerCase().includes(search) ||
        c.codigo_convenio?.toLowerCase().includes(search) ||
        getClienteNombre(c.id_cliente).toLowerCase().includes(search)
      );
    }
    return result;
  }, [convenios, filtroCliente, searchTerm, clientes]);

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg animate-bounce-subtle">
            <ScrollText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Convenios</h1>
            <p className="text-gray-500 mt-1">
              {filteredConvenios.length === convenios.length
                ? `Gestión de convenios (${convenios.length} items)`
                : `Mostrando ${filteredConvenios.length} de ${convenios.length} convenios`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Convenio
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar convenios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-sky-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-600" />
                    Cliente
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-600" />
                    Vigencia
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-sky-600" />
                    Anexos
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
              {filteredConvenios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron convenios que coincidan con la búsqueda' : 'No hay convenios registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredConvenios.map((item) => (
                  <TableRow key={item.id_convenio} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${!isVigente(item.vigencia) ? 'opacity-60' : ''}`} onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo_convenio || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.nombre_convenio}</span>
                    </TableCell>
                    <TableCell>{getClienteNombre(item.id_cliente)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${isVigente(item.vigencia) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {isVigente(item.vigencia) ? 'Vigente' : 'Vencido'}
                        </span>
                        <span className="text-xs text-gray-500">{item.vigencia}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/compra/anexos?convenio=${item.id_convenio}`)}
                        className="gap-1.5 text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
                      >
                        <Boxes className="h-3.5 w-3.5" />
                        Anexos
                      </Button>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openForm(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id_convenio)} className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8" title="Eliminar">
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); resetForm(); }}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle>{editingId ? 'Editar' : 'Nuevo'} Convenio</CardTitle>
          {editingId && formData.codigo_convenio && (
            <span className="ml-auto font-mono font-bold">{formData.codigo_convenio}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <Label>Cliente *</Label>
            <select className="w-full p-2 border rounded" value={formData.id_cliente || ''} onChange={(e: any) => setFormData({...formData, id_cliente: e.target.value})}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} ({c.cedula_rif})</option>)}
            </select>
          </div>
          
          <div><Label>Nombre del Convenio *</Label><Input value={formData.nombre_convenio || ''} onChange={(e: any) => setFormData({...formData, nombre_convenio: e.target.value})} /></div>
          
          <div><Label>Tipo de Convenio *</Label>
            <select className="w-full p-2 border rounded" value={formData.id_tipo_convenio || ''} onChange={(e: any) => setFormData({...formData, id_tipo_convenio: e.target.value})}>
              <option value="">Seleccionar</option>
              {tiposConvenio.map(t => <option key={t.id_tipo_convenio} value={t.id_tipo_convenio}>{t.nombre}</option>)}
            </select>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Fecha *</Label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors" 
                value={formData.fecha || ''} 
                onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, fecha: new Date().toISOString().split('T')[0]})} 
                className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Hoy
              </button>
            </div>
          </div>
          
          <div>
            <Label>Vigencia *</Label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors" 
                value={formData.vigencia || ''} 
                onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, vigencia: new Date().toISOString().split('T')[0]})} 
                className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Guardar</Button>
          <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
                    <ScrollText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre_convenio}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_convenio || 'Sin código'}</p>
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
                  <p className="font-bold text-gray-900">{getClienteNombre(detailModal.item.id_cliente)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tipo</p>
                  <p className="font-bold text-gray-900">{getTipoConvenioNombre(detailModal.item.id_tipo_convenio)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Vigencia</p>
                  <div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isVigente(detailModal.item.vigencia) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isVigente(detailModal.item.vigencia) ? 'Vigente' : 'Vencido'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{detailModal.item.vigencia}</p>
                  </div>
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
