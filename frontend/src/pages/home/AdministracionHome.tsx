import { Shield, Users, Building, Coins, UserCircle } from 'lucide-react';

export function AdministracionHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE ADMINISTRACIÓN</h1>
          <p className="text-sm text-gray-600 mt-1">Configuración central del sistema</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
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
        </div>
      </div>
    </div>
  );
}
