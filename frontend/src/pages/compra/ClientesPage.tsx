import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { clientesService, provinciaService, municipioService, tipoEntidadService } from '../../services/api';
import type { Cliente } from '../../types/ventas';
import { Plus, Save, Trash2, Edit, User, ArrowLeft, Building, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form' | 'detail';
type TipoPersona = 'NATURAL' | 'JURIDICA' | 'TCP' | '';

export function CompraClientesPage() {
  const [view, setView] = useState<View>('list');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [tiposEntidad, setTiposEntidad] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>('');
  const [selectedProvincia, setSelectedProvincia] = useState<number | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (view === 'list') loadClientes(); }, [view]);
  useEffect(() => { if (selectedProvincia) loadMunicipios(selectedProvincia); }, [selectedProvincia]);

  const loadInitialData = async () => {
    try {
      const [provs, ents] = await Promise.all([
        provinciaService.getProvincias(),
        tipoEntidadService.getTiposEntidad()
      ]);
      setProvincias(provs);
      setTiposEntidad(ents);
    } catch (error) { console.error('Error:', error); }
  };

  const loadMunicipios = async (provinciaId: number) => {
    try {
      const muns = await municipioService.getMunicipios(provinciaId);
      setMunicipios(muns);
    } catch (error) { console.error('Error:', error); }
  };

  const loadClientes = async () => {
    try {
      const data = await clientesService.getClientes(0, 1000);
      setClientes(data.filter(c => c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS'));
    } catch (error) { console.error('Error:', error); }
  };

  const handleSave = async () => {
    try {
      const clienteData: any = {
        numero_cliente: formData.numero_cliente || `CLI-${Date.now()}`,
        nombre: formData.nombre || '',
        tipo_persona: tipoPersona,
        cedula_rif: formData.cedula_rif || '',
        telefono: formData.telefono,
        email: formData.email,
        fax: formData.fax,
        web: formData.web,
        codigo_postal: formData.codigo_postal,
        direccion: formData.direccion || '',
        id_provincia: selectedProvincia || undefined,
        id_municipio: selectedMunicipio || undefined,
        tipo_relacion: formData.tipo_relacion || 'PROVEEDOR',
        estado: formData.estado || 'ACTIVO',
      };

      if (editingId) {
        await clientesService.updateCliente(editingId, clienteData);
      } else {
        await clientesService.createCliente(clienteData);
      }

      if (tipoPersona === 'NATURAL' && formData.carnet_identidad) {
        const naturalData = {
          id_cliente: editingId || 0,
          nombre: formData.nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido,
          carnet_identidad: formData.carnet_identidad,
          codigo_expediente: formData.codigo_expediente,
          numero_registro: formData.numero_registro,
          catalogo: formData.catalogo,
          es_trabajador: formData.es_trabajador || false,
          ocupacion: formData.es_trabajador ? formData.ocupacion : undefined,
          centro_trabajo: formData.es_trabajador ? formData.centro_trabajo : undefined,
          correo_trabajo: formData.es_trabajador ? formData.correo_trabajo : undefined,
          direccion_trabajo: formData.es_trabajador ? formData.direccion_trabajo : undefined,
          telefono_trabajo: formData.es_trabajador ? formData.telefono_trabajo : undefined,
          en_baja: formData.en_baja || false,
          fecha_baja: formData.en_baja ? formData.fecha_baja : undefined,
          vigencia: formData.vigencia,
        };
        console.log('Guardando cliente natural:', naturalData);
      }

      if (tipoPersona === 'JURIDICA' && formData.codigo_reup) {
        const juridicaData = {
          id_cliente: editingId || 0,
          codigo_reup: formData.codigo_reup,
          id_tipo_entidad: formData.id_tipo_entidad,
        };
        console.log('Guardando cliente jurídica:', juridicaData);
      }

      if (tipoPersona === 'TCP') {
        const tcpData = {
          id_cliente: editingId || 0,
          nombre: formData.nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido,
          direccion: formData.direccion,
          numero_registro_proyecto: formData.numero_registro_proyecto,
          fecha_aprobacion: formData.fecha_aprobacion,
        };
        console.log('Guardando cliente TCP:', tcpData);
      }

      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadClientes();
    } catch (error: any) { 
      console.error('Error:', error);
      toast.error(error.message || 'Error al guardar'); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar cliente?')) return;
    try {
      await clientesService.deleteCliente(id);
      toast.success('Eliminado');
      loadClientes();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => {
    setFormData({});
    setTipoPersona('');
    setSelectedProvincia(null);
    setSelectedMunicipio(null);
    setEditingId(null);
  };

  const openForm = (item?: Cliente) => {
    if (item) {
      setEditingId(item.id_cliente);
      setTipoPersona(item.tipo_persona);
      setFormData({ 
        numero_cliente: item.numero_cliente,
        nombre: item.nombre,
        cedula_rif: item.cedula_rif,
        telefono: item.telefono,
        email: item.email,
        fax: item.fax,
        web: item.web,
        codigo_postal: item.codigo_postal,
        direccion: item.direccion,
        tipo_relacion: item.tipo_relacion,
        estado: item.estado,
      });
      if (item.id_provincia) setSelectedProvincia(item.id_provincia);
      if (item.id_municipio) setSelectedMunicipio(item.id_municipio);
    } else { resetForm(); }
    setView('form');
  };

  const openDetail = (item: Cliente) => {
    setEditingId(item.id_cliente);
    setView('detail');
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clientes/Proveedores</h2>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </div>
      {clientes.length === 0 ? (
        <p className="text-gray-500">No hay clientes registrados.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((item) => (
            <Card key={item.id_cliente} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      {item.tipo_persona === 'JURIDICA' ? <Building className="w-5 h-5 text-blue-600" /> : 
                       item.tipo_persona === 'TCP' ? <Briefcase className="w-5 h-5 text-green-600" /> :
                       <User className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.nombre}</h3>
                      <p className="text-sm text-gray-500">{item.cedula_rif}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${item.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.estado}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDetail(item)} className="flex-1">Ver</Button>
                  <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_cliente)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    const cliente = clientes.find(c => c.id_cliente === editingId);
    if (!cliente) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => { setView('list'); setEditingId(null); }}><ArrowLeft className="w-4 h-4" /></Button>
            <CardTitle>Detalle del Cliente</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Nombre</Label><p className="font-medium">{cliente.nombre}</p></div>
            <div><Label>Cédula/RIF</Label><p className="font-medium">{cliente.cedula_rif}</p></div>
            <div><Label>Tipo de Persona</Label><p className="font-medium">{cliente.tipo_persona}</p></div>
            <div><Label>Tipo de Relación</Label><p className="font-medium">{cliente.tipo_relacion}</p></div>
            <div><Label>Teléfono</Label><p className="font-medium">{cliente.telefono || 'N/A'}</p></div>
            <div><Label>Email</Label><p className="font-medium">{cliente.email || 'N/A'}</p></div>
            <div><Label>Dirección</Label><p className="font-medium">{cliente.direccion}</p></div>
            <div><Label>Estado</Label><span className={`px-2 py-1 rounded text-xs ${cliente.estado === 'ACTIVO' ? 'bg-green-100' : 'bg-red-100'}`}>{cliente.estado}</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => openForm(cliente)}><Edit className="w-4 h-4 mr-2" />Editar</Button>
            <Button variant="danger" onClick={() => handleDelete(cliente.id_cliente)}><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderForm = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); resetForm(); }}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle>{editingId ? 'Editar' : 'Nuevo'} Cliente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div><Label>Tipo de Persona *</Label>
            <select className="w-full p-2 border rounded" value={tipoPersona} onChange={(e: any) => setTipoPersona(e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="NATURAL">Persona Natural</option>
              <option value="JURIDICA">Persona Jurídica</option>
              <option value="TCP">TCP (Trabajador por Cuenta Propia)</option>
            </select>
          </div>
          <div><Label>Tipo de Relación</Label>
            <select className="w-full p-2 border rounded" value={formData.tipo_relacion || 'PROVEEDOR'} onChange={(e: any) => setFormData({...formData, tipo_relacion: e.target.value})}>
              <option value="CLIENTE">Cliente</option>
              <option value="PROVEEDOR">Proveedor</option>
              <option value="AMBAS">Ambos</option>
            </select>
          </div>
          <div><Label>Estado</Label>
            <select className="w-full p-2 border rounded" value={formData.estado || 'ACTIVO'} onChange={(e: any) => setFormData({...formData, estado: e.target.value})}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          
          <div><Label>Nombre *</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
          <div><Label>Cédula/RIF *</Label><Input value={formData.cedula_rif || ''} onChange={(e: any) => setFormData({...formData, cedula_rif: e.target.value})} /></div>
          <div><Label>Teléfono</Label><Input value={formData.telefono || ''} onChange={(e: any) => setFormData({...formData, telefono: e.target.value})} /></div>
          
          <div><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e: any) => setFormData({...formData, email: e.target.value})} /></div>
          <div><Label>Fax</Label><Input value={formData.fax || ''} onChange={(e: any) => setFormData({...formData, fax: e.target.value})} /></div>
          <div><Label>Web</Label><Input value={formData.web || ''} onChange={(e: any) => setFormData({...formData, web: e.target.value})} /></div>
          
          <div><Label>Código Postal</Label><Input value={formData.codigo_postal || ''} onChange={(e: any) => setFormData({...formData, codigo_postal: e.target.value})} /></div>
          <div><Label>Provincia</Label>
            <select className="w-full p-2 border rounded" value={selectedProvincia || ''} onChange={(e: any) => { setSelectedProvincia(Number(e.target.value)); setSelectedMunicipio(null); }}>
              <option value="">Seleccionar</option>
              {provincias.map(p => <option key={p.id_provincia} value={p.id_provincia}>{p.nombre}</option>)}
            </select>
          </div>
          <div><Label>Municipio</Label>
            <select className="w-full p-2 border rounded" value={selectedMunicipio || ''} onChange={(e: any) => setSelectedMunicipio(Number(e.target.value))} disabled={!selectedProvincia}>
              <option value="">Seleccionar</option>
              {municipios.map(m => <option key={m.id_municipio} value={m.id_municipio}>{m.nombre}</option>)}
            </select>
          </div>
          
          <div className="lg:col-span-3"><Label>Dirección *</Label><Input value={formData.direccion || ''} onChange={(e: any) => setFormData({...formData, direccion: e.target.value})} /></div>

          {tipoPersona === 'NATURAL' && (
            <>
              <div><Label>Primer Apellido *</Label><Input value={formData.primer_apellido || ''} onChange={(e: any) => setFormData({...formData, primer_apellido: e.target.value})} /></div>
              <div><Label>Segundo Apellido</Label><Input value={formData.segundo_apellido || ''} onChange={(e: any) => setFormData({...formData, segundo_apellido: e.target.value})} /></div>
              <div><Label>Carnet de Identidad *</Label><Input value={formData.carnet_identidad || ''} onChange={(e: any) => setFormData({...formData, carnet_identidad: e.target.value})} /></div>
              <div><Label>Código Expediente</Label><Input value={formData.codigo_expediente || ''} onChange={(e: any) => setFormData({...formData, codigo_expediente: e.target.value})} /></div>
              <div><Label>Número de Registro</Label><Input value={formData.numero_registro || ''} onChange={(e: any) => setFormData({...formData, numero_registro: e.target.value})} /></div>
              <div><Label>Catálogo</Label><Input value={formData.catalogo || ''} onChange={(e: any) => setFormData({...formData, catalogo: e.target.value})} /></div>
              
              <div className="lg:col-span-3 border-t pt-4 mt-2">
                <Label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.es_trabajador || false} onChange={(e: any) => setFormData({...formData, es_trabajador: e.target.checked})} />
                  ¿Es Trabajador?
                </Label>
              </div>
              
              {formData.es_trabajador && (
                <>
                  <div><Label>Ocupación</Label><Input value={formData.ocupacion || ''} onChange={(e: any) => setFormData({...formData, ocupacion: e.target.value})} /></div>
                  <div><Label>Centro de Trabajo</Label><Input value={formData.centro_trabajo || ''} onChange={(e: any) => setFormData({...formData, centro_trabajo: e.target.value})} /></div>
                  <div><Label>Correo Trabajo</Label><Input type="email" value={formData.correo_trabajo || ''} onChange={(e: any) => setFormData({...formData, correo_trabajo: e.target.value})} /></div>
                  <div><Label>Dirección Trabajo</Label><Input value={formData.direccion_trabajo || ''} onChange={(e: any) => setFormData({...formData, direccion_trabajo: e.target.value})} /></div>
                  <div><Label>Teléfono Trabajo</Label><Input value={formData.telefono_trabajo || ''} onChange={(e: any) => setFormData({...formData, telefono_trabajo: e.target.value})} /></div>
                </>
              )}
              
              <div className="lg:col-span-3 border-t pt-4 mt-2">
                <Label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.en_baja || false} onChange={(e: any) => setFormData({...formData, en_baja: e.target.checked})} />
                  ¿En Baja?
                </Label>
              </div>
              
              {formData.en_baja && (
                <>
                  <div><Label>Fecha de Baja</Label><Input type="date" value={formData.fecha_baja || ''} onChange={(e: any) => setFormData({...formData, fecha_baja: e.target.value})} /></div>
                  <div><Label>Vigencia</Label><Input type="date" value={formData.vigencia || ''} onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} /></div>
                </>
              )}
            </>
          )}

          {tipoPersona === 'JURIDICA' && (
            <>
              <div><Label>Código REUUP *</Label><Input value={formData.codigo_reup || ''} onChange={(e: any) => setFormData({...formData, codigo_reup: e.target.value})} /></div>
              <div><Label>Tipo de Entidad</Label>
                <select className="w-full p-2 border rounded" value={formData.id_tipo_entidad || ''} onChange={(e: any) => setFormData({...formData, id_tipo_entidad: e.target.value})}>
                  <option value="">Seleccionar</option>
                  {tiposEntidad.map(t => <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>{t.nombre}</option>)}
                </select>
              </div>
            </>
          )}

          {tipoPersona === 'TCP' && (
            <>
              <div><Label>Nombre *</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
              <div><Label>Primer Apellido *</Label><Input value={formData.primer_apellido || ''} onChange={(e: any) => setFormData({...formData, primer_apellido: e.target.value})} /></div>
              <div><Label>Segundo Apellido</Label><Input value={formData.segundo_apellido || ''} onChange={(e: any) => setFormData({...formData, segundo_apellido: e.target.value})} /></div>
              <div className="lg:col-span-2"><Label>Número de Registro de Proyecto</Label><Input value={formData.numero_registro_proyecto || ''} onChange={(e: any) => setFormData({...formData, numero_registro_proyecto: e.target.value})} /></div>
              <div><Label>Fecha de Aprobación</Label><Input type="date" value={formData.fecha_aprobacion || ''} onChange={(e: any) => setFormData({...formData, fecha_aprobacion: e.target.value})} /></div>
            </>
          )}
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
      <h1 className="text-3xl font-bold mb-6">Gestión de Clientes/Proveedores</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
      {view === 'detail' && renderDetail()}
    </div>
  );
}
