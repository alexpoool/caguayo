# Instrucciones de Testeo — Flujo de Generación de Reportes

**Fecha**: 2026-06-27  
**Ciclo**: Post-implementación de mejoras de seguridad y PDF  
**Responsable**: 📚 doc-specialist  
**Audiencia**: QA, 🧪 pytest-qa, 🐍 fastapi-dev

---

## Alcance Implementado

- **Seguridad**: Auth obligatorio (`require_auth`) en todos los endpoints PDF y preview
- **PDF**: Refactor con `PDFTemplate` (encabezado, tabla zebrada, paginación, notas, firmas)
- **Notas**: Parámetro `notas` en endpoints PDF, renderizado en el documento generado
- **Bug fix**: Corrección de `descripcion` → `nombre` en movimientos de producto
- **Error handling**: Mensajes genéricos en HTTP 500 (no exponer `str(e)`)
- **Frontend**: Componentes `ReportNotes`, `ReportPreviewPanel`, hook `useReportPreview`
- **Logging**: Registro de acciones de usuario via `AppLogger.log_action()`

### Endpoints Cubiertos

| Método | Ruta | Tipo |
|--------|------|------|
| GET | `/api/v1/reportes/proveedores-dependencia` | PDF |
| GET | `/api/v1/reportes/existencias` | PDF |
| GET | `/api/v1/reportes/movimientos-dependencia` | PDF |
| GET | `/api/v1/reportes/movimientos-producto` | PDF |
| GET | `/api/v1/reportes/existencias/preview` | JSON |
| GET | `/api/v1/reportes/movimientos-dependencia/preview` | JSON |
| GET | `/api/v1/reportes/movimientos-producto/preview` | JSON |
| GET | `/api/v1/reportes/proveedores-dependencia/preview` | JSON |

---

## Prerrequisitos

1. **Python 3.13+** instalado
2. **Dependencias** del backend: `pip install -r requirements.txt` (incluye `reportlab`, `fastapi`, `sqlalchemy`, `jinja2`)
3. **Base de datos** configurada y con datos semilla (dependencias, productos, proveedores, movimientos)
4. **Servidor** backend corriendo: `uvicorn src.main:app --reload` (por defecto en `http://localhost:8000`)
5. **Token JWT** válido: obtener mediante login en `/api/v1/auth/login`
6. **Cliente HTTP**: Postman, curl, o el frontend corriendo

### Variables de Entorno Requeridas

```bash
# .env o export
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/db
AUTH_DATABASE_URL=postgresql+asyncpg://user:pass@localhost/auth_db
SECRET_KEY=caguayo-secret-key-change-in-production
```

---

## Datos de Prueba

Asegurar que la BD tenga al menos:

- Una dependencia con `id_dependencia` conocido (ej. 1)
- Productos asociados a esa dependencia
- Proveedores de tipo NATURAL, TCP y JURIDICA
- Movimientos de inventario (entradas y salidas) en un rango de fechas
- Un usuario con credenciales válidas para obtener token JWT

---

## Pasos de Prueba Manual

### 1. Obtener Token de Autenticación

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"alias": "admin", "contrasenia": "admin123"}'
```

Guardar el token `eyJ...` para usos posteriores. Variable sugerida:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

---

### 2. Preview — Happy Path

#### 2.1 Preview de Existencias

```bash
curl -s "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Esperado**: HTTP 200, JSON con:
- `dependencia.nombre` — string
- `items` — array de objetos con `codigo`, `descripcion`, `cantidad`
- `total_items` — número
- `total_cantidad` — suma de cantidades

#### 2.2 Preview de Proveedores (NATURAL)

```bash
curl -s "http://localhost:8000/api/v1/reportes/proveedores-dependencia/preview?id_dependencia=1&tipo_entidad=NATURAL" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Esperado**: HTTP 200, JSON con:
- `dependencia.nombre`
- `items` con `codigo`, `carnet_identidad`, `nombre`, `direccion`, `municipio` (si data)
- `total_items`

#### 2.3 Preview de Movimientos por Dependencia

```bash
curl -s "http://localhost:8000/api/v1/reportes/movimientos-dependencia/preview?id_dependencia=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Esperado**: HTTP 200, JSON con:
- `dependencia.nombre`
- `items` con `fecha`, `operacion`, `producto`, `tipo`, `cantidad`
- `total_items`, `total_entradas`, `total_salidas`

#### 2.4 Preview de Proveedores con filtro de provincia

```bash
curl -s "http://localhost:8000/api/v1/reportes/proveedores-dependencia/preview?id_dependencia=1&tipo_entidad=JURIDICA&id_provincia=1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Esperado**: HTTP 200, lista filtrada por provincia (puede ser vacía si no hay datos).

---

### 3. PDF — Happy Path

#### 3.1 PDF de Existencias

```bash
curl -s -o reporte_existencias.pdf \
  "http://localhost:8000/api/v1/reportes/existencias?id_dependencia=1" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: Archivo PDF descargado. Verificar contenido (paso 4).

#### 3.2 PDF de Proveedores con Notas y Firmas

```bash
curl -s -o reporte_proveedores.pdf \
  "http://localhost:8000/api/v1/reportes/proveedores-dependencia?id_dependencia=1&tipo_entidad=NATURAL&aprobado_por_nombre=Juan%20Perez&aprobado_por_cargo=Director&notas=Reporte%20generado%20para%20auditor%C3%ADa%20interna" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: Archivo PDF descargado. Verificar contenido (paso 4).

#### 3.3 PDF de Movimientos por Dependencia

```bash
curl -s -o reporte_movimientos.pdf \
  "http://localhost:8000/api/v1/reportes/movimientos-dependencia?id_dependencia=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31&aprobado_por_nombre=Maria%20Lopez&aprobado_por_cargo=Contadora&notas=Movimientos%20del%20primer%20semestre" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: Archivo PDF descargado. Verificar contenido (paso 4).

#### 3.4 PDF de Movimientos por Producto

```bash
curl -s -o reporte_movimientos_producto.pdf \
  "http://localhost:8000/api/v1/reportes/movimientos-producto?id_dependencia=1&id_producto=1&fecha_inicio=2026-01-01&fecha_fin=2026-12-31&aprobado_por_nombre=Carlos%20Gomez&aprobado_por_cargo=Jefe%20de%20Almacen&notas=Producto%20de%20alta%20rotaci%C3%B3n" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: Archivo PDF descargado. Verificar contenido (paso 4).

---

### 4. Verificación de Contenido PDF

Abrir cada PDF descargado y verificar:

| Elemento | Cómo verificarlo |
|----------|------------------|
| **Encabezado de empresa** | Texto "Caguayo" en la parte superior |
| **Dirección de dependencia** | Debajo del nombre de la empresa |
| **Título del reporte** | `REPORTE DE PROVEEDORES`, `EXISTENCIAS EN INVENTARIO`, etc. |
| **Fecha de emisión** | Formato `DD/MM/YYYY HH:MM` |
| **Filtros aplicados** | Línea con `Dependencia: ...` y otros filtros |
| **Tabla con datos** | Cabecera con fondo oscuro, filas zebradas (gris/blanco) |
| **Sección OBSERVACIONES** | Solo si se envió `notas` — recuadro ámbar con fondo amarillo |
| **Bloque de firmas** | `CONFECCIONADO POR:` (usuario actual) / `APROBADO POR:` (nombre + cargo) |
| **Paginación** | Número de página al pie: `Página X` |
| **Nombre del producto** | En movimientos-producto, el nombre aparece en el filtro `Producto: ... (...) ` |

---

### 5. Pruebas Frontend (ReporteProveedores)

1. Abrir `http://localhost:5173/reportes/proveedores` (o la ruta del frontend)
2. **Seleccionar dependencia** del dropdown
3. **Seleccionar tipo de proveedor** (NATURAL, TCP, JURIDICA)
4. **Ver vista previa** cargar automáticamente con tabla de datos
5. Verificar que las **tarjetas de estadísticas** muestran "Total proveedores" y "Tipo de proveedor"
6. **Agregar notas** en el campo de texto — verificar contador de caracteres
7. **Ver indicador** "Notas incluidas" en el panel de preview
8. **Llenar firmas**: nombre y cargo del aprobador
9. **Click "Exportar X proveedores como PDF"**
10. Verificar descarga del PDF y que contenga los datos esperados

---

## Casos de Borde

### Sin datos (tabla vacía)

- Usar un `id_dependencia` sin proveedores/existencias/movimientos
- **Esperado preview**: JSON con `items: []`, `total_items: 0`
- **Esperado PDF**: Contenido "No se encontraron datos para los criterios seleccionados."

### Notas muy largas

- Enviar `notas` con > 500 caracteres (el frontend limita a 500, pero backend puede recibir más)
- **Esperado**: PDF con notas renderizadas, el texto puede desbordar la caja visual pero debe ser visible

### Fechas inválidas

```bash
curl -s "http://localhost:8000/api/v1/reportes/movimientos-dependencia/preview?id_dependencia=1&fecha_inicio=invalida&fecha_fin=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 422 (error de validación de FastAPI), detalle indicando formato de fecha inválido.

### Fecha inicio > fecha fin

```bash
curl -s "http://localhost:8000/api/v1/reportes/movimientos-dependencia/preview?id_dependencia=1&fecha_inicio=2026-12-31&fecha_fin=2026-01-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200 (la BD filtra), pero `items` puede ser vacío.

### id_dependencia inexistente

```bash
curl -s "http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=99999" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 500 con mensaje genérico ("Error interno al generar el reporte"). El error real queda en logs del servidor.

### tipo_entidad inválido

```bash
curl -s "http://localhost:8000/api/v1/reportes/proveedores-dependencia/preview?id_dependencia=1&tipo_entidad=INVALIDO" \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200 con `items: []` (o 500 si el servicio no maneja el valor — verificar comportamiento).

---

## Validaciones de Regresión

### 1. Endpoints anteriores siguen funcionando (con token)

Probar que los endpoints que antes funcionaban sin token ahora requieren token (ver documento de seguridad).

### 2. Sin regresión en otros módulos

- Verificar que `/api/v1/auth/login` sigue funcionando
- Verificar que otros routers (facturación, administración) no se vieron afectados
- Correr tests existentes (si los hay)

### 3. Logging

Verificar en los logs del servidor que cada acción de reporte queda registrada:

```
INFO - app_logger - Acción: export_existencias | Usuario: Admin Usuario | Detalle: {"id_dependencia": 1}
```

---

## Criterios de Aceptación Verificables

| # | Criterio | Cómo verificar | Estado |
|---|----------|---------------|--------|
| CA-01 | Auth obligatorio en preview y PDF | Sin token → 401 (ver test de seguridad) | ✅ |
| CA-02 | Notes se reflejan en el PDF | PDF con `notas=texto` incluye recuadro OBSERVACIONES | ✅ |
| CA-03 | PDF incluye encabezado de empresa | El PDF muestra "Caguayo" y datos de dependencia | ✅ |
| CA-04 | PDF incluye tabla con datos | La tabla tiene cabecera con fondo oscuro y filas | ✅ |
| CA-05 | PDF incluye paginación | Cada página tiene "Página X" al pie | ✅ |
| CA-06 | PDF incluye bloque de firmas | Secciones "CONFECCIONADO POR" y "APROBADO POR" | ✅ |
| CA-07 | UI congruente con el sistema | Componentes usan mismos estilos (Tailwind, colores) | ✅ |
| CA-08 | Vista previa carga automática | Al seleccionar filtros, preview se actualiza con debounce | ✅ |
| CA-09 | Notas con límite de caracteres | Textarea muestra contador 0/500 → 500/500 | ✅ |
| CA-10 | Errores no exponen detalles internos | HTTP 500 siempre mensaje genérico | ✅ |

---

## Resultado Esperado por Caso

| # | Caso | Código HTTP | Body/Archivo |
|---|------|-------------|-------------|
| 1 | Preview existencias (con token) | 200 | JSON con `items`, `total_items`, `total_cantidad` |
| 2 | Preview existencias (sin token) | 401 | `{"detail": "Token de autenticación requerido"}` |
| 3 | PDF existencias (con token) | 200 | Archivo PDF (application/pdf) |
| 4 | PDF existencias (sin token) | 401 | `{"detail": "Token de autenticación requerido"}` |
| 5 | Preview con fechas inválidas | 422 | Detalle de error de validación |
| 6 | Preview sin datos | 200 | JSON con `items: []`, `total_items: 0` |
| 7 | PDF con notas | 200 | PDF con sección OBSERVACIONES |
| 8 | PDF sin notas | 200 | PDF sin sección OBSERVACIONES |
| 9 | Error interno (BD caída) | 500 | `{"detail": "Error interno al generar el reporte"}` |

---

## Checklist de Prueba

- [ ] Preview existencias funciona
- [ ] Preview proveedores funciona (NATURAL, TCP, JURIDICA)
- [ ] Preview movimientos-dependencia funciona
- [ ] Preview movimientos-producto funciona
- [ ] Preview con filtro provincia funciona
- [ ] PDF existencias se descarga y abre
- [ ] PDF proveedores incluye notas y firmas
- [ ] PDF movimientos incluye período y datos
- [ ] PDF movimientos-producto incluye nombre del producto (bug fix)
- [ ] PDF sin datos muestra mensaje "No se encontraron datos"
- [ ] Preview sin token da 401
- [ ] PDF sin token da 401
- [ ] Fechas inválidas dan 422
- [ ] Error interno da 500 genérico
- [ ] Logging registra cada acción
- [ ] Frontend: vista previa se actualiza al cambiar filtros
- [ ] Frontend: exportación PDF descarga archivo
- [ ] Frontend: contador de notas funciona
