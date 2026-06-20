import { BarChart3, Package, DollarSign, Download, TrendingUp, Boxes, ArrowLeftRight, UserCircle, FileText, TrendingDown } from "lucide-react";

export function ReportesHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md mb-3">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            MÓDULO DE REPORTES
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Genera y visualiza reportes del sistema de inventario
          </p>
        </div>

        <div className="bg-white rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Reportes permite generar diferentes tipos de informes
            para el control y análisis del inventario. Consulta existencias
            actuales, historial de movimientos por dependencia o producto,
            y listados de proveedores.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Boxes className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Existencias</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Stock actual de productos por dependencia con totales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <ArrowLeftRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Mov. Dependencia</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Historial de movimientos filtrado por dependencia y período.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <Package className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Mov. Producto</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Seguimiento detallado de un producto específico en el tiempo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <UserCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Proveedores</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Listado de proveedores registrados en el sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}