import { Boxes, Truck, ArrowRightLeft, Clock, Package } from "lucide-react";
import { Link } from "react-router-dom";

export function InventarioHome() {
  const inventario = [
    {
      titulo: "Recepciones",
      descripcion: "Ingreso de productos al sistema",
      icono: Truck,
      ruta: "/movimientos/seleccionar-recepcion",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Ajustes",
      descripcion: "Transferir productos entre dependencias",
      icono: ArrowRightLeft,
      ruta: "/movimientos/ajuste",
      color: "bg-indigo-50 hover:bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      titulo: "Pendientes",
      descripcion: "Movimientos que requieren confirmación",
      icono: Clock,
      ruta: "/movimientos/pendientes",
      color: "bg-orange-50 hover:bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      titulo: "Productos",
      descripcion: "Catálogo de productos y stock actual",
      icono: Package,
      ruta: "/productos",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md mb-3">
            <Boxes className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            MÓDULO DE INVENTARIO
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Control y gestión de productos en el sistema
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {inventario.map((item) => (
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
