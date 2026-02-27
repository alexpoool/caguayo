export function UsuariosPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">En construcción</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled>
          Nuevo Usuario
        </button>
        <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-60" disabled>
          Editar
        </button>
        <button className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60" disabled>
          Eliminar
        </button>
      </div>

      <div className="border border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-400">
        Área en blanco para desarrollo de usuarios
      </div>
    </div>
  );
}
