import { Link } from 'react-router-dom';
import { Users, FileText, FolderOpen, ShoppingCart } from 'lucide-react';
import { ModuleHome } from '../../components/ModuleHome';

export function CompraHome() {
  return (
    <ModuleHome title="MÓDULO DE REPRESENTACIÓN" description="Gestión de adquisiciones y representación" icon={ShoppingCart}>
      <p className="text-sm text-gray-700 mb-4">Este módulo centraliza las operaciones relacionadas con la representación comercial: clientes, convenios y documentos anexos.</p>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/compra/clientes" className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-800">Clientes</h3>
            <p className="text-xs text-gray-600 mt-0.5">Gestión de clientes y representación</p>
          </div>
        </Link>

        <Link to="/compra/convenios" className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
            <FileText className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-800">Convenios</h3>
            <p className="text-xs text-gray-600 mt-0.5">Contratos y acuerdos comerciales</p>
          </div>
        </Link>

        <Link to="/compra/anexos" className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
            <FolderOpen className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-800">Anexos</h3>
            <p className="text-xs text-gray-600 mt-0.5">Documentos anexos a convenios</p>
          </div>
        </Link>
      </div>
    </ModuleHome>
  );
}
