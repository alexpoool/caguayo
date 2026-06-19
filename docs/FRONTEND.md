# Documentación del Frontend de Caguayo

## Descripción General

El frontend de Caguayo es una aplicación web moderna y responsiva construida con React 18, TypeScript y Vite. Proporciona una interfaz de usuario intuitiva para interactuar con el sistema de gestión financiera, ofreciendo una experiencia de usuario fluida y eficiente.

## Características del Frontend

### 1. Arquitectura Moderna

- **React 18**: Framework de componentes con hooks
- **TypeScript**: Tipado estático para desarrollo seguro
- **Vite**: Herramienta de build rápida y moderna
- **Ant Design**: Biblioteca de componentes profesional
- **TanStack Query**: Manejo de estado y caché

### 2. Experiencia de Usuario

- **UI Responsiva**: Diseñada para funcionar en todos los dispositivos
- **Interacción Intuitiva**: Patrones de interacción familiares y eficientes
- **Feedback Visual**: Indicadores de carga, notificaciones y estados
- **Accesibilidad**: Soporte completo para accesibilidad

### 3. Rendimiento

- **Caché Inteligente**: TanStack Query para datos en caché
- **Bundle Optimizado**: Empaquetado eficiente para producción
- **Lazy Loading**: Carga perezosa de componentes y rutas
- **Actualización en Tiempo Real**: Actualizaciones de datos sin recargar página

## Características Principales

### 1. Gestión de Clientes

**Características**:
- Lista de clientes con búsqueda y filtrado
- Creación y edición de clientes
- Visualización de detalles de clientes
- Exportación de datos

**Componentes**:
- `ClienteList` - Lista de clientes
- `ClienteForm` - Formulario para crear/editar clientes
- `ClienteDetail` - Detalles del cliente

### 2. Control de Ventas

**Características**:
- Lista de ventas con filtros
- Creación de facturas
- Gestión de items de venta
- Cálculo automático de impuestos

**Componentes**:
- `VentaList` - Lista de ventas
- `FacturaForm` - Formulario de facturación
- `ItemManager` - Gestión de items

### 3. Liquidaciones

**Características**:
- Lista de liquidaciones
- Creación y edición de liquidaciones
- Visualización de resumen de liquidaciones
- Exportación de reportes

**Componentes**:
- `LiquidacionList` - Lista de liquidaciones
- `LiquidacionForm` - Formulario de liquidación
- `LiquidacionSummary` - Resumen de liquidación

### 4. Movimientos

**Características**:
- Lista de movimientos
- Creación de transacciones
- Filtrado por tipo y fecha
- Visualización de gráficos

**Componentes**:
- `MovimientoList` - Lista de movimientos
- `MovimientoForm` - Formulario de movimiento
- `MovimientoChart` - Gráfico de movimientos

### 5. Productos

**Características**:
- Catálogo de productos
- Gestión de inventario
- Búsqueda y filtrado
- Control de stock

**Componentes**:
- `ProductoList` - Lista de productos
- `ProductoForm` - Formulario de producto
- `InventarioManager` - Gestión de inventario

### 6. Reportes y Análisis

**Características**:
- Gráficos de ventas
- Resúmenes financieros
- Reportes personalizables
- Exportación de datos

**Componentes**:
- `SalesChart` - Gráfico de ventas
- `FinancialSummary` - Resumen financiero
- `ReportGenerator` - Generador de reportes

## Arquitectura del Frontend

### 1. Estructura de Archivos

```
/frontend/src/
├── components/           # Componentes de UI reutilizables
│   ├── ui/              # Componentes de UI base
│   ├── clientes/        # Componentes relacionados con clientes
│   ├── ventas/          # Componentes relacionados con ventas
│   └── ...              # Otros componentes
├── hooks/                # Hooks personalizados
│   ├── useClientes.js    # Hook para clientes
│   ├── useVentas.js      # Hook para ventas
│   └── ...               # Otros hooks
├── pages/                # Páginas de la aplicación
│   ├── clientes/         # Páginas de clientes
│   ├── ventas/           # Páginas de ventas
│   ├── movimientos/      # Páginas de movimientos
│   ├── productos/        # Páginas de productos
│   └── ...               # Otras páginas
├── routes/               # Definición de rutas
├── services/             # Servicios de la API
├── stores/               # Zustand (si se usa)
├── styles/               # Archivos de estilos
└── utils/                # Utilidades
```

### 2. Patrones de Diseño

#### 1. Component Pattern

**Ubicación**: `frontend/src/components/`

**Propósito**: Componentes UI reutilizables y auto-contenidos

**Características**:
- Estilo funcional con hooks
- Propiedades TypeScript estrictas
- Documentación completa
- Pruebables de forma aislada

#### 2. Hook Pattern

**Ubicación**: `frontend/src/hooks/`

**Propósito**: Lógica reutilizable entre componentes

**Características**:
- Lógica de negocio extraída de componentes
- Estados compartidos
- Efectos secundarios (API calls, timers)
- Nombres descriptivos

#### 3. Query Pattern

**Ubicación**: TanStack Query

**Propósito**: Gestión de estado asíncrono

**Características**:
- Caché inteligente
- Sincronización optimista
- Estados de carga/error
- Invalidación de caché

#### 4. Route Pattern

**Ubicación**: `frontend/src/routes/`

**Propósito**: Definición de rutas de la aplicación

**Características**:
- Rutas protegidas
- Carga perezosa
- Manejo de errores
- Redirecciones

### 3. Gestión de Estado

#### 1. TanStack Query

**Propósito**: Gestión de estado asíncrono y caché

**Características**:
- Caché en memoria
- Sincronización optimista
- Estados de carga/error/refetch
- Devtools para depuración

**Ejemplo de Uso**:
```typescript
const { data: clientes, isLoading, error } = useQuery({
  queryKey: ['clientes'],
  queryFn: () => fetchClientes(),
  staleTime: 1000 * 60 * 5, // 5 minutos
});
```

#### 2. React Context (Opcional)

**Propósito**: Estado global para temas, UI y notificaciones

**Características**:
- Contexto de tema
- Gestor de notificaciones
- Estado de UI global

### 4. Manejo de Formularios

#### 1. Esquemas de Yup (Opcional)

**Propósito**: Validación de formularios

**Características**:
- Validación en tiempo real
- Mensajes de error traducibles
- Integración con React Hook Form

#### 2. React Hook Form

**Propósito**: Manejo eficiente de formularios

**Características**:
- Registro de esquemas mínimo
- Validación de esquemas en tiempo real
- Manejo de errores fácil
- Soporte para formularios complejos

### 5. Navegación

#### 1. React Router

**Propósito**: Navegación entre páginas

**Características**:
- Rutas anidadas
- Rutas protegidas
- Parámetros de ruta
- Redirecciones

**Ejemplo de Ruta**:
```typescript
<Route path="/clientes" element={<ClienteList />} />
<Route path="/clientes/:id" element={<ClienteDetail />} />
<Route path="/ventas" element={<VentaList />} />
```

### 6. Estilos

#### 1. Tailwind CSS

**Propósito**: Estilos utility-first

**Características**:
- Estilos consistentes
- Fácil personalización
- Menor CSS
- Diseño responsivo

#### 2. Ant Design

**Propósito**: Componentes UI profesionales

**Características**:
- Biblioteca completa de componentes
- Diseño consistente
- Accesibilidad incorporada
- Temas personalizables

### 7. Internacionalización

#### 1. i18next

**Propósito**: Soporte multi-idioma

**Características**:
- Traducciones lazy-loaded
- Interpolación de variables
- Detección automática de idioma
- Soporte para plurales

## Componentes Principales

### 1. Layout

**Componente**: `AppLayout`

**Características**:
- Barra de navegación
- Área de contenido
- Pie de página
- Manejo de errores

### 2. Navegación

**Componente**: `Sidebar`

**Características**:
- Navegación lateral
- Grupos de elementos de menú
- Indicadores de expansión/colapso
- Estados activos

### 3. Tarjetas

**Componente**: `StatCard`

**Características**:
- Visualización de métricas
- Indicadores de tendencia
- Colores consistentes
- Tooltips

### 4. Formularios

**Componente**: `FormField`

**Características**:
- Campos de entrada
- Validación en tiempo real
- Mensajes de error
- Estilos consistentes

### 5. Tablas

**Componente**: `DataTable`

**Características**:
- Ordenamiento y filtrado
- Paginación
- Carga perezosa
- Exportación de datos

### 6. Gráficos

**Componente**: `ChartWrapper`

**Características**:
- Gráficos responsivos
- Múltiples tipos de gráficos
- Personalización de temas
- Animaciones

## Servicios de la API

### 1. ClienteService

**Ubicación**: `frontend/src/services/clienteService.ts`

**Características**:
- CRUD de clientes
- Búsqueda de clientes
- Manejo de errores
- Transformación de datos

### 2. VentaService

**Ubicación**: `frontend/src/services/ventaService.ts`

**Características**:
- CRUD de ventas
- Cálculo de impuestos
- Gestión de items
- Procesamiento de pagos

### 3. MovimientoService

**Ubicación**: `frontend/src/services/movimientoService.ts`

**Características**:
- CRUD de movimientos
- Filtrado de movimientos
- Cálculo de saldos
- Exportación de datos

## Hooks Personalizados

### 1. useClientes

**Ubicación**: `frontend/src/hooks/useClientes.ts`

**Características**:
- Consulta de lista de clientes
- Búsqueda de clientes
- Estados de carga/error
- Mutaciones (crear, actualizar, eliminar)

### 2. useVentas

**Ubicación**: `frontend/src/hooks/useVentas.ts`

**Características**:
- Consulta de lista de ventas
- Creación de ventas
- Filtrado de ventas
- Estados de carga/error

### 3. useMovimientos

**Ubicación**: `frontend/src/hooks/useMovimientos.ts`

**Características**:
- Consulta de lista de movimientos
- Creación de movimientos
- Filtrado de movimientos
- Sincronización optimista

### 4. useDebounce

**Ubicación**: `frontend/src/hooks/useDebounce.ts`

**Características**:
- Búsqueda con debounce
- Filtrado con debounce
- Actualización de formularios con debounce

## Páginas Principales

### 1. Página de Clientes

**Ruta**: `/clientes`

**Características**:
- Lista de clientes con búsqueda
- Botón para agregar nuevo cliente
- Tabla con información de clientes
- Modal para crear/editar clientes

**Componentes**:
- `ClienteList` - Lista principal
- `ClienteModal` - Modal para formulario
- `ClienteFilters` - Filtros

### 2. Página de Ventas

**Ruta**: `/ventas`

**Características**:
- Lista de ventas con filtros
- Botón para crear nueva venta
- Tabla con información de ventas
- Modal para crear/editar ventas

**Componentes**:
- `VentaList` - Lista principal
- `VentaModal` - Modal para formulario
- `VentaFilters` - Filtros

### 3. Página de Movimientos

**Ruta**: `/movimientos`

**Características**:
- Lista de movimientos con filtros
- Botón para agregar nuevo movimiento
- Tabla con información de movimientos
- Gráfico de movimientos

**Componentes**:
- `MovimientoList` - Lista principal
- `MovimientoModal` - Modal para formulario
- `MovimientoChart` - Gráfico
- `MovimientoFilters` - Filtros

### 4. Página de Productos

**Ruta**: `/productos`

**Características**:
- Catálogo de productos
- Búsqueda y filtrado
- Gestión de inventario
- Botón para agregar nuevo producto

**Componentes**:
- `ProductoList` - Lista principal
- `ProductoModal` - Modal para formulario
- `InventarioManager` - Gestión de inventario
- `ProductoFilters` - Filtros

### 5. Página de Liquidaciones

**Ruta**: `/liquidaciones`

**Características**:
- Lista de liquidaciones
- Botón para crear nueva liquidación
- Resumen de liquidaciones
- Gráfico de liquidaciones

**Componentes**:
- `LiquidacionList` - Lista principal
- `LiquidacionModal` - Modal para formulario
- `LiquidacionSummary` - Resumen
- `LiquidacionChart` - Gráfico

## Configuración del Frontend

### 1. Archivo de Configuración

**Archivo**: `frontend/vite.config.ts`

**Características**:
- Configuración de servidor de desarrollo
- Configuración de empaquetado para producción
- Plugins (React, TypeScript, etc.)
- Optimización de recursos

### 2. Configuración de TypeScript

**Archivo**: `frontend/tsconfig.json`

**Características**:
- Configuración de paths
- Plugins de TypeScript
- Configuración de JSX

### 3. Archivo de Configuración de Tailwind

**Archivo**: `frontend/tailwind.config.js`

**Características**:
- Configuración de temas
- Configuración de breakpoints
- Configuración de colores

### 4. Archivo de Configuración de PostCSS

**Archivo**: `frontend/postcss.config.js`

**Características**:
- Configuración de prefijos de proveedor
- Configuración de source maps

## Scripts de Desarrollo

### 1. Desarrollo

```bash
pnpm dev
```

**Características**:
- Servidor de desarrollo en vite
- Actualización en tiempo real
- Inspección de React DevTools
- Modo de hot reload

### 2. Construcción

```bash
pnpm build
```

**Características**:
- Construcción optimizada para producción
- Minificación de recursos
- Dividir en chunks
- Generar archivos de manifest

### 3. Pruebas

```bash
pnpm test
```

**Características**:
- Ejecutar pruebas unitarias
- Ejecutar pruebas de integración
- Reportar cobertura

### 4. Linting

```bash
pnpm run lint
```

**Características**:
- ESLint con TypeScript
- Detección de problemas
- Reportar advertencias

### 5. TipoCheck

```bash
pnpm run typecheck
```

**Características**:
- Verificar tipos de TypeScript
- Detectar errores de tipado
- Reportar errores

## Configuración del Entorno

### 1. Variables de Entorno

**Archivo**: `.env.example`

```env
# API
VITE_API_URL=http://localhost:8000

# Autenticación
VITE_AUTH_TOKEN=tu-token-aqui

# Otros
VITE_APP_NAME=Caguayo
VITE_VERSION=1.0.0
```

### 2. Variables de Entorno de Producción

```env
VITE_API_URL=https://api.caguayo.com
VITE_APP_ENV=production
```

## Pruebas

### 1. Pruebas Unitarias

**Ubicación**: `frontend/src/__tests__/`

**Características**:
- Pruebas de componentes
- Pruebas de hooks
- Pruebas de utilidades
- Pruebas de servicios

### 2. Pruebas de Integración

**Ubicación**: `frontend/cypress/`

**Características**:
- Escenarios de usuario end-to-end
- Pruebas de flujo de trabajo
- Pruebas de autenticación
- Pruebas de formularios

### 3. Pruebas de Rendimiento

**Herramientas**:
- Lighthouse CI
- Web Vitals
- Bundle analyzer

## Despliegue

### 1. Construcción para Producción

```bash
pnpm build
```

### 2. Despliegue

```bash
# Subir a servidor
scp -r dist/* usuario@servidor:/ruta/del/proyecto/

# O usar un pipeline CI/CD
pnpm run deploy
```

### 3. Configuración del Servidor

**Configuración del servidor**:
- Servidor web (Nginx/Apache)
- SSL/TLS
- Balanceo de carga (si es necesario)
- Monitoreo

## Monitoreo y Observabilidad

### 1. Métricas

| Métrica | Descripción | Frecuencia |
|---------|-------------|------------|
| Rendimiento de página | Tiempo de carga, renderizado | Cada página |
| Errores de JavaScript | Errores de JS capturados | En tiempo real |
| Uso de API | Llamadas a la API | Cada minuto |
| Tamaño de la aplicación | Tamaño del bundle | Cada construcción |

### 2. Alertas

- **Errores de JavaScript**: Capturados por Sentry
- **Rendimiento de página**: Tiempo de carga > 3 segundos
- **Errores de API**: Errores 5xx
- **Tamaño de la aplicación**: Crecimiento > 10% mensual

## Conclusión

El frontend de Caguayo proporciona una interfaz de usuario moderna y eficiente para el sistema de gestión financiera. Características clave:

1. **Arquitectura Moderna**: React 18, TypeScript y Vite
2. **Experiencia de Usuario**: UI intuitiva y responsiva
3. **Rendimiento**: Caché inteligente y bundles optimizados
4. **Escalabilidad**: Arquitectura modular y escalable
5. **Mantenibilidad**: Código bien estructurado y documentado
6. **Pruebabilidad**: Componentes y hooks probables

El frontend está diseñado para:

- **Productividad**: Desarrollo rápido y eficiente
- **Calidad**: UI profesional y accesible
- **Escalabilidad**: Crecimiento con el negocio
- **Mantenibilidad**: Código fácil de entender y modificar
- **Seguridad**: Autenticación y autorización robustas

La combinación de React + TypeScript + Vite + Ant Design + TanStack Query proporciona un stack frontend moderno y equilibrado que maximiza la productividad del desarrollador mientras mantiene un código de alta calidad.