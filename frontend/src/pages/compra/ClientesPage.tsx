import { useState } from 'react';
import { UserCircle, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useClientes } from '../../hooks/useClientes';
import type { Cliente, ClienteCreate, ClienteUpdate } from '../../types/index';

export function CompraClientesPage() {
  const { clientes, isLoading, createCliente, updateCliente, deleteCliente, isCreating } = useClientes();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const filteredClientes = clientes.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cedula_rif?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      numero_cliente: formData.get('numero_cliente'),
      nombre: formData.get('nombre'),
      tipo_persona: formData.get('tipo_persona'),
      cedula_rif: formData.get('cedula_rif'),
      telefono: formData.get('telefono'),
      email: formData.get('email'),
      fax: formData.get('fax'),
      web: formData.get('web'),
      codigo_postal: formData.get('codigo_postal'),
      nit: formData.get('nit'),
      direccion: formData.get('direccion'),
      tipo_relacion: formData.get('tipo_relacion'),
    };
    
    if (editingCliente) {
      updateCliente({ id: editingCliente.id_cliente, data });
    } else {
      createCliente(data);
    }
    setView('list');
    setEditingCliente(null);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setView('form');
  };

  const handleDelete = (id: number) => {
    deleteCliente(id);
    setShowDeleteConfirm(null);
  };

  const getTipoRelacionBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      CLIENTE: 'bg-blue-100 text-blue-800',
      PROVEEDOR: 'bg-green-100 text-green-800',
      AMBAS: 'bg-purple-100 text-purple-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  const getTipoPersonaBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      NATURAL: 'bg-cyan-100 text-cyan-800',
      JURIDICA: 'bg-orange-100 text-orange-800',
      TCP: 'bg-pink-100 text-pink-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (view === 'form') {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setView('list'); setEditingCliente(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cliente</label>
              <input name="numero_cliente" defaultValue={editingCliente?.numero_cliente} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input name="nombre" defaultValue={editingCliente?.nombre} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Persona</label>
              <select name="tipo_persona" defaultValue={editingCliente?.tipo_persona || 'NATURAL'} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="NATURAL">Natural</option>
                <option value="JURIDICA">Jurídica</option>
                <option value="TCP">TCP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relación</label>
              <select name="tipo_relacion" defaultValue={editingCliente?.tipo_relacion || 'CLIENTE'} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="CLIENTE">Cliente</option>
                <option value="PROVEEDOR">Proveedor</option>
                <option value="AMBAS">Ambos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula/RIF</label>
              <input name="cedula_rif" defaultValue={editingCliente?.cedula_rif} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input name="telefono" defaultValue={editingCliente?.telefono} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" defaultValue={editingCliente?.email} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
              <input name="fax" defaultValue={editingCliente?.fax} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
              <input name="web" defaultValue={editingCliente?.web} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <input name="codigo_postal" defaultValue={editingCliente?.codigo_postal} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
              <input name="nit" defaultValue={editingCliente?.nit} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <textarea name="direccion" defaultValue={editingCliente?.direccion} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isCreating ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setView('list'); setEditingCliente(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <UserCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold">Clientes</h2>
        </div>
        <button onClick={() => setView('form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Número</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo Persona</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Cédula/RIF</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo Relación</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Teléfono</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : filteredClientes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay clientes</td></tr>
            ) : (
              filteredClientes.map((cliente) => (
                <tr key={cliente.id_cliente} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{cliente.numero_cliente}</td>
                  <td className="px-4 py-3 text-sm font-medium">{cliente.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getTipoPersonaBadge(cliente.tipo_persona)}`}>
                      {cliente.tipo_persona}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{cliente.cedula_rif}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getTipoRelacionBadge(cliente.tipo_relacion)}`}>
                      {cliente.tipo_relacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{cliente.telefono}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(cliente)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(cliente.id_cliente)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-4">¿Estás seguro de eliminar este cliente?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
