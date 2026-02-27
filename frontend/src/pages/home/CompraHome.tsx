import { Link } from 'react-router-dom';
import { Users, FileText, FolderOpen, ShoppingCart, Package } from 'lucide-react';

export function CompraHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md mb-3">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE COMPRAS</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión de adquisiciones y representación</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link
            to="/compra/clientes"
            className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">Clientes</h3>
            <p className="text-xs text-gray-500 mt-1 text-center">Gestión de clientes y representación</p>
          </Link>

          <Link
            to="/compra/convenios"
            className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-800">Convenios</h3>
            <p className="text-xs text-gray-500 mt-1 text-center">Contratos y acuerdos comerciales</p>
          </Link>

          <Link
            to="/compra/anexos"
            className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-500"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <FolderOpen className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-800">Anexos</h3>
            <p className="text-xs text-gray-500 mt-1 text-center">Documentos anexos a convenios</p>
          </Link>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border-2 border-dashed border-orange-300">
          <div className="flex items-center justify-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-700">Módulo activo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
