# Marca del cliente (empresa responsable de esta instalación)

Cada despliegue del software pertenece a una empresa; sus assets viven
aquí (fuera del código, pisables por el cliente):

- `logo-black.png` — logo en negro, para facturas/documentos
  (fondo blanco).
- Opcional: `logo.png` (color), `favicon.ico` propio del cliente.

Estos archivos NO son del producto: al vender la app a un cliente nuevo,
se reemplazan por los de su marca. El nombre (corto y razón social) se
configura en el `.env` del backend (`EMPRESA_NOMBRE` / `EMPRESA_RAZON_SOCIAL`) y/o
en `VITE_EMPRESA_NOMBRE` / `VITE_EMPRESA_RAZON_SOCIAL` del frontend; el
default es el de esta instalación (Caguayo).
