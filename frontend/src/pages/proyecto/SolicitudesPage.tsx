import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { solicitudesService, contratosService, clientesService, monedaService } from '../../services/api';
import type { SolicitudServicio, SolicitudServicioCreate, SolicitudServicioUpdate } from '../../types/servicio';
import type { ContratoWithDetails, ContratoCreate } from '../../types/contrato';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, ArrowLeft, Search, ClipboardList, Tag, X, Layers, CheckCircle, CheckSquare, FileText, User, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type View = 'list' | 'form';

export function SolicitudesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');

  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: SolicitudServicio | null }>({ isOpen: false, item: null });
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

  const [contratoModal, setContratoModal] = useState<{ isOpen: boolean; item: ContratoWithDetails | null; loading: boolean }>({ isOpen: false, item: null, loading: false });

  const [aprobarModal, setAprobarModal] = useState<{
    isOpen: boolean;
    solicitud: SolicitudServicio | null;
    modo: 'seleccionar' | 'crear';
    contratos: ContratoWithDetails[];
    loadingContratos: boolean;
  }>({ isOpen: false, solicitud: null, modo: 'seleccionar', contratos: [], loadingContratos: false });

  const [formContrato, setFormContrato] = useState<Record<string, any>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const estadosContrato = [{ id: 1, nombre: 'ACTIVO' }, { id: 2, nombre: 'CANCELADO' }, { id: 3, nombre: 'FINALIZADO' }, { id: 4, nombre: 'PENDIENTE' }];
  const tiposContrato = [{ id: 1, nombre: 'SERVICIO' }, { id: 2, nombre: 'OBRA' }, { id: 3, nombre: 'MANTENIMIENTO' }, { id: 4, nombre: 'ALQUILER' }, { id: 5, nombre: 'COMPRA' }];

  const estados = ['PENDIENTE', 'EN NEGOCIACION', 'EN PROCESO', 'TERMINADA', 'CANCELADA'];

  const loadSolicitudes = async () => {
    try { const data = await solicitudesService.getSolicitudes(); setSolicitudes(data); }
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list') loadSolicitudes(); }, [view]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesRes, monedasRes] = await Promise.all([
          clientesService.getClientes(0, 1000),
          monedaService.getMonedas(0, 100)
        ]);
        setClientes(clientesRes);
        setMonedas(monedasRes);
      } catch (error) { console.error('Error:', error); }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      if (editingId) {
        const data: SolicitudServicioUpdate = {
          nombres_rep: formData.nombres_rep,
          apellido1_rep: formData.apellido1_rep,
          apellido2_rep: formData.apellido2_rep,
          ci_rep: formData.ci_rep,
          telefono_rep: formData.telefono_rep,
          cargo: formData.cargo,
          descripcion: formData.descripcion,
          fecha_solicitud: formData.fecha_solicitud,
          fecha_entrega: formData.fecha_entrega,
          estado: formData.estado,
          observaciones: formData.observaciones,
          material_asumido_x: formData.material_asumido_x === 'true' || formData.material_asumido_x === true,
          aprobado: formData.aprobado === 'true' || formData.aprobado === true
        };
        await solicitudesService.updateSolicitud(editingId, data);
      } else {
        const data: SolicitudServicioCreate = {
          nombres_rep: formData.nombres_rep,
          apellido1_rep: formData.apellido1_rep,
          apellido2_rep: formData.apellido2_rep,
          ci_rep: formData.ci_rep,
          telefono_rep: formData.telefono_rep,
          cargo: formData.cargo,
          descripcion: formData.descripcion,
          fecha_solicitud: formData.fecha_solicitud || new Date().toISOString().split('T')[0],
          fecha_entrega: formData.fecha_entrega,
          estado: formData.estado || 'PENDIENTE',
          observaciones: formData.observaciones,
          material_asumido_x: formData.material_asumido_x === 'true' || formData.material_asumido_x === true,
          aprobado: false
        };
        await solicitudesService.createSolicitud(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadSolicitudes();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, codigo: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar solicitud?',
      message: `¿Está seguro de eliminar la solicitud "${codigo}"?`,
      onConfirm: async () => {
        try {
          await solicitudesService.deleteSolicitud(id);
          toast.success('Eliminado');
          loadSolicitudes();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const handleCancelarSolicitud = async (item: SolicitudServicio) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Cancelar solicitud?',
      message: `¿Está seguro de cancelar la solicitud "${item.codigo_solicitud}"?`,
      onConfirm: async () => {
        try {
          await solicitudesService.updateSolicitud(item.id_solicitud_servicio, {
            estado: 'CANCELADA'
          });
          toast.success('Solicitud cancelada');
          loadSolicitudes();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'warning'
    });
  };

  const handleTerminarSolicitud = async (item: SolicitudServicio) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Terminar solicitud?',
      message: `¿Está seguro de marcar como terminada la solicitud "${item.codigo_solicitud}"?`,
      onConfirm: async () => {
        try {
          await solicitudesService.updateSolicitud(item.id_solicitud_servicio, {
            estado: 'TERMINADA'
          });
          toast.success('Solicitud terminada');
          loadSolicitudes();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'success'
    });
  };

  const handleToggleAprobado = async (item: SolicitudServicio) => {
    try {
      await solicitudesService.updateSolicitud(item.id_solicitud_servicio, { 
        aprobado: true,
        estado: 'EN NEGOCIACION'
      });
      toast.success('Solicitud en negociación');
      loadSolicitudes();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleAsignarContrato = async (item: SolicitudServicio) => {
    setAprobarModal({
      isOpen: true,
      solicitud: item,
      modo: 'seleccionar',
      contratos: [],
      loadingContratos: true
    });
    try {
      const data = await contratosService.getContratos(0, 1000);
      setAprobarModal(prev => ({ ...prev, contratos: data, loadingContratos: false }));
    } catch (error: any) {
      toast.error('Error al cargar contratos');
      setAprobarModal(prev => ({ ...prev, isOpen: false, loadingContratos: false }));
    }
  };

  const confirmarAprobacion = async () => {
    if (!aprobarModal.solicitud) return;
    
    try {
      if (aprobarModal.modo === 'crear') {
        if (!formContrato.id_cliente) {
          toast.error('Debe seleccionar un cliente');
          return;
        }
        const data: ContratoCreate = {
          nombre: formContrato.nombre || `Contrato-${Date.now()}`,
          id_cliente: Number(formContrato.id_cliente),
          id_estado: Number(formContrato.id_estado) || 1,
          id_tipo_contrato: Number(formContrato.id_tipo_contrato) || 1,
          id_moneda: Number(formContrato.id_moneda) || 1,
          fecha: formContrato.fecha || new Date().toISOString().split('T')[0],
          vigencia: formContrato.vigencia || new Date().toISOString().split('T')[0],
          proforma: formContrato.proforma,
          documento_final: formContrato.documento_final
        };
        const nuevoContrato = await contratosService.createContrato(data);
        await solicitudesService.updateSolicitud(aprobarModal.solicitud.id_solicitud_servicio, {
          aprobado: true,
          id_contrato: nuevoContrato.id_contrato,
          id_cliente: Number(formContrato.id_cliente),
          estado: 'EN PROCESO'
        });
        toast.success('Solicitud aprobada con nuevo contrato');
      } else {
        const contratoSeleccionado = aprobarModal.contratos.find(c => c.id_contrato === Number(formContrato.id_contrato_seleccionado));
        if (!contratoSeleccionado) {
          toast.error('Debe seleccionar un contrato');
          return;
        }
        await solicitudesService.updateSolicitud(aprobarModal.solicitud.id_solicitud_servicio, {
          aprobado: true,
          id_contrato: Number(formContrato.id_contrato_seleccionado),
          id_cliente: contratoSeleccionado.id_cliente,
          estado: 'EN PROCESO'
        });
        toast.success('Solicitud aprobada');
      }
      setAprobarModal({ isOpen: false, solicitud: null, modo: 'seleccionar', contratos: [], loadingContratos: false });
      setFormContrato({});
      loadSolicitudes();
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar');
    }
  };

  const openContratoModal = async (idContrato: number) => {
    setContratoModal({ isOpen: true, item: null, loading: true });
    try {
      const contrato = await contratosService.getContrato(idContrato);
      setContratoModal({ isOpen: true, item: contrato, loading: false });
    } catch (error: any) {
      toast.error('Error al cargar contrato');
      setContratoModal({ isOpen: false, item: null, loading: false });
    }
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: SolicitudServicio) => {
    if (item) {
      setEditingId(item.id_solicitud_servicio);
      setFormData({
        nombres_rep: item.nombres_rep,
        apellido1_rep: item.apellido1_rep,
        apellido2_rep: item.apellido2_rep,
        ci_rep: item.ci_rep,
        telefono_rep: item.telefono_rep,
        cargo: item.cargo,
        descripcion: item.descripcion,
        fecha_solicitud: item.fecha_solicitud,
        fecha_entrega: item.fecha_entrega,
        estado: item.estado,
        observaciones: item.observaciones,
        material_asumido_x: item.material_asumido_x,
        aprobado: item.aprobado
      });
    } else { resetForm(); }
    setView('form');
  };

  const filteredSolicitudes = useMemo(() => {
    if (!searchTerm) return solicitudes;
    return solicitudes.filter(s =>
      s.codigo_solicitud?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [solicitudes, searchTerm]);

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Servicio</h1>
            <p className="text-gray-500 mt-1">
              {filteredSolicitudes.length === solicitudes.length
                ? `Gestión de solicitudes (${solicitudes.length} items)`
                : `Mostrando ${filteredSolicitudes.length} de ${solicitudes.length} solicitudes`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar solicitudes..."
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
                    <Tag className="h-4 w-4 text-teal-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Etapas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSolicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron solicitudes que coincidan con la búsqueda' : 'No hay solicitudes'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSolicitudes.map((item) => (
                  <TableRow key={item.id_solicitud_servicio} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo_solicitud || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{item.fecha_solicitud || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.estado === 'TERMINADA' ? 'bg-green-100 text-green-800' :
                        item.estado === 'CANCELADA' ? 'bg-red-100 text-red-800' :
                        item.estado === 'EN PROCESO' ? 'bg-blue-100 text-blue-800' :
                        item.estado === 'EN NEGOCIACION' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.estado || 'PENDIENTE'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {item.id_contrato ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => item.id_contrato && openContratoModal(item.id_contrato)}
                          className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Ver Contrato
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/proyectos/etapas?solicitud=${item.id_solicitud_servicio}`)}
                        className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Etapas
                      </Button>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {item.estado === 'PENDIENTE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAprobado(item)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Aceptar solicitud"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {item.estado === 'EN NEGOCIACION' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAsignarContrato(item)}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-8 w-8"
                            title="Asignar contrato"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.estado === 'EN PROCESO' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelarSolicitud(item)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {item.estado === 'EN PROCESO' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTerminarSolicitud(item)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Terminar"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {item.estado === 'TERMINADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            className="text-gray-400 cursor-not-allowed h-8 w-8"
                            title="Terminada"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id_solicitud_servicio, item.codigo_solicitud || 'N/A')}
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
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos de la solicitud</p>
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
            <ClipboardList className="h-5 w-5 text-teal-600" />
            Información de la Solicitud
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Fecha Solicitud</Label>
              <Input type="date" value={formData.fecha_solicitud || ''} onChange={(e: any) => setFormData({...formData, fecha_solicitud: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha Entrega</Label>
              <Input type="date" value={formData.fecha_entrega || ''} onChange={(e: any) => setFormData({...formData, fecha_entrega: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">Nombres Representante</Label>
              <Input value={formData.nombres_rep || ''} onChange={(e: any) => setFormData({...formData, nombres_rep: e.target.value})} className="mt-1" placeholder="Nombres del representante" />
            </div>
            <div>
              <Label className="text-sm font-medium">Primer Apellido</Label>
              <Input value={formData.apellido1_rep || ''} onChange={(e: any) => setFormData({...formData, apellido1_rep: e.target.value})} className="mt-1" placeholder="Primer apellido" />
            </div>
            <div>
              <Label className="text-sm font-medium">Segundo Apellido</Label>
              <Input value={formData.apellido2_rep || ''} onChange={(e: any) => setFormData({...formData, apellido2_rep: e.target.value})} className="mt-1" placeholder="Segundo apellido" />
            </div>
            <div>
              <Label className="text-sm font-medium">CI Representante</Label>
              <Input value={formData.ci_rep || ''} onChange={(e: any) => setFormData({...formData, ci_rep: e.target.value})} className="mt-1" placeholder="Cédula de identidad" />
            </div>
            <div>
              <Label className="text-sm font-medium">Teléfono Representante</Label>
              <Input value={formData.telefono_rep || ''} onChange={(e: any) => setFormData({...formData, telefono_rep: e.target.value})} className="mt-1" placeholder="Teléfono de contacto" />
            </div>
            <div>
              <Label className="text-sm font-medium">Cargo</Label>
              <Input value={formData.cargo || ''} onChange={(e: any) => setFormData({...formData, cargo: e.target.value})} className="mt-1" placeholder="Cargo del representante" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({...formData, descripcion: e.target.value})} className="mt-1" placeholder="Descripción de la solicitud" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones</Label>
              <Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})} className="mt-1" placeholder="Observaciones adicionales" />
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.codigo_solicitud || 'Sin código'}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_solicitud || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    detailModal.item.estado === 'TERMINADA' ? 'bg-green-100 text-green-800' :
                    detailModal.item.estado === 'CANCELADA' ? 'bg-red-100 text-red-800' :
                    detailModal.item.estado === 'EN PROCESO' ? 'bg-blue-100 text-blue-800' :
                    detailModal.item.estado === 'EN NEGOCIACION' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {detailModal.item.estado || 'PENDIENTE'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Aprobado</p>
                  <p className="font-bold text-gray-900">{detailModal.item.aprobado ? 'Sí' : 'No'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Solicitud</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_solicitud || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha Entrega</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha_entrega || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cargo</p>
                  <p className="font-bold text-gray-900">{detailModal.item.cargo || 'N/A'}</p>
                </div>
              </div>
              {(detailModal.item.nombres_rep || detailModal.item.apellido1_rep) && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Representante</p>
                  <p className="font-bold text-gray-900">{[detailModal.item.nombres_rep, detailModal.item.apellido1_rep, detailModal.item.apellido2_rep].filter(Boolean).join(' ')}</p>
                  {detailModal.item.ci_rep && <p className="text-sm text-gray-600 mt-1">CI: {detailModal.item.ci_rep}</p>}
                  {detailModal.item.telefono_rep && <p className="text-sm text-gray-600 mt-1">Tel: {detailModal.item.telefono_rep}</p>}
                </div>
              )}
              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-gray-700">{detailModal.item.descripcion}</p>
                </div>
              )}
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => navigate(`/proyectos/etapas?solicitud=${detailModal.item!.id_solicitud_servicio}`)} className="px-6 py-3 text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-colors font-medium">Ver Etapas</button>
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {contratoModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Detalle del Contrato</h3>
                    <p className="text-sm text-gray-500">{contratoModal.item?.nombre || 'Cargando...'}</p>
                  </div>
                </div>
                <button onClick={() => setContratoModal({ isOpen: false, item: null, loading: false })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            {contratoModal.loading ? (
              <div className="p-12 text-center text-gray-500">Cargando...</div>
            ) : contratoModal.item ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Nombre</p>
                    <p className="font-bold text-gray-900">{contratoModal.item.nombre}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                    <p className="font-bold text-gray-900">{contratoModal.item.cliente?.nombre || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Monto</p>
                    <p className="font-bold text-gray-900">${Number(contratoModal.item.monto).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                    <p className="font-bold text-gray-900">{contratoModal.item.estado?.nombre || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha</p>
                    <p className="font-bold text-gray-900">{contratoModal.item.fecha || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vigencia</p>
                    <p className="font-bold text-gray-900">{contratoModal.item.vigencia || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setContratoModal({ isOpen: false, item: null, loading: false })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {aprobarModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Aprobar Solicitud</h3>
                    <p className="text-sm text-gray-500">{aprobarModal.solicitud?.codigo_solicitud || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => { setAprobarModal({ isOpen: false, solicitud: null, modo: 'seleccionar', contratos: [], loadingContratos: false }); setFormContrato({}); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setAprobarModal(prev => ({ ...prev, modo: 'seleccionar' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${aprobarModal.modo === 'seleccionar' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <FileText className="h-4 w-4" />
                  Seleccionar
                </button>
                <button
                  onClick={() => setAprobarModal(prev => ({ ...prev, modo: 'crear' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${aprobarModal.modo === 'crear' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
              </div>

              {aprobarModal.modo === 'seleccionar' ? (
                <div className="space-y-4">
                  {aprobarModal.loadingContratos ? (
                    <div className="text-center py-8 text-gray-500">Cargando contratos...</div>
                  ) : aprobarModal.contratos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No hay contratos disponibles</div>
                  ) : (
                    <div>
                      <Label className="text-sm font-medium">Seleccionar Contrato</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        value={formContrato.id_contrato_seleccionado || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, id_contrato_seleccionado: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {aprobarModal.contratos.map(c => (
                          <option key={c.id_contrato} value={c.id_contrato}>
                            {c.nombre || c.codigo || `Contrato #${c.id_contrato}`} - {c.cliente?.nombre || 'Sin cliente'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Nombre del Contrato</Label>
                      <Input
                        value={formContrato.nombre || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, nombre: e.target.value })}
                        className="mt-1"
                        placeholder="Nombre del contrato"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cliente *</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        value={formContrato.id_cliente || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, id_cliente: e.target.value })}
                      >
                        <option value="">Seleccionar cliente</option>
                        {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        value={formContrato.id_tipo_contrato || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, id_tipo_contrato: e.target.value })}
                      >
                        {tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        value={formContrato.id_estado || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, id_estado: e.target.value })}
                      >
                        {estadosContrato.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Moneda</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        value={formContrato.id_moneda || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, id_moneda: e.target.value })}
                      >
                        <option value="">Seleccionar</option>
                        {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha</Label>
                      <Input
                        type="date"
                        value={formContrato.fecha || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, fecha: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Vigencia</Label>
                      <Input
                        type="date"
                        value={formContrato.vigencia || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, vigencia: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Proforma</Label>
                      <Input
                        value={formContrato.proforma || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, proforma: e.target.value })}
                        className="mt-1"
                        placeholder="Número de proforma"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Documento Final</Label>
                      <Input
                        value={formContrato.documento_final || ''}
                        onChange={(e: any) => setFormContrato({ ...formContrato, documento_final: e.target.value })}
                        className="mt-1"
                        placeholder="Número de documento"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setAprobarModal({ isOpen: false, solicitud: null, modo: 'seleccionar', contratos: [], loadingContratos: false }); setFormContrato({}); }} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancelar</button>
              <button onClick={confirmarAprobacion} className="px-6 py-3 text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors font-medium">Confirmar Aprobación</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
