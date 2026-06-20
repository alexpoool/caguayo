import { Settings, Coins, Users, Shield, Building, Wallet } from "lucide-react";

export function AdministracionHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md mb-3">
            <Settings className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            MÓDULO DE ADMINISTRACIÓN
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configuración y gestión del sistema
          </p>
        </div>

        <div className="bg-white rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Administración permite configurar y gestionar
            todos los aspectos del sistema. Accede a cada sección
            para administrar monedas, usuarios, grupos, dependencias
            y cuentas bancarias.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg">
              <Settings className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Configuración</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Tipos de contrato, estados, categorías, proveedores, convenios, dependencias y cuentas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <Coins className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Monedas</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Gestión de monedas y tasas de cambio del sistema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Usuarios</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Administración de usuarios del sistema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Grupos</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Gestión de grupos y permisos de acceso.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <Building className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Dependencias</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Configuración de dependencias y sus datos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-cyan-50 rounded-lg">
              <Wallet className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Cuentas</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Cuentas bancarias de las dependencias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}