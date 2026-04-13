import {
  Wrench,
  ClipboardList,
  Users,
  Receipt,
  Calculator,
} from "lucide-react";
import { Link } from "react-router-dom";

export function ProyectosHome() {
  const proyectos = [
    {
      titulo: "Servicios",
      descripcion: "Catálogo de servicios con precios y medidas",
      icono: Wrench,
      ruta: "/proyectos/servicios",
      color: "bg-teal-50 hover:bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      titulo: "Solicitudes",
      descripcion: "Solicitudes de servicio con etapas y tareas",
      icono: ClipboardList,
      ruta: "/proyectos/solicitudes",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Creadores",
      descripcion: "Personas asignadas a etapas de proyectos",
      icono: Users,
      ruta: "/proyectos/creadores",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      titulo: "Facturas",
      descripcion: "Facturación por servicios con items y pagos",
      icono: Receipt,
      ruta: "/proyectos/facturas-servicio",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      titulo: "Liquidaciones",
      descripcion: "Liquidación final a creadores con cálculos financieros",
      icono: Calculator,
      ruta: "/proyectos/liquidaciones",
      color: "bg-green-50 hover:bg-green-100 col-span-2",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-3">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            MÓDULO DE PROYECTOS
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de servicios profesionales
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {proyectos.map((item) => (
            <Link
              key={item.ruta}
              to={item.ruta}
              className={`block p-4 rounded-lg ${item.color} transition-colors`}
            >
              <div className="flex items-start gap-3">
                <item.icono className={`h-6 w-6 ${item.iconColor} mt-0.5`} />
                <div>
                  <h3 className="font-bold text-sm text-gray-800">
                    {item.titulo}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {item.descripcion}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
