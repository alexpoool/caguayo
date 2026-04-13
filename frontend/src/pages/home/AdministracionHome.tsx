import { Shield, Users, Building, Coins, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function AdministracionHome() {
  const administracion = [
    {
      titulo: "Usuarios",
      descripcion:
        "Personas que acceden al sistema. Cada usuario pertenece a un grupo que define sus permisos.",
      icono: Users,
      ruta: "/configuracion",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Grupos",
      descripcion:
        "Conjuntos de permisos: administrador, vendedor, almacenero, supervisor.",
      icono: UserCircle,
      ruta: "/configuracion",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      titulo: "Dependencias",
      descripcion:
        "Ubicaciones físicas como almacenes, sucursales o puntos de venta.",
      icono: Building,
      ruta: "/configuracion",
      color: "bg-emerald-50 hover:bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      titulo: "Monedas",
      descripcion: "Monedas aceptadas y tipos de cambio aplicables.",
      icono: Coins,
      ruta: "/configuracion",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            MÓDULO DE ADMINISTRACIÓN
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configuración central del sistema
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {administracion.map((item, index) => (
            <Link
              key={index}
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
