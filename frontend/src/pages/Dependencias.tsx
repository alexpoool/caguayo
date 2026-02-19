import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, Building2, Plus, Edit, Trash2, Save, X, ChevronRight, ChevronDown, Trash,
  Tag, Network, MapPin, Phone, Mail, Globe, Map, Locate, FileText,
  Landmark, Store, Wallet, CreditCard, User, ArrowLeft, Sparkles, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  ConfirmModal
} from '../components/ui';
import { dependenciasService, configuracionService } from '../services/administracion';
import type { Dependencia, DependenciaCreate } from '../types/dependencia';
import type { CuentaCreate } from '../types/cuenta';
import type { TipoCuenta } from '../types/tipo_cuenta';


interface ArbolDependenciaProps {
  dependencias: Dependencia[];
  dependenciasPadre: Dependencia[];
  nivel: number;
  onSelect: (dep: Dependencia) => void;
  selectedId?: number;
}

function ArbolDependencia({ dependencias, dependenciasPadre, nivel, onSelect, selectedId }: ArbolDependenciaProps) {
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpandidos = new Set(expandidos);
    if (newExpandidos.has(id)) {
      newExpandidos.delete(id);
    } else {
      newExpandidos.add(id);
    }
    setExpandidos(newExpandidos);
  };

  return (
    <div className="space-y-1">
      {dependenciasPadre.map((dep) => {
        const hijos = dependencias.filter(d => d.codigo_padre === dep.id_dependencia);
        const isExpanded = expandidos.has(dep.id_dependencia);
        const isSelected = selectedId === dep.id_dependencia;

        return (
          <div key={dep.id_dependencia}>
            <div
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
              style={{ paddingLeft: `${nivel * 20 + 8}px` }}
              onClick={() => onSelect(dep)}
            >
              {hijos.length > 0 && (
                <button
                  onClick={(e) => toggleExpand(dep.id_dependencia, e)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {hijos.length === 0 && <span className="w-6" />}
              {nivel === 0 ? (
                <Building2 className="h-4 w-4 text-blue-600" />
              ) : (
                <Building className="h-4 w-4 text-gray-500" />
              )}
              <span className="flex-1">{dep.nombre}</span>
            </div>
            {isExpanded && hijos.length > 0 && (
              <ArbolDependencia
                dependencias={dependencias}
                dependenciasPadre={hijos}
                nivel={nivel + 1}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DependenciasPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingDependencia, setEditingDependencia] = useState<Dependencia | null>(null);
  const [selectedPadre, setSelectedPadre] = useState<Dependencia | null>(null);
  const [formData, setFormData] = useState<DependenciaCreate>({
    id_tipo_dependencia: 0,
    nombre: '',
    direccion: '',
    telefono: '',
  });
  const [cuentas, setCuentas] = useState<CuentaCreate[]>([]);
  const [editingCuentaIndex, setEditingCuentaIndex] = useState<number | null>(null);
  const [cuentaForm, setCuentaForm] = useState<CuentaCreate>({
    titular: '',
    banco: '',
    sucursal: undefined,
    direccion: '',
    id_tipo_cuenta: 0,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Estados para modales de detalle
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    dependencia: Dependencia | null;
  }>({ isOpen: false, dependencia: null });

  const [cuentaDetailModal, setCuentaDetailModal] = useState<{
    isOpen: boolean;
    cuenta: any;
  }>({ isOpen: false, cuenta: null });

  const { data: tiposCuenta = [] } = useQuery<TipoCuenta[]>({
    queryKey: ['tiposCuenta'],
    queryFn: () => configuracionService.getTiposCuenta(),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: tiposDependencia = [] } = useQuery({
    queryKey: ['tipos-dependencia'],
    queryFn: () => dependenciasService.getTiposDependencia(),
  });

  const { data: provincias = [] } = useQuery({
    queryKey: ['provincias'],
    queryFn: () => dependenciasService.getProvincias(),
  });

  const { data: municipios = [], refetch: refetchMunicipios } = useQuery({
    queryKey: ['municipios', formData.id_provincia],
    queryFn: () => dependenciasService.getMunicipios(formData.id_provincia),
    enabled: !!formData.id_provincia,
  });

  // Refetch municipios when provincia changes
  useEffect(() => {
    if (formData.id_provincia) {
      refetchMunicipios();
    }
  }, [formData.id_provincia, refetchMunicipios]);

  // Set default municipio when creating new dependencia and municipios are loaded
  useEffect(() => {
    if (view === 'form' && !editingDependencia && formData.id_provincia && !formData.id_municipio && municipios.length > 0) {
      const municipioSantiago = municipios.find(m => m.nombre === 'Santiago de Cuba');
      if (municipioSantiago) {
        setFormData(prev => ({ ...prev, id_municipio: municipioSantiago.id_municipio }));
      }
    }
  }, [view, editingDependencia, formData.id_provincia, formData.id_municipio, municipios]);

  const createDependencia = useMutation({
    mutationFn: dependenciasService.createDependencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencias'] });
      toast.success('Dependencia creada exitosamente');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear dependencia'),
  });

  const updateDependencia = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Dependencia> }) =>
      dependenciasService.updateDependencia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencias'] });
      toast.success('Dependencia actualizada');
      setView('list');
      setEditingDependencia(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Error al actualizar dependencia');
      console.error('Error:', error);
    },
  });

  const deleteDependencia = useMutation({
    mutationFn: dependenciasService.deleteDependencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencias'] });
      toast.success('Dependencia eliminada');
    },
  });

  const resetForm = (isNew: boolean = false) => {
    // Buscar provincia Santiago de Cuba
    const provinciaSantiago = provincias.find(p => p.nombre === 'Santiago de Cuba');
    const provinciaId = provinciaSantiago?.id_provincia;
    
    // Buscar municipio Santiago de Cuba de esa provincia
    let municipioId = undefined;
    if (provinciaId && municipios.length > 0) {
      const municipioSantiago = municipios.find(m => 
        m.nombre === 'Santiago de Cuba' && m.id_provincia === provinciaId
      );
      municipioId = municipioSantiago?.id_municipio;
    }
    
    setFormData({
      id_tipo_dependencia: 0,
      nombre: '',
      direccion: '',
      telefono: '',
      id_provincia: isNew ? provinciaId : undefined,
      id_municipio: isNew ? municipioId : undefined,
    });
    setCuentas([]);
    setEditingCuentaIndex(null);
    setCuentaForm({
      titular: '',
      banco: '',
      sucursal: undefined,
      direccion: '',
      id_tipo_cuenta: 0,
    });
    setSelectedPadre(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.direccion || !formData.telefono || !formData.id_tipo_dependencia) {
      toast.error('Todos los campos requeridos deben completarse');
      return;
    }

    // Concatenar 53 al teléfono si no lo tiene ya
    const telefonoConPrefijo = formData.telefono.startsWith('53') 
      ? formData.telefono 
      : '53' + formData.telefono;

    if (editingDependencia) {
      // Al editar, no enviamos las cuentas (se manejan por separado)
      const data = {
        ...formData,
        telefono: telefonoConPrefijo,
        codigo_padre: formData.codigo_padre,
      };
      updateDependencia.mutate({ id: editingDependencia.id_dependencia, data });
    } else {
      // Al crear, enviamos dependencia y cuentas separados
      const dependenciaData = {
        ...formData,
        telefono: telefonoConPrefijo,
        codigo_padre: formData.codigo_padre,
      };
      const data = {
        dependencia: dependenciaData,
        cuentas: cuentas.length > 0 ? cuentas : undefined,
      };
      createDependencia.mutate(data);
    }
  };

  const handleEdit = (dep: Dependencia) => {
    setEditingDependencia(dep);
    setFormData(dep);
    // Cargar cuentas existentes de la dependencia
    if (dep.cuentas && dep.cuentas.length > 0) {
      setCuentas(dep.cuentas.map(c => ({
        titular: c.titular,
        banco: c.banco,
        sucursal: c.sucursal,
        direccion: c.direccion,
        id_tipo_cuenta: c.id_tipo_cuenta,
      })));
    } else {
      setCuentas([]);
    }
    if (dep.codigo_padre) {
      const padre = dependencias.find(d => d.id_dependencia === dep.codigo_padre);
      setSelectedPadre(padre || null);
    }
    setView('form');
  };

  const handleNuevaSubdependencia = (padre: Dependencia) => {
    setSelectedPadre(padre);
    setEditingDependencia(null);
    
    // Buscar provincia y municipio Santiago de Cuba por defecto
    const provinciaSantiago = provincias.find(p => p.nombre === 'Santiago de Cuba');
    const provinciaId = provinciaSantiago?.id_provincia;
    
    let municipioId = undefined;
    if (provinciaId && municipios.length > 0) {
      const municipioSantiago = municipios.find(m => 
        m.nombre === 'Santiago de Cuba' && m.id_provincia === provinciaId
      );
      municipioId = municipioSantiago?.id_municipio;
    }
    
    setFormData({
      id_tipo_dependencia: 0,
      nombre: '',
      direccion: '',
      telefono: '',
      codigo_padre: padre.id_dependencia,
      id_provincia: provinciaId,
      id_municipio: municipioId,
    });
    setView('form');
  };

  const handleDelete = (dep: Dependencia) => {
    const hijos = dependencias.filter(d => d.codigo_padre === dep.id_dependencia);
    if (hijos.length > 0) {
      toast.error('No se puede eliminar una dependencia con subdependencias');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Dependencia',
      message: `¿Está seguro de eliminar la dependencia "${dep.nombre}"?`,
      onConfirm: () => {
        deleteDependencia.mutate(dep.id_dependencia);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  // Funciones para manejar cuentas
  const handleAddCuenta = () => {
    if (!cuentaForm.titular || !cuentaForm.banco || !cuentaForm.direccion || !cuentaForm.id_tipo_cuenta) {
      toast.error('Todos los campos de la cuenta son requeridos');
      return;
    }

    if (editingCuentaIndex !== null) {
      // Editar cuenta existente
      const newCuentas = [...cuentas];
      newCuentas[editingCuentaIndex] = cuentaForm;
      setCuentas(newCuentas);
      setEditingCuentaIndex(null);
      toast.success('Cuenta actualizada');
    } else {
      // Agregar nueva cuenta
      setCuentas([...cuentas, cuentaForm]);
      toast.success('Cuenta agregada');
    }

    // Limpiar formulario de cuenta
    setCuentaForm({
      titular: '',
      banco: '',
      sucursal: undefined,
      direccion: '',
      id_tipo_cuenta: 0,
    });
  };

  const handleEditCuenta = (index: number) => {
    setCuentaForm(cuentas[index]);
    setEditingCuentaIndex(index);
  };

  const handleDeleteCuenta = (index: number) => {
    const newCuentas = cuentas.filter((_, i) => i !== index);
    setCuentas(newCuentas);
    if (editingCuentaIndex === index) {
      setEditingCuentaIndex(null);
    setCuentaForm({
      titular: '',
      banco: '',
      sucursal: undefined,
      direccion: '',
      id_tipo_cuenta: 0,
    });
    }
    toast.success('Cuenta eliminada');
  };

  // Funciones para modales de detalle
  const handleSelectDependencia = (dep: Dependencia) => {
    setDetailModal({ isOpen: true, dependencia: dep });
  };

  const handleCloseDetailModal = () => {
    setDetailModal({ isOpen: false, dependencia: null });
  };

  const handleShowCuentaDetail = (cuenta: any) => {
    setCuentaDetailModal({ isOpen: true, cuenta });
  };

  const handleCloseCuentaDetailModal = () => {
    setCuentaDetailModal({ isOpen: false, cuenta: null });
  };

  const dependenciasRaiz = dependencias.filter(d => !d.codigo_padre);

  if (view === 'form') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header con icono animado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => { setView('list'); setEditingDependencia(null); resetForm(); }}
              className="hover:scale-105 transition-transform duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg animate-bounce-subtle">
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingDependencia ? 'Editar Dependencia' : 'Nueva Dependencia'}
                </h1>
                <p className="text-sm text-gray-500">
                  {editingDependencia ? 'Actualice la información de la dependencia' : 'Complete los datos para crear una nueva dependencia'}
                </p>
              </div>
            </div>
          </div>
          <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
        </div>

        {selectedPadre && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Dependencia Padre:</span> {selectedPadre.nombre}
              </p>
            </div>
          </div>
        )}

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-blue-600" />
              <CardTitle>Información de la Dependencia</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Building className="h-5 w-5 text-blue-500" />
                  Nombre *
                </Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre de la dependencia"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Tag className="h-5 w-5 text-purple-500" />
                  Tipo de Dependencia *
                </Label>
                <select
                  className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.id_tipo_dependencia}
                  onChange={(e) => setFormData({ ...formData, id_tipo_dependencia: parseInt(e.target.value) })}
                >
                  <option value={0}>Seleccione un tipo</option>
                  {tiposDependencia.map((t) => (
                    <option key={t.id_tipo_dependencia} value={t.id_tipo_dependencia}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Padre */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Network className="h-5 w-5 text-green-500" />
                  Dependencia Padre
                </Label>
                <select
                  className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.codigo_padre || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_padre: e.target.value ? parseInt(e.target.value) : undefined })}
                  disabled={!editingDependencia && !!selectedPadre}
                >
                  <option value="">Sin dependencia padre (Nivel raíz)</option>
                  {dependencias.map((d) => (
                    <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>
                  ))}
                </select>
                {selectedPadre && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Pre-seleccionado desde "+ Sub"
                  </p>
                )}
              </div>

              {/* Dirección */}
              <div className="col-span-2 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Dirección *
                </Label>
                <Input
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Dirección completa"
                  className="transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Contacto */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-5 w-5 text-green-500" />
                  Teléfono *
                </Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder=" +53"
                  className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Email
                </Label>
                <Input
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email (opcional)"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  Web
                </Label>
                <Input
                  value={formData.web || ''}
                  onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                  placeholder="Sitio web (opcional)"
                  className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Ubicación */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Map className="h-5 w-5 text-orange-500" />
                  Provincia
                </Label>
                <select
                  className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={formData.id_provincia || ''}
                  onChange={(e) => {
                    const newProvinciaId = e.target.value ? parseInt(e.target.value) : undefined;
                    setFormData({
                      ...formData,
                      id_provincia: newProvinciaId,
                      id_municipio: undefined
                    });
                    if (newProvinciaId) {
                      queryClient.invalidateQueries({ queryKey: ['municipios'] });
                    }
                  }}
                >
                  <option value="">Seleccione provincia</option>
                  {provincias.map((p) => (
                    <option key={p.id_provincia} value={p.id_provincia}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Locate className="h-5 w-5 text-pink-500" />
                  Municipio
                </Label>
                <select
                  className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  value={formData.id_municipio || ''}
                  onChange={(e) => setFormData({ ...formData, id_municipio: e.target.value ? parseInt(e.target.value) : undefined })}
                  disabled={!formData.id_provincia}
                >
                  <option value="">
                    {formData.id_provincia ? 'Seleccione municipio' : 'Primero seleccione una provincia'}
                  </option>
                  {municipios.map((m) => (
                    <option key={m.id_municipio} value={m.id_municipio}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="col-span-2 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <FileText className="h-5 w-5 text-gray-500" />
                  Descripción
                </Label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la dependencia (opcional)"
                  rows={3}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sección de Cuentas Bancarias */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Cuentas Bancarias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Formulario para agregar/editar cuenta */}
            <div className="grid grid-cols-2 gap-6 mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <User className="h-5 w-5 text-blue-500" />
                  Titular *
                </Label>
                <Input
                  value={cuentaForm.titular}
                  onChange={(e) => setCuentaForm({ ...cuentaForm, titular: e.target.value })}
                  placeholder="Nombre del titular"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Landmark className="h-5 w-5 text-purple-500" />
                  Banco *
                </Label>
                <Input
                  value={cuentaForm.banco}
                  onChange={(e) => setCuentaForm({ ...cuentaForm, banco: e.target.value })}
                  placeholder="Nombre del banco"
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Store className="h-5 w-5 text-orange-500" />
                  Sucursal
                </Label>
                <Input
                  type="number"
                  value={cuentaForm.sucursal || ''}
                  onChange={(e) => setCuentaForm({ ...cuentaForm, sucursal: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Número de sucursal"
                  className="transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Dirección Sucursal *
                </Label>
                <Input
                  value={cuentaForm.direccion}
                  onChange={(e) => setCuentaForm({ ...cuentaForm, direccion: e.target.value })}
                  placeholder="Dirección de la sucursal"
                  className="transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  Tipo de Cuenta *
                </Label>
                <select
                  className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={cuentaForm.id_tipo_cuenta}
                  onChange={(e) => setCuentaForm({ ...cuentaForm, id_tipo_cuenta: parseInt(e.target.value) })}
                >
                  <option value={0}>Seleccione tipo de cuenta</option>
                  {tiposCuenta.map((tc) => (
                    <option key={tc.id_tipo_cuenta} value={tc.id_tipo_cuenta}>{tc.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex items-end gap-3">
                <Button
                  type="button"
                  onClick={handleAddCuenta}
                  variant={editingCuentaIndex !== null ? "primary" : "secondary"}
                  className="gap-2 hover:scale-105 active:scale-95 transition-transform"
                >
                  {editingCuentaIndex !== null ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Actualizar Cuenta
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Agregar Cuenta
                    </>
                  )}
                </Button>
                {editingCuentaIndex !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingCuentaIndex(null);
                      setCuentaForm({
                        titular: '',
                        banco: '',
                        sucursal: undefined,
                        direccion: '',
                        id_tipo_cuenta: 0,
                      });
                    }}
                    className="hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            {/* Lista de cuentas agregadas */}
            {cuentas.length > 0 ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <TableRow>
                      <TableHead className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Titular
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-purple-500" />
                          Banco
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-indigo-500" />
                          Tipo
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta, index) => {
                      const tipoCuenta = tiposCuenta.find((tc: TipoCuenta) => tc.id_tipo_cuenta === cuenta.id_tipo_cuenta);
                      return (
                        <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium">{cuenta.titular}</TableCell>
                          <TableCell>{cuenta.banco}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                              <CreditCard className="h-3 w-3" />
                              {tipoCuenta?.nombre || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCuenta(index)}
                                className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCuenta(index)}
                                className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay cuentas bancarias agregadas</p>
                <p className="text-sm text-gray-400 mt-1">Agregue cuentas usando el formulario superior</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón de guardar */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            className="gap-2 px-6 py-3 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Save className="h-5 w-5" />
            {editingDependencia ? 'Actualizar Dependencia' : 'Guardar Dependencia'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dependencias</h1>
          <p className="text-gray-500 mt-1">Gestión jerárquica de dependencias</p>
        </div>
        <Button onClick={() => { setView('form'); setEditingDependencia(null); resetForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Dependencia
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Estructura Jerárquica</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            {dependenciasRaiz.length > 0 ? (
              <ArbolDependencia
                dependencias={dependencias}
                dependenciasPadre={dependenciasRaiz}
                nivel={0}
                onSelect={handleSelectDependencia}
              />
            ) : (
              <p className="text-gray-500 text-center py-4">No hay dependencias registradas</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listado de Dependencias</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencias.map((dep) => (
                  <TableRow key={dep.id_dependencia}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {dep.codigo_padre && <span className="text-gray-400">└─</span>}
                        {dep.nombre}
                      </div>
                    </TableCell>
                    <TableCell>{dep.tipo_dependencia?.nombre || '-'}</TableCell>
                    <TableCell>{dep.telefono}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNuevaSubdependencia(dep)}
                          className="text-green-600"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Sub
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(dep)}
                          className="text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dep)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
      />

      {/* Modal de detalle de dependencia */}
      {detailModal.isOpen && detailModal.dependencia && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Building className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalle de Dependencia</h2>
                  <p className="text-sm text-gray-500">Información completa</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseDetailModal} className="hover:bg-gray-200 rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-8">
                {/* Información básica */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Building className="h-4 w-4" />
                        Nombre
                      </Label>
                      <p className="font-semibold text-gray-900 text-lg">{detailModal.dependencia.nombre}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Tag className="h-4 w-4" />
                        Tipo
                      </Label>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {detailModal.dependencia.tipo_dependencia?.nombre || '-'}
                      </span>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <MapPin className="h-4 w-4" />
                        Dirección
                      </Label>
                      <p className="font-medium text-gray-900">{detailModal.dependencia.direccion}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </Label>
                      <p className="font-medium text-gray-900">{detailModal.dependencia.telefono}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="font-medium text-gray-900">{detailModal.dependencia.email || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Globe className="h-4 w-4" />
                        Web
                      </Label>
                      <p className="font-medium text-gray-900">{detailModal.dependencia.web || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-500 text-sm">
                        <Map className="h-4 w-4" />
                        Ubicación
                      </Label>
                      <p className="font-medium text-gray-900">
                        {detailModal.dependencia.provincia?.nombre || '-'}, {detailModal.dependencia.municipio?.nombre || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cuentas bancarias */}
                {detailModal.dependencia.cuentas && detailModal.dependencia.cuentas.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" />
                      Cuentas Bancarias
                      <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">
                        {detailModal.dependencia.cuentas.length}
                      </span>
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-green-200">
                      <Table>
                        <TableHeader className="bg-green-100/50">
                          <TableRow>
                            <TableHead className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              Titular
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-purple-500" />
                                Banco
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-indigo-500" />
                                Tipo
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Ver</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailModal.dependencia.cuentas.map((cuenta, index) => {
                            const tipoCuenta = tiposCuenta.find(tc => tc.id_tipo_cuenta === cuenta.id_tipo_cuenta);
                            return (
                              <TableRow key={index} className="hover:bg-green-50/50 transition-colors">
                                <TableCell className="font-medium">{cuenta.titular}</TableCell>
                                <TableCell>{cuenta.banco}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                    <CreditCard className="h-3 w-3" />
                                    {tipoCuenta?.nombre || '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleShowCuentaDetail(cuenta)}
                                    className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                                  >
                                    <Building className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Subdependencias */}
                {(() => {
                  const hijos = dependencias.filter(d => d.codigo_padre === detailModal.dependencia!.id_dependencia);
                  if (hijos.length === 0) return null;
                  return (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Network className="h-5 w-5 text-indigo-600" />
                        Subdependencias
                        <span className="ml-2 px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-xs">
                          {hijos.length}
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {hijos.map(hijo => (
                          <div key={hijo.id_dependencia} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{hijo.nombre}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de cuenta */}
      {cuentaDetailModal.isOpen && cuentaDetailModal.cuenta && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalle de Cuenta</h2>
                  <p className="text-sm text-gray-500">Información bancaria</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseCuentaDetailModal} className="hover:bg-gray-200 rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-1">
                <Label className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Titular
                </Label>
                <p className="font-bold text-gray-900 text-lg">{cuentaDetailModal.cuenta.titular}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 space-y-1">
                  <Label className="flex items-center gap-2 text-purple-600 text-sm font-medium">
                    <Landmark className="h-4 w-4" />
                    Banco
                  </Label>
                  <p className="font-semibold text-gray-900">{cuentaDetailModal.cuenta.banco}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 space-y-1">
                  <Label className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                    <Store className="h-4 w-4" />
                    Sucursal
                  </Label>
                  <p className="font-semibold text-gray-900">{cuentaDetailModal.cuenta.sucursal || '-'}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 space-y-1">
                <Label className="flex items-center gap-2 text-red-600 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                <p className="font-semibold text-gray-900">{cuentaDetailModal.cuenta.direccion}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 space-y-1">
                <Label className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  Tipo de Cuenta
                </Label>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                  <CreditCard className="h-4 w-4" />
                  {tiposCuenta.find(tc => tc.id_tipo_cuenta === cuentaDetailModal.cuenta!.id_tipo_cuenta)?.nombre || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
