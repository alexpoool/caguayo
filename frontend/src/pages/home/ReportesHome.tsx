import {
  BarChart3,
  Package,
  DollarSign,
  Download,
  TrendingUp,
  Boxes,
  ArrowLeftRight,
  UserCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export function ReportesHome() {
  const reportes = [
    {
      titulo: "Existencias",
      descripcion: "Stock actual por dependencia",
      icono: Boxes,
      ruta: "/reportes/existencias",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Movimientos por Dependencia",
      descripcion: "Historial de movimientos en un período",
      icono: ArrowLeftRight,
      ruta: "/reportes/movimientos-dependencia",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      titulo: "Movimientos por Producto",
      descripcion: "Historial de producto específico",
      icono: Package,
      ruta: "/reportes/movimientos-producto",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      titulo: "Proveedores",
      descripcion: "Listado de proveedores por dependencia",
      icono: UserCircle,
      ruta: "/reportes/proveedores",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md mb-3">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            MÓDULO DE REPORTES
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona un reporte para generar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {reportes.map((reporte) => (
            <Link
              key={reporte.ruta}
              to={reporte.ruta}
              className={`block p-4 rounded-lg ${reporte.color} transition-colors`}
            >
              <div className="flex items-start gap-3">
                <reporte.icono className={`h-6 w-6 ${reporte.iconColor} mt-0.5`} />
                <div>
                  <h3 className="font-bold text-sm text-gray-800">{reporte.titulo}</h3>
                  <p className="text-xs text-gray-600 mt-1">{reporte.descripcion}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
