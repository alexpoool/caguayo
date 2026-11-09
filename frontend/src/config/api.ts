const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

if (!configuredBaseUrl && import.meta.env.PROD) {
  throw new Error(
    'VITE_API_BASE_URL no está definida. Configúrala antes de compilar para producción.',
  );
}

/** URL base única del API. En desarrollo permite el proxy local `/api/v1`. */
export const API_BASE_URL = (configuredBaseUrl || '/api/v1').replace(/\/+$/, '');
