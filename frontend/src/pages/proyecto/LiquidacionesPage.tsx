import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Check,
  XCircle,
  FileText,
  ScrollText,
  Tag,
  DollarSign,
  Calendar,
  User,
  Calculator,
  ArrowLeft,
  Save
} from 'lucide-react';
import { 
  personaLiquidacionService, 
  monedaService, 
  clientesService, 
  etapasProyectoService, 
  solicitudesService, 
  personaEtapaService,
  facturasServicioService
} from '../../services/api';
import type { PersonaLiquidacionInput, PersonaLiquidacionInputUpdate, FacturaPagoValidacion, PersonaLiquidacionValidacion } from '../../types/servicio';
import type { 
  PersonaLiquidacion,
  PersonaEtapa,
  Etapa,
  SolicitudServicio,
  Moneda,
  Cliente
} from '../../services/api';

type View = 'list' | 'form';
type TabType = 'todas' | 'pendientes' | 'liquidadas';

export function LiquidacionesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [activeTab, setActiveTab] = useState<TabType>('todas');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const idParam = searchParams.get('id');
  const solicitudParam = searchParams.get('solicitud');
  const etapaParam = searchParams.get('etapa');
  const personaParam = searchParams.get('persona');
  
  const [filtroPersona, setFiltroPersona] = useState<number | null>(
    personaParam ? Number(personaParam) : null
  );
  
  const [selectedSolicitud, setSelectedSolicitud] = useState<number | null>(
    solicitudParam ? Number(solicitudParam) : null
  );
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(
    etapaParam ? Number(etapaParam) : null
  );
  const [selectedPersona, setSelectedPersona] = useState<number | null>(
    personaParam ? Number(personaParam) : null
  );
  const [personasEtapa, setPersonasEtapa] = useState<Cliente[]>([]);
  
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: PersonaLiquidacion | null }>({ isOpen: false, item: null });
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; item: PersonaLiquidacion | null }>({ isOpen: false, item: null });
  const [confirmData, setConfirmData] = useState({
    observaciones: ''
  });
  
  const [validacionModal, setValidacionModal] = useState<{ isOpen: boolean; validacion: PersonaLiquidacionValidacion | null }>({ isOpen: false, validacion: null });
  
  const [formData, setFormData] = useState({
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_liquidacion: '',
    descripcion: '',
    id_moneda: 1,
    tipo_pago: 'TRANSFERENCIA',
    importe: 0,
    porcentaje_caguayo: 10,
    tributario: 5,
    comision_bancaria: 0,
    gasto_empresa: 0,
    doc_pago_liquidacion: '',
    observacion: ''
  });

  const { data: liquidaciones = [], isLoading } = useQuery({
    queryKey: ['persona-liquidaciones', activeTab],
    queryFn: () => personaLiquidacionService.getLiquidaciones(0, 1000)
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(0, 100)
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(0, 1000)
  });

  const { data: solicitudes = [] } = useQuery({
    queryKey: ['solicitudes'],
    queryFn: () => solicitudesService.getSolicitudes(0, 1000)
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', selectedSolicitud],
    queryFn: () => selectedSolicitud ? etapasProyectoService.getEtapasBySolicitud(selectedSolicitud) : Promise.resolve([]),
    enabled: !!selectedSolicitud
  });

  useEffect(() => {
    if (idParam && Number(idParam) > 0) {
      personaLiquidacionService.getLiquidacion(Number(idParam)).then((liq) => {
        if (liq) {
          openForm(liq);
        }
      }).catch(console.error);
    } else if (solicitudParam && etapaParam && personaParam) {
      setView('form');
    }
  }, [idParam, solicitudParam, etapaParam, personaParam]);

  useEffect(() => {
    if (solicitudParam && Number(solicitudParam) > 0) {
      etapasProyectoService.getEtapasBySolicitud(Number(solicitudParam)).then((ets) => {
        if (ets.length > 0 && etapaParam) {
          setSelectedEtapa(Number(etapaParam));
        }
      }).catch(console.error);
    }
  }, [solicitudParam, etapaParam]);

  useEffect(() => {
    if (selectedEtapa) {
      personaEtapaService.getPersonasByEtapa(selectedEtapa).then(async (pes) => {
        const personasDetails = await Promise.all(
          pes.map(async (pe: PersonaEtapa) => {
            try {
              return await clientesService.getCliente(pe.id_persona);
            } catch {
              return null;
            }
          })
        );
        const filtered = personasDetails.filter((p): p is Cliente => p !== null);
        setPersonasEtapa(filtered);
        
        if (personaParam && Number(personaParam) > 0) {
          setSelectedPersona(Number(personaParam));
        }
      }).catch(console.error);
    }
  }, [selectedEtapa]);

  useEffect(() => {
    if (selectedPersona && selectedEtapa && personaParam) {
      loadPersonaEtapaCobro(selectedEtapa, selectedPersona);
    }
  }, [selectedPersona]);

  const createMutation = useMutation({
    mutationFn: (data: PersonaLiquidacionInput) => personaLiquidacionService.createLiquidacion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-liquidaciones'] });
      toast.success('Liquidación creada correctamente');
      setView('list');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al crear liquidación');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PersonaLiquidacionInputUpdate }) => 
      personaLiquidacionService.updateLiquidacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-liquidaciones'] });
      toast.success('Liquidación actualizada correctamente');
      setView('list');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al actualizar liquidación');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => personaLiquidacionService.deleteLiquidacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-liquidaciones'] });
      toast.success('Liquidación eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar liquidación');
    }
  });

  const confirmarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { devengado?: number; tributario?: number; comision_bancaria?: number; gasto_empresa?: number; observaciones?: string; porcentaje_caguayo?: number } }) => 
      personaLiquidacionService.confirmarLiquidacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-liquidaciones'] });
      toast.success('Liquidación confirmada');
      setConfirmModal({ isOpen: false, item: null });
      setConfirmData({ observaciones: '' });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al confirmar liquidación');
    }
  });

  const handleConfirmar = (item: PersonaLiquidacion) => {
    setConfirmModal({ isOpen: true, item });
    setConfirmData({ observaciones: '' });
  };

  const handleConfirmarSubmit = async () => {
    if (!confirmModal.item) return;
    const item = confirmModal.item;

    if (item.id_etapa && item.id_persona) {
      try {
        const validacion = await personaLiquidacionService.validarLiquidar(item.id_etapa, item.id_persona);
        
        if (!validacion.puede_liquidar) {
          setConfirmModal({ isOpen: false, item: null });
          setValidacionModal({ isOpen: true, validacion });
          return;
        }
      } catch (error) {
        console.error('Error validando liquidación:', error);
      }
    }

    const devengado = (item.gasto_empresa || 0) - (item.comision_bancaria || 0);
    confirmarMutation.mutate({
      id: item.id_liquidacion,
      data: {
        devengado,
        porcentaje_caguayo: item.porcentaje_caguayo || 10,
        tributario: item.tributario || 5,
        comision_bancaria: item.comision_bancaria || 0,
        gasto_empresa: item.gasto_empresa || 0,
        observaciones: confirmData.observaciones || undefined
      }
    });
  };

  const resetForm = () => {
    setFormData({
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_liquidacion: '',
      descripcion: '',
      id_moneda: 1,
      tipo_pago: 'TRANSFERENCIA',
      importe: 0,
      porcentaje_caguayo: 10,
      tributario: 5,
      comision_bancaria: 0,
      gasto_empresa: 0,
      doc_pago_liquidacion: '',
      observacion: ''
    });
    setEditingId(null);
    setSelectedSolicitud(null);
    setSelectedEtapa(null);
    setSelectedPersona(null);
    setPersonasEtapa([]);
  };

  const calculateImporteCaguayo = () => {
    const importe = Number(formData.importe) || 0;
    const porcentaje = Number(formData.porcentaje_caguayo) || 0;
    return importe * (porcentaje / 100);
  };

  const calculateDevengado = () => {
    const importe = Number(formData.importe) || 0;
    const importe_caguayo = calculateImporteCaguayo();
    return importe - importe_caguayo;
  };

  const calculateTributarioMonto = () => {
    const devengado = calculateDevengado();
    const tributario = Number(formData.tributario) || 0;
    return devengado * (tributario / 100);
  };

  const calculateSubtotal = () => {
    const devengado = calculateDevengado();
    const tributario_monto = calculateTributarioMonto();
    return devengado - tributario_monto;
  };

  const calculateNetoPagar = () => {
    const subtotal = calculateSubtotal();
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    return subtotal - gasto_empresa - comision;
  };

  const loadPersonaEtapaCobro = async (idEtapa: number, idPersona: number) => {
    try {
      const personasEtapa = await personaEtapaService.getPersonasByEtapa(idEtapa);
      const personaEtapa = personasEtapa.find((p: PersonaEtapa) => p.id_persona === idPersona);
      if (personaEtapa) {
        setFormData(prev => ({ ...prev, importe: personaEtapa.cobro || 0 }));
      } else {
        setFormData(prev => ({ ...prev, importe: 0 }));
      }
    } catch (error) {
      console.error('Error loading persona etapa:', error);
      setFormData(prev => ({ ...prev, importe: 0 }));
    }
  };

  const handleSolicitudChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const solicitudId = Number(e.target.value);
    setSelectedSolicitud(solicitudId || null);
    setSelectedEtapa(null);
  };

  const handleEtapaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const etapaId = Number(e.target.value);
    setSelectedEtapa(etapaId || null);
    if (!personaParam) {
      setSelectedPersona(null);
      setFormData(prev => ({ ...prev, importe: 0 }));
      setPersonasEtapa([]);
    }

    if (etapaId) {
      try {
        const validacion = await facturasServicioService.validarPagoEtapa(etapaId);
        
        if (validacion.id_factura_servicio && !validacion.esta_pagada) {
          setValidacionModal({ 
            isOpen: true, 
            validacion: {
              puede_liquidar: false,
              id_etapa: etapaId,
              id_persona: 0,
              factura: validacion,
              mensaje: `Factura no pagada. Saldo pendiente: ${validacion.saldo}`
            }
          });
          return;
        }

        const personasDeEtapa = await personaEtapaService.getPersonasByEtapa(etapaId);
        const personasDetails = await Promise.all(
          personasDeEtapa.map(async (pe: PersonaEtapa) => {
            try {
              return await clientesService.getCliente(pe.id_persona);
            } catch {
              return null;
            }
          })
        );
        setPersonasEtapa(personasDetails.filter((p): p is Cliente => p !== null));
      } catch (error) {
        console.error('Error loading personas de etapa:', error);
      }
    }
  };

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = Number(e.target.value);
    setSelectedPersona(personaId || null);
    
    if (personaId && selectedEtapa) {
      loadPersonaEtapaCobro(selectedEtapa, personaId);
    } else {
      setFormData(prev => ({ ...prev, importe: 0 }));
    }
  };

  const openForm = (item?: PersonaLiquidacion) => {
    if (item) {
      setEditingId(item.id_liquidacion);
      setFormData({
        fecha_emision: item.fecha_emision,
        fecha_liquidacion: item.fecha_liquidacion || '',
        descripcion: item.descripcion || '',
        id_moneda: item.id_moneda || 1,
        tipo_pago: item.tipo_pago || 'TRANSFERENCIA',
        importe: item.importe || 0,
        porcentaje_caguayo: item.porcentaje_caguayo || 10,
        tributario: item.tributario || 5,
        comision_bancaria: item.comision_bancaria || 0,
        gasto_empresa: item.gasto_empresa || 0,
        doc_pago_liquidacion: item.doc_pago_liquidacion || '',
        observacion: item.observacion || ''
      });
      if (item.id_etapa && item.id_persona) {
        setSelectedEtapa(item.id_etapa);
        setSelectedPersona(item.id_persona);
      }
    } else {
      resetForm();
    }
    setView('form');
  };

  const handleSave = async () => {
    if (!selectedEtapa || !selectedPersona) {
      toast.error('Debe seleccionar una etapa y una persona');
      return;
    }

    try {
      const validacion = await personaLiquidacionService.validarLiquidar(selectedEtapa, selectedPersona);
      
      if (!validacion.puede_liquidar) {
        setValidacionModal({ isOpen: true, validacion });
        return;
      }
    } catch (error) {
      console.error('Error validando liquidación:', error);
    }

    const baseData = {
      id_etapa: selectedEtapa,
      id_persona: selectedPersona,
      fecha_emision: formData.fecha_emision || new Date().toISOString().split('T')[0],
      fecha_liquidacion: formData.fecha_liquidacion || undefined,
      descripcion: formData.descripcion || undefined,
      id_moneda: formData.id_moneda || 1,
      tipo_pago: formData.tipo_pago,
      porcentaje_caguayo: Number(formData.porcentaje_caguayo) || 10,
      tributario: Number(formData.tributario) || 5,
      comision_bancaria: Number(formData.comision_bancaria) || 0,
      gasto_empresa: Number(formData.gasto_empresa) || 0,
      doc_pago_liquidacion: formData.doc_pago_liquidacion || undefined,
      observacion: formData.observacion || undefined
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: baseData });
    } else {
      createMutation.mutate(baseData as PersonaLiquidacionInput);
    }
  };

  const getPersonaNombre = (id?: number) => {
    if (!id) return 'N/A';
    const persona = personas.find((p: Cliente) => p.id_cliente === id);
    return persona ? persona.nombre : `Persona #${id}`;
  };

  const getMonedaSimbolo = (id?: number) => {
    if (!id) return '';
    const moneda = monedas.find((m: Moneda) => m.id_moneda === id);
    return moneda ? moneda.simbolo : '';
  };

  const filteredLiquidaciones = useMemo(() => {
    let result = liquidaciones;
    
    if (filtroPersona) {
      result = result.filter((l: PersonaLiquidacion) => l.id_persona === filtroPersona);
    }
    
    if (activeTab === 'pendientes') {
      result = result.filter((l: PersonaLiquidacion) => !l.confirmado);
    } else if (activeTab === 'liquidadas') {
      result = result.filter((l: PersonaLiquidacion) => l.confirmado);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((l: PersonaLiquidacion) =>
        l.numero?.toLowerCase().includes(term) ||
        l.descripcion?.toLowerCase().includes(term) ||
        l.observacion?.toLowerCase().includes(term) ||
        getPersonaNombre(l.id_persona).toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [liquidaciones, activeTab, searchTerm, filtroPersona, personas]);

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {filtroPersona && (
                <Button variant="outline" onClick={() => navigate('/proyectos/realizadores')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Realizadores
                </Button>
              )}
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                <ScrollText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
                <p className="text-gray-500 mt-1">Gestión de liquidaciones a realizadores</p>
              </div>
            </div>
            <Button
              onClick={() => openForm()}
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Nueva Liquidación
            </Button>
          </div>

          <div className="flex gap-4 border-b">
            {(['todas', 'pendientes', 'liquidadas'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar liquidaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                        Número
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-teal-600" />
                        Persona
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-teal-600" />
                        Fecha
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-teal-600" />
                        Importe
                      </div>
                    </TableHead>
                    <TableHead>Neto Pagar</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">Cargando...</TableCell>
                    </TableRow>
                  ) : filteredLiquidaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">No hay liquidaciones</TableCell>
                    </TableRow>
                  ) : (
                    filteredLiquidaciones.map((liquidacion: PersonaLiquidacion) => (
                      <TableRow 
                        key={liquidacion.id_liquidacion} 
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer" 
                        onClick={() => setDetailModal({ isOpen: true, item: liquidacion })}
                      >
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                            <Tag className="h-3 w-3" />
                            {liquidacion.numero || `#${liquidacion.id_liquidacion}`}
                          </span>
                        </TableCell>
                        <TableCell>{getPersonaNombre(liquidacion.id_persona)}</TableCell>
                        <TableCell className="text-gray-900">{liquidacion.fecha_emision}</TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {getMonedaSimbolo(liquidacion.id_moneda)} {Number(liquidacion.importe || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-green-700">
                          {getMonedaSimbolo(liquidacion.id_moneda)} {Number(liquidacion.neto_pagar || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            liquidacion.confirmado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {liquidacion.confirmado ? 'Confirmada' : 'Pendiente'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {!liquidacion.confirmado && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleConfirmar(liquidacion)}
                                className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                                title="Confirmar liquidación"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openForm(liquidacion)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('¿Eliminar liquidación?')) {
                                  deleteMutation.mutate(liquidacion.id_liquidacion);
                                }
                              }}
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
        </>
      )}

      {view === 'form' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                <Calculator className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Liquidación' : 'Nueva Liquidación'}</h2>
                <p className="text-gray-500 mt-1">Complete los datos de la liquidación</p>
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
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Solicitud</Label>
                  <select
                    value={selectedSolicitud || ''}
                    onChange={handleSolicitudChange}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="">Seleccionar solicitud</option>
                    {solicitudes.map((solicitud: SolicitudServicio) => (
                      <option key={solicitud.id_solicitud_servicio} value={solicitud.id_solicitud_servicio}>
                        {solicitud.numero || solicitud.codigo_solicitud || `#${solicitud.id_solicitud_servicio}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Etapa *</Label>
                  <select
                    value={selectedEtapa || ''}
                    onChange={handleEtapaChange}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    disabled={!selectedSolicitud}
                  >
                    <option value="">Seleccionar etapa</option>
                    {etapas.map((etapa: Etapa) => (
                      <option key={etapa.id_etapa} value={etapa.id_etapa}>
                        {etapa.nombre_etapa || `Etapa ${etapa.numero_etapa}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Persona *</Label>
                  <select
                    value={selectedPersona || ''}
                    onChange={handlePersonaChange}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    disabled={!selectedEtapa}
                  >
                    <option value="">Seleccionar persona</option>
                    {personasEtapa.map((persona: Cliente) => (
                      <option key={persona.id_cliente} value={persona.id_cliente}>
                        {persona.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Moneda</Label>
                  <select
                    value={formData.id_moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_moneda: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    {monedas.map((moneda: Moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.nombre} ({moneda.simbolo})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Tipo de Pago</Label>
                  <select
                    value={formData.tipo_pago}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_pago: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                
                <div>
                  <Label>Fecha Emisión *</Label>
                  <Input
                    type="date"
                    value={formData.fecha_emision}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_emision: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Fecha Liquidación</Label>
                  <Input
                    type="date"
                    value={formData.fecha_liquidacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_liquidacion: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Input
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    className="mt-1"
                    placeholder="Descripción de la liquidación"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Información Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <Label>% Caguayo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.porcentaje_caguayo}
                    onChange={(e) => setFormData(prev => ({ ...prev, porcentaje_caguayo: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tributario (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tributario}
                    onChange={(e) => setFormData(prev => ({ ...prev, tributario: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Comisión Bancaria</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.comision_bancaria}
                    onChange={(e) => setFormData(prev => ({ ...prev, comision_bancaria: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Gasto Empresa</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.gasto_empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, gasto_empresa: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 mt-6 border border-teal-100">
                <p className="text-sm text-teal-600 font-medium mb-1">Importe (Cobro)</p>
                <p className="text-2xl font-bold text-teal-700">{Number(formData.importe || 0).toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <div className="mb-4 pb-4 border-b border-gray-300">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Importe:</span>
                      <span className="font-medium">{Number(formData.importe || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Importe Caguayo ({formData.porcentaje_caguayo || 10}%):</span>
                      <span>- {calculateImporteCaguayo().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Devengado:</span>
                      <span className="font-bold text-blue-600 text-lg">{calculateDevengado().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Tributario ({Number(formData.tributario) || 5}%):</span>
                      <span>- {calculateTributarioMonto().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Subtotal:</span>
                      <span className="font-bold text-purple-600 text-lg">{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Gasto Empresa:</span>
                      <span>- {Number(formData.gasto_empresa || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Comisión:</span>
                      <span>- {Number(formData.comision_bancaria || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Neto a Pagar:</span>
                      <span className="font-bold text-green-600 text-xl">{calculateNetoPagar().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Label>Doc Pago Liquidación</Label>
                <Input
                  value={formData.doc_pago_liquidacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, doc_pago_liquidacion: e.target.value }))}
                  className="mt-1 mb-4"
                  placeholder="Documento de pago"
                />
                <Label>Observación</Label>
                <textarea
                  value={formData.observacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 p-2 border rounded resize-none"
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t">
                <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg">
                  <Save className="h-4 w-4" />
                  {editingId ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <ScrollText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Liquidación</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.numero || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Persona</p>
                  <p className="font-bold text-gray-900">{getPersonaNombre(detailModal.item.id_persona)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Neto a Pagar</p>
                  <p className="font-bold text-green-900 text-xl">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.neto_pagar || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Emisión</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_emision}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    detailModal.item.confirmado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {detailModal.item.confirmado ? 'Confirmada' : 'Pendiente'}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Etapa</p>
                  <p className="font-bold text-gray-900">{detailModal.item.id_etapa ? `#${detailModal.item.id_etapa}` : 'N/A'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  Detalle Financiero
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Importe</p>
                    <p className="font-bold text-blue-900">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.importe || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Devengado</p>
                    <p className="font-bold text-purple-900">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.devengado || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Tributario</p>
                    <p className="font-bold text-orange-900">{Number(detailModal.item.tributario || 0).toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Comisión</p>
                    <p className="font-bold text-gray-900">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.comision_bancaria || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Gasto Empresa</p>
                    <p className="font-bold text-red-900">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.gasto_empresa || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100 col-span-3">
                    <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Neto a Pagar</p>
                    <p className="font-bold text-green-900 text-xl">{getMonedaSimbolo(detailModal.item.id_moneda)} {Number(detailModal.item.neto_pagar || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setDetailModal({ isOpen: false, item: null }); openForm(detailModal.item!); }} className="px-6 py-3 text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-colors font-medium">Editar</button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmModal.isOpen && confirmModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                    <Check className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Confirmar Liquidación</h3>
                    <p className="text-sm text-gray-500 font-mono">{confirmModal.item.numero || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => { setConfirmModal({ isOpen: false, item: null }); setConfirmData({ observaciones: '' }); }} className="p-2 hover:bg-gray-200 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Resumen</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Persona</p>
                    <p className="font-semibold text-gray-900">{getPersonaNombre(confirmModal.item.id_persona)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Neto a Pagar</p>
                    <p className="font-semibold text-green-700">{getMonedaSimbolo(confirmModal.item.id_moneda)} {Number(confirmModal.item.neto_pagar || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Observaciones</Label>
                <textarea
                  value={confirmData.observaciones}
                  onChange={(e) => setConfirmData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 p-2 border rounded resize-none"
                  placeholder="Observaciones adicionales (opcional)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleConfirmarSubmit}
                disabled={confirmarMutation.isPending}
                className="px-6 py-3 text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors font-medium disabled:opacity-50"
              >
                {confirmarMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => { setConfirmModal({ isOpen: false, item: null }); setConfirmData({ observaciones: '' }); }}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {validacionModal.isOpen && validacionModal.validacion && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg">
                    <XCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">No se puede liquidar</h3>
                    <p className="text-sm text-gray-500">Factura no pagada</p>
                  </div>
                </div>
                <button onClick={() => setValidacionModal({ isOpen: false, validacion: null })} className="p-2 hover:bg-gray-200 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {validacionModal.validacion.factura && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      Datos de la Factura
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Código</p>
                        <p className="font-semibold text-gray-900">{validacionModal.validacion.factura.codigo_factura || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Estado</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Pendiente de pago
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Monto Total</p>
                        <p className="font-semibold text-gray-900">{Number(validacionModal.validacion.factura.monto || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Monto Pagado</p>
                        <p className="font-semibold text-green-600">{Number(validacionModal.validacion.factura.monto_pagado || 0).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 uppercase">Saldo Pendiente</p>
                        <p className="font-bold text-red-600 text-xl">{Number(validacionModal.validacion.factura.saldo || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {validacionModal.validacion.factura.pagos && validacionModal.validacion.factura.pagos.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        Pagos Realizados
                      </h4>
                      <div className="space-y-2">
                        {validacionModal.validacion.factura.pagos.map((pago: any) => (
                          <div key={pago.id_pago_factura_servicio} className="flex justify-between items-center p-2 bg-white rounded-lg border">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{pago.fecha || 'Sin fecha'}</p>
                              <p className="text-xs text-gray-500">{pago.doc_traza || 'Sin documento'}</p>
                            </div>
                            <p className="font-semibold text-green-600">{Number(pago.monto || 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!validacionModal.validacion.factura.pagos || validacionModal.validacion.factura.pagos.length === 0) && (
                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <p className="text-sm text-yellow-800">No hay pagos registrados para esta factura.</p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-sm text-red-800 font-medium">
                  {validacionModal.validacion?.mensaje || 'La factura de esta etapa no ha sido pagada completamente.'}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between gap-3">
              <button
                onClick={() => navigate(`/proyectos/facturas-servicio?etapa=${validacionModal.validacion?.id_etapa}`)}
                className="px-6 py-3 text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-colors font-medium"
              >
                Ir a Pagar Factura
              </button>
              <button
                onClick={() => setValidacionModal({ isOpen: false, validacion: null })}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
