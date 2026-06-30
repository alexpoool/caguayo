import {
  Briefcase,
  ShoppingCart,
  Users,
  DollarSign,
  FileText,
} from "lucide-react";

export function VentaHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg mb-3 animate-bounce-subtle">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Módulo de Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión comercial y atención al cliente
          </p>
        </div>

        <div className="bg-white rounded-md shadow-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Ventas gestiona todas las operaciones comerciales del
            sistema, desde el registro de ventas hasta el control de clientes y
            el seguimiento detallado de cada transacción.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
              <ShoppingCart className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Ventas</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Registro de operaciones con productos, cantidades, precios y
                  totales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
              <Users className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Clientes</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Base de datos con contacto, historial de compras y
                  preferencias.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
              <FileText className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">
                  Estados de Venta
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Pendiente, confirmada o cancelada. El sistema controla cada
                  estado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
              <DollarSign className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">
                  Control Financiero
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Totales por venta, cálculo automático y registro histórico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
