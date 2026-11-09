/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_EMPRESA_NOMBRE?: string;
  readonly VITE_EMPRESA_RAZON_SOCIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
