import { UserCircle, FilePlus, Briefcase, FileText } from 'lucide-react';

/** Portada del módulo Terceros: clientes, contratos, proveedores y convenios. */
export function TercerosHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <UserCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE TERCEROS
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Clientes, contratos, proveedores y convenios
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Terceros reúne la gestión de clientes y proveedores,
            sus contratos y convenios, junto con los suplementos de cada
            contrato.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <UserCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Clientes
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Registro y gestión de clientes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FilePlus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Contratos
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Contratos y sus suplementos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Briefcase className="h-4 w-4" />
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
                  Convenios
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Convenios asociados a proveedores.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
