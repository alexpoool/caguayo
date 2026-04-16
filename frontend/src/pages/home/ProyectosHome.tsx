import { Wrench, ClipboardList, Users, Receipt, Calculator, Layers } from 'lucide-react';

export function ProyectosHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-3">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE PROYECTOS</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión de servicios profesionales</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Proyectos gestiona el ciclo completo de servicios profesionales, desde la solicitud hasta la liquidación final a los creadores.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg">
              <Wrench className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Servicios</h3>
                <p className="text-xs text-gray-600 mt-0.5">Catálogo de servicios con precios y unidades de medida.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <ClipboardList className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Solicitudes</h3>
                <p className="text-xs text-gray-600 mt-0.5">Solicitudes de servicio con etapas y tareas.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <Users className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Realizadores</h3>
                <p className="text-xs text-gray-600 mt-0.5">Personas naturales asignadas a etapas de proyectos.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <Receipt className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Facturas</h3>
                <p className="text-xs text-gray-600 mt-0.5">Facturación por servicios con items y pagos.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg col-span-2">
              <Calculator className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Liquidaciones</h3>
                <p className="text-xs text-gray-600 mt-0.5">Liquidación final a realizadores con cálculos financieros automáticos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
