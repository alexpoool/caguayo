/**
 * Configuración de marca.
 *
 * Dos marcas conviven en el sistema:
 *
 *  - PRODUCTO (ITEMLI): marca del software. Es fija en todas las
 *    instalaciones; aparece en Login, Register, About, favicon.
 *  - EMPRESA (cliente): responsable del negocio en cada instancia
 *    (ej. una distribuidora, una agencia, Caguayo…). Aparece en el
 *    sidebar, home, facturas y PDFs. Se obtiene del backend
 *    (`GET /api/v1/config/branding`) con caída a variables VITE_ y
 *    finalmente a "ERP".
 */
import { useEffect, useReducer } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/** Marca del software: idéntica en todas las instalaciones. */
export const PRODUCTO = {
  nombre: 'ITEMLI',
  logo: '/producto/itemli-logo.png',
} as const;

export interface Empresa {
  /** Nombre corto para la interfaz (sidebar, saludos). */
  nombre: string;
  /** Razón social para documentos (facturas, PDFs). */
  razonSocial: string;
}

const fallbackEmpresa = (): Empresa => {
  const envNombre = (import.meta.env.VITE_EMPRESA_NOMBRE as string | undefined)?.trim() || 'ERP';
  const envRazon =
    ((import.meta.env.VITE_EMPRESA_RAZON_SOCIAL as string | undefined)?.trim() || envNombre);
  return { nombre: envNombre, razonSocial: envRazon };
};

let empresa: Empresa = fallbackEmpresa();
let cargando: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function ensureEmpresaCargada(): Promise<void> {
  if (cargando) return cargando;
  cargando = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/config/branding`);
      if (!res.ok) return;
      const data = await res.json();
      const info = data?.empresa;
      if (info?.nombre || info?.razon_social) {
        empresa = {
          nombre: info.nombre || 'ERP',
          razonSocial: info.razon_social || info.nombre || 'ERP',
        };
        listeners.forEach((l) => l());
      }
    } catch {
      // Sin backend (o sin red): se queda el valor de env / "ERP".
    }
  })();
}

/** Gancho reactivo para componentes. */
export function useEmpresa(): Empresa {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    ensureEmpresaCargada();
    return () => {
      listeners.delete(force);
    };
  }, []);
  return empresa;
}

/** Lectura síncrona (uso en generadores de HTML/PDF). Dispara la carga perezosa. */
export function empresaActual(): Empresa {
  ensureEmpresaCargada();
  return empresa;
}
