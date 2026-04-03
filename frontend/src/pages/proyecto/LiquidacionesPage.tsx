import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { personaLiquidacionService, monedaService, clientesService, etapasProyectoService, contratosService, solicitudesService } from '../../services/api';
import type { PersonaLiquidacion, PersonaLiquidacionCreate, PersonaLiquidacionUpdate } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import type { Cliente } from '../../types/ventas';
import type { Etapa, SolicitudServicio } from '../../types/servicio';
import type { ContratoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, Calculator, DollarSign, Calendar, Hash, X, Eye, FileText, Percent, Building, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function LiquidacionesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const personaParam = searchParams.get('persona');
  const [view, setView] = useState<View>('list');

  const [liquidaciones, setLiquidaciones] = useState<PersonaLiquidacion[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [personas, setPersonas] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);

  const [selectedContrato, setSelectedContrato] = useState<number | null>(null);
  const [selectedSolicitud, setSelectedSolicitud] = useState<number | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPersona, setFiltroPersona] = useState<number | null>(personaParam ? Number(personaParam) : null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: PersonaLiquidacion | null }>({ isOpen: false, item: null });
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

  const calculateImporte = () => Number(formData.importe) || 0;

  const calculateDevengado = () => {
    const importe = calculateImporte();
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    return importe - (importe * gasto_empresa / 100) - (importe * comision / 100);
  };

  const calculateNetoPagar = () => {
    const devengado = calculateDevengado();
    const tributario = Number(formData.tributario) || 0;
    return devengado - (devengado * tributario / 100);
  };

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [monedasRes, personasRes, contratosRes] = await Promise.all([
        monedaService.getMonedas(0, 100),
        clientesService.getClientes(0, 1000),
        contratosService.getContratos(0, 1000)
      ]);
      setMonedas(monedasRes);
      setPersonas(personasRes);
      setContratos(contratosRes);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadSolicitudesByContrato = async (contratoId: number) => {
    try {
      const data = await solicitudesService.getSolicitudesByContrato(contratoId);
      setSolicitudes(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadEtapasBySolicitud = async (solicitudId: number) => {
    try {
      const data = await etapasProyectoService.getEtapasBySolicitud(solicitudId);
      setEtapas(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadLiquidaciones = async () => {
    try {
      const data = await personaLiquidacionService.getLiquidaciones(0, 1000);
      setLiquidaciones(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => { if (view === 'list') loadLiquidaciones(); }, [view]);

  const handleSave = async () => {
    try {
      const baseData = {
        numero: formData.numero || undefined,
        id_etapa: formData.id_etapa ? Number(formData.id_etapa) : undefined,
        id_persona: formData.id_persona ? Number(formData.id_persona) : (personaParam ? Number(personaParam) : undefined),
        fecha_emision: formData.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_liquidacion: formData.fecha_liquidacion || undefined,
        descripcion: formData.descripcion || undefined,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        importe: Number(formData.importe) || 0,
        porciento_gestion: Number(formData.porciento_gestion) || 0,
        porciento_empresa: Number(formData.porciento_empresa) || 0,
        devengado: calculateDevengado(),
        tributario: Number(formData.tributario) || 0,
        comision_bancaria: Number(formData.comision_bancaria) || 0,
        neto_pagar: calculateNetoPagar(),
        doc_pago_liquidacion: formData.doc_pago_liquidacion || undefined,
        gasto_empresa: Number(formData.gasto_empresa) || 0,
        observacion: formData.observacion || undefined
      };

      if (editingId) {
        const updateData: PersonaLiquidacionUpdate = { ...baseData };
        await personaLiquidacionService.updateLiquidacion(editingId, updateData);
        toast.success('Liquidación actualizada');
      } else {
        const createData: PersonaLiquidacionCreate = {
          ...baseData,
          fecha_emision: baseData.fecha_emision
        };
        await personaLiquidacionService.createLiquidacion(createData);
        toast.success('Liquidación creada');
      }
      setView('list');
      resetForm();
      loadLiquidaciones();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number, numero: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar liquidación?',
      message: `¿Está seguro de eliminar la liquidación "${numero || `#${id}`}"?`,
      onConfirm: async () => {
        try {
          await personaLiquidacionService.deleteLiquidacion(id);
          toast.success('Liquidación eliminada');
          loadLiquidaciones();
        } catch (error: any) {
          toast.error(error.message || 'Error al eliminar');
        }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({
      fecha_emision: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setSelectedContrato(null);
    setSelectedSolicitud(null);
    setSelectedEtapa(null);
    setSolicitudes([]);
    setEtapas([]);
  };

  const handleContratoChange = (e: any) => {
    const contratoId = Number(e.target.value);
    setSelectedContrato(contratoId || null);
    setSelectedSolicitud(null);
    setSelectedEtapa(null);
    setSolicitudes([]);
    setEtapas([]);
    setFormData({ ...formData, id_etapa: undefined });
    if (contratoId) {
      loadSolicitudesByContrato(contratoId);
    }
  };

  const handleSolicitudChange = (e: any) => {
    const solicitudId = Number(e.target.value);
    setSelectedSolicitud(solicitudId || null);
    setSelectedEtapa(null);
    setEtapas([]);
    setFormData({ ...formData, id_etapa: undefined });
    if (solicitudId) {
      loadEtapasBySolicitud(solicitudId);
    }
  };

  const handleEtapaChange = (e: any) => {
    const etapaId = Number(e.target.value);
    setSelectedEtapa(etapaId || null);
    setFormData({ ...formData, id_etapa: etapaId || undefined });
  };

  const openForm = (item?: PersonaLiquidacion) => {
    if (item) {
      setEditingId(item.id_liquidacion);
      setFormData({
        numero: item.numero,
        id_etapa: item.id_etapa,
        id_persona: item.id_persona,
        fecha_emision: item.fecha_emision,
        fecha_liquidacion: item.fecha_liquidacion,
        descripcion: item.descripcion,
        id_moneda: item.id_moneda,
        importe: item.importe,
        porciento_gestion: item.porciento_gestion,
        porciento_empresa: item.porciento_empresa,
        devengado: item.devengado,
        tributario: item.tributario,
        comision_bancaria: item.comision_bancaria,
        neto_pagar: item.neto_pagar,
        doc_pago_liquidacion: item.doc_pago_liquidacion,
        gasto_empresa: item.gasto_empresa,
        observacion: item.observacion
      });
    } else {
      resetForm();
    }
    setView('form');
  };

  const getPersonaNombre = (id?: number) => {
    if (!id) return 'N/A';
    const persona = personas.find(p => p.id_cliente === id);
    return persona ? persona.nombre : `Persona #${id}`;
  };

  const getMonedaNombre = (id?: number) => {
    if (!id) return 'N/A';
    const moneda = monedas.find(m => m.id_moneda === id);
    return moneda ? moneda.simbolo : `#${id}`;
  };

  const getEstadoBadge = (item: PersonaLiquidacion) => {
    if (item.fecha_liquidacion) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Liquidada</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>;
  };

  const filteredLiquidaciones = useMemo(() => {
    let result = liquidaciones;
    if (filtroPersona) {
      result = result.filter(l => l.id_persona === filtroPersona);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.numero?.toLowerCase().includes(term) ||
        l.descripcion?.toLowerCase().includes(term) ||
        l.observacion?.toLowerCase().includes(term) ||
        getPersonaNombre(l.id_persona).toLowerCase().includes(term)
      );
    }
    return result;
  }, [liquidaciones, filtroPersona, searchTerm, personas]);

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
            <p className="text-gray-500 mt-1">
              {filteredLiquidaciones.length === liquidaciones.length
                ? `${liquidaciones.length} liquidaciones`
                : `Mostrando ${filteredLiquidaciones.length} de ${liquidaciones.length} liquidaciones`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar liquidaciones..."
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
                    <Hash className="h-4 w-4 text-teal-600" />
                    Número
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Fecha Emisión
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Importe
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Neto a Pagar
                  </div>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLiquidaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron liquidaciones que coincidan con la búsqueda' : 'No hay liquidaciones'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLiquidaciones.map((item) => (
                  <TableRow
                    key={item.id_liquidacion}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, item })}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        {item.numero || `#${item.id_liquidacion}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-900">{item.fecha_emision}</span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {getMonedaNombre(item.id_moneda)} {Number(item.importe).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      {getMonedaNombre(item.id_moneda)} {Number(item.neto_pagar).toFixed(2)}
                    </TableCell>
                    <TableCell>{getEstadoBadge(item)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailModal({ isOpen: true, item })}
                          className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 h-8 w-8"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id_liquidacion, item.numero || '')}
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
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
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
              <Label className="text-sm font-medium">Número</Label>
              {editingId ? (
                <Input
                  value={formData.numero || ''}
                  onChange={(e: any) => setFormData({ ...formData, numero: e.target.value })}
                  className="mt-1"
                  placeholder="Número de liquidación"
                />
              ) : (
                <Input
                  value={formData.numero || 'Se autogenerará al guardar'}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Persona</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_persona || ''}
                onChange={(e: any) => setFormData({ ...formData, id_persona: e.target.value })}
              >
                <option value="">Seleccionar persona</option>
                {personas.map(p => (
                  <option key={p.id_cliente} value={p.id_cliente}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Contrato</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={selectedContrato || ''}
                onChange={handleContratoChange}
              >
                <option value="">Seleccionar contrato</option>
                {contratos.map(c => (
                  <option key={c.id_contrato} value={c.id_contrato}>{c.nombre || c.codigo || `#${c.id_contrato}`} - {c.cliente?.nombre || `Cliente #${c.id_cliente}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Solicitud</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={selectedSolicitud || ''}
                onChange={handleSolicitudChange}
                disabled={!selectedContrato}
              >
                <option value="">Seleccionar solicitud</option>
                {solicitudes.map(s => (
                  <option key={s.id_solicitud_servicio} value={s.id_solicitud_servicio}>{s.numero || s.codigo_solicitud || `#${s.id_solicitud_servicio}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Etapa</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={selectedEtapa || ''}
                onChange={handleEtapaChange}
                disabled={!selectedSolicitud}
              >
                <option value="">Seleccionar etapa</option>
                {etapas.map(e => (
                  <option key={e.id_etapa} value={e.id_etapa}>{e.nombre_etapa || `Etapa ${e.numero_etapa}`} - {e.numero_etapa}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_moneda || ''}
                onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}
              >
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha Emisión *</Label>
              <Input
                type="date"
                value={formData.fecha_emision || ''}
                onChange={(e: any) => setFormData({ ...formData, fecha_emision: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha Liquidación</Label>
              <Input
                type="date"
                value={formData.fecha_liquidacion || ''}
                onChange={(e: any) => setFormData({ ...formData, fecha_liquidacion: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Input
                value={formData.descripcion || ''}
                onChange={(e: any) => setFormData({ ...formData, descripcion: e.target.value })}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-medium">Importe</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.importe || ''}
                onChange={(e: any) => setFormData({ ...formData, importe: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">% Gestión</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.porciento_gestion || ''}
                onChange={(e: any) => setFormData({ ...formData, porciento_gestion: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">% Empresa</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.porciento_empresa || ''}
                onChange={(e: any) => setFormData({ ...formData, porciento_empresa: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Tributario (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tributario || ''}
                onChange={(e: any) => setFormData({ ...formData, tributario: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Comisión Bancaria (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.comision_bancaria || ''}
                onChange={(e: any) => setFormData({ ...formData, comision_bancaria: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Gasto Empresa (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.gasto_empresa || ''}
                onChange={(e: any) => setFormData({ ...formData, gasto_empresa: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Doc Pago Liquidación</Label>
              <Input
                value={formData.doc_pago_liquidacion || ''}
                onChange={(e: any) => setFormData({ ...formData, doc_pago_liquidacion: e.target.value })}
                className="mt-1"
                placeholder="Documento de pago"
              />
            </div>
          </div>
          <div className="mt-6">
            <Label className="text-sm font-medium">Observación</Label>
            <Input
              value={formData.observacion || ''}
              onChange={(e: any) => setFormData({ ...formData, observacion: e.target.value })}
              className="mt-1"
              placeholder="Observaciones adicionales"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            {/* Sección 1: Devengado */}
            <div className="mb-4 pb-4 border-b border-gray-300">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculo del Devengado</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Importe Total:</span>
                  <span className="font-medium">{calculateImporte().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Gasto Empresa ({Number(formData.gasto_empresa || 0)}%):</span>
                  <span>- {(calculateImporte() * (Number(formData.gasto_empresa) || 0) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Comisión ({Number(formData.comision_bancaria || 0)}%):</span>
                  <span>- {(calculateImporte() * (Number(formData.comision_bancaria) || 0) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold text-gray-800">Devengado:</span>
                  <span className="font-bold text-blue-600 text-lg">{calculateDevengado().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Sección 2: Neto a Pagar */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculo del Neto a Pagar</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Devengado:</span>
                  <span className="font-medium">{calculateDevengado().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Tributario ({Number(formData.tributario || 0)}%):</span>
                  <span>- {(calculateDevengado() * (Number(formData.tributario) || 0) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold text-gray-800">Neto a Pagar:</span>
                  <span className="font-bold text-green-600 text-xl">{calculateNetoPagar().toLocaleString()}</span>
                </div>
              </div>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <Calculator className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Liquidación {detailModal.item.numero || `#${detailModal.item.id_liquidacion}`}</h3>
                    <div className="mt-1">{getEstadoBadge(detailModal.item)}</div>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Persona</p>
                  <p className="font-bold text-gray-900">{getPersonaNombre(detailModal.item.id_persona)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Neto a Pagar</p>
                  <p className="font-bold text-green-900 text-xl">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.neto_pagar).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Emisión</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_emision}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Liquidación</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_liquidacion || 'Pendiente'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Etapa</p>
                  <p className="font-bold text-gray-900">{detailModal.item.id_etapa ? `#${detailModal.item.id_etapa}` : 'N/A'}</p>
                </div>
              </div>

              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-gray-700">{detailModal.item.descripcion}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  Detalle Financiero
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Importe</p>
                    <p className="font-bold text-blue-900">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.importe).toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Devengado</p>
                    <p className="font-bold text-purple-900">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.devengado).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Tributario</p>
                    <p className="font-bold text-orange-900">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.tributario).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">% Gestión</p>
                    <p className="font-bold text-gray-900">{Number(detailModal.item.porciento_gestion).toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">% Empresa</p>
                    <p className="font-bold text-gray-900">{Number(detailModal.item.porciento_empresa).toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Comisión Bancaria</p>
                    <p className="font-bold text-gray-900">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.comision_bancaria).toFixed(2)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Gasto Empresa</p>
                    <p className="font-bold text-red-900">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.gasto_empresa).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100 col-span-2">
                    <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Neto a Pagar</p>
                    <p className="font-bold text-green-900 text-xl">{getMonedaNombre(detailModal.item.id_moneda)} {Number(detailModal.item.neto_pagar).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {(detailModal.item.doc_pago_liquidacion || detailModal.item.observacion) && (
                <div className="border-t pt-4 space-y-3">
                  {detailModal.item.doc_pago_liquidacion && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Doc Pago Liquidación</p>
                      <p className="text-gray-700 font-mono">{detailModal.item.doc_pago_liquidacion}</p>
                    </div>
                  )}
                  {detailModal.item.observacion && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observación</p>
                      <p className="text-gray-700">{detailModal.item.observacion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setDetailModal({ isOpen: false, item: null }); openForm(detailModal.item!); }} className="px-6 py-3 text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-colors font-medium">Editar</button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
