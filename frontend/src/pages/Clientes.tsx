import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService, tiposEntidadService, clienteNaturalService, clienteTCPService, cuentasService } from '../services/api';
import type { Cliente, ClienteCreate, ClienteUpdate, Cuenta } from '../types/ventas';
import { Plus, Edit, Trash2, User, Phone, Mail, CreditCard, Search, ArrowLeft, Save, Building2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal
} from '../components/ui';

type TipoPersona = 'NATURAL' | 'JURIDICA' | 'TCP';

export function ClientesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>('NATURAL');
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

  // Form state - Cliente base
  const [formData, setFormData] = useState<ClienteCreate>({
    nombre: '',
    telefono: '',
    email: '',
    cedula_rif: '',
    direccion: '',
    activo: true,
    tipo_relacion: 'CLIENTE',
    fax: '',
    web: '',
    numero_cliente: '',
    codigo_postal: '',
    nit: ''
  });

  // Datos Persona Natural
  const [datosNatural, setDatosNatural] = useState({
    codigo_expediente: '',
    numero_registro: '',
    carnet_identidad: '',
    es_trabajador: false,
    ocupacion: '',
    centro_laboral: '',
    centro_trabajo: '',
    correo_trabajo: '',
    direccion_trabajo: '',
    telefono_trabajo: '',
    catalogo: '',
    baja: false,
    fecha_baja: '',
    vigencia: '',
    codigo_reeup: '',
    id_tipo_entidad: undefined as number | undefined
  });

  // Datos TCP
  const [datosTCP, setDatosTCP] = useState({
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    direccion: '',
    numero_registro_proyecto: '',
    fecha_aprobacion: ''
  });

  // Cuentas bancarias
  const [cuentas, setCuentas] = useState<Partial<Cuenta>[]>([]);
  const [nuevaCuenta, setNuevaCuenta] = useState({
    titular: '',
    banco: '',
    sucursal: 0,
    direccion: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
  });

  const { data: tiposEntidad = [] } = useQuery({
    queryKey: ['tiposEntidad'],
    queryFn: () => tiposEntidadService.getTiposEntidad(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: ClienteCreate) => {
      const cliente = await clientesService.createCliente(data);
      
      // Crear datos según tipo de persona
      if (tipoPersona === 'NATURAL' || tipoPersona === 'JURIDICA') {
        await clienteNaturalService.createClienteNatural({
          id_cliente: cliente.id_cliente,
          codigo_expediente: datosNatural.codigo_expediente || undefined,
          numero_registro: datosNatural.numero_registro || undefined,
          carnet_identidad: datosNatural.carnet_identidad || undefined,
          es_trabajador: datosNatural.es_trabajador,
          ocupacion: datosNatural.ocupacion || undefined,
          centro_laboral: datosNatural.centro_laboral || undefined,
          centro_trabajo: datosNatural.centro_trabajo || undefined,
          correo_trabajo: datosNatural.correo_trabajo || undefined,
          direccion_trabajo: datosNatural.direccion_trabajo || undefined,
          telefono_trabajo: datosNatural.telefono_trabajo || undefined,
          catalogo: datosNatural.catalogo || undefined,
          baja: datosNatural.baja,
          fecha_baja: datosNatural.fecha_baja || undefined,
          vigencia: datosNatural.vigencia || undefined,
          codigo_reeup: datosNatural.codigo_reeup || undefined,
          id_tipo_entidad: datosNatural.id_tipo_entidad
        });
      } else if (tipoPersona === 'TCP') {
        await clienteTCPService.createClienteTCP({
          id_cliente: cliente.id_cliente,
          nombre: datosTCP.nombre,
          primer_apellido: datosTCP.primer_apellido || undefined,
          segundo_apellido: datosTCP.segundo_apellido || undefined,
          direccion: datosTCP.direccion || undefined,
          numero_registro_proyecto: datosTCP.numero_registro_proyecto || undefined,
          fecha_aprobacion: datosTCP.fecha_aprobacion || undefined
        });
      }

      // Crear cuentas bancarias
      for (const cuenta of cuentas) {
        if (cuenta.titular && cuenta.banco) {
          await cuentasService.createCuenta({
            ...cuenta,
            id_cliente: cliente.id_cliente
          });
        }
      }

      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente creado correctamente');
      setView('list');
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear cliente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteUpdate }) => 
      clientesService.updateCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente actualizado correctamente');
      setView('list');
      setEditingCliente(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar cliente');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clientesService.deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente eliminado correctamente');
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al eliminar cliente';
      toast.error(message);
    }
  });

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.nombre = 'El nombre es requerido';
    }

    if (tipoPersona === 'TCP' && !datosTCP.nombre) {
      errors.tcp_nombre = 'El nombre del líder es requerido';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Por favor corrija los errores del formulario');
      return;
    }

    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id_cliente, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '', telefono: '', email: '', cedula_rif: '', direccion: '',
      activo: true, tipo_relacion: 'CLIENTE', fax: '', web: '',
      numero_cliente: '', codigo_postal: '', nit: ''
    });
    setDatosNatural({
      codigo_expediente: '', numero_registro: '', carnet_identidad: '',
      es_trabajador: false, ocupacion: '', centro_laboral: '',
      centro_trabajo: '', correo_trabajo: '', direccion_trabajo: '',
      telefono_trabajo: '', catalogo: '', baja: false, fecha_baja: '',
      vigencia: '', codigo_reeup: '', id_tipo_entidad: undefined
    });
    setDatosTCP({
      nombre: '', primer_apellido: '', segundo_apellido: '',
      direccion: '', numero_registro_proyecto: '', fecha_aprobacion: ''
    });
    setCuentas([]);
    setNuevaCuenta({ titular: '', banco: '', sucursal: 0, direccion: '' });
    setTipoPersona('NATURAL');
    setFormErrors({});
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      cedula_rif: cliente.cedula_rif || '',
      direccion: cliente.direccion || '',
      activo: cliente.activo,
      fax: cliente.fax || '',
      web: cliente.web || '',
      numero_cliente: cliente.numero_cliente || '',
      codigo_postal: cliente.codigo_postal || '',
      nit: cliente.nit || ''
    });
    setView('form');
  };

  const handleDelete = (cliente: Cliente) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar cliente?',
      message: `¿Está seguro de eliminar al cliente "${cliente.nombre}"?`,
      onConfirm: () => deleteMutation.mutate(cliente.id_cliente),
      type: 'danger'
    });
  };

  const addCuenta = () => {
    if (nuevaCuenta.titular && nuevaCuenta.banco) {
      setCuentas([...cuentas, { ...nuevaCuenta, sucursal: nuevaCuenta.sucursal || 0 }]);
      setNuevaCuenta({ titular: '', banco: '', sucursal: 0, direccion: '' });
    }
  };

  const removeCuenta = (index: number) => {
    setCuentas(cuentas.filter((_, i) => i !== index));
  };

  // VISTA: FORMULARIO
  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <Button variant="secondary" onClick={() => { setView('list'); setEditingCliente(null); resetForm(); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo de Persona */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tipo de Persona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {[
                  { value: 'NATURAL', label: 'Persona Natural', icon: User },
                  { value: 'JURIDICA', label: 'Persona Jurídica', icon: Building2 },
                  { value: 'TCP', label: 'TCP (Trabajo por Cuenta Propia)', icon: Briefcase }
                ].map((tipo) => (
                  <label key={tipo.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoPersona"
                      value={tipo.value}
                      checked={tipoPersona === tipo.value}
                      onChange={(e) => setTipoPersona(e.target.value as TipoPersona)}
                      className="w-4 h-4"
                    />
                    <tipo.icon className="h-4 w-4" />
                    {tipo.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Datos Base del Cliente */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label># de Cliente</Label>
                <Input
                  value={formData.numero_cliente}
                  onChange={(e) => setFormData({ ...formData, numero_cliente: e.target.value })}
                  placeholder="Ingresado por usuario"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Nombre Completo *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={formErrors.nombre ? 'border-red-500' : ''}
                />
                {formErrors.nombre && <p className="text-red-500 text-sm">{formErrors.nombre}</p>}
              </div>
              <div>
                <Label>Cédula / RIF</Label>
                <Input value={formData.cedula_rif} onChange={(e) => setFormData({ ...formData, cedula_rif: e.target.value })} placeholder="V-12345678" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label>Fax</Label>
                <Input value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} />
              </div>
              <div>
                <Label>Web</Label>
                <Input value={formData.web} onChange={(e) => setFormData({ ...formData, web: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Código Postal</Label>
                <Input value={formData.codigo_postal} onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })} />
              </div>
              <div>
                <Label>NIT</Label>
                <Input value={formData.nit} onChange={(e) => setFormData({ ...formData, nit: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Label>Dirección</Label>
                <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de Relación</Label>
                <select
                  value={formData.tipo_relacion || 'CLIENTE'}
                  onChange={(e) => setFormData({ ...formData, tipo_relacion: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="CLIENTE">Cliente (solo compra)</option>
                  <option value="PRODUCTOR">Productor (solo vende)</option>
                  <option value="AMBOS">Cliente y Productor</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label className="mb-0">Cliente activo</Label>
              </div>
            </CardContent>
          </Card>

          {/* Datos según tipo de persona */}
          {(tipoPersona === 'NATURAL' || tipoPersona === 'JURIDICA') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{tipoPersona === 'NATURAL' ? 'Datos Persona Natural' : 'Datos Persona Jurídica'}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tipoPersona === 'NATURAL' ? (
                  <>
                    <div><Label>Código Expediente</Label><Input value={datosNatural.codigo_expediente} onChange={(e) => setDatosNatural({...datosNatural, codigo_expediente: e.target.value})} /></div>
                    <div><Label># de Registro</Label><Input value={datosNatural.numero_registro} onChange={(e) => setDatosNatural({...datosNatural, numero_registro: e.target.value})} /></div>
                    <div><Label>Carnet de Identidad</Label><Input value={datosNatural.carnet_identidad} onChange={(e) => setDatosNatural({...datosNatural, carnet_identidad: e.target.value})} /></div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={datosNatural.es_trabajador} onChange={(e) => setDatosNatural({...datosNatural, es_trabajador: e.target.checked})} />
                      <Label className="mb-0">¿Es trabajador?</Label>
                    </div>
                    {datosNatural.es_trabajador && (
                      <>
                        <div><Label>Ocupación</Label><Input value={datosNatural.ocupacion} onChange={(e) => setDatosNatural({...datosNatural, ocupacion: e.target.value})} /></div>
                        <div><Label>Centro Laboral</Label><Input value={datosNatural.centro_laboral} onChange={(e) => setDatosNatural({...datosNatural, centro_laboral: e.target.value})} /></div>
                        <div><Label>Centro de Trabajo</Label><Input value={datosNatural.centro_trabajo} onChange={(e) => setDatosNatural({...datosNatural, centro_trabajo: e.target.value})} /></div>
                        <div><Label>Correo Trabajo</Label><Input type="email" value={datosNatural.correo_trabajo} onChange={(e) => setDatosNatural({...datosNatural, correo_trabajo: e.target.value})} /></div>
                        <div><Label>Dirección Trabajo</Label><Input value={datosNatural.direccion_trabajo} onChange={(e) => setDatosNatural({...datosNatural, direccion_trabajo: e.target.value})} /></div>
                        <div><Label>Teléfono Trabajo</Label><Input value={datosNatural.telefono_trabajo} onChange={(e) => setDatosNatural({...datosNatural, telefono_trabajo: e.target.value})} /></div>
                      </>
                    )}
                    <div><Label>Catálogo</Label><Input value={datosNatural.catalogo} onChange={(e) => setDatosNatural({...datosNatural, catalogo: e.target.value})} /></div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={datosNatural.baja} onChange={(e) => setDatosNatural({...datosNatural, baja: e.target.checked})} />
                      <Label className="mb-0">¿En baja?</Label>
                    </div>
                    {datosNatural.baja && (
                      <>
                        <div><Label>Fecha de Baja</Label><Input type="date" value={datosNatural.fecha_baja} onChange={(e) => setDatosNatural({...datosNatural, fecha_baja: e.target.value})} /></div>
                      </>
                    )}
                    <div><Label>Vigencia</Label><Input type="date" value={datosNatural.vigencia} onChange={(e) => setDatosNatural({...datosNatural, vigencia: e.target.value})} /></div>
                  </>
                ) : (
                  <>
                    <div><Label>Código REEUP (XXX.XX.XXXXX)</Label><Input value={datosNatural.codigo_reeup} onChange={(e) => setDatosNatural({...datosNatural, codigo_reeup: e.target.value})} placeholder="123.45.67890" /></div>
                    <div>
                      <Label>Tipo de Entidad</Label>
                      <select
                        value={datosNatural.id_tipo_entidad || ''}
                        onChange={(e) => setDatosNatural({...datosNatural, id_tipo_entidad: e.target.value ? parseInt(e.target.value) : undefined})}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">Seleccione tipo</option>
                        {tiposEntidad.map((t) => <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>{t.nombre}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datos TCP */}
          {tipoPersona === 'TCP' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Datos TCP (Trabajo por Cuenta Propia)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Nombre del Líder *</Label>
                  <Input
                    value={datosTCP.nombre}
                    onChange={(e) => setDatosTCP({...datosTCP, nombre: e.target.value})}
                    className={formErrors.tcp_nombre ? 'border-red-500' : ''}
                  />
                  {formErrors.tcp_nombre && <p className="text-red-500 text-sm">{formErrors.tcp_nombre}</p>}
                </div>
                <div><Label>Primer Apellido</Label><Input value={datosTCP.primer_apellido} onChange={(e) => setDatosTCP({...datosTCP, primer_apellido: e.target.value})} /></div>
                <div><Label>Segundo Apellido</Label><Input value={datosTCP.segundo_apellido} onChange={(e) => setDatosTCP({...datosTCP, segundo_apellido: e.target.value})} /></div>
                <div className="md:col-span-2"><Label>Dirección</Label><Input value={datosTCP.direccion} onChange={(e) => setDatosTCP({...datosTCP, direccion: e.target.value})} /></div>
                <div><Label># de Registro del Proyecto</Label><Input value={datosTCP.numero_registro_proyecto} onChange={(e) => setDatosTCP({...datosTCP, numero_registro_proyecto: e.target.value})} /></div>
                <div><Label>Fecha de Aprobación</Label><Input type="date" value={datosTCP.fecha_aprobacion} onChange={(e) => setDatosTCP({...datosTCP, fecha_aprobacion: e.target.value})} /></div>
              </CardContent>
            </Card>
          )}

          {/* Cuentas Bancarias */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Cuentas Bancarias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Input placeholder="Titular" value={nuevaCuenta.titular} onChange={(e) => setNuevaCuenta({...nuevaCuenta, titular: e.target.value})} />
                <Input placeholder="Banco" value={nuevaCuenta.banco} onChange={(e) => setNuevaCuenta({...nuevaCuenta, banco: e.target.value})} />
                <Input placeholder="Sucursal" type="number" value={nuevaCuenta.sucursal || ''} onChange={(e) => setNuevaCuenta({...nuevaCuenta, sucursal: parseInt(e.target.value) || 0})} />
                <Button type="button" onClick={addCuenta} variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              {cuentas.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Titular</TableHead><TableHead>Banco</TableHead><TableHead>Sucursal</TableHead><TableHead></TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta, index) => (
                      <TableRow key={index}>
                        <TableCell>{cuenta.titular}</TableCell>
                        <TableCell>{cuenta.banco}</TableCell>
                        <TableCell>{cuenta.sucursal}</TableCell>
                        <TableCell><button onClick={() => removeCuenta(index)}><Trash2 className="h-4 w-4 text-red-600" /></button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit"><Save className="h-4 w-4 mr-2" />{editingCliente ? 'Actualizar' : 'Crear'}</Button>
            <Button type="button" variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
        </form>
      </div>
    );
  }

  // VISTA: LISTA
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => { resetForm(); setView('form'); }}><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes.filter(c => c.nombre?.toLowerCase().includes(searchTerm.toLowerCase())).map((cliente) => (
          <Card key={cliente.id_cliente} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{cliente.nombre}</h3>
                  <p className="text-sm text-gray-500">{cliente.cedula_rif || 'Sin identificación'}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${cliente.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {cliente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {cliente.telefono && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {cliente.telefono}</p>}
                {cliente.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {cliente.email}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(cliente)}><Edit className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(cliente)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
