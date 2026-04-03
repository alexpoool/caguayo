import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { personaEtapaService, etapasProyectoService, clientesService, monedaService, solicitudesService } from '../../services/api';
import type { PersonaEtapa, PersonaEtapaCreate, Etapa } from '../../types/servicio';
import type { ClienteNatural } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, ArrowLeft, Search, Users, X, DollarSign, Eye, ListFilter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

interface PersonaEtapaWithDetails extends PersonaEtapa {
  persona?: ClienteNatural;
  moneda?: Moneda;
}

export function CreadoresPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get('etapa');
  const [view, setView] = useState<View>('list');

  const [personasEtapa, setPersonasEtapa] = useState<PersonaEtapaWithDetails[]>([]);
  const [personasNaturales, setPersonasNaturales] = useState<ClienteNatural[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<number | null>(etapaParam ? Number(etapaParam) : null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: PersonaEtapaWithDetails | null }>({ isOpen: false, item: null });
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
      const [clientesRes, monedasRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100)
      ]);
      const naturales: ClienteNatural[] = clientesRes
        .filter((c: any) => c.tipo_persona === 'NATURAL')
        .map((c: any) => ({
          id_cliente: c.id_cliente,
          nombre: c.nombre,
          primer_apellido: c.primer_apellido || '',
          segundo_apellido: c.segundo_apellido,
          carnet_identidad: c.cedula_rif || '',
          es_trabajador: false,
          en_baja: false
        }));
      setPersonasNaturales(naturales);
      setMonedas(monedasRes);
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
      title: '¿Eliminar creador?',
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

  const resetForm = () => { setFormData({}); };

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
    if (!searchTerm) return personasEtapa;
    return personasEtapa.filter(p => {
      const name = getPersonaName(p.id_persona);
      const ci = getPersonaCI(p.id_persona);
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [personasEtapa, searchTerm, personasNaturales]);

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
            <h1 className="text-2xl font-bold text-gray-900">Creadores</h1>
            <p className="text-gray-500 mt-1">
              {currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Gestión de creadores'}
              {` · ${filteredPersonas.length} persona(s)`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Creador
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
                <TableHead>Apellidos</TableHead>
                <TableHead>CI</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Cobro
                  </div>
                </TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Liquidaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron creadores que coincidan con la búsqueda' : 'No hay creadores registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonas.map((item) => {
                  const persona = personasNaturales.find(p => p.id_cliente === item.id_persona);
                  return (
                    <TableRow key={`${item.id_etapa}-${item.id_persona}`} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="font-medium text-gray-900">{persona?.nombre || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {`${persona?.primer_apellido || ''} ${persona?.segundo_apellido || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                          {persona?.carnet_identidad || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {getMonedaSymbol(item.id_moneda)} {Number(item.cobro).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{getMonedaSymbol(item.id_moneda) || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        {item.liquidada ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Liquidada</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/proyectos/liquidaciones?persona=${item.id_persona}`)}
                          className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
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
            <h2 className="text-2xl font-bold text-gray-900">Nuevo Creador</h2>
            <p className="text-gray-500 mt-1">{currentEtapa ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}` : 'Asignar creador a etapa'}</p>
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
            Información del Creador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Persona *</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_persona || ''} onChange={(e: any) => setFormData({ ...formData, id_persona: e.target.value })}>
                <option value="">Seleccionar persona</option>
                {personasNaturales.map(p => (
                  <option key={p.id_cliente} value={p.id_cliente}>
                    {`${p.nombre} ${p.primer_apellido} ${p.segundo_apellido || ''} - ${p.carnet_identidad}`.trim()}
                  </option>
                ))}
              </select>
            </div>
            {!etapaParam && (
              <div>
                <Label className="text-sm font-medium">Etapa *</Label>
                <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_etapa || ''} onChange={(e: any) => setFormData({ ...formData, id_etapa: e.target.value })}>
                  <option value="">Seleccionar etapa</option>
                  {etapas.map(e => (
                    <option key={e.id_etapa} value={e.id_etapa}>{e.nombre_etapa || `Etapa #${e.numero_etapa}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Cobro</Label>
              <Input type="number" step="0.01" value={formData.cobro || ''} onChange={(e: any) => setFormData({ ...formData, cobro: e.target.value })} className="mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
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
    </div>
  );
}
