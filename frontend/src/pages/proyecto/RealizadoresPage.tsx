import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { ClienteForm } from '../clientes/components/form/ClienteForm';
import { personaEtapaService, etapasProyectoService, clientesService, monedaService, solicitudesService, personaLiquidacionService } from '../../services/api';
import type { PersonaEtapa, PersonaEtapaCreate, Etapa, SolicitudServicio, PersonaLiquidacion } from '../../types/servicio';
import type { Cliente, ClienteNatural, ClienteNaturalCreate, ClienteJuridicaCreate, ClienteTCPCreate, ClienteTCP, ClienteJuridica } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, ArrowLeft, Search, Users, X, DollarSign, Eye, ListFilter, FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

interface PersonaEtapaWithDetails extends PersonaEtapa {
  persona?: ClienteNatural;
  moneda?: Moneda;
}

interface ClienteConDetalles extends Cliente {
  primer_apellido?: string;
  segundo_apellido?: string;
  carnet_identidad?: string;
}

export function RealizadoresPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get('etapa');
  const [view, setView] = useState<View>('list');

  const [personasEtapa, setPersonasEtapa] = useState<PersonaEtapaWithDetails[]>([]);
  const [todosClientes, setTodosClientes] = useState<Cliente[]>([]);
  const [personasNaturales, setPersonasNaturales] = useState<ClienteNatural[]>([]);
  const [personasTCP, setPersonasTCP] = useState<ClienteTCP[]>([]);
  const [personasJuridicas, setPersonasJuridicas] = useState<ClienteJuridica[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [etapasSolicitud, setEtapasSolicitud] = useState<Etapa[]>([]);
  const [busquedaPersona, setBusquedaPersona] = useState('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Cliente | ClienteConDetalles | null>(null);
  const [busquedaSolicitud, setBusquedaSolicitud] = useState('');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudServicio | null>(null);
  const [showDropdownPersona, setShowDropdownPersona] = useState(false);
  const [showDropdownSolicitud, setShowDropdownSolicitud] = useState(false);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [nuevoClienteTipo, setNuevoClienteTipo] = useState<string>('NATURAL');
  const [nuevoClienteData, setNuevoClienteData] = useState<Record<string, any>>({});
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const dropdownPersonaRef = useRef<HTMLDivElement>(null);
  const dropdownSolicitudRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<number | null>(etapaParam ? Number(etapaParam) : null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: PersonaEtapaWithDetails | null }>({ isOpen: false, item: null });
  const [liquidacionesModal, setLiquidacionesModal] = useState<{ isOpen: boolean; persona: PersonaEtapaWithDetails | null; liquidaciones: PersonaLiquidacion[] }>({ isOpen: false, persona: null, liquidaciones: [] });
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

  const getTipoPersona = (idPersona: number): string => {
    if (personasNaturales.find(p => p.id_cliente === idPersona)) return 'natural';
    if (personasTCP.find(p => p.id_cliente === idPersona)) return 'tcp';
    if (personasJuridicas.find(p => p.id_cliente === idPersona)) return 'juridica';
    return 'natural';
  };

  const getLabelTipo = (idPersona: number): string => {
    const tipo = getTipoPersona(idPersona);
    const labels: Record<string, string> = {
      natural: 'Natural',
      tcp: 'TCP',
      juridica: 'Jurídica'
    };
    return labels[tipo] || 'Natural';
  };

  const getClienteById = (idPersona: number): ClienteNatural | ClienteTCP | ClienteJuridica | undefined => {
    return personasNaturales.find(p => p.id_cliente === idPersona) || 
           personasTCP.find(p => p.id_cliente === idPersona) ||
           personasJuridicas.find(p => p.id_cliente === idPersona);
  };

  const loadInitialData = async () => {
    try {
      const [todosClientesRes, personasRes, monedasRes, solicitudesRes, tcpRes, juridicasRes] = await Promise.all([
        clientesService.getClientes(0, 10000),
        clientesService.getPersonasNaturales(),
        monedaService.getMonedas(0, 100),
        solicitudesService.getSolicitudes(0, 1000),
        clientesService.getClientes(0, 10000, 'TCP'),
        clientesService.getClientes(0, 10000, 'JURIDICA')
      ]);
      setTodosClientes(todosClientesRes);
      setPersonasNaturales(personasRes);
      setPersonasTCP(tcpRes);
      setPersonasJuridicas(juridicasRes);
      setMonedas(monedasRes);
      setSolicitudes(solicitudesRes);
      if (etapaParam) {
        const etapaData = await etapasProyectoService.getEtapa(Number(etapaParam));
        setCurrentEtapa(etapaData);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadPersonas = async () => {
    try {
      let allPersonas: PersonaEtapaWithDetails[] = [];
      if (etapaParam) {
        const data = await personaEtapaService.getPersonasByEtapa(Number(etapaParam));
        allPersonas = data.map(p => ({ ...p }));
      } else {
        const solicitudes = await solicitudesService.getSolicitudes(0, 1000);
        const allEtapas: Etapa[] = [];
        for (const sol of solicitudes) {
          const etapasData = await etapasProyectoService.getEtapasBySolicitud(sol.id_solicitud_servicio).catch(() => []);
          allEtapas.push(...etapasData);
        }
        setEtapas(allEtapas);
        const results = await Promise.all(
          allEtapas.map(e => personaEtapaService.getPersonasByEtapa(e.id_etapa).catch(() => []))
        );
        allPersonas = results.flat().map(p => ({ ...p }));
      }
      setPersonasEtapa(allPersonas);
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => {
    if (view === 'list') loadPersonas();
  }, [view]);

  const handleSave = async () => {
    try {
      const data: PersonaEtapaCreate = {
        id_etapa: Number(formData.id_etapa) || (etapaParam ? Number(etapaParam) : 0),
        id_persona: Number(formData.id_persona) || 0,
        cobro: formData.cobro ? Number(formData.cobro) : 0,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined
      };
      await personaEtapaService.createPersonaEtapa(data);
      toast.success('Creado');
      setView('list');
      resetForm();
      loadPersonas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (etapaId: number, personaId: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar realizador?',
      message: `¿Está seguro de eliminar a "${nombre}" de esta etapa?`,
      onConfirm: async () => {
        try {
          await personaEtapaService.deletePersonaEtapa(etapaId, personaId);
          toast.success('Eliminado');
          loadPersonas();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({});
    setPersonaSeleccionada(null);
    setBusquedaPersona('');
    setSolicitudSeleccionada(null);
    setBusquedaSolicitud('');
    setEtapasSolicitud([]);
    setShowDropdownPersona(false);
    setShowDropdownSolicitud(false);
  };

  const openForm = () => {
    resetForm();
    if (etapaParam) {
      setFormData({ id_etapa: Number(etapaParam) });
    }
    setView('form');
  };

  const getPersonaName = (id: number) => {
    const p = personasNaturales.find(pn => pn.id_cliente === id);
    if (!p) return `Persona #${id}`;
    return `${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ''}`.trim();
  };

  const getPersonaCI = (id: number) => {
    const p = personasNaturales.find(pn => pn.id_cliente === id);
    return p?.carnet_identidad || 'N/A';
  };

  const getMonedaSymbol = (id?: number) => {
    if (!id) return '';
    const m = monedas.find(mo => mo.id_moneda === id);
    return m?.simbolo || '';
  };

  const filteredPersonas = useMemo(() => {
    const uniqueMap = new Map<number, PersonaEtapaWithDetails>();
    personasEtapa.forEach(p => {
      if (!uniqueMap.has(p.id_persona)) {
        uniqueMap.set(p.id_persona, p);
      }
    });
    const uniquePersonas = Array.from(uniqueMap.values());
    
    if (!searchTerm) return uniquePersonas;
    return uniquePersonas.filter(p => {
      const name = getPersonaName(p.id_persona);
      const ci = getPersonaCI(p.id_persona);
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [personasEtapa, searchTerm, personasNaturales]);

  const personasFiltradas = useMemo(() => {
    if (!busquedaPersona) return todosClientes;
    const term = busquedaPersona.toLowerCase();
    return todosClientes.filter(c =>
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.numero_cliente || '').toLowerCase().includes(term) ||
      (c.cedula_rif || '').toLowerCase().includes(term)
    );
  }, [todosClientes, busquedaPersona]);

  const solicitudesFiltradas = useMemo(() => {
    if (!busquedaSolicitud) return solicitudes;
    const term = busquedaSolicitud.toLowerCase();
    return solicitudes.filter(s =>
      (s.numero || '').toLowerCase().includes(term) ||
      (s.codigo_solicitud || '').toLowerCase().includes(term) ||
      (s.nombres_rep || '').toLowerCase().includes(term) ||
      (s.apellido1_rep || '').toLowerCase().includes(term) ||
      (s.ci_rep || '').toLowerCase().includes(term) ||
      (s.descripcion || '').toLowerCase().includes(term)
    );
  }, [solicitudes, busquedaSolicitud]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownPersonaRef.current && !dropdownPersonaRef.current.contains(e.target as Node)) {
        setShowDropdownPersona(false);
      }
      if (dropdownSolicitudRef.current && !dropdownSolicitudRef.current.contains(e.target as Node)) {
        setShowDropdownSolicitud(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeleccionarPersona = (c: Cliente | ClienteConDetalles) => {
    setPersonaSeleccionada(c);
    setBusquedaPersona(c.nombre || '');
    setShowDropdownPersona(false);
    setFormData(prev => ({ ...prev, id_persona: c.id_cliente }));
  };

  const handleSeleccionarSolicitud = async (s: SolicitudServicio) => {
    setSolicitudSeleccionada(s);
    setBusquedaSolicitud(s.numero || s.codigo_solicitud || '');
    setShowDropdownSolicitud(false);
    setFormData(prev => ({ ...prev, id_etapa: '' }));
    setEtapasSolicitud([]);
    try {
      const etapas = await etapasProyectoService.getEtapasBySolicitud(s.id_solicitud_servicio);
      setEtapasSolicitud(etapas);
    } catch (error) {
      setEtapasSolicitud([]);
    }
  };

  const handleCrearCliente = async () => {
    if (!nuevoClienteData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      setGuardandoCliente(true);
      if (nuevoClienteTipo === 'NATURAL') {
        const data = await clientesService.createCliente({
          nombre: nuevoClienteData.nombre,
          tipo_persona: 'NATURAL',
          cedula_rif: nuevoClienteData.carnet_identidad || '',
          telefono: nuevoClienteData.telefono || '',
          email: nuevoClienteData.correo || '',
          direccion: '',
          tipo_relacion: 'CLIENTE',
          estado: 'ACTIVO',
          activo: true
        });
        setFormData(prev => ({ ...prev, id_persona: data.id_cliente }));
        setBusquedaPersona(data.nombre || '');
        setPersonaSeleccionada(data);
        toast.success('Cliente creado');
      } else if (nuevoClienteTipo === 'JURIDICA') {
        const data = await clientesService.createCliente({
          nombre: nuevoClienteData.nombre,
          tipo_persona: 'JURIDICA',
          cedula_rif: nuevoClienteData.codigo_nit || nuevoClienteData.codigo_reup || '',
          telefono: nuevoClienteData.telefono || '',
          email: nuevoClienteData.correo || '',
          direccion: '',
          tipo_relacion: 'CLIENTE',
          estado: 'ACTIVO',
          activo: true
        });
        setFormData(prev => ({ ...prev, id_persona: data.id_cliente }));
        setBusquedaPersona(data.nombre || '');
        setPersonaSeleccionada(data);
        toast.success('Cliente creado');
      } else if (nuevoClienteTipo === 'TCP') {
        const data = await clientesService.createCliente({
          nombre: nuevoClienteData.nombre,
          tipo_persona: 'TCP',
          cedula_rif: nuevoClienteData.carnet_identidad || '',
          telefono: nuevoClienteData.telefono || '',
          email: nuevoClienteData.correo || '',
          direccion: '',
          tipo_relacion: 'CLIENTE',
          estado: 'ACTIVO',
          activo: true
        });
        setFormData(prev => ({ ...prev, id_persona: data.id_cliente }));
        setBusquedaPersona(data.nombre || '');
        setPersonaSeleccionada(data);
        toast.success('Cliente creado');
      }
      setShowNuevoClienteModal(false);
      setNuevoClienteData({});
      setNuevoClienteTipo('NATURAL');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cliente');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {etapaParam && (
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Realizadores</h1>
            <p className="text-gray-500 mt-1">
              {currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Gestión de realizadores'}
              {` · ${filteredPersonas.length} persona(s)`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
Nuevo Realizador
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o CI..."
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
                    <Users className="h-4 w-4 text-teal-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Cobro
                  </div>
                </TableHead>
                <TableHead>Liquidaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron realizadores que coincidan con la búsqueda' : 'No hay realizadores registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonas.map((item) => {
                  const persona = getClienteById(item.id_persona);
                  return (
                    <TableRow key={`${item.id_etapa}-${item.id_persona}`} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="font-medium text-gray-900">{persona?.nombre || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getTipoPersona(item.id_persona) === 'natural' ? 'bg-blue-100 text-blue-800' :
                          getTipoPersona(item.id_persona) === 'tcp' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getLabelTipo(item.id_persona)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {getMonedaSymbol(item.id_moneda)} {Number(item.cobro).toFixed(2)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {item.liquidada ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const liqs = await personaLiquidacionService.getLiquidacionesByPersona(item.id_persona);
                                setLiquidacionesModal({ isOpen: true, persona: item, liquidaciones: liqs });
                              } catch (error) {
                                console.error('Error loading liquidaciones:', error);
                                toast.error('Error al cargar liquidaciones');
                              }
                            }}
                            className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/proyectos/liquidaciones?solicitud=${currentEtapa?.id_solicitud_servicio}&etapa=${item.id_etapa}&persona=${item.id_persona}`)}
                            className="gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Liquidar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id_etapa, item.id_persona, getPersonaName(item.id_persona))}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nuevo Realizador</h2>
            <p className="text-gray-500 mt-1">{currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Asignar realizador a etapa'}</p>
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
            <Users className="h-5 w-5 text-teal-600" />
            Información del Realizador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Fila 1: Buscador + Botón Nuevo Realizador */}
            <div className="flex gap-2 items-start">
              <div ref={dropdownPersonaRef} className="relative flex-1">
                <Label className="text-sm font-medium">Persona *</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar persona..."
                    value={busquedaPersona}
                    disabled={!!personaSeleccionada}
                    onChange={(e) => { setBusquedaPersona(e.target.value); setShowDropdownPersona(true); setPersonaSeleccionada(null); }}
                    onFocus={() => setShowDropdownPersona(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-gray-100"
                  />
                  {personaSeleccionada && (
                    <button
                      type="button"
                      onClick={() => { setPersonaSeleccionada(null); setBusquedaPersona(''); setFormData(prev => ({ ...prev, id_persona: '' })); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showDropdownPersona && personasFiltradas.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {personasFiltradas.map(p => {
                      const clienteExt = p as ClienteConDetalles;
                      return (
                      <button
                        key={p.id_cliente}
                        type="button"
                        onClick={() => handleSeleccionarPersona(p)}
                        className="w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-medium text-gray-900">{p.nombre}</span>
                        <span className="text-gray-600"> {clienteExt.primer_apellido} {clienteExt.segundo_apellido || ''}</span>
                        {clienteExt.carnet_identidad && <span className="text-gray-400 text-sm ml-2">- {clienteExt.carnet_identidad}</span>}
                        <span className="text-xs text-gray-400 ml-2">({p.tipo_persona})</span>
                      </button>
                    )})}
                  </div>
                )}
                {showDropdownPersona && personasFiltradas.length === 0 && busquedaPersona && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No se encontraron resultados
                  </div>
                )}
              </div>
              <div className="pt-7">
                <button
                  type="button"
                  onClick={() => setShowNuevoClienteModal(true)}
                  className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Realizador
                </button>
              </div>
            </div>

{/* Fila 2: Solicitud + Etapa (solo sin etapaParam) - lado a lado */}
            {!etapaParam && (
              <div className="flex gap-2 items-start">
                <div ref={dropdownSolicitudRef} className="relative flex-1">
                  <Label className="text-sm font-medium">Solicitud *</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar solicitud..."
                      value={busquedaSolicitud}
                      onChange={(e) => { setBusquedaSolicitud(e.target.value); setShowDropdownSolicitud(true); setSolicitudSeleccionada(null); }}
                      onFocus={() => setShowDropdownSolicitud(true)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    />
                  </div>
                  {showDropdownSolicitud && solicitudesFiltradas.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {solicitudesFiltradas.map(s => (
                        <button
                          key={s.id_solicitud_servicio}
                          type="button"
                          onClick={() => handleSeleccionarSolicitud(s)}
                          className="w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">{s.numero || s.codigo_solicitud}</span>
                          {s.descripcion && <span className="text-gray-500 text-sm ml-2">- {s.descripcion}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdownSolicitud && solicitudesFiltradas.length === 0 && busquedaSolicitud && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">Etapa *</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    value={formData.id_etapa || ''}
                    onChange={(e: any) => {
                      const etapaId = Number(e.target.value);
                      const etapaSel = etapasSolicitud.find(et => et.id_etapa === etapaId);
                      setFormData({ 
                        ...formData, 
                        id_etapa: etapaId,
                        id_moneda: etapaSel?.id_moneda || formData.id_moneda || ''
                      });
                    }}
                    disabled={!solicitudSeleccionada}
                  >
                    <option value="">Seleccionar etapa</option>
                    {etapasSolicitud.map(e => (
                      <option key={e.id_etapa} value={e.id_etapa}>{e.nombre_etapa || `Etapa #${e.numero_etapa}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Fila 3: Cobro + Moneda (lado a lado) */}
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Label className="text-sm font-medium">Cobro</Label>
                <Input type="number" step="0.01" value={formData.cobro || ''} onChange={(e: any) => setFormData({ ...formData, cobro: e.target.value })} className="mt-1" placeholder="0.00" />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">Moneda</Label>
                <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || currentEtapa?.id_moneda || ''} onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}>
                  <option value="">Seleccionar moneda</option>
                  {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
              <Save className="h-4 w-4" />
              Guardar
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
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{getPersonaName(detailModal.item.id_persona)}</h3>
                    <p className="text-sm text-gray-500 font-mono">CI: {getPersonaCI(detailModal.item.id_persona)}</p>
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
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Cobro</p>
                  <p className="font-bold text-green-900 text-xl">{getMonedaSymbol(detailModal.item.id_moneda)} {Number(detailModal.item.cobro).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{getMonedaSymbol(detailModal.item.id_moneda) || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Liquidada</p>
                  {detailModal.item.liquidada ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sí</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No</span>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pago Completado</p>
                  {detailModal.item.pago_completado ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sí</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No</span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => detailModal.item && navigate(`/proyectos/liquidaciones?persona=${detailModal.item.id_persona}`)}
                className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50"
              >
                <Eye className="h-4 w-4" />
                Ver Liquidaciones
              </Button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {liquidacionesModal.isOpen && liquidacionesModal.persona && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Liquidaciones</h3>
                    <p className="text-sm text-gray-500">Historial de liquidaciones del realizador</p>
                  </div>
                </div>
                <button onClick={() => setLiquidacionesModal({ isOpen: false, persona: null, liquidaciones: [] })} className="p-2 hover:bg-gray-200 rounded-full">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {liquidacionesModal.liquidaciones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay liquidaciones registradas</p>
                </div>
              ) : (
                liquidacionesModal.liquidaciones.map((liq) => (
                  <div key={liq.id_liquidacion} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Número</p>
                        <p className="font-semibold text-gray-900">{liq.numero || `LIQ-${liq.id_liquidacion}`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Fecha</p>
                        <p className="font-semibold text-gray-900">{liq.fecha_emision || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Devengado</p>
                        <p className="font-semibold text-gray-900">{Number(liq.devengado || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Neto a Pagar</p>
                        <p className="font-bold text-green-600">{Number(liq.neto_pagar || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <div>
                        {liq.confirmado ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Confirmada</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLiquidacionesModal({ isOpen: false, persona: null, liquidaciones: [] });
                          navigate(`/proyectos/liquidaciones?id=${liq.id_liquidacion}`);
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver Detalle
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setLiquidacionesModal({ isOpen: false, persona: null, liquidaciones: [] })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showNuevoClienteModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Nuevo Cliente</h3>
                    <p className="text-sm text-gray-500">Crear nuevo cliente para asignar como realizador</p>
                  </div>
                </div>
                <button onClick={() => setShowNuevoClienteModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ClienteForm
                editingCliente={null}
                isProveedorView={false}
                onCancel={() => {
                  setShowNuevoClienteModal(false);
                }}
                onSubmit={async (data: any) => {
                  try {
                    const nuevoCliente = await clientesService.createCliente(data);
                    handleSeleccionarPersona(nuevoCliente);
                    setShowNuevoClienteModal(false);
                    toast.success('Cliente creado');
                  } catch (error: any) {
                    toast.error(error.message || 'Error al crear cliente');
                  }
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
