import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Tag, FolderTree, Truck,
  Plus, Edit, Trash2, X, Save, Sparkles, FileCheck, FileText,
  ScrollText, ToggleLeft, Package, BuildingIcon, Wallet,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Label, Card, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../components/ui';
import { configuracionService, dependenciasService } from '../services/administracion';
import { categoriasService, subcategoriasService } from '../services/api';


interface ConfigCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  count: number;
  onClick: () => void;
  color: string;
}

function ConfigCard({ title, icon, description, count, onClick, color }: ConfigCardProps) {
  const colorClasses: Record<string, string> = {
    'bg-blue-500': 'from-blue-500 to-blue-600',
    'bg-green-500': 'from-green-500 to-emerald-600',
    'bg-purple-500': 'from-purple-500 to-purple-600',
    'bg-orange-500': 'from-orange-500 to-orange-600',
    'bg-red-500': 'from-red-500 to-red-600',
    'bg-teal-500': 'from-teal-500 to-teal-600',
    'bg-indigo-500': 'from-indigo-500 to-indigo-600',
    'bg-cyan-500': 'from-cyan-500 to-cyan-600',
  };

  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] group overflow-hidden"
      onClick={onClick}
    >
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]}`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-gray-800">{count}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Elementos</span>
          </div>
        </div>
        <h3 className="mt-5 font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-blue-500 transition-colors">
          <span>Configurar</span>
          <Plus className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" 
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Gestión de configuración</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const { data: tiposContrato = [], refetch: refetchTiposContrato } = useQuery({
    queryKey: ['tiposContrato'],
    queryFn: () => configuracionService.getTiposContrato(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: estadosContrato = [], refetch: refetchEstadosContrato } = useQuery({
    queryKey: ['estadosContrato'],
    queryFn: () => configuracionService.getEstadosContrato(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: categorias = [], refetch: refetchCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => categoriasService.getCategorias(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: subcategorias = [], refetch: refetchSubcategorias } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: () => subcategoriasService.getSubcategorias(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: tiposProveedor = [], refetch: refetchTiposProveedor } = useQuery({
    queryKey: ['tiposProveedor'],
    queryFn: () => configuracionService.getTiposProveedor(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: tiposConvenio = [], refetch: refetchTiposConvenio } = useQuery({
    queryKey: ['tiposConvenio'],
    queryFn: () => configuracionService.getTiposConvenio(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: tiposDependencia = [], refetch: refetchTiposDependencia } = useQuery({
    queryKey: ['tiposDependencia'],
    queryFn: () => dependenciasService.getTiposDependencia(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: tiposCuenta = [], refetch: refetchTiposCuenta } = useQuery({
    queryKey: ['tiposCuenta'],
    queryFn: () => configuracionService.getTiposCuenta(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Mutations para tipos de contrato
  const createTipoContrato = useMutation({
    mutationFn: configuracionService.createTipoContrato,
    onSuccess: () => {
      console.log('Tipo contrato creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposContrato'] });
      refetchTiposContrato();
      toast.success('Tipo de contrato creado');
      closeModal();
    },
  });

  const updateTipoContrato = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoContrato(id, data),
    onSuccess: () => {
      console.log('Tipo contrato actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposContrato'] });
      refetchTiposContrato();
      toast.success('Tipo de contrato actualizado');
      closeModal();
    },
  });

  const deleteTipoContrato = useMutation({
    mutationFn: configuracionService.deleteTipoContrato,
    onSuccess: () => {
      console.log('Tipo contrato eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposContrato'] });
      refetchTiposContrato();
      toast.success('Tipo de contrato eliminado');
    },
  });

  // Mutations para estados de contrato
  const createEstadoContrato = useMutation({
    mutationFn: configuracionService.createEstadoContrato,
    onSuccess: () => {
      console.log('Estado contrato creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['estadosContrato'] });
      refetchEstadosContrato();
      toast.success('Estado de contrato creado');
      closeModal();
    },
  });

  const updateEstadoContrato = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateEstadoContrato(id, data),
    onSuccess: () => {
      console.log('Estado contrato actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['estadosContrato'] });
      refetchEstadosContrato();
      toast.success('Estado de contrato actualizado');
      closeModal();
    },
  });

  const deleteEstadoContrato = useMutation({
    mutationFn: configuracionService.deleteEstadoContrato,
    onSuccess: () => {
      console.log('Estado contrato eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['estadosContrato'] });
      refetchEstadosContrato();
      toast.success('Estado de contrato eliminado');
    },
  });

  // Mutations para tipos de proveedor
  const createTipoProveedor = useMutation({
    mutationFn: configuracionService.createTipoProveedor,
    onSuccess: () => {
      console.log('Tipo proveedor creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposProveedor'] });
      refetchTiposProveedor();
      toast.success('Tipo de proveedor creado');
      closeModal();
    },
  });

  const updateTipoProveedor = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoProveedor(id, data),
    onSuccess: () => {
      console.log('Tipo proveedor actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposProveedor'] });
      refetchTiposProveedor();
      toast.success('Tipo de proveedor actualizado');
      closeModal();
    },
  });

  const deleteTipoProveedor = useMutation({
    mutationFn: configuracionService.deleteTipoProveedor,
    onSuccess: () => {
      console.log('Tipo proveedor eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposProveedor'] });
      refetchTiposProveedor();
      toast.success('Tipo de proveedor eliminado');
    },
  });

  // Mutations para tipos de convenio
  const createTipoConvenio = useMutation({
    mutationFn: configuracionService.createTipoConvenio,
    onSuccess: () => {
      console.log('Tipo convenio creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposConvenio'] });
      refetchTiposConvenio();
      toast.success('Tipo de convenio creado');
      closeModal();
    },
  });

  const updateTipoConvenio = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoConvenio(id, data),
    onSuccess: () => {
      console.log('Tipo convenio actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposConvenio'] });
      refetchTiposConvenio();
      toast.success('Tipo de convenio actualizado');
      closeModal();
    },
  });

  const deleteTipoConvenio = useMutation({
    mutationFn: configuracionService.deleteTipoConvenio,
    onSuccess: () => {
      console.log('Tipo convenio eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposConvenio'] });
      refetchTiposConvenio();
      toast.success('Tipo de convenio eliminado');
    },
  });

  // Mutations para tipos de dependencia
  const createTipoDependencia = useMutation({
    mutationFn: dependenciasService.createTipoDependencia,
    onSuccess: () => {
      console.log('Tipo dependencia creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposDependencia'] });
      refetchTiposDependencia();
      toast.success('Tipo de dependencia creado');
      closeModal();
    },
  });

  const updateTipoDependencia = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      dependenciasService.updateTipoDependencia(id, data),
    onSuccess: () => {
      console.log('Tipo dependencia actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposDependencia'] });
      refetchTiposDependencia();
      toast.success('Tipo de dependencia actualizado');
      closeModal();
    },
  });

  const deleteTipoDependencia = useMutation({
    mutationFn: dependenciasService.deleteTipoDependencia,
    onSuccess: () => {
      console.log('Tipo dependencia eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposDependencia'] });
      refetchTiposDependencia();
      toast.success('Tipo de dependencia eliminado');
    },
  });

  // Mutations para tipos de cuenta
  const createTipoCuenta = useMutation({
    mutationFn: configuracionService.createTipoCuenta,
    onSuccess: () => {
      console.log('Tipo cuenta creado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposCuenta'] });
      refetchTiposCuenta();
      toast.success('Tipo de cuenta creado');
      closeModal();
    },
  });

  const updateTipoCuenta = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoCuenta(id, data),
    onSuccess: () => {
      console.log('Tipo cuenta actualizado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposCuenta'] });
      refetchTiposCuenta();
      toast.success('Tipo de cuenta actualizado');
      closeModal();
    },
  });

  const deleteTipoCuenta = useMutation({
    mutationFn: configuracionService.deleteTipoCuenta,
    onSuccess: () => {
      console.log('Tipo cuenta eliminado, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['tiposCuenta'] });
      refetchTiposCuenta();
      toast.success('Tipo de cuenta eliminado');
    },
  });

  // Mutations para categorías
  const createCategoria = useMutation({
    mutationFn: categoriasService.createCategoria,
    onSuccess: () => {
      console.log('Categoría creada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      refetchCategorias();
      toast.success('Categoría creada');
      closeModal();
    },
  });

  const updateCategoria = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      categoriasService.updateCategoria(id, data),
    onSuccess: () => {
      console.log('Categoría actualizada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      refetchCategorias();
      toast.success('Categoría actualizada');
      closeModal();
    },
  });

  const deleteCategoria = useMutation({
    mutationFn: categoriasService.deleteCategoria,
    onSuccess: () => {
      console.log('Categoría eliminada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      refetchCategorias();
      toast.success('Categoría eliminada');
    },
  });

  // Mutations para subcategorías
  const createSubcategoria = useMutation({
    mutationFn: subcategoriasService.createSubcategoria,
    onSuccess: () => {
      console.log('Subcategoría creada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['subcategorias'] });
      refetchSubcategorias();
      toast.success('Subcategoría creada');
      closeModal();
    },
  });

  const updateSubcategoria = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      subcategoriasService.updateSubcategoria(id, data),
    onSuccess: () => {
      console.log('Subcategoría actualizada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['subcategorias'] });
      refetchSubcategorias();
      toast.success('Subcategoría actualizada');
      closeModal();
    },
  });

  const deleteSubcategoria = useMutation({
    mutationFn: subcategoriasService.deleteSubcategoria,
    onSuccess: () => {
      console.log('Subcategoría eliminada, invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['subcategorias'] });
      refetchSubcategorias();
      toast.success('Subcategoría eliminada');
    },
  });

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setEditingItem(item || null);
    if (type === 'subcategorias' && !item) {
      setFormData({ nombre: '', descripcion: '', id_categoria: '' });
    } else if (type === 'subcategorias' && item) {
      setFormData({ ...item });
    } else {
      setFormData(item || { nombre: '', descripcion: '' });
    }
    
    // Refetch data when opening modal to ensure fresh data
    switch (type) {
      case 'tipo-contrato':
        refetchTiposContrato();
        break;
      case 'estado-contrato':
        refetchEstadosContrato();
        break;
      case 'categorias':
        refetchCategorias();
        break;
      case 'subcategorias':
        refetchSubcategorias();
        break;
      case 'tipo-proveedores':
        refetchTiposProveedor();
        break;
      case 'tipo-convenios':
        refetchTiposConvenio();
        break;
      case 'tipo-dependencia':
        refetchTiposDependencia();
        break;
      case 'tipo-cuenta':
        refetchTiposCuenta();
        break;
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }

    switch (modalType) {
      case 'tipo-contrato':
        if (editingItem) {
          updateTipoContrato.mutate({ id: editingItem.id_tipo_contrato, data: formData });
        } else {
          createTipoContrato.mutate(formData);
        }
        break;
      case 'estado-contrato':
        if (editingItem) {
          updateEstadoContrato.mutate({ id: editingItem.id_estado_contrato, data: formData });
        } else {
          createEstadoContrato.mutate(formData);
        }
        break;
      case 'categorias':
        if (editingItem) {
          updateCategoria.mutate({ id: editingItem.id_categoria, data: formData });
        } else {
          createCategoria.mutate(formData);
        }
        break;
      case 'subcategorias':
        if (!formData.id_categoria) {
          toast.error('Debe seleccionar una categoría');
          return;
        }
        const subcategoriaData = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          id_categoria: parseInt(formData.id_categoria),
        };
        if (editingItem) {
          updateSubcategoria.mutate({ id: editingItem.id_subcategoria, data: subcategoriaData });
        } else {
          createSubcategoria.mutate(subcategoriaData);
        }
        break;
      case 'tipo-proveedores':
        if (editingItem) {
          updateTipoProveedor.mutate({ id: editingItem.id_tipo_provedores, data: formData });
        } else {
          createTipoProveedor.mutate(formData);
        }
        break;
      case 'tipo-convenios':
        if (editingItem) {
          updateTipoConvenio.mutate({ id: editingItem.id_tipo_convenio, data: formData });
        } else {
          createTipoConvenio.mutate(formData);
        }
        break;
      case 'tipo-dependencia':
        if (editingItem) {
          updateTipoDependencia.mutate({ id: editingItem.id_tipo_dependencia, data: formData });
        } else {
          createTipoDependencia.mutate(formData);
        }
        break;
      case 'tipo-cuenta':
        if (editingItem) {
          updateTipoCuenta.mutate({ id: editingItem.id_tipo_cuenta, data: formData });
        } else {
          createTipoCuenta.mutate(formData);
        }
        break;
    }
  };

  const handleDelete = (type: string, item: any) => {
    if (confirm('¿Está seguro de eliminar este elemento?')) {
      switch (type) {
        case 'tipo-contrato':
          deleteTipoContrato.mutate(item.id_tipo_contrato);
          break;
        case 'estado-contrato':
          deleteEstadoContrato.mutate(item.id_estado_contrato);
          break;
        case 'categorias':
          deleteCategoria.mutate(item.id_categoria);
          break;
        case 'subcategorias':
          deleteSubcategoria.mutate(item.id_subcategoria);
          break;
        case 'tipo-proveedores':
          deleteTipoProveedor.mutate(item.id_tipo_provedores);
          break;
        case 'tipo-convenios':
          deleteTipoConvenio.mutate(item.id_tipo_convenio);
          break;
        case 'tipo-dependencia':
          deleteTipoDependencia.mutate(item.id_tipo_dependencia);
          break;
        case 'tipo-cuenta':
          deleteTipoCuenta.mutate(item.id_tipo_cuenta);
          break;
      }
    }
  };

  const configCards = [
    {
      title: 'Tipos de Contrato',
      icon: <ScrollText className="h-8 w-8" />,
      description: 'Gestión de tipos de contratos',
      count: tiposContrato.length,
      color: 'bg-blue-500',
      type: 'tipo-contrato'
    },
    {
      title: 'Estados de Contrato',
      icon: <ToggleLeft className="h-8 w-8" />,
      description: 'Estados posibles de contratos',
      count: estadosContrato.length,
      color: 'bg-green-500',
      type: 'estado-contrato'
    },
    {
      title: 'Categorías',
      icon: <FolderTree className="h-8 w-8" />,
      description: 'Categorías de productos',
      count: categorias.length,
      color: 'bg-purple-500',
      type: 'categorias'
    },
    {
      title: 'Subcategorías',
      icon: <Tag className="h-8 w-8" />,
      description: 'Subcategorías de productos',
      count: subcategorias.length,
      color: 'bg-orange-500',
      type: 'subcategorias'
    },
    {
      title: 'Tipos de Proveedores',
      icon: <Truck className="h-8 w-8" />,
      description: 'Clasificación de proveedores',
      count: tiposProveedor.length,
      color: 'bg-red-500',
      type: 'tipo-proveedores'
    },
    {
      title: 'Tipos de Convenio',
      icon: <FileText className="h-8 w-8" />,
      description: 'Tipos de convenios comerciales',
      count: tiposConvenio.length,
      color: 'bg-teal-500',
      type: 'tipo-convenios'
    },
    {
      title: 'Tipos de Dependencia',
      icon: <BuildingIcon className="h-8 w-8" />,
      description: 'Clasificación de dependencias',
      count: tiposDependencia.length,
      color: 'bg-indigo-500',
      type: 'tipo-dependencia'
    },
    {
      title: 'Tipos de Cuenta',
      icon: <Wallet className="h-8 w-8" />,
      description: 'Tipos de cuentas bancarias (CUP, MLC, USD)',
      count: tiposCuenta.length,
      color: 'bg-cyan-500',
      type: 'tipo-cuenta'
    },
  ];

  const getItems = () => {
    switch (modalType) {
      case 'tipo-contrato':
        return tiposContrato;
      case 'estado-contrato':
        return estadosContrato;
      case 'categorias':
        return categorias;
      case 'subcategorias':
        return subcategorias;
      case 'tipo-proveedores':
        return tiposProveedor;
      case 'tipo-convenios':
        return tiposConvenio;
      case 'tipo-dependencia':
        return tiposDependencia;
      case 'tipo-cuenta':
        return tiposCuenta;
      default:
        return [];
    }
  };

  const getItemId = (item: any) => {
    switch (modalType) {
      case 'tipo-contrato':
        return item.id_tipo_contrato;
      case 'estado-contrato':
        return item.id_estado_contrato;
      case 'categorias':
        return item.id_categoria;
      case 'subcategorias':
        return item.id_subcategoria;
      case 'tipo-proveedores':
        return item.id_tipo_provedores;
      case 'tipo-convenios':
        return item.id_tipo_convenio;
      case 'tipo-dependencia':
        return item.id_tipo_dependencia;
      case 'tipo-cuenta':
        return item.id_tipo_cuenta;
      default:
        return item.id;
    }
  };

  const isSubcategoria = modalType === 'subcategorias';

  const getFormTitle = () => {
    if (editingItem) return 'Editar Elemento';
    switch (modalType) {
      case 'tipo-contrato': return 'Nuevo Tipo de Contrato';
      case 'estado-contrato': return 'Nuevo Estado de Contrato';
      case 'categorias': return 'Nueva Categoría';
      case 'subcategorias': return 'Nueva Subcategoría';
      case 'tipo-proveedores': return 'Nuevo Tipo de Proveedor';
      case 'tipo-convenios': return 'Nuevo Tipo de Convenio';
      case 'tipo-dependencia': return 'Nuevo Tipo de Dependencia';
      case 'tipo-cuenta': return 'Nuevo Tipo de Cuenta';
      default: return 'Nuevo Elemento';
    }
  };

  const getFormIcon = (size: 'sm' | 'lg' = 'sm') => {
    const className = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
    switch (modalType) {
      case 'tipo-contrato': return <ScrollText className={`${className} text-blue-600`} />;
      case 'estado-contrato': return <ToggleLeft className={`${className} text-green-600`} />;
      case 'categorias': return <FolderTree className={`${className} text-purple-600`} />;
      case 'subcategorias': return <Tag className={`${className} text-orange-600`} />;
      case 'tipo-proveedores': return <Truck className={`${className} text-red-600`} />;
      case 'tipo-convenios': return <FileText className={`${className} text-teal-600`} />;
      case 'tipo-dependencia': return <BuildingIcon className={`${className} text-indigo-600`} />;
      case 'tipo-cuenta': return <Wallet className={`${className} text-cyan-600`} />;
      default: return <Plus className={`${className} text-gray-600`} />;
    }
  };

  const getModalGradient = () => {
    switch (modalType) {
      case 'tipo-contrato': return 'from-blue-50 to-indigo-50';
      case 'estado-contrato': return 'from-green-50 to-emerald-50';
      case 'categorias': return 'from-purple-50 to-pink-50';
      case 'subcategorias': return 'from-orange-50 to-amber-50';
      case 'tipo-proveedores': return 'from-red-50 to-rose-50';
      case 'tipo-convenios': return 'from-teal-50 to-cyan-50';
      case 'tipo-dependencia': return 'from-indigo-50 to-blue-50';
      case 'tipo-cuenta': return 'from-cyan-50 to-sky-50';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  const getTableHeaderGradient = () => {
    switch (modalType) {
      case 'tipo-contrato': return 'bg-gradient-to-r from-blue-50 to-indigo-50';
      case 'estado-contrato': return 'bg-gradient-to-r from-green-50 to-emerald-50';
      case 'categorias': return 'bg-gradient-to-r from-purple-50 to-pink-50';
      case 'subcategorias': return 'bg-gradient-to-r from-orange-50 to-amber-50';
      case 'tipo-proveedores': return 'bg-gradient-to-r from-red-50 to-rose-50';
      case 'tipo-convenios': return 'bg-gradient-to-r from-teal-50 to-cyan-50';
      case 'tipo-dependencia': return 'bg-gradient-to-r from-indigo-50 to-blue-50';
      case 'tipo-cuenta': return 'bg-gradient-to-r from-cyan-50 to-sky-50';
      default: return 'bg-gray-50';
    }
  };

  const getButtonGradient = () => {
    switch (modalType) {
      case 'tipo-contrato': return 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800';
      case 'estado-contrato': return 'from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800';
      case 'categorias': return 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800';
      case 'subcategorias': return 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800';
      case 'tipo-proveedores': return 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800';
      case 'tipo-convenios': return 'from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800';
      case 'tipo-dependencia': return 'from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800';
      case 'tipo-cuenta': return 'from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800';
      default: return 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800';
    }
  };

  const renderModalContent = () => {
    const items = getItems();
    
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Formulario */}
        <div className={`bg-gradient-to-br ${getModalGradient()} rounded-2xl shadow-lg border p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getButtonGradient().split(' ')[0].replace('from-', 'from-').replace('600', '500').replace('700', '600')} text-white shadow-lg`}>
                {getFormIcon('lg')}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{getFormTitle()}</h3>
                <p className="text-sm text-gray-500">Complete los campos requeridos</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 font-medium">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                  Nombre *
                </Label>
                <Input
                  placeholder="Nombre del elemento"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="bg-white transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {isSubcategoria && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700 font-medium">
                    <FolderTree className="h-5 w-5 text-purple-500" />
                    Categoría *
                  </Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 bg-white transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={formData.id_categoria || ''}
                    onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                  >
                    <option value="">Seleccione una categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <FileText className="h-5 w-5 text-gray-500" />
                Descripción
              </Label>
              <Input
                placeholder="Descripción opcional"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="bg-white transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                className={`gap-2 bg-gradient-to-r ${getButtonGradient()} text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300`}
              >
                <Save className="h-4 w-4" />
                {editingItem ? 'Actualizar' : 'Agregar'}
              </Button>
              {editingItem && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setEditingItem(null)}
                  className="hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className={getTableHeaderGradient()}>
              <TableRow>
                <TableHead className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  ID
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-gray-600" />
                    Nombre
                  </div>
                </TableHead>
                {isSubcategoria && (
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-gray-600" />
                      Categoría
                    </div>
                  </TableHead>
                )}
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Descripción
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={getItemId(item)} className="hover:bg-gray-50 transition-colors">
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                      <Package className="h-3 w-3" />
                      #{getItemId(item)}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{item.nombre}</TableCell>
                  {isSubcategoria && (
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        <FolderTree className="h-3 w-3" />
                        {item.categoria?.nombre || '-'}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>{item.descripcion || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setFormData(item);
                        }}
                        className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(modalType!, item)}
                        className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSubcategoria ? 5 : 4} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No hay elementos registrados</p>
                      <p className="text-sm mt-1">Agregue elementos usando el formulario superior</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl animate-bounce-subtle">
            <Settings className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-500 mt-1">Gestión de parámetros del sistema</p>
          </div>
        </div>
        <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {configCards.map((card, index) => (
          <div 
            key={card.type}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ConfigCard
              title={card.title}
              icon={card.icon}
              description={card.description}
              count={card.count}
              color={card.color}
              onClick={() => openModal(card.type)}
            />
          </div>
        ))}
      </div>

      {/* Modal Mejorado */}
      <Modal
        isOpen={!!modalType}
        onClose={closeModal}
        title={configCards.find(c => c.type === modalType)?.title || ''}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
