import React from 'react';
import { UserCircle } from 'lucide-react';

export function CompraClientesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          <UserCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold">Clientes (Representación)</h2>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
        Contenido de gestión de clientes de representación. Aquí irán las tablas y formularios.
      </div>
    </div>
  );
}
