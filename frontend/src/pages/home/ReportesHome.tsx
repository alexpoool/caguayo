import { BarChart3, Construction, Package, DollarSign, Download, TrendingUp } from 'lucide-react';

export function ReportesHome() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md mb-3">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MÓDULO DE REPORTES</h1>
          <p className="text-sm text-gray-600 mt-1">Información estratégica y análisis</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-700 mb-4">
            El módulo de Reportes permitirá generar informes y análisis detallados sobre diferentes aspectos del sistema. Podrás exportar los datos para análisis externo.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Ventas</h3>
                <p className="text-xs text-gray-600 mt-0.5">Estadísticas por período, cliente, producto.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Inventario</h3>
                <p className="text-xs text-gray-600 mt-0.5">Stock actual, movimientos y alertas.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Financieros</h3>
                <p className="text-xs text-gray-600 mt-0.5">Ingresos, ganancias, por cobrar y pagar.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <Download className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-gray-800">Exportar</h3>
                <p className="text-xs text-gray-600 mt-0.5">PDF, Excel y CSV.</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg border-2 border-dashed border-indigo-300">
            <div className="flex items-center justify-center gap-2">
              <Construction className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-bold text-indigo-700">Próximamente disponible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
