# Entorno del frontend

## Variables de build

Vite expone solo variables con prefijo `VITE_` al navegador. No se deben poner secretos en ellas.

| Variable | Requerida | Uso |
|---|---|---|
| `VITE_API_BASE_URL` | Sí | URL base del API, con `/api/v1` y sin barra final |
| `VITE_EMPRESA_NOMBRE` | No | Nombre de la empresa cuando el backend no entrega branding |
| `VITE_EMPRESA_RAZON_SOCIAL` | No | Razón social cuando el backend no entrega branding |

Ejemplo:

```dotenv
VITE_API_BASE_URL=https://erp.example.com/api/v1
VITE_EMPRESA_NOMBRE=Caguayo
VITE_EMPRESA_RAZON_SOCIAL=CAGUAYO S.A.
```

## Despliegues

Cada despliegue debe definir su propio `VITE_API_BASE_URL`. No se debe reutilizar el valor de desarrollo.

- Desarrollo: `http://localhost:8000/api/v1` o proxy local `/api/v1`.
- Staging: URL del backend de staging.
- Producción: URL del backend de producción.

El build falla si `VITE_API_BASE_URL` falta en producción. Pendiente de implementar en `G2.7`.

## Cabeceras de seguridad

El servidor que sirve `index.html` debe entregar:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`connect-src` debe incluir la URL real del API. `style-src 'unsafe-inline'` se mantiene por Tailwind y estilos inline existentes; se revisará al cerrar `G11`.

Pendiente: aplicar estas cabeceras en el servidor real de cada despliegue.
