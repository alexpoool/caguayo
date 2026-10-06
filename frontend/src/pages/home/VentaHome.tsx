import {
  Briefcase,
  ShoppingCart,
  Users,
  DollarSign,
  FileText,
} from "lucide-react";

export function VentaHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE VENTAS
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Gestión comercial y atención al cliente
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Ventas gestiona todas las operaciones comerciales del
            sistema, desde el registro de ventas hasta el control de clientes y
            el seguimiento detallado de cada transacción.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Ventas</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro de operaciones con productos, cantidades, precios y
                  totales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Clientes
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Base de datos con contacto, historial de compras y
                  preferencias.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Contratos y Suplementos
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Gestión de contratos, suplementos y documentación asociada.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Control Financiero
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Facturación, cuentas por cobrar y seguimiento financiero.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}