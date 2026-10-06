import { Settings, Coins, Users, Shield, Building, Wallet } from "lucide-react";

export function AdministracionHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <Settings className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE ADMINISTRACIÓN
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Configuración y gestión del sistema
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Administración permite configurar y gestionar todos los
            aspectos del sistema. Desde parámetros generales hasta usuarios,
            permisos, dependencias y cuentas bancarias.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Configuración
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Parámetros del sistema, catálogos, tipos y configuraciones
                  generales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Monedas
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Gestión de monedas y tasas de cambio del sistema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Usuarios
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Administración de usuarios, credenciales y acceso al sistema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Grupos y Permisos
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Gestión de grupos, roles y permisos por funcionalidad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Dependencias
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Configuración de dependencias, datos fiscales y estructura
                  organizativa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cuentas Bancarias
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Gestión de cuentas bancarias asociadas a dependencias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}