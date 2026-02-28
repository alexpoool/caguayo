import { ShoppingCart, Construction, Package, FileText, Truck } from 'lucide-react';

export function CompraHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md mb-3">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE COMPRAS</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión de adquisiciones</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Compras estará dedicado a la gestión de proveedores y órdenes de compra. Permitirá controlar el ciclo completo de adquisiciones.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Proveedores</h3>
                <p className="text-xs text-gray-600 mt-0.5">Registro y gestión de empresas proveedoras.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Órdenes</h3>
                <p className="text-xs text-gray-600 mt-0.5">Generación y seguimiento de órdenes.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <Truck className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Recepción</h3>
                <p className="text-xs text-gray-600 mt-0.5">Registro de productos recibidos.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <FileText className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Seguimiento</h3>
                <p className="text-xs text-gray-600 mt-0.5">Estado de cada orden.</p>
              </div>
            </div>
          </div>

          {/* Bloque de 'Próximamente disponible' eliminado a petición del usuario */}
        </div>
      </div>
    </div>
  );
}
