import { Briefcase, ShoppingCart, Users, DollarSign, FileText } from 'lucide-react';

export function VentaHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md mb-3">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE VENTAS</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión comercial y atención al cliente</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Ventas gestiona todas las operaciones comerciales del sistema, desde el registro de ventas hasta el control de clientes y el seguimiento detallado de cada transacción.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Ventas</h3>
                <p className="text-xs text-gray-600 mt-0.5">Registro de operaciones con productos, cantidades, precios y totales.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <Users className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Clientes</h3>
                <p className="text-xs text-gray-600 mt-0.5">Base de datos con contacto, historial de compras y preferencias.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Estados de Venta</h3>
                <p className="text-xs text-gray-600 mt-0.5">Pendiente, confirmada o cancelada. El sistema controla cada estado.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Control Financiero</h3>
                <p className="text-xs text-gray-600 mt-0.5">Totales por venta, cálculo automático y registro histórico.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
