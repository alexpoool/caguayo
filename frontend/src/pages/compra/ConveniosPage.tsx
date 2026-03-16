import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { conveniosService, clientesService, tipoConvenioService } from '../../services/api';
import type { Cliente } from '../../types/ventas';
import { Plus, Save, Trash2, Edit, FileText, ArrowLeft, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type View = 'list' | 'form' | 'detail';

export function CompraConveniosPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  
  const [convenios, setConvenios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposConvenio, setTiposConvenio] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

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
        codigo_convenio: item.codigo_convenio,
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

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Convenios</h2>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </div>
      {convenios.length === 0 ? (
        <p className="text-gray-500">No hay convenios registrados.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Código</th>
                  <th className="text-left p-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left p-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-3 font-medium text-gray-600">Vigencia</th>
                  <th className="text-right p-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {convenios.map((item) => (
                  <tr key={item.id_convenio} className={`border-b hover:bg-gray-50 ${!isVigente(item.vigencia) ? 'opacity-60' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="font-mono text-sm">{item.codigo_convenio || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium">{item.nombre_convenio}</td>
                    <td className="p-3 text-gray-600">{getClienteNombre(item.id_cliente)}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs w-fit ${isVigente(item.vigencia) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isVigente(item.vigencia) ? 'Vigente' : 'Vencido'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.vigencia}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/compra/anexos?convenio=${item.id_convenio}`)}>
                          Anexos
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id_convenio)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Cliente *</Label>
            <select className="w-full p-2 border rounded" value={formData.id_cliente || ''} onChange={(e: any) => setFormData({...formData, id_cliente: e.target.value})}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} ({c.cedula_rif})</option>)}
            </select>
          </div>
          
          <div className="md:col-span-2"><Label>Nombre del Convenio *</Label><Input value={formData.nombre_convenio || ''} onChange={(e: any) => setFormData({...formData, nombre_convenio: e.target.value})} /></div>
          
          <div><Label>Tipo de Convenio *</Label>
            <select className="w-full p-2 border rounded" value={formData.id_tipo_convenio || ''} onChange={(e: any) => setFormData({...formData, id_tipo_convenio: e.target.value})}>
              <option value="">Seleccionar</option>
              {tiposConvenio.map(t => <option key={t.id_tipo_convenio} value={t.id_tipo_convenio}>{t.nombre}</option>)}
            </select>
          </div>
          
          <div><Label>Fecha *</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div>
          
          <div><Label>Vigencia *</Label><Input type="date" value={formData.vigencia || ''} onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} /></div>
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
      <h1 className="text-3xl font-bold mb-6">Gestión de Convenios</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
