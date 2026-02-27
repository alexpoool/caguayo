import { Boxes, Truck, ArrowRightLeft, Clock, Package } from 'lucide-react';
import { ModuleHome } from '../../components/ModuleHome';

export function InventarioHome() {
  return (
    <ModuleHome title="MÓDULO DE INVENTARIO" description="Control y gestión de productos en el sistema" icon={Boxes}>
      <p className="text-sm text-gray-700 mb-4">
        El módulo de Inventario permite gestionar todos los movimientos de productos dentro del sistema. Controla las entradas de productos mediante recepciones, realiza ajustes para transferir productos entre dependencias, y mantiene el seguimiento de movimientos pendientes de confirmación.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <Truck className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Recepciones</h3>
            <p className="text-xs text-gray-600 mt-0.5">Registro de productos que ingresan al sistema. Cada recepción aumenta el stock en la dependencia destino.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg">
          <ArrowRightLeft className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Ajustes</h3>
            <p className="text-xs text-gray-600 mt-0.5">Transferir productos entre dependencias. Genera dos movimientos: salida y entrada.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
          <Clock className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Pendientes</h3>
            <p className="text-xs text-gray-600 mt-0.5">Movimientos que requieren confirmación para afectar el inventario.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
          <Package className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-gray-800">Productos</h3>
            <p className="text-xs text-gray-600 mt-0.5">Catálogo de productos con precios, categorías y stock actual.</p>
          </div>
        </div>
      </div>
    </ModuleHome>
  );
}
