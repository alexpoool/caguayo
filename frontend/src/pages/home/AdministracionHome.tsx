import { Shield, Users, Building, Coins, UserCircle } from 'lucide-react';
import { ModuleHome } from '../../components/ModuleHome';

export function AdministracionHome() {
  return (
    <ModuleHome title="MÓDULO DE ADMINISTRACIÓN" description="Configuración central del sistema" icon={Shield}>
      <p className="text-sm text-gray-700 mb-4">
        El módulo de Administración gestiona la configuración global del sistema, incluyendo usuarios, dependencias y parámetros generales. Es la base para el funcionamiento de todos los demás módulos.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Usuarios</h3>
            <p className="text-xs text-gray-600 mt-0.5">Personas que acceden al sistema. Cada usuario pertenece a un grupo que define sus permisos.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
          <UserCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Grupos</h3>
            <p className="text-xs text-gray-600 mt-0.5">Conjuntos de permisos: administrador, vendedor, almacenero, supervisor.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
          <Building className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Dependencias</h3>
            <p className="text-xs text-gray-600 mt-0.5">Ubicaciones físicas como almacenes, sucursales o puntos de venta.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
          <Coins className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Monedas</h3>
            <p className="text-xs text-gray-600 mt-0.5">Monedas aceptadas y tipos de cambio aplicables.</p>
          </div>
        </div>
      </div>
    </ModuleHome>
  );
}
