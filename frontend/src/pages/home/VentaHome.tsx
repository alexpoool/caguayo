import { Briefcase, FileText, Receipt, DollarSign, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function VentaHome() {
  const ventas = [
    {
      titulo: "Contratos",
      descripcion: "Gestión de contratos con clientes",
      icono: FileText,
      ruta: "/ventas/contratos",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      titulo: "Suplementos",
      descripcion: "Suplementos de contratos existentes",
      icono: Briefcase,
      ruta: "/ventas/suplementos",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      titulo: "Facturas",
      descripcion: "Facturación a clientes",
      icono: Receipt,
      ruta: "/ventas/facturas",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      titulo: "Efectivo",
      descripcion: "Ventas al contado y cajas",
      icono: DollarSign,
      ruta: "/ventas/efectivo",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md mb-3">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">MÓDULO DE VENTAS</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión comercial y operativa
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ventas.map((item) => (
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
