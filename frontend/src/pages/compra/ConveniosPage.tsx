import React from 'react';
import { FileText } from 'lucide-react';

export function CompraConveniosPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-green-50 text-green-600">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold">Convenios (Representación)</h2>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
        Lista de convenios y operaciones asociadas.
      </div>
    </div>
  );
}
