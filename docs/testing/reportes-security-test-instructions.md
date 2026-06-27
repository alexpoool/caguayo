# Instrucciones de Testeo de Seguridad — Módulo de Reportes

**Fecha**: 2026-06-27  
**Ciclo**: Post-implementación de correcciones de seguridad (C-01, C-02, A-02)  
**Responsable**: 📚 doc-specialist  
**Audiencia**: 🧪 pytest-qa, 🔐 security-reviewer, 🐍 fastapi-dev

---

## Resumen de Correcciones

| ID | Severidad | Descripción | Estado |
|----|-----------|-------------|--------|
| C-01 | 🔴 Crítico | Endpoints Preview sin autenticación | ✅ Corregido |
| C-02 | 🔴 Crítico | Autenticación opcional en endpoints PDF | ✅ Corregido |
| A-01 | 🟠 Alto | Sin validación de autorización por funcionalidades | ❌ Pendiente (ver gap) |
| A-02 | 🟠 Alto | Exposición de detalles internos en errores | ✅ Corregido |
| M-02 | 🟡 Medio | Token JWT en localStorage (deuda técnica) | ⚠️ Documentado |

---

## Prueba 1: Endpoints Preview Rechazan Solicitudes Sin Token

### Objetivo
Verificar que los 4 endpoints preview retornan HTTP 401 cuando no se envía token.

### Pasos

**1.1 Preview de Existencias sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1"
```

**Esperado**:
- HTTP 401
- Body: `{"detail": "Token de autenticación requerido"}`

**1.2 Preview de Proveedores sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/proveedores-dependencia/preview?id_dependencia=1&tipo_entidad=NATURAL"
```

**Esperado**: HTTP 401

**1.3 Preview de Movimientos por Dependencia sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/movimientos-dependencia/preview?id_dependencia=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31"
```

**Esperado**: HTTP 401

**1.4 Preview de Movimientos por Producto sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/movimientos-producto/preview?id_dependencia=1&id_producto=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31"
```

**Esperado**: HTTP 401

---

## Prueba 2: Endpoints PDF Rechazan Solicitudes Sin Token

### Objetivo
Verificar que los 4 endpoints PDF retornan HTTP 401 cuando no se envía token.

### Pasos

**2.1 PDF de Existencias sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias?id_dependencia=1"
```

**Esperado**: HTTP 401

**2.2 PDF de Proveedores sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/proveedores-dependencia?id_dependencia=1&tipo_entidad=NATURAL"
```

**Esperado**: HTTP 401

**2.3 PDF de Movimientos por Dependencia sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/movimientos-dependencia?id_dependencia=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31"
```

**Esperado**: HTTP 401

**2.4 PDF de Movimientos por Producto sin token**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/movimientos-producto?id_dependencia=1&id_producto=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31"
```

**Esperado**: HTTP 401

---

## Prueba 3: Token Inválido o Expirado

### Objetivo
Verificar que tokens malformados o expirados son rechazados.

### Pasos

**3.1 Token malformado (no es JWT)**

```bash
TOKEN_INVALIDO="no-es-un-jwt-valido"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: Bearer $TOKEN_INVALIDO"
```

**Esperado**: HTTP 401 con `{"detail": "Token inválido o expirado"}`

**3.2 Header sin prefijo Bearer**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: TokenSinBearer"
```

**Esperado**: HTTP 401 con `{"detail": "Token de autenticación requerido"}`

**3.3 Header Authorization vacío**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: "
```

**Esperado**: HTTP 401 (FastAPI rechaza header vacío por `Header(...)`)

**3.4 Token expirado (modificar fecha manualmente o esperar expiración)**

```bash
# Usar un token JWT que se sepa expirado
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.3P8EemEKwQQx9tNML7zBpglqMFTCP9E9jxD2p3y0RcI"
```

**Esperado**: HTTP 401

---

## Prueba 4: Errores Internos No Exponen Detalles

### Objetivo
Verificar que los mensajes de error HTTP 500 no exponen información interna (queries, stack traces, nombres de tabla, rutas de archivo).

### Pasos

**4.1 Forzar error con id_dependencia inexistente**

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=99999" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 500 con `{"detail": "Error interno al generar el reporte"}`.
**No esperado**: `{"detail": "KeyError: ..."}` o `{"detail": "relation ... does not exist"}` o cualquier traza.

**4.2 Verificar en logs del servidor**

El error real (con detalle técnico) debe aparecer en los logs del backend, no en la respuesta HTTP:

```
ERROR - reportes_router - Error en reporte existencias: <detalle técnico>
```

**4.3 Probar en todos los endpoints PDF y preview**

Repetir con cada endpoint usando un `id_dependencia` inválido y verificar que siempre se recibe mensaje genérico.

---

## Prueba 5: Verificación de Logging de Acceso a Datos Sensibles

### Objetivo
Confirmar que cada acceso a datos sensibles (inventario, proveedores, movimientos) queda registrado con identidad del usuario.

### Pasos

**5.1 Generar acción y verificar log**

```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"alias": "admin", "contrasenia": "admin123"}' | jq -r '.token')

# 2. Ejecutar preview
curl -s "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# 3. Buscar en logs del servidor
```

**Esperado**: En los logs del servidor debe aparecer una entrada como:

```
INFO - app_logger - Acción: preview_existencias | Usuario: Admin Usuario | Detalle: {"id_dependencia": 1, "total_items": N}
```

**5.2 Verificar logging en todos los tipos de acción**

| Acción | Endpoint | Log esperado |
|--------|----------|-------------|
| `preview_existencias` | `GET /existencias/preview` | ✅ |
| `preview_proveedores_dependencia` | `GET /proveedores-dependencia/preview` | ✅ |
| `preview_movimientos_dependencia` | `GET /movimientos-dependencia/preview` | ✅ |
| `preview_movimientos_producto` | `GET /movimientos-producto/preview` | ✅ |
| `export_existencias` | `GET /existencias` | ✅ |
| `export_proveedores_dependencia` | `GET /proveedores-dependencia` | ✅ |
| `export_movimientos_dependencia` | `GET /movimientos-dependencia` | ✅ |
| `export_movimientos_producto` | `GET /movimientos-producto` | ✅ |

---

## Prueba 6: Token Válido — Acceso Correcto

### Objetivo (prueba negativa de seguridad)
Confirmar que con token válido todos los endpoints funcionan correctamente.

```bash
curl -s -o /dev/null -w "HTTP %{http_code}, Size: %{size_download}\n" \
  "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200, body JSON con datos.

Repetir para los 8 endpoints.

---

## Deuda Técnica Documentada

### M-02: Token JWT en localStorage

**Riesgo**: El token se almacena en `localStorage` en el frontend, accesible desde JavaScript. En caso de XSS, un atacante puede robar el token.

**Mitigación actual**: Ninguna. Es una deuda técnica documentada.

**Recomendación para producción**: Migrar a httpOnly cookies.

**Impacto en pruebas**: No hay cambio funcional, pero el riesgo persiste. Las pruebas de seguridad deben considerar este vector de ataque.

---

## Checklist de Seguridad

- [ ] Preview existencias sin token → 401
- [ ] Preview proveedores sin token → 401
- [ ] Preview movimientos-dependencia sin token → 401
- [ ] Preview movimientos-producto sin token → 401
- [ ] PDF existencias sin token → 401
- [ ] PDF proveedores sin token → 401
- [ ] PDF movimientos-dependencia sin token → 401
- [ ] PDF movimientos-producto sin token → 401
- [ ] Token inválido → 401
- [ ] Token sin prefijo Bearer → 401
- [ ] Token expirado → 401
- [ ] Error interno → 500 genérico (no expone detalles)
- [ ] Logging registra acción, usuario y detalle
- [ ] Con token válido → 200 correcto (todos los endpoints)

---

## Gaps Residuales

| ID | Descripción | Riesgo | Acción Requerida |
|----|-------------|--------|------------------|
| A-01 | No hay verificación de autorización por funcionalidades | 🟠 Alto | Implementar validación de permisos específicos por tipo de reporte (ej. `REPORTE_EXISTENCIAS`) |
| ESC-01 | No se verifica que `id_dependencia` pertenezca al tenant del usuario autenticado | 🟡 Medio | Validar dependencia contra usuario autenticado (multi-tenant) |
| M-02 | Token en localStorage vulnerable a XSS | 🟡 Medio | Migrar a httpOnly cookies para entornos productivos |
| PDF-02 | Sin paginación inteligente para tablas muy largas | 🔵 Bajo | Evaluar `splitByRow` o paginación manual para >100 filas |
