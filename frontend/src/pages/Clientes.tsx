import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService, tiposEntidadService, clienteNaturalService, clienteJuridicaService, clienteTCPService, cuentasService } from '../services/api';
import type { Cliente, ClienteCreate, ClienteUpdate, ClienteNatural, ClienteJuridica, ClienteTCP, Cuenta } from '../types/ventas';
import { Plus, Edit, Trash2, User, Phone, Mail, CreditCard, Search, ArrowLeft, Save, Building2, Briefcase, Eye } from 'lucide-react';
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
type TipoRelacion = 'CLIENTE' | 'PROVEEDOR' | 'AMBAS';
type EstadoCliente = 'ACTIVO' | 'INACTIVO';

export function ClientesPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  
  // Check if this is the proveedor view (from /compra/clientes)
  const isProveedorView = location.pathname.includes('/compra/clientes') || location.search.includes('tipo=proveedor');
  
  // Default tipo_relacion based on view
  const defaultTipoRelacion = isProveedorView ? 'PROVEEDOR' : 'CLIENTE';
  
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>('NATURAL');
  const [datosNatural, setDatosNatural] = useState<ClienteNatural | null>(null);
  const [datosJuridica, setDatosJuridica] = useState<ClienteJuridica | null>(null);
  const [datosTCP, setDatosTCP] = useState<ClienteTCP | null>(null);
  const [cuentasCliente, setCuentasCliente] = useState<Cuenta[]>([]);
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
    numero_cliente: '',
    nombre: '',
    tipo_persona: 'NATURAL',
    cedula_rif: '',
    telefono: '',
    email: '',
    fax: '',
    web: '',
    id_provincia: undefined,
    id_municipio: undefined,
    codigo_postal: '',
    direccion: '',
    tipo_relacion: defaultTipoRelacion,
    estado: 'ACTIVO',
    fecha_registro: new Date().toISOString().split('T')[0],
    activo: true
  });

  // Datos Persona Natural
  const [datosNaturalForm, setDatosNaturalForm] = useState({
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    carnet_identidad: '',
    codigo_expediente: '',
    numero_registro: '',
    catalogo: '',
    es_trabajador: false,
    ocupacion: '',
    centro_trabajo: '',
    correo_trabajo: '',
    direccion_trabajo: '',
    telefono_trabajo: '',
    en_baja: false,
    fecha_baja: '',
    vigencia: ''
  });

  // Datos Persona Jurídica
  const [datosJuridicaForm, setDatosJuridicaForm] = useState({
    codigo_reup: '',
    id_tipo_entidad: undefined as number | undefined
  });

  // Datos TCP
  const [datosTCPForm, setDatosTCPForm] = useState({
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
      if (tipoPersona === 'NATURAL') {
        await clienteNaturalService.createClienteNatural({
          id_cliente: cliente.id_cliente,
          nombre: datosNaturalForm.nombre,
          primer_apellido: datosNaturalForm.primer_apellido || '',
          segundo_apellido: datosNaturalForm.segundo_apellido || '',
          carnet_identidad: datosNaturalForm.carnet_identidad,
          codigo_expediente: datosNaturalForm.codigo_expediente || '',
          numero_registro: datosNaturalForm.numero_registro || '',
          catalogo: datosNaturalForm.catalogo || '',
          es_trabajador: datosNaturalForm.es_trabajador,
          ocupacion: datosNaturalForm.ocupacion || '',
          centro_trabajo: datosNaturalForm.centro_trabajo || '',
          correo_trabajo: datosNaturalForm.correo_trabajo || '',
          direccion_trabajo: datosNaturalForm.direccion_trabajo || '',
          telefono_trabajo: datosNaturalForm.telefono_trabajo || '',
          en_baja: datosNaturalForm.en_baja,
          fecha_baja: datosNaturalForm.fecha_baja || '',
          vigencia: datosNaturalForm.vigencia || ''
        });
      } else if (tipoPersona === 'JURIDICA') {
        await clienteJuridicaService.createClienteJuridica({
          id_cliente: cliente.id_cliente,
          codigo_reup: datosJuridicaForm.codigo_reup || '',
          id_tipo_entidad: datosJuridicaForm.id_tipo_entidad
        });
      } else if (tipoPersona === 'TCP') {
        await clienteTCPService.createClienteTCP({
          id_cliente: cliente.id_cliente,
          nombre: datosTCPForm.nombre,
          primer_apellido: datosTCPForm.primer_apellido || undefined,
          segundo_apellido: datosTCPForm.segundo_apellido || undefined,
          direccion: datosTCPForm.direccion || undefined,
          numero_registro_proyecto: datosTCPForm.numero_registro_proyecto || undefined,
          fecha_aprobacion: datosTCPForm.fecha_aprobacion || undefined
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

    if (tipoPersona === 'TCP' && !datosTCPForm.nombre) {
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
      numero_cliente: '',
      nombre: '',
      tipo_persona: 'NATURAL',
      cedula_rif: '',
      telefono: '',
      email: '',
      fax: '',
      web: '',
      id_provincia: undefined,
      id_municipio: undefined,
      codigo_postal: '',
      direccion: '',
      tipo_relacion: defaultTipoRelacion,
      estado: 'ACTIVO',
      fecha_registro: new Date().toISOString().split('T')[0],
      activo: true
    });
    setDatosNaturalForm({
      nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      carnet_identidad: '',
      codigo_expediente: '',
      numero_registro: '',
      catalogo: '',
      es_trabajador: false,
      ocupacion: '',
      centro_trabajo: '',
      correo_trabajo: '',
      direccion_trabajo: '',
      telefono_trabajo: '',
      en_baja: false,
      fecha_baja: '',
      vigencia: ''
    });
    setDatosJuridicaForm({
      codigo_reup: '',
      id_tipo_entidad: undefined
    });
    setDatosTCPForm({
      nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      direccion: '',
      numero_registro_proyecto: '',
      fecha_aprobacion: ''
    });
    setCuentas([]);
    setNuevaCuenta({ titular: '', banco: '', sucursal: 0, direccion: '' });
    setTipoPersona('NATURAL');
    setFormErrors({});
  };

  const handleViewDetails = async (cliente: Cliente) => {
    setViewingCliente(cliente);
    
    // Cargar datos específicos según tipo de persona
    try {
      if (cliente.tipo_persona === 'NATURAL') {
        const data = await clienteNaturalService.getClienteNatural(cliente.id_cliente);
        setDatosNatural(data);
        setDatosJuridica(null);
        setDatosTCP(null);
      } else if (cliente.tipo_persona === 'JURIDICA') {
        const data = await clienteJuridicaService.getClienteJuridica(cliente.id_cliente);
        setDatosJuridica(data);
        setDatosNatural(null);
        setDatosTCP(null);
      } else if (cliente.tipo_persona === 'TCP') {
        const data = await clienteTCPService.getClienteTCP(cliente.id_cliente);
        setDatosTCP(data);
        setDatosNatural(null);
        setDatosJuridica(null);
      }
      
      // Cargar cuentas
      const cuentasData = await cuentasService.getCuentasByCliente(cliente.id_cliente);
      setCuentasCliente(cuentasData);
      
      setView('detail');
    } catch (error) {
      toast.error('Error al cargar detalles del cliente');
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      numero_cliente: cliente.numero_cliente || '',
      nombre: cliente.nombre || '',
      tipo_persona: cliente.tipo_persona || 'NATURAL',
      cedula_rif: cliente.cedula_rif || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      fax: cliente.fax || '',
      web: cliente.web || '',
      id_provincia: cliente.id_provincia,
      id_municipio: cliente.id_municipio,
      codigo_postal: cliente.codigo_postal || '',
      direccion: cliente.direccion || '',
      tipo_relacion: cliente.tipo_relacion || 'CLIENTE',
      estado: cliente.estado || 'ACTIVO',
      fecha_registro: cliente.fecha_registro || new Date().toISOString().split('T')[0],
      activo: cliente.activo
    });
    setTipoPersona(cliente.tipo_persona || 'NATURAL');
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

  // Render views based on state
  const renderFormView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {editingCliente ? (isProveedorView ? 'Editar Proveedor' : 'Editar Cliente') : (isProveedorView ? 'Nuevo Proveedor' : 'Nuevo Cliente')}
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
              <div className="md:col-span-3">
                <Label>Dirección</Label>
                <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de Relación</Label>
                <select
                  aria-label="Tipo de Relación"
                  value={formData.tipo_relacion || 'CLIENTE'}
                  onChange={(e) => setFormData({ ...formData, tipo_relacion: e.target.value as TipoRelacion })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="CLIENTE">Cliente (solo compra)</option>
                  <option value="PROVEEDOR">Proveedor (solo vende)</option>
                  <option value="AMBAS">Cliente y Proveedor</option>
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  aria-label="Estado"
                  value={formData.estado || 'ACTIVO'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoCliente })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Cliente activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label className="mb-0">Cliente activo</Label>
              </div>
            </CardContent>
          </Card>

          {/* Datos según tipo de persona */}
          {tipoPersona === 'NATURAL' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Datos Persona Natural</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Nombre</Label><Input value={datosNaturalForm.nombre} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, nombre: e.target.value})} /></div>
                <div><Label>Primer Apellido</Label><Input value={datosNaturalForm.primer_apellido} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, primer_apellido: e.target.value})} /></div>
                <div><Label>Segundo Apellido</Label><Input value={datosNaturalForm.segundo_apellido} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, segundo_apellido: e.target.value})} /></div>
                <div><Label>Carnet de Identidad</Label><Input value={datosNaturalForm.carnet_identidad} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, carnet_identidad: e.target.value})} /></div>
                <div><Label>Código Expediente</Label><Input value={datosNaturalForm.codigo_expediente} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, codigo_expediente: e.target.value})} /></div>
                <div><Label># de Registro</Label><Input value={datosNaturalForm.numero_registro} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, numero_registro: e.target.value})} /></div>
                <div><Label>Catálogo</Label><Input value={datosNaturalForm.catalogo} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, catalogo: e.target.value})} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Es trabajador" checked={datosNaturalForm.es_trabajador} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, es_trabajador: e.target.checked})} />
                  <Label className="mb-0">¿Es trabajador?</Label>
                </div>
                {datosNaturalForm.es_trabajador && (
                  <>
                    <div><Label>Ocupación</Label><Input value={datosNaturalForm.ocupacion} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, ocupacion: e.target.value})} /></div>
                    <div><Label>Centro de Trabajo</Label><Input value={datosNaturalForm.centro_trabajo} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, centro_trabajo: e.target.value})} /></div>
                    <div><Label>Correo Trabajo</Label><Input type="email" value={datosNaturalForm.correo_trabajo} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, correo_trabajo: e.target.value})} /></div>
                    <div><Label>Dirección Trabajo</Label><Input value={datosNaturalForm.direccion_trabajo} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, direccion_trabajo: e.target.value})} /></div>
                    <div><Label>Teléfono Trabajo</Label><Input value={datosNaturalForm.telefono_trabajo} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, telefono_trabajo: e.target.value})} /></div>
                    <div><Label>Vigencia</Label><Input type="date" value={datosNaturalForm.vigencia} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, vigencia: e.target.value})} /></div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" aria-label="En baja" checked={datosNaturalForm.en_baja} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, en_baja: e.target.checked})} />
                  <Label className="mb-0">¿En baja?</Label>
                </div>
                {datosNaturalForm.en_baja && (
                  <div><Label>Fecha de Baja</Label><Input type="date" value={datosNaturalForm.fecha_baja} onChange={(e) => setDatosNaturalForm({...datosNaturalForm, fecha_baja: e.target.value})} /></div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datos Persona Jurídica */}
          {tipoPersona === 'JURIDICA' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Datos Persona Jurídica</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Código REUP</Label><Input value={datosJuridicaForm.codigo_reup} onChange={(e) => setDatosJuridicaForm({...datosJuridicaForm, codigo_reup: e.target.value})} placeholder="123.45.67890" /></div>
                <div>
                  <Label>Tipo de Entidad</Label>
                  <select
                    aria-label="Tipo de Entidad"
                    value={datosJuridicaForm.id_tipo_entidad || ''}
                    onChange={(e) => setDatosJuridicaForm({...datosJuridicaForm, id_tipo_entidad: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccione tipo</option>
                    {tiposEntidad.map((t) => <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>{t.nombre}</option>)}
                  </select>
                </div>
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
                    value={datosTCPForm.nombre}
                    onChange={(e) => setDatosTCPForm({...datosTCPForm, nombre: e.target.value})}
                    className={formErrors.tcp_nombre ? 'border-red-500' : ''}
                  />
                  {formErrors.tcp_nombre && <p className="text-red-500 text-sm">{formErrors.tcp_nombre}</p>}
                </div>
                <div><Label>Primer Apellido</Label><Input value={datosTCPForm.primer_apellido} onChange={(e) => setDatosTCPForm({...datosTCPForm, primer_apellido: e.target.value})} /></div>
                <div><Label>Segundo Apellido</Label><Input value={datosTCPForm.segundo_apellido} onChange={(e) => setDatosTCPForm({...datosTCPForm, segundo_apellido: e.target.value})} /></div>
                <div className="md:col-span-2"><Label>Dirección</Label><Input value={datosTCPForm.direccion} onChange={(e) => setDatosTCPForm({...datosTCPForm, direccion: e.target.value})} /></div>
                <div><Label># de Registro del Proyecto</Label><Input value={datosTCPForm.numero_registro_proyecto} onChange={(e) => setDatosTCPForm({...datosTCPForm, numero_registro_proyecto: e.target.value})} /></div>
                <div><Label>Fecha de Aprobación</Label><Input type="date" value={datosTCPForm.fecha_aprobacion} onChange={(e) => setDatosTCPForm({...datosTCPForm, fecha_aprobacion: e.target.value})} /></div>
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
                <Input placeholder="Titular" aria-label="Titular cuenta" value={nuevaCuenta.titular} onChange={(e) => setNuevaCuenta({...nuevaCuenta, titular: e.target.value})} />
                <Input placeholder="Banco" aria-label="Banco cuenta" value={nuevaCuenta.banco} onChange={(e) => setNuevaCuenta({...nuevaCuenta, banco: e.target.value})} />
                <Input placeholder="Sucursal" aria-label="Sucursal cuenta" type="number" value={nuevaCuenta.sucursal || ''} onChange={(e) => setNuevaCuenta({...nuevaCuenta, sucursal: parseInt(e.target.value) || 0})} />
                <Button type="button" aria-label="Agregar cuenta" onClick={addCuenta} variant="outline"><Plus className="h-4 w-4" /></Button>
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
                        <TableCell><button aria-label="Eliminar cuenta" title="Eliminar cuenta" onClick={() => removeCuenta(index)}><Trash2 className="h-4 w-4 text-red-600" /></button></TableCell>
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

  const renderDetailView = () => {
    if (!viewingCliente) return null;
    return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Detalles del Cliente</h1>
        <Button variant="secondary" onClick={() => { setView('list'); setViewingCliente(null); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />Volver
          </Button>
        </div>

        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label># Cliente</Label><p className="font-medium">{viewingCliente.numero_cliente || 'N/A'}</p></div>
            <div><Label>Nombre</Label><p className="font-medium">{viewingCliente.nombre}</p></div>
            <div><Label>Cédula/RIF</Label><p className="font-medium">{viewingCliente.cedula_rif || 'N/A'}</p></div>
            <div><Label>Tipo Persona</Label><p className="font-medium">{viewingCliente.tipo_persona}</p></div>
            <div><Label>Tipo Relación</Label><p className="font-medium">{viewingCliente.tipo_relacion}</p></div>
            <div><Label>Estado</Label><p className="font-medium">{viewingCliente.estado}</p></div>
            <div><Label>Teléfono</Label><p className="font-medium">{viewingCliente.telefono || 'N/A'}</p></div>
            <div><Label>Email</Label><p className="font-medium">{viewingCliente.email || 'N/A'}</p></div>
            <div><Label>Fax</Label><p className="font-medium">{viewingCliente.fax || 'N/A'}</p></div>
            <div><Label>Web</Label><p className="font-medium">{viewingCliente.web || 'N/A'}</p></div>
            <div><Label>Código Postal</Label><p className="font-medium">{viewingCliente.codigo_postal || 'N/A'}</p></div>
            <div><Label>Fecha Registro</Label><p className="font-medium">{viewingCliente.fecha_registro}</p></div>
            <div className="md:col-span-3"><Label>Dirección</Label><p className="font-medium">{viewingCliente.direccion}</p></div>
          </CardContent>
        </Card>

        {/* Datos según tipo de persona */}
        {viewingCliente.tipo_persona === 'NATURAL' && datosNatural && (
          <Card>
            <CardHeader>
              <CardTitle>Datos Persona Natural</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Nombre</Label><p className="font-medium">{datosNatural.nombre || 'N/A'}</p></div>
              <div><Label>Primer Apellido</Label><p className="font-medium">{datosNatural.primer_apellido || 'N/A'}</p></div>
              <div><Label>Segundo Apellido</Label><p className="font-medium">{datosNatural.segundo_apellido || 'N/A'}</p></div>
              <div><Label>Carnet de Identidad</Label><p className="font-medium">{datosNatural.carnet_identidad || 'N/A'}</p></div>
              <div><Label>Código Expediente</Label><p className="font-medium">{datosNatural.codigo_expediente || 'N/A'}</p></div>
              <div><Label>Número de Registro</Label><p className="font-medium">{datosNatural.numero_registro || 'N/A'}</p></div>
              <div><Label>Catálogo</Label><p className="font-medium">{datosNatural.catalogo || 'N/A'}</p></div>
              <div><Label>¿Es Trabajador?</Label><p className="font-medium">{datosNatural.es_trabajador ? 'Sí' : 'No'}</p></div>
              {datosNatural.es_trabajador && (
                <>
                  <div><Label>Ocupación</Label><p className="font-medium">{datosNatural.ocupacion || 'N/A'}</p></div>
                  <div><Label>Centro de Trabajo</Label><p className="font-medium">{datosNatural.centro_trabajo || 'N/A'}</p></div>
                  <div><Label>Correo Trabajo</Label><p className="font-medium">{datosNatural.correo_trabajo || 'N/A'}</p></div>
                  <div><Label>Dirección Trabajo</Label><p className="font-medium">{datosNatural.direccion_trabajo || 'N/A'}</p></div>
                  <div><Label>Teléfono Trabajo</Label><p className="font-medium">{datosNatural.telefono_trabajo || 'N/A'}</p></div>
                  <div><Label>Vigencia</Label><p className="font-medium">{datosNatural.vigencia || 'N/A'}</p></div>
                </>
              )}
              <div><Label>¿En Baja?</Label><p className="font-medium">{datosNatural.en_baja ? 'Sí' : 'No'}</p></div>
              {datosNatural.en_baja && (
                <div><Label>Fecha de Baja</Label><p className="font-medium">{datosNatural.fecha_baja || 'N/A'}</p></div>
              )}
            </CardContent>
          </Card>
        )}

        {viewingCliente.tipo_persona === 'JURIDICA' && datosJuridica && (
          <Card>
            <CardHeader>
              <CardTitle>Datos Persona Jurídica</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Código REUP</Label><p className="font-medium">{datosJuridica.codigo_reup || 'N/A'}</p></div>
              <div><Label>Tipo de Entidad</Label><p className="font-medium">{tiposEntidad.find(t => t.id_tipo_entidad === datosJuridica.id_tipo_entidad)?.nombre || 'N/A'}</p></div>
            </CardContent>
          </Card>
        )}

        {viewingCliente.tipo_persona === 'TCP' && datosTCP && (
          <Card>
            <CardHeader>
              <CardTitle>Datos TCP</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Nombre</Label><p className="font-medium">{datosTCP.nombre || 'N/A'}</p></div>
              <div><Label>Primer Apellido</Label><p className="font-medium">{datosTCP.primer_apellido || 'N/A'}</p></div>
              <div><Label>Segundo Apellido</Label><p className="font-medium">{datosTCP.segundo_apellido || 'N/A'}</p></div>
              <div className="md:col-span-2"><Label>Dirección</Label><p className="font-medium">{datosTCP.direccion || 'N/A'}</p></div>
              <div><Label># Registro Proyecto</Label><p className="font-medium">{datosTCP.numero_registro_proyecto || 'N/A'}</p></div>
              <div><Label>Fecha Aprobación</Label><p className="font-medium">{datosTCP.fecha_aprobacion || 'N/A'}</p></div>
            </CardContent>
          </Card>
        )}

        {/* Cuentas Bancarias */}
        {cuentasCliente.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cuentas Bancarias</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titular</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Número Cuenta</TableHead>
                    <TableHead>Dirección</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasCliente.map((cuenta) => (
                    <TableRow key={cuenta.id_cuenta}>
                      <TableCell>{cuenta.titular}</TableCell>
                      <TableCell>{cuenta.banco}</TableCell>
                      <TableCell>{cuenta.sucursal}</TableCell>
                      <TableCell>{cuenta.numero_cuenta || 'N/A'}</TableCell>
                      <TableCell>{cuenta.direccion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // VISTA: LISTA
  const filteredClientes = useMemo(() => {
    let result = clientes;
    
    // Filter by tipo_relacion if this is the proveedor view
    if (isProveedorView) {
      result = result.filter(c => c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS');
    }
    
    if (!searchTerm) return result;
    return result.filter(c => 
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cedula_rif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm, isProveedorView]);

  // Render based on view state
  if (view === 'form') {
    return renderFormView();
  }

  if (view === 'detail' && viewingCliente) {
    return renderDetailView();
  }

  // Default: render list view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isProveedorView ? 'Proveedores' : 'Clientes'}</h1>
          <p className="text-gray-500 mt-1">
            {filteredClientes.length === clientes.length 
              ? `Gestión de clientes (${clientes.length} items)`
              : `Mostrando ${filteredClientes.length} de ${clientes.length} clientes`
            }
          </p>
        </div>
        <Button onClick={() => { resetForm(); setView('form'); }}><Plus className="h-4 w-4 mr-2" />{isProveedorView ? 'Nuevo Proveedor' : 'Nuevo Cliente'}</Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de clientes */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Nombre</th>
                <th className="text-left p-4 font-medium text-gray-600">Cédula/RIF</th>
                <th className="text-left p-4 font-medium text-gray-600">Teléfono</th>
                <th className="text-left p-4 font-medium text-gray-600">Email</th>
                <th className="text-left p-4 font-medium text-gray-600">Tipo</th>
                <th className="text-left p-4 font-medium text-gray-600">Estado</th>
                <th className="text-right p-4 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    {isProveedorView ? 'No hay proveedores registrados' : 'No hay clientes registrados'}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id_cliente} className="border-b hover:bg-gray-50">
                    <td className="p-4">{cliente.nombre || '(Sin nombre)'}</td>
                    <td className="p-4">{cliente.cedula_rif || '-'}</td>
                    <td className="p-4">{cliente.telefono || '-'}</td>
                    <td className="p-4">{cliente.email || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cliente.tipo_persona === 'NATURAL' ? 'bg-blue-100 text-blue-800' :
                        cliente.tipo_persona === 'JURIDICA' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {cliente.tipo_persona || 'NATURAL'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cliente.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cliente.estado || 'ACTIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(cliente)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cliente)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cliente)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
