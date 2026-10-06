import { Wrench, ClipboardList, Users, Receipt, Calculator } from 'lucide-react';

export function ProyectosHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE PROYECTOS
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Gestión de servicios profesionales
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Proyectos gestiona el ciclo completo de servicios
            profesionales, desde la solicitud y planificación hasta la
            facturación y liquidación final a los realizadores.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Servicios
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Catálogo de servicios con precios y unidades de medida.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Solicitudes y Proyectos
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Gestión de solicitudes, etapas, tareas y seguimiento de
                  proyectos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Realizadores
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro y asignación de realizadores a las etapas del
                  proyecto.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Facturación y Pre-facturas
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Emisión de pre-facturas, facturas de servicio y control de
                  pagos.
                </p>
              </div>
            </div>

            <div className="col-span-1 flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm sm:col-span-2">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Liquidaciones
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Liquidaciones automáticas a realizadores con retenciones y
                  control de saldos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}