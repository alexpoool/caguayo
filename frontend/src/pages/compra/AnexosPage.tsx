import React from 'react';
import { Boxes } from 'lucide-react';

export function CompraAnexosPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
          <Boxes className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold">Anexos (Representación)</h2>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
        Gestión de anexos vinculados a convenios y clientes.
      </div>
    </div>
  );
}
