import { ShoppingCart, UserCircle, FileText, Boxes, Coins } from "lucide-react";
import { Link } from "react-router-dom";

export function CompraHome() {
  const compras = [
    {
      titulo: "Proveedores",
      descripcion: "Registro y gestión de empresas proveedoras",
      icono: UserCircle,
      ruta: "/compra/clientes",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Convenios",
      descripcion: "Gestión de convenios con proveedores",
      icono: FileText,
      ruta: "/compra/convenios",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      titulo: "Anexos",
      descripcion: "Anexos a los convenios de compras",
      icono: Boxes,
      ruta: "/compra/anexos",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      titulo: "Liquidaciones",
      descripcion: "Liquidaciones de compras finalizadas",
      icono: Coins,
      ruta: "/compra/liquidaciones",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md mb-3">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">MÓDULO DE COMPRAS</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión de adquisiciones</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {compras.map((item) => (
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
