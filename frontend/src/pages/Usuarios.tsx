import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, ShieldCheck, Edit, Trash2, Save, X, ArrowLeft, Eye, Copy, CheckCircle, Sparkles, User, FileText, Building, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  ConfirmModal
} from '../components/ui';
import { administracionService } from '../services/administracion';
import { dependenciasService } from '../services/administracion';
import type { Grupo, GrupoCreate, Usuario, UsuarioCreate } from '../types/usuario';

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'menu' | 'grupos' | 'usuarios'>('menu');
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [grupoForm, setGrupoForm] = useState<GrupoCreate>({ nombre: '', descripcion: '' });
  const [usuarioForm, setUsuarioForm] = useState<UsuarioCreate>({
    ci: '', nombre: '', primer_apellido: '', segundo_apellido: '', id_grupo: 0
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [createdUserModal, setCreatedUserModal] = useState<{
    isOpen: boolean;
    usuario: Usuario | null;
    contrasenia: string;
  }>({ isOpen: false, usuario: null, contrasenia: '' });

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    usuario: Usuario | null;
  }>({ isOpen: false, usuario: null });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos'],
    queryFn: () => administracionService.getGrupos(),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => administracionService.getUsuarios(),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const createGrupo = useMutation({
    mutationFn: administracionService.createGrupo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo creado exitosamente');
      resetGrupoForm();
    },
    onError: () => toast.error('Error al crear grupo'),
  });

  const updateGrupo = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Grupo> }) =>
      administracionService.updateGrupo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo actualizado');
      setEditingGrupo(null);
      resetGrupoForm();
    },
  });

  const deleteGrupo = useMutation({
    mutationFn: administracionService.deleteGrupo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo eliminado');
    },
  });

  // Función para generar contraseña igual que el backend
  const generatePassword = (ci: string): string => {
    // Simple hash para mostrar en el frontend (el backend usa SHA256 real)
    let hash = 0;
    for (let i = 0; i < ci.length; i++) {
      const char = ci.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  };

  const createUsuario = useMutation({
    mutationFn: administracionService.createUsuario,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario creado exitosamente');
      resetUsuarioForm();
      // Mostrar modal con datos autogenerados
      const contraseniaGenerada = generatePassword(variables.ci);
      setCreatedUserModal({
        isOpen: true,
        usuario: data,
        contrasenia: contraseniaGenerada,
      });
    },
    onError: () => toast.error('Error al crear usuario'),
  });

  const updateUsuario = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Usuario> }) =>
      administracionService.updateUsuario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario actualizado');
      setEditingUsuario(null);
      resetUsuarioForm();
    },
  });

  const deleteUsuario = useMutation({
    mutationFn: administracionService.deleteUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario eliminado');
    },
  });

  const resetGrupoForm = () => setGrupoForm({ nombre: '', descripcion: '' });
  const resetUsuarioForm = () => setUsuarioForm({
    ci: '', nombre: '', primer_apellido: '', segundo_apellido: '', id_grupo: 0
  });

  const handleGrupoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoForm.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    if (editingGrupo) {
      updateGrupo.mutate({ id: editingGrupo.id_grupo, data: grupoForm });
    } else {
      createGrupo.mutate(grupoForm);
    }
  };

  const handleUsuarioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioForm.ci || !usuarioForm.nombre || !usuarioForm.primer_apellido || !usuarioForm.id_grupo) {
      toast.error('Todos los campos requeridos deben completarse');
      return;
    }
    if (editingUsuario) {
      updateUsuario.mutate({ id: editingUsuario.id_usuario, data: usuarioForm });
    } else {
      createUsuario.mutate(usuarioForm);
    }
  };

  const handleDeleteGrupo = (grupo: Grupo) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Grupo',
      message: `¿Está seguro de eliminar el grupo "${grupo.nombre}"?`,
      onConfirm: () => {
        deleteGrupo.mutate(grupo.id_grupo);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const handleDeleteUsuario = (usuario: Usuario) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Está seguro de eliminar al usuario "${usuario.nombre} ${usuario.primer_apellido}"?`,
      onConfirm: () => {
        deleteUsuario.mutate(usuario.id_usuario);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  if (view === 'menu') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestión de grupos y usuarios del sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={() => setView('grupos')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-lg text-white">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Grupos</h3>
                  <p className="text-gray-500">{grupos.length} grupos registrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={() => setView('usuarios')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500 rounded-lg text-white">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Usuarios</h3>
                  <p className="text-gray-500">{usuarios.length} usuarios registrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === 'grupos') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header con icono animado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              onClick={() => setView('menu')}
              className="hover:scale-105 transition-transform duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg animate-bounce-subtle">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Grupos</h1>
                <p className="text-sm text-gray-500">Administre los grupos de usuarios del sistema</p>
              </div>
            </div>
          </div>
          <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
        </div>

        {/* Formulario de Grupos */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <CardTitle>{editingGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleGrupoSubmit} className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Nombre *
                </Label>
                <Input
                  value={grupoForm.nombre}
                  onChange={(e) => setGrupoForm({ ...grupoForm, nombre: e.target.value })}
                  placeholder="Nombre del grupo"
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Descripción
                </Label>
                <Input
                  value={grupoForm.descripcion || ''}
                  onChange={(e) => setGrupoForm({ ...grupoForm, descripcion: e.target.value })}
                  placeholder="Descripción opcional"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  type="submit" 
                  className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Save className="h-4 w-4" />
                  {editingGrupo ? 'Actualizar' : 'Guardar'}
                </Button>
                {editingGrupo && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => { setEditingGrupo(null); resetGrupoForm(); }}
                    className="hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabla de Grupos */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <CardTitle>Listado de Grupos</CardTitle>
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                {grupos.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <TableRow>
                    <TableHead className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      ID
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        Nombre
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Descripción
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.map((grupo) => (
                    <TableRow key={grupo.id_grupo} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                          <Shield className="h-3 w-3" />
                          #{grupo.id_grupo}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{grupo.nombre}</TableCell>
                      <TableCell>{grupo.descripcion || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingGrupo(grupo); setGrupoForm(grupo); }}
                            className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGrupo(grupo)}
                            className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="danger"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary" 
            onClick={() => setView('menu')}
            className="hover:scale-105 transition-transform duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg animate-bounce-subtle">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-sm text-gray-500">Administre los usuarios del sistema</p>
            </div>
          </div>
        </div>
        <Sparkles className="h-6 w-6 text-green-500 animate-pulse" />
      </div>

      {/* Formulario de Usuarios */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <CardTitle>{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleUsuarioSubmit} className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <CreditCard className="h-5 w-5 text-blue-500" />
                CI *
              </Label>
              <Input
                value={usuarioForm.ci}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, ci: e.target.value })}
                placeholder="Carnet de identidad"
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <User className="h-5 w-5 text-green-500" />
                Nombre *
              </Label>
              <Input
                value={usuarioForm.nombre}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, nombre: e.target.value })}
                placeholder="Nombre"
                className="transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <User className="h-5 w-5 text-purple-500" />
                Primer Apellido *
              </Label>
              <Input
                value={usuarioForm.primer_apellido}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, primer_apellido: e.target.value })}
                placeholder="Primer apellido"
                className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <User className="h-5 w-5 text-pink-500" />
                Segundo Apellido
              </Label>
              <Input
                value={usuarioForm.segundo_apellido || ''}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, segundo_apellido: e.target.value })}
                placeholder="Segundo apellido (opcional)"
                className="transition-all duration-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <Shield className="h-5 w-5 text-orange-500" />
                Grupo *
              </Label>
              <select
                className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={usuarioForm.id_grupo}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, id_grupo: parseInt(e.target.value) })}
              >
                <option value={0}>Seleccione un grupo</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>{g.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700">
                <Building className="h-5 w-5 text-indigo-500" />
                Dependencia
              </Label>
              <select
                className="w-full border rounded-md px-3 py-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={usuarioForm.id_dependencia || ''}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, id_dependencia: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">Sin dependencia</option>
                {dependencias.map((d) => (
                  <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <Button 
                type="submit" 
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Save className="h-4 w-4" />
                {editingUsuario ? 'Actualizar' : 'Guardar'}
              </Button>
              {editingUsuario && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { setEditingUsuario(null); resetUsuarioForm(); }}
                  className="hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle>Listado de Usuarios</CardTitle>
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              {usuarios.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <TableRow>
                  <TableHead className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    CI
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-500" />
                      Nombre Completo
                    </div>
                  </TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      Grupo
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id_usuario} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        <CreditCard className="h-3 w-3" />
                        {usuario.ci}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {usuario.nombre} {usuario.primer_apellido} {usuario.segundo_apellido || ''}
                    </TableCell>
                    <TableCell>{usuario.alias}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        <Shield className="h-3 w-3" />
                        {usuario.grupo?.nombre || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailModal({ isOpen: true, usuario })}
                          className="text-green-600 hover:bg-green-50 hover:scale-110 transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingUsuario(usuario); setUsuarioForm(usuario); }}
                          className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUsuario(usuario)}
                          className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
      />

      {/* Modal de datos autogenerados */}
      {createdUserModal.isOpen && createdUserModal.usuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Usuario Creado Exitosamente
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCreatedUserModal({ ...createdUserModal, isOpen: false })}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-2">
                  El usuario ha sido creado con las siguientes credenciales autogeneradas:
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-600">Nombre Completo</Label>
                  <div className="text-lg font-medium">
                    {createdUserModal.usuario.nombre} {createdUserModal.usuario.primer_apellido} {createdUserModal.usuario.segundo_apellido || ''}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-blue-700 flex items-center gap-2">
                      Alias (Usuario)
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserModal.usuario!.alias);
                          setCopiedField('alias');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                      >
                        {copiedField === 'alias' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </Label>
                    <div className="text-xl font-mono font-bold text-blue-900">
                      {createdUserModal.usuario.alias}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-blue-700 flex items-center gap-2">
                      Contraseña Temporal
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserModal.contrasenia);
                          setCopiedField('password');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                      >
                        {copiedField === 'password' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </Label>
                    <div className="text-xl font-mono font-bold text-blue-900">
                      {createdUserModal.contrasenia}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>Importante:</strong> Guarde estas credenciales. La contraseña no se mostrará nuevamente.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button onClick={() => setCreatedUserModal({ ...createdUserModal, isOpen: false })}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del usuario */}
      {detailModal.isOpen && detailModal.usuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Detalles del Usuario</h2>
              <Button variant="ghost" size="icon" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">CI</Label>
                  <div className="font-medium">{detailModal.usuario.ci}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Alias</Label>
                  <div className="font-medium">{detailModal.usuario.alias}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-600">Nombre Completo</Label>
                  <div className="font-medium text-lg">
                    {detailModal.usuario.nombre} {detailModal.usuario.primer_apellido} {detailModal.usuario.segundo_apellido || ''}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Grupo</Label>
                  <div className="font-medium">{detailModal.usuario.grupo?.nombre || '-'}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Dependencia</Label>
                  <div className="font-medium">{detailModal.usuario.dependencia?.nombre || 'Sin dependencia'}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t">
              <Button variant="secondary" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
