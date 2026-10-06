import { ShoppingCart, Package, FileText, Truck } from "lucide-react";

export function CompraHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE COMPRAS
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Gestión de adquisiciones y proveedores
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Compras está dedicado a la gestión de proveedores y
            órdenes de compra. Permite controlar el ciclo completo de
            adquisiciones de forma organizada y eficiente.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Proveedores
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro y gestión de empresas proveedoras.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Órdenes de Compra
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Generación y seguimiento de órdenes de compra.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recepción
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro de productos recibidos con trazabilidad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Seguimiento
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Control del estado y cumplimiento de cada orden.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}