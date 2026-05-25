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
  Save,
  Eye,
  Printer
} from 'lucide-react';
import { authService } from '../../services/auth';
import { 
  personaLiquidacionService, 
  monedaService, 
  clientesService, 
  etapasProyectoService, 
  solicitudesService, 
  personaEtapaService,
  facturasServicioService,
  certificacionesService
} from '../../services/api';
import { administracionService } from '../../services/administracion';
import type { Usuario } from '../../types/usuario';
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
    doc_pago_liquidacion: '',
    porcentaje_caguayo: 10
  });
  
  const [validacionModal, setValidacionModal] = useState<{ isOpen: boolean; validacion: PersonaLiquidacionValidacion | null }>({ isOpen: false, validacion: null });

  const [printModal, setPrintModal] = useState<{ 
    isOpen: boolean; 
    liquidacion: PersonaLiquidacion | null; 
    autorizado_por_id: number | null; 
    autorizado_por: string; 
    cargo_autorizado: string; 
    revisado_por: string 
  }>({ 
    isOpen: false, 
    liquidacion: null, 
    autorizado_por_id: null,
    autorizado_por: '', 
    cargo_autorizado: '', 
    revisado_por: '' 
  });
  
  const [formData, setFormData] = useState({
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_liquidacion: '',
    descripcion: '',
    id_moneda: 277,
    tipo_pago: 'TRANSFERENCIA',
    importe: 0,
    porcentaje_caguayo: 10,
    tributario: 5,
    comision_bancaria: 0,
    gasto_empresa: 0,
    doc_pago_liquidacion: '',
    observacion: ''
  });

  const [selectedPago, setSelectedPago] = useState<number | null>(null);
  const [pagosDisponibles, setPagosDisponibles] = useState<{id_pago_factura_servicio: number; monto: number; monto_disponible: number; id_moneda?: number; fecha: string; doc_traza?: string}[]>([]);
  const [disponibleLiquidar, setDisponibleLiquidar] = useState<number>(0);
  const [porCobrarPersona, setPorCobrarPersona] = useState<number>(0);

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => administracionService.getUsuarios()
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', selectedSolicitud],
    queryFn: () => selectedSolicitud ? etapasProyectoService.getEtapasBySolicitud(selectedSolicitud) : etapasProyectoService.getAllEtapas(),
    enabled: true
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

  // Cargar todas las etapas al inicio
  useEffect(() => {
    etapasProyectoService.getAllEtapas().then((ets) => {
      queryClient.setQueryData(['etapas-all'], ets);
    }).catch(console.error);
  }, []);

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
    if (selectedPersona && selectedEtapa) {
      loadPersonaEtapaCobro(selectedEtapa, selectedPersona);
      cargarPagosYDisponible(selectedEtapa, selectedPersona);
    }
  }, [selectedPersona, selectedEtapa]);

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
    mutationFn: ({ id, data }: { id: number; data: { devengado?: number; tributario?: number; comision_bancaria?: number; gasto_empresa?: number; porcentaje_caguayo?: number } }) => 
      personaLiquidacionService.confirmarLiquidacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-liquidaciones'] });
      toast.success('Liquidación confirmada');
      setConfirmModal({ isOpen: false, item: null });
      setConfirmData({ doc_pago_liquidacion: '', porcentaje_caguayo: 10 });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al confirmar liquidación');
    }
  });

  const handleConfirmar = (item: PersonaLiquidacion) => {
    setConfirmModal({ isOpen: true, item });
    setConfirmData({ doc_pago_liquidacion: '', porcentaje_caguayo: 10 });
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

    const porcentajeCaguayo = confirmData.porcentaje_caguayo || item.porcentaje_caguayo || 10;
    const importeCaguayo = Number(item.importe) * (porcentajeCaguayo / 100);
    const devengado = Number(item.importe) - importeCaguayo;
    
    confirmarMutation.mutate({
      id: item.id_liquidacion,
      data: {
        devengado,
        porcentaje_caguayo: porcentajeCaguayo,
        tributario: item.tributario || 5,
        comision_bancaria: item.comision_bancaria || 0,
        gasto_empresa: item.gasto_empresa || 0,
        doc_pago_liquidacion: confirmData.doc_pago_liquidacion || undefined
      } as any
    });
  };

  const resetForm = () => {
    setFormData({
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_liquidacion: '',
      descripcion: '',
      id_moneda: 277,
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
    setSelectedPago(null);
    setPagosDisponibles([]);
    setDisponibleLiquidar(0);
    setPorCobrarPersona(0);
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
        setPorCobrarPersona(Number(personaEtapa.por_cobrar) || 0);
      } else {
        setPorCobrarPersona(0);
      }
    } catch (error) {
      console.error('Error loading persona etapa:', error);
      setPorCobrarPersona(0);
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
      const etapa = (etapas as Etapa[]).find(et => et.id_etapa === etapaId);
      if (etapa) {
        if (etapa.id_moneda) {
          setFormData(prev => ({ ...prev, id_moneda: etapa.id_moneda }));
        }
        setFormData(prev => ({
          ...prev,
          descripcion: etapa.descripcion || ''
        }));
      }
      try {
        const validacion = await facturasServicioService.validarPagoEtapa(etapaId);
        
        if (validacion.id_factura_servicio && (!validacion.pagado || validacion.pagado <= 0)) {
          setValidacionModal({ 
            isOpen: true, 
            validacion: {
              puede_liquidar: false,
              id_etapa: etapaId,
              id_persona: 0,
              factura: validacion,
              mensaje: `No hay pagos registrados para esta etapa. Saldo pendiente: ${validacion.saldo}`
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
    setSelectedPago(null);
    setPagosDisponibles([]);
    setDisponibleLiquidar(0);
    
    if (personaId && selectedEtapa) {
      loadPersonaEtapaCobro(selectedEtapa, personaId);
      cargarPagosYDisponible(selectedEtapa, personaId);
    } else {
      setFormData(prev => ({ ...prev, importe: 0 }));
    }
  };

  const cargarPagosYDisponible = async (idEtapa: number, idPersona: number) => {
    if (!idEtapa || !idPersona || idEtapa <= 0 || idPersona <= 0) {
      setPagosDisponibles([]);
      setDisponibleLiquidar(0);
      return;
    }
    try {
      const [pagosData, disponibleData] = await Promise.all([
        personaLiquidacionService.getPagosDisponibles(idEtapa),
        personaLiquidacionService.getDisponibleLiquidar(idEtapa, idPersona),
      ]);

      setPagosDisponibles(pagosData);
      setDisponibleLiquidar(disponibleData.disponible);

      if (pagosData.length === 0) {
        toast.error('No hay pagos disponibles para esta etapa. Debe registrar un pago en la factura antes de liquidar.');
        return;
      }

      if (!selectedPago) {
        const pago = pagosData[0];
        setSelectedPago(pago.id_pago_factura_servicio);
        const montoDisponible = Number(pago.monto_disponible);
        setFormData(prev => ({ ...prev, importe: Math.min(montoDisponible, disponibleData.disponible || montoDisponible) }));
      }
    } catch (error) {
      console.error('Error cargando pagos disponibles:', error);
      toast.error('Error al cargar pagos disponibles');
    }
  };

  const handlePagoChange = (pagoId: number | null) => {
    setSelectedPago(pagoId || null);
    
    if (pagoId) {
      const pago = pagosDisponibles.find(p => p.id_pago_factura_servicio === pagoId);
      if (pago) {
        const montoDisponible = Number(pago.monto_disponible);
        setFormData(prev => ({ ...prev, importe: Math.min(montoDisponible, porCobrarPersona || montoDisponible) }));
      }
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
        setSelectedPago(item.id_pago ?? null);
        loadPersonaEtapaCobro(item.id_etapa, item.id_persona);
        cargarPagosYDisponible(item.id_etapa, item.id_persona);
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

    if (!formData.id_moneda) {
      toast.error('Debe seleccionar una moneda');
      return;
    }

    if (pagosDisponibles.length === 0) {
      toast.error('No hay pagos disponibles para liquidar. Debe registrar un pago en la factura.');
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

    const baseData: any = {
      id_etapa: selectedEtapa,
      id_persona: selectedPersona,
      id_pago: selectedPago || undefined,
      importe: Number(formData.importe) || undefined,
      fecha_emision: formData.fecha_emision || new Date().toISOString().split('T')[0],
      fecha_liquidacion: formData.fecha_liquidacion || undefined,
      descripcion: formData.descripcion || undefined,
      id_moneda: formData.id_moneda || undefined,
      tipo_pago: formData.tipo_pago,
      porcentaje_caguayo: Number(formData.porcentaje_caguayo) || 10,
      tributario: Number(formData.tributario) || 5,
      comision_bancaria: Number(formData.comision_bancaria) || 0,
      gasto_empresa: Number(formData.gasto_empresa) || 0,
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

  const generatePersonaLiquidacionHTML = (liquidacion: PersonaLiquidacion, autorizadoPor: string, cargoAutorizado: string, revisadoPor: string, nombreCertificacion?: string) => {
    const realizador = personas.find((p: Cliente) => p.id_cliente === liquidacion.id_persona);
    const etapasAll = queryClient.getQueryData<Etapa[]>(['etapas-all']) || etapas;
    const etapa = etapasAll.find((e: Etapa) => e.id_etapa === liquidacion.id_etapa);
    const solicitud = solicitudes.find((s: SolicitudServicio) => s.id_solicitud_servicio === etapa?.id_solicitud_servicio);
    const moneda = monedas.find((m: Moneda) => m.id_moneda === liquidacion.id_moneda);
    
    const user = authService.getUser();
    const confectionadoPor = user ? `${user.nombre || ''} ${user.primer_apellido || ''}`.trim() : '';
    const cargoUsuario = user?.cargo || '';
    
    const empresa = user?.dependencia;
    const empresaNombre = empresa?.nombre || 'Empresa';
    const empresaDireccion = empresa?.direccion || '';
    const empresaTelefono = empresa?.telefono || '';
    const empresaEmail = empresa?.email || '';
    
    const nombreRealizador = realizador?.nombre || 'N/A';
    const cedulaRealizador = realizador?.nit || 'N/A';
    const direccionRealizador = realizador?.direccion || '';
    
    const nombreEtapa = etapa?.nombre_etapa || `Etapa #${etapa?.numero_etapa || 'N/A'}`;
    const descripcionEtapa = etapa?.descripcion || '';
    const codigoSolicitud = solicitud?.codigo_solicitud || 'N/A';
    const codigoProyecto = solicitud?.codigo_proyecto || 'N/A';
    const nombreTituloEtapa = (nombreCertificacion && etapa?.tipo_etapa === 'CERTIFICACIONES') ? nombreCertificacion : nombreEtapa;
    const nombreMoneda = moneda?.nombre || '';
    
    const descripcionLiquidacion = liquidacion?.descripcion || '';
    const observacionLiquidacion = liquidacion?.observacion || '';
    const docPagoLiquidacion = liquidacion?.doc_pago_liquidacion || '';
    
    const porcentajeCaguayo = Number(liquidacion.porcentaje_caguayo || 10);
    const importeCaguayo = Number(liquidacion.importe_caguayo || (liquidacion.importe * porcentajeCaguayo / 100)).toFixed(2);
    const devengado = Number(liquidacion.devengado || 0).toFixed(2);
    const tributario = Number(liquidacion.tributario || 5);
    const tributarioMonto = Number(liquidacion.tributario_monto || (Number(devengado) * tributario / 100)).toFixed(2);
    const comisionBancaria = Number(liquidacion.comision_bancaria || 0).toFixed(2);
    const gastoEmpresa = Number(liquidacion.gasto_empresa || 0).toFixed(2);
    const netoPagar = Number(liquidacion.neto_pagar || 0).toFixed(2);
    
    const subtotal = (Number(devengado) - Number(tributarioMonto)).toFixed(2);
    const importe = Number(liquidacion.importe || 0).toFixed(2);
    
    if (!liquidacion.fecha_liquidacion && liquidacion.confirmado) {
      liquidacion.fecha_liquidacion = new Date().toISOString().split('T')[0];
    }
    const fechaEmision = liquidacion.fecha_emision ? new Date(liquidacion.fecha_emision).toLocaleDateString('es-ES') : 'N/A';
    const fechaLiquidacion = liquidacion.fecha_liquidacion ? new Date(liquidacion.fecha_liquidacion).toLocaleDateString('es-ES') : 'N/A';
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Liquidación | ${liquidacion.numero}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
        .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
        .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.2; color: #111; }
        .header-tcp { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; gap: 15px; }
        .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
        .header-logo img { width: 160px; height: 160px; object-fit: contain; }
        .header-center { text-align: center; flex: 1; }
        .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: black; }
        .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
        .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.2; }
        .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
        .email { font-size: 12px; color: black; }
        .header-box { border: 2px solid black; background: white; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
        .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: black; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
        .header-box-row { font-size: 11px; margin-bottom: 3px; }
        .header-box-row strong { font-weight: 700; }
        .header-box-row.total-final { font-weight: 800; font-size: 13px; border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; }
        .fila-fechas { display: flex; justify-content: space-between; margin: 18px 0 12px 0; border-bottom: 1px dashed #aaa; padding-bottom: 12px; }
        .bloque-fecha { font-weight: 600; font-size: 13px; }
        .info-proyecto { display: flex; flex-wrap: wrap; justify-content: space-between; background: white; padding: 12px; border: 1px solid black; margin-bottom: 20px; font-size: 12.5px; }
        .proyecto-item { min-width: 180px; margin-bottom: 6px; }
        .proyecto-item strong { font-weight: 800; }
        .resumen-derecha { display: flex; justify-content: flex-end; margin-top: 8px; margin-bottom: 20px; }
        .cuadro-totales { width: 280px; border: 1px solid #111; background: #fefcf5; padding: 12px 15px; font-size: 13px; font-family: monospace; }
        .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
        .devengado-total-row { font-weight: bold; border-top: 1px solid #333; margin-top: 6px; padding-top: 4px; }
        .firmas { display: flex; flex-direction: column; gap: 20px; margin-top: 32px; margin-bottom: 16px; }
        .fila-nombres { display: flex; justify-content: space-between; gap: 20px; }
        .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
        .bloque-firma { flex: 1; padding-top: 8px; font-size: 11px; text-align: left; }
        .bloque-firma p { margin: 2px 0; }
        .cargo { font-size: 10px; color: #2c2c2c; }
        .nota-revisado { margin-top: 18px; font-size: 10px; text-align: right; border-top: 1px solid #ddd; padding-top: 8px; font-style: italic; }
        @media (max-width: 650px) { .documento { padding: 1rem; } .cuadro-totales { width: 100%; } .firmas { flex-direction: column; gap: 20px; } .fila-nombres { flex-direction: column; gap: 20px; } .fila-firmas { flex-direction: column; gap: 20px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 15px; } .info-proyecto { flex-direction: column; } }
        @page { margin: 0; }
        @media print {
          body { background: white; display: block; padding: 0; min-height: auto; align-items: flex-start; }
          .documento { max-width: none; box-shadow: none; border-radius: 0; padding: 1cm; padding-top: 240px; padding-bottom: 160px; }
          .print-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0.3cm 1cm 0 1cm; }
          .print-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0 1cm 0.3cm 1cm; }
        }
    </style>
</head>
<body>
<div class="documento texto">
    <div class="print-header">
    <div class="header-tcp">
        <div class="header-logo">
            <img src="/logo-black.png" alt="Logo CAGUAYO S.A." />
        </div>
        <div class="header-center">
            <div class="tcp-title">CAGUAYO S.A.</div>
            <div class="nombre-titular">${empresaNombre}</div>
            <div class="direccion-contacto">${empresaDireccion}</div>
            <div class="telefonos">Tel: ${empresaTelefono}</div>
            <div class="email">${empresaEmail}</div>
        </div>
        <div class="header-box">
            <div class="header-box-title">Liquidación</div>
            <div class="header-box-row"><strong>Número:</strong> ${liquidacion.numero || 'N/A'}</div>
            <div class="header-box-row"><strong>Moneda:</strong> ${nombreMoneda || 'N/A'}</div>
            <div class="header-box-row" style="border-top: 1px solid black; padding-top: 4px; margin-top: 4px;"><strong>IMPORTE:</strong> ${importe}</div>
            <div class="header-box-row"><span style="color: #666;">Importe Caguayo(${porcentajeCaguayo}%):</span> -${importeCaguayo}</div>
            <div class="header-box-row" style="font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px;"><strong>DEVENGADO:</strong> ${devengado}</div>
            <div class="header-box-row"><span style="color: #666;">Tributario(${tributario}%):</span> -${tributarioMonto}</div>
            <div class="header-box-row" style="font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px;"><strong>SUBTOTAL:</strong> ${subtotal}</div>
            <div class="header-box-row"><span style="color: #666;">Gasto Empresa:</span> -${gastoEmpresa}</div>
            <div class="header-box-row"><span style="color: #666;">Comisión:</span> -${comisionBancaria}</div>
            <div class="header-box-row total-final"><strong>NETO A PAGAR:</strong> ${netoPagar}</div>
        </div>
    </div>
    </div>

    <div class="fila-fechas">
        <span class="bloque-fecha"><strong>Fecha Emisión:</strong> ${fechaEmision}</span>
        <span class="bloque-fecha"><strong>Fecha Liquidación:</strong> ${fechaLiquidacion}</span>
        ${docPagoLiquidacion ? `<span class="bloque-fecha"><strong>Doc. Pago:</strong> ${docPagoLiquidacion}</span>` : ''}
    </div>

    <div class="info-proyecto">
        <div class="proyecto-item" style="width:100%;"><strong>Realizador:</strong> ${nombreRealizador}, <strong>CI:</strong> ${cedulaRealizador}, <strong>Dirección:</strong> ${direccionRealizador}</div>
        <div class="proyecto-item" style="width: 100%;"><strong>Proyecto:</strong> ${codigoProyecto}, ${nombreTituloEtapa}</div>
        ${descripcionLiquidacion ? `<div class="proyecto-item" style="width: 100%;"><strong>Descripción:</strong> ${descripcionLiquidacion}</div>` : ''}
        ${observacionLiquidacion ? `<div class="proyecto-item" style="width: 100%;"><strong>Observaciones:</strong> ${observacionLiquidacion}</div>` : ''}
    </div>

    

    <div class="print-footer">
    <div class="firmas">
        <div class="fila-firmas" style="display: flex; justify-content: space-between; gap: 40px;">
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Confeccionado por:</strong></p>
                <p>${confectionadoPor}</p>
                <p class="cargo">${cargoUsuario}</p>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Realizador:</strong></p>
                <p>${nombreRealizador}</p>
                <br>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
        </div>
        <div class="fila-firmas" style="display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;">
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Autorizado por:</strong></p>
                <p>${autorizadoPor || ' '}</p>
                <p class="cargo">${cargoAutorizado || ' '}</p>
                <br>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
            <div class="bloque-firma" style="flex: 1;">
                <p><strong>Revisado por:</strong></p>
                <p>${revisadoPor || ''}</p>
                <p>Economia SA</p>
                <div style="border-bottom: 1px solid #222; margin-top: 30px;"></div>
                <p style="margin-top: 4px;">Firma</p>
            </div>
        </div>
    </div>
    </div>
</div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    if (!printModal.liquidacion) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de popups detectado. Permita ventanas emergentes para este sitio.');
      return;
    }

    let nombreCertificacion: string | undefined;
    const etapasAll = queryClient.getQueryData<Etapa[]>(['etapas-all']) || etapas;
    const etapa = etapasAll.find((e: Etapa) => e.id_etapa === printModal.liquidacion!.id_etapa);
    if (etapa?.tipo_etapa === 'CERTIFICACIONES') {
      const certs = await certificacionesService.getCertificacionesByEtapa(etapa.id_etapa);
      if (certs.length > 0) nombreCertificacion = certs[0].nombre;
    }
    const html = generatePersonaLiquidacionHTML(
      printModal.liquidacion, 
      printModal.autorizado_por, 
      printModal.cargo_autorizado || '', 
      printModal.revisado_por,
      nombreCertificacion
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    setPrintModal({ isOpen: false, liquidacion: null, autorizado_por_id: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' });
  };

  const handleViewDocument = async (liquidacion: PersonaLiquidacion) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de popups detectado. Permita ventanas emergentes para este sitio.');
      return;
    }

    let nombreCertificacion: string | undefined;
    const etapasAll = queryClient.getQueryData<Etapa[]>(['etapas-all']) || etapas;
    const etapa = etapasAll.find((e: Etapa) => e.id_etapa === liquidacion.id_etapa);
    if (etapa?.tipo_etapa === 'CERTIFICACIONES') {
      const certs = await certificacionesService.getCertificacionesByEtapa(etapa.id_etapa);
      if (certs.length > 0) nombreCertificacion = certs[0].nombre;
    }
    const html = generatePersonaLiquidacionHTML(liquidacion, '', '', '', nombreCertificacion);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
                              onClick={() => handleViewDocument(liquidacion)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                              title="Ver documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPrintModal({ 
                                isOpen: true, 
                                liquidacion: liquidacion, 
                                autorizado_por_id: null,
                                autorizado_por: '', 
                                cargo_autorizado: '', 
                                revisado_por: '' 
                              })}
                              className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 h-8 w-8"
                              title="Imprimir"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
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

                <div className="md:col-span-2">
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
              </div>
            </CardContent>
          </Card>

          {selectedPersona && selectedEtapa && (
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div>
                <Label>Pago de Factura</Label>
                {pagosDisponibles.length > 0 ? (
                <div className="mt-1 space-y-2">
                  {pagosDisponibles.map((pago) => (
                    <label key={pago.id_pago_factura_servicio} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPago === pago.id_pago_factura_servicio
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}>
                      <input
                        type="radio"
                        name="pago"
                        checked={selectedPago === pago.id_pago_factura_servicio}
                        onChange={() => handlePagoChange(pago.id_pago_factura_servicio)}
                        className="h-4 w-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{pago.fecha || 'S/N'}</span>
                        <span className="text-sm font-bold text-teal-700">{Number(pago.monto_disponible).toLocaleString()} {getMonedaSimbolo(pago.id_moneda)}</span>
                      </div>
                    </label>
                  ))}
                </div>
                ) : (
                  <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mt-1">
                    No hay pagos disponibles para esta etapa. Debe registrar un pago en la factura antes de liquidar.
                  </p>
                )}
                {disponibleLiquidar > 0 && (
                  <div className="flex justify-between text-xs text-blue-600 mt-2 border-t pt-2">
                    <span>Disponible del pago: <strong>{selectedPago ? Number(pagosDisponibles.find(p => p.id_pago_factura_servicio === selectedPago)?.monto_disponible || 0).toLocaleString() : '0'}</strong></span>
                    <span>Por cobrar de la persona: <strong>{Number(porCobrarPersona).toLocaleString()}</strong></span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-teal-600" />
                Información de la Liquidación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="mt-6 pt-6 border-t">
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
                      value={formData.comision_bancaria || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, comision_bancaria: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Gasto Empresa</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.gasto_empresa || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, gasto_empresa: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 mt-6 border border-teal-100">
                <Label className="text-sm text-teal-600 font-medium">Importe a Liquidar</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.importe || ''}
                  onChange={(e) => {
                    const nuevoValor = e.target.value === '' ? 0 : Number(e.target.value);
                    const pago = pagosDisponibles.find(p => p.id_pago_factura_servicio === selectedPago);
                    const maxImporte = Math.min(
                      pago ? Number(pago.monto_disponible) : Infinity,
                      porCobrarPersona || Infinity
                    );
                    if (nuevoValor > maxImporte) {
                      toast.error(`El importe máximo a liquidar es ${maxImporte.toLocaleString()}`);
                      return;
                    }
                    setFormData(prev => ({ ...prev, importe: nuevoValor }));
                  }}
                  className="mt-1 text-2xl font-bold text-teal-700"
                />
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
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Emisión</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_emision}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Liquidación</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_liquidacion || '-'}</p>
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
                <button onClick={() => { setConfirmModal({ isOpen: false, item: null }); setConfirmData({ doc_pago_liquidacion: '', porcentaje_caguayo: 10 }); }} className="p-2 hover:bg-gray-200 rounded-full">
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
                <Label>Documento de Pago</Label>
                <input
                  type="text"
                  value={confirmData.doc_pago_liquidacion}
                  onChange={(e) => setConfirmData(prev => ({ ...prev, doc_pago_liquidacion: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded"
                  placeholder="Número de documento de pago"
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
                onClick={() => { setConfirmModal({ isOpen: false, item: null }); setConfirmData({ doc_pago_liquidacion: '', porcentaje_caguayo: 10 }); }}
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
                        <p className="text-xs text-gray-500 uppercase">Importe Total</p>
                        <p className="font-semibold text-gray-900">{Number(validacionModal.validacion.factura.importe || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Pagado</p>
                        <p className="font-semibold text-green-600">{Number(validacionModal.validacion.factura.pagado || 0).toLocaleString()}</p>
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
                              <p className="text-xs text-gray-500">{getMonedaSimbolo(pago.id_moneda)}</p>
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
                  {validacionModal.validacion?.mensaje || 'No hay pagos registrados para liquidar.'}
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

      {printModal.isOpen && printModal.liquidacion && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Printer className="h-6 w-6 text-gray-600" />
                <h3 className="text-xl font-bold text-gray-900">Imprimir Liquidación</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">Complete los datos para la impresión</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">Autorizado por</Label>
                <select
                  value={printModal.autorizado_por_id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value ? Number(e.target.value) : null;
                    const selectedUsuario = usuarios.find((u: Usuario) => u.id_usuario === selectedId);
                    setPrintModal({ 
                      ...printModal, 
                      autorizado_por_id: selectedId,
                      autorizado_por: selectedUsuario ? `${selectedUsuario.nombre} ${selectedUsuario.primer_apellido}`.trim() : '',
                      cargo_autorizado: selectedUsuario?.cargo || ''
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usuario: Usuario) => (
                    <option key={usuario.id_usuario} value={usuario.id_usuario}>
                      {usuario.nombre} {usuario.primer_apellido} {usuario.segundo_apellido || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium">Cargo del autorizado</Label>
                <Input 
                  value={printModal.cargo_autorizado}
                  onChange={(e) => setPrintModal({ ...printModal, cargo_autorizado: e.target.value })}
                  placeholder="Cargo del autorizado"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Revisado por</Label>
                <Input 
                  value={printModal.revisado_por}
                  onChange={(e) => setPrintModal({ ...printModal, revisado_por: e.target.value })}
                  placeholder="Nombre de quien revisa"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setPrintModal({ isOpen: false, liquidacion: null, autorizado_por_id: null, autorizado_por: '', cargo_autorizado: '', revisado_por: '' })} 
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePrint} 
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
