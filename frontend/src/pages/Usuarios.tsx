import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, Shield, Edit, Trash2, Save, X, 
  Copy, CheckCircle, User, Building, CreditCard, Plus, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
  ConfirmModal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../components/ui';
import { administracionService } from '../services/administracion';
import { dependenciasService } from '../services/administracion';
import type { Usuario, UsuarioCreate } from '../types/usuario';

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredUsuarios = searchTerm.trim()
    ? usuarios.filter(u => 
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.primer_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.ci.includes(searchTerm)
      )
    : usuarios;

  const generatePassword = (ci: string): string => {
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

  const resetUsuarioForm = () => setUsuarioForm({
    ci: '', nombre: '', primer_apellido: '', segundo_apellido: '', id_grupo: 0
  });

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

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setUsuarioForm(usuario);
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setEditingUsuario(null);
    resetUsuarioForm();
  };

  if (view === 'form') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h1>
                <p className="text-sm text-gray-500">
                  {editingUsuario ? 'Modifique los datos del usuario' : 'Complete los datos del nuevo usuario'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <CardTitle>Datos del Usuario</CardTitle>
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
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleCancel}
                  className="hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">
            {filteredUsuarios.length === usuarios.length 
              ? `Gestión de usuarios (${usuarios.length} usuarios)`
              : `Mostrando ${filteredUsuarios.length} de ${usuarios.length} usuarios`
            }
          </p>
        </div>
        <Button onClick={() => setView('form')} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CI</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Dependencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda' : 'No hay usuarios'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow 
                    key={usuario.id_usuario} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, usuario })}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </div>
                        {usuario.nombre} {usuario.primer_apellido} {usuario.segundo_apellido || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {usuario.ci}
                      </span>
                    </TableCell>
                    <TableCell>{usuario.alias}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        <Shield className="h-3 w-3" />
                        {usuario.grupo?.nombre || 'Sin grupo'}
                      </span>
                    </TableCell>
                    <TableCell>{usuario.dependencia?.nombre || '-'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(usuario)}
                          className="text-blue-600 hover:bg-blue-50 h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUsuario(usuario)}
                          className="text-red-600 hover:bg-red-50 h-8 w-8"
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

  const ModalUsuarioCreado = () => createPortal(
    createdUserModal.isOpen && createdUserModal.usuario && (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
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
                  <div className="font-mono font-medium text-lg">{createdUserModal.usuario.alias}</div>
                </div>
                
                <div>
                  <Label className="text-blue-700 flex items-center gap-2">
                    Contraseña Temporal
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserModal.usuario!.password_temporal);
                        setCopiedField('password');
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                    >
                      {copiedField === 'password' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </Label>
                  <div className="font-mono font-medium text-lg">{createdUserModal.usuario.password_temporal}</div>
                </div>
              </div>
              
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                ⚠️ Esta información solo se muestra una vez. Asegúrese de copiar la contraseña antes de cerrar.
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
    ),
    document.body
  );

  const ModalDetalleUsuario = () => createPortal(
    detailModal.isOpen && detailModal.usuario && (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Detalles del Usuario</h2>
            <Button variant="ghost" size="icon" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
                {detailModal.usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {detailModal.usuario.nombre} {detailModal.usuario.primer_apellido} {detailModal.usuario.segundo_apellido || ''}
                </h3>
                <p className="text-gray-500">{detailModal.usuario.alias}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Correo</Label>
                <div className="font-medium">{detailModal.usuario.correo || '-'}</div>
              </div>
              <div>
                <Label className="text-gray-600">C.I</Label>
                <div className="font-medium">{detailModal.usuario.ci}</div>
              </div>
              <div>
                <Label className="text-gray-600">Grupo</Label>
                <div className="font-medium">{detailModal.usuario.grupo?.nombre || '-'}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-gray-600">Dependencia</Label>
                <div className="font-medium">{detailModal.usuario.dependencia?.nombre || 'Sin dependencia'}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end p-4 border-t gap-2">
            <Button variant="secondary" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    ),
    document.body
  );

  return (
    <>
      {content}
      <ModalUsuarioCreado />
      <ModalDetalleUsuario />
    </>
  );
}
