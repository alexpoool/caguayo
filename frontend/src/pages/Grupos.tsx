import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, ShieldCheck, Edit, Trash2, Save, X, Plus, Search, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
  ConfirmModal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../components/ui';
import { administracionService } from '../services/administracion';
import type { Grupo, GrupoCreate } from '../types/usuario';

export function GruposPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoForm, setGrupoForm] = useState<GrupoCreate>({ nombre: '', descripcion: '' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    grupo: Grupo | null;
  }>({ isOpen: false, grupo: null });

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos'],
    queryFn: () => administracionService.getGrupos(),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => administracionService.getUsuarios(),
  });

  const filteredGrupos = searchTerm.trim()
    ? grupos.filter(g => 
        g.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
    : grupos;

  const getUsuariosCountByGrupo = (grupoId: number) => {
    return usuarios.filter(u => u.id_grupo === grupoId).length;
  };

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

  const resetGrupoForm = () => setGrupoForm({ nombre: '', descripcion: '' });

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

  const handleDeleteGrupo = (grupo: Grupo) => {
    const usuariosCount = getUsuariosCountByGrupo(grupo.id_grupo);
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Grupo',
      message: usuariosCount > 0 
        ? `El grupo "${grupo.nombre}" tiene ${usuariosCount} usuario(s) asignado(s). ¿Está seguro de eliminarlo?`
        : `¿Está seguro de eliminar el grupo "${grupo.nombre}"?`,
      onConfirm: () => {
        deleteGrupo.mutate(grupo.id_grupo);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const handleEdit = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setGrupoForm(grupo);
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setEditingGrupo(null);
    resetGrupoForm();
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
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}
                </h1>
                <p className="text-sm text-gray-500">
                  {editingGrupo ? 'Modifique los datos del grupo' : 'Complete los datos del nuevo grupo'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <CardTitle>Datos del Grupo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleGrupoSubmit} className="space-y-6">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Save className="h-4 w-4" />
                  {editingGrupo ? 'Actualizar' : 'Guardar'}
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
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-500 mt-1">
            {filteredGrupos.length === grupos.length 
              ? `Gestión de grupos (${grupos.length} grupos)`
              : `Mostrando ${filteredGrupos.length} de ${grupos.length} grupos`
            }
          </p>
        </div>
        <Button onClick={() => setView('form')} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre o descripción..."
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
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrupos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron grupos que coincidan con la búsqueda' : 'No hay grupos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGrupos.map((grupo) => (
                  <TableRow 
                    key={grupo.id_grupo} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, grupo })}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        #{grupo.id_grupo}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        {grupo.nombre}
                      </div>
                    </TableCell>
                    <TableCell>{grupo.descripcion || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm">{getUsuariosCountByGrupo(grupo.id_grupo)} usuario(s)</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(grupo)}
                          className="text-blue-600 hover:bg-blue-50 h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGrupo(grupo)}
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

  const ModalDetalle = () => createPortal(
    detailModal.isOpen && detailModal.grupo && (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Detalles del Grupo</h2>
            <Button variant="ghost" size="icon" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{detailModal.grupo.nombre}</h3>
                <p className="text-gray-500">ID: {detailModal.grupo.id_grupo}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Descripción</Label>
              <div className="font-medium">{detailModal.grupo.descripcion || 'Sin descripción'}</div>
            </div>
            <div>
              <Label className="text-gray-600">Usuarios asignados</Label>
              <div className="font-medium">{getUsuariosCountByGrupo(detailModal.grupo.id_grupo)} usuario(s)</div>
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
      <ModalDetalle />
    </>
  );
}
