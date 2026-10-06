import { Boxes, Truck, ArrowRightLeft, Clock, Package } from "lucide-react";

export function InventarioHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <Boxes className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE INVENTARIO
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Control y gestión de productos en el sistema
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Inventario permite gestionar todos los movimientos de
            productos dentro del sistema. Controla las entradas mediante
            recepciones, realiza transferencias entre dependencias y mantiene el
            seguimiento de movimientos pendientes de confirmación.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recepciones
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro de productos que ingresan al sistema, aumentando el
                  stock en la dependencia destino.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Ajustes
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Transferencia de productos entre dependencias con generación
                  automática de salida y entrada.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Movimientos Pendientes
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Movimientos que requieren confirmación para afectar el
                  inventario.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Productos
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Catálogo con precios, categorías y stock actual por
                  dependencia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}