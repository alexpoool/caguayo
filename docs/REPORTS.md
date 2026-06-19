# Documentación Completa de Reportes de Caguayo

## Descripción General

El sistema de reportes de Caguayo proporciona una plataforma completa para generar, visualizar y exportar informes financieros y operativos. El sistema está diseñado para satisfacer las necesidades de diferentes stakeholders, desde usuarios finales hasta analistas de negocio y auditores.

## Características Principales

### 1. Tipos de Reportes

#### 1.1 Reportes Financieros

**Características**:
- **Estado de Cuenta**: Detalle de transacciones por cliente
- **Reporte de Ventas**: Ventas por período, producto y cliente
- **Liquidaciones**: Resumen de liquidaciones por período
- **Flujo de Efectivo**: Entradas y salidas de efectivo
- **Balance General**: Activos, pasivos y patrimonio

**Componentes**:
- `FinancialReport` - Componente base para reportes financieros
- `AccountStatement` - Estado de cuenta detallado
- `SalesReport` - Reporte de ventas
- `LiquidationReport` - Reporte de liquidaciones
- `CashFlowReport` - Reporte de flujo de efectivo

#### 1.2 Reportes Operativos

**Características**:
- **Inventario**: Niveles de stock y movimientos
- **Movimientos**: Registro de transacciones
- **Clientes**: Información de clientes y actividad
- **Productos**: Catálogo y rendimiento
- **Dependencias**: Relaciones y conexiones

**Componentes**:
- `InventoryReport` - Reporte de inventario
- `TransactionReport` - Reporte de movimientos
- `CustomerReport` - Reporte de clientes
- `ProductReport` - Reporte de productos
- `DependencyReport` - Reporte de dependencias

#### 1.3 Reportes de Auditoría

**Características**:
- **Bitácora de Transacciones**: Registro completo de todas las transacciones
- **Historial de Cambios**: Cambios en datos maestros
- **Log de Accesos**: Registro de accesos a datos sensibles
- **Reporte de Cumplimiento**: Cumplimiento de regulaciones

**Componentes**:
- `AuditLogReport` - Bitácora de transacciones
- `ChangeHistoryReport` - Historial de cambios
- `AccessLogReport` - Log de accesos
- `ComplianceReport` - Reporte de cumplimiento

#### 1.4 Reportes Personalizados

**Características**:
- **Constructor de Reportes**: Creación de reportes personalizados
- **Filtros Avanzados**: Filtrado por múltiples criterios
- **Agregación Dinámica**: Cálculos personalizados
- **Programación**: Generación automática de reportes

**Componentes**:
- `ReportBuilder` - Constructor de reportes
- `CustomFilters` - Filtros avanzados
- `DynamicAggregation` - Agregación dinámica
- `ReportScheduler` - Programación de reportes

### 2. Funcionalidades de Reportes

#### 2.1 Generación de Reportes

**Características**:
- **Generación Instantánea**: Reportes en tiempo real
- **Búsqueda Previa**: Reportes con filtros predefinidos
- **Programación**: Generación automática programada
- **Solicitud Bajo Demanda**: Generación bajo solicitud del usuario

**Componentes**:
- `ReportGenerator` - Servicio principal de generación
- `InstantReport` - Generación instantánea
- `ScheduledReport` - Generación programada
- `OnDemandReport` - Generación bajo demanda

#### 2.2 Visualización de Reportes

**Características**:
- **Gráficos Interactivos**: Visualización gráfica de datos
- **Tablas Dinámicas**: Tablas con ordenamiento y filtrado
- **Mapas de Calor**: Visualización de datos con colores
- **Gráficos de Tendencia**: Análisis de tendencias

**Componentes**:
- `ChartReport` - Reportes con gráficos
- `TableReport` - Reportes con tablas
- `HeatmapReport` - Reportes con mapas de calor
- `TrendReport` - Reportes con tendencias

#### 2.3 Exportación de Reportes

**Características**:
- **Formatos Múltiples**: PDF, Excel, CSV, JSON, XML
- **Compresión Automática**: Compresión de archivos grandes
- **Programación de Exportación**: Exportación automática
- **Almacenamiento en la Nube**: Almacenamiento en servicios cloud

**Componentes**:
- `PDFExporter` - Exportador a PDF
- `ExcelExporter` - Exportador a Excel
- `CSVExporter` - Exportador a CSV
- `JSONExporter` - Exportador a JSON
- `XMLExporter` - Exportador a XML

#### 2.4 Almacenamiento de Reportes

**Características**:
- **Base de Datos**: Almacenamiento en base de datos
- **Sistema de Archivos**: Almacenamiento en archivos
- **Nube**: Almacenamiento en servicios cloud
- **Backup**: Copias de seguridad automáticas

**Componentes**:
- `DatabaseReportStorage` - Almacenamiento en base de datos
- `FileSystemReportStorage` - Almacenamiento en archivos
- `CloudReportStorage` - Almacenamiento en nube
- `BackupReportStorage` - Copias de seguridad

### 3. Configuración de Reportes

#### 3.1 Configuración de Plantillas

**Características**:
- **Plantillas Predefinidas**: Plantillas para diferentes tipos de reportes
- **Plantillas Personalizadas**: Creación de plantillas personalizadas
- **Herencia de Plantillas**: Plantillas base para extensiones
- **Versionado de Plantillas**: Control de versiones de plantillas

**Componentes**:
- `TemplateRegistry` - Registro de plantillas
- `PredefinedTemplates` - Plantillas predefinidas
- `CustomTemplate` - Plantillas personalizadas
- `TemplateInheritance` - Herencia de plantillas

#### 3.2 Configuración de Filtros

**Características**:
- **Filtros Predefinidos**: Filtros comunes para diferentes reportes
- **Filtros Personalizados**: Filtros específicos para reportes
- **Filtros Dinámicos**: Filtros generados automáticamente
- **Filtros Persistentes**: Filtros guardados para uso futuro

**Componentes**:
- `FilterRegistry` - Registro de filtros
- `PredefinedFilters` - Filtros predefinidos
- `CustomFilter` - Filtros personalizados
- `DynamicFilter` - Filtros dinámicos

#### 3.3 Configuración de Programación

**Características**:
- **Programación Diaria**: Reportes diarios
- **Programación Semanal**: Reportes semanales
- **Programación Mensual**: Reportes mensuales
- **Programación Personalizada**: Programación personalizada

**Componentes**:
- `Scheduler` - Programador principal
- `DailyScheduler` - Programador diario
- `WeeklyScheduler` - Programador semanal
- `MonthlyScheduler` - Programador mensual
- `CustomScheduler` - Programador personalizado

### 4. Generación de Reportes

#### 4.1 Pipeline de Generación

```
┌─────────────────────────────────────────────────────────┐
│                    Solicitud de Reporte                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Validación de Entrada                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Resolución de Plantilla                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Aplicación de Filtros                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Consulta a Base de Datos                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Procesamiento de Datos                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Aplicación de Formato                      │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Exportación de Archivo                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Almacenamiento de Reporte                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Notificación al Usuario                   │
└─────────────────────────────────────────────────────────┘
```

#### 4.2 Procesamiento de Datos

**Características**:
- **Consulta Optimizada**: Consultas de base de datos optimizadas
- **Cálculos Dinámicos**: Cálculos en tiempo real
- **Agregación**: Agregación de datos
- **Filtrado**: Filtrado de datos

**Componentes**:
- `QueryOptimizer` - Optimizador de consultas
- `DynamicCalculator` - Calculadora dinámica
- `DataAggregator` - Agregador de datos
- `DataFilter` - Filtrador de datos

#### 4.3 Formato de Salida

**Características**:
- **PDF**: Formato de documento portable
- **Excel**: Formato de hoja de cálculo
- **CSV**: Formato de valores separados por comas
- **JSON**: Formato de intercambio de datos
- **XML**: Formato de marcado extensible

**Componentes**:
- `PDFFormatter` - Formateador PDF
- `ExcelFormatter` - Formateador Excel
- `CSVFormatter` - Formateador CSV
- `JSONFormatter` - Formateador JSON
- `XMLFormatter` - Formateador XML

### 5. Exportación de Reportes

#### 5.1 Exportación a PDF

**Características**:
- **Diseño Responsivo**: Diseño que se adapta a diferentes dispositivos
- **Gráficos de Alta Calidad**: Gráficos con alta resolución
- **Tablas Formateadas**: Tablas con formato adecuado
- **Encabezados/Pies de Página**: Información adicional en cada página

**Componentes**:
- `PDFGenerator` - Generador de PDF
- `PDFLayout` - Diseño de PDF
- `PDFTable` - Tabla PDF
- `PDFChart` - Gráfico PDF

#### 5.2 Exportación a Excel

**Características**:
- **Múltiples Hojas**: Datos en múltiples hojas
- **Formatos**: Formato condicional y personalizado
- **Gráficos**: Gráficos integrados
- **Datos Dinámicos**: Datos que se actualizan automáticamente

**Componentes**:
- `ExcelGenerator` - Generador de Excel
- `ExcelWorksheet` - Hoja de cálculo
- `ExcelChart` - Gráfico Excel
- `ExcelFormat` - Formato Excel

#### 5.3 Exportación a CSV

**Características**:
- **Separadores Personalizables**: Separadores personalizados
- **Codificación de Caracteres**: Soporte para diferentes codificaciones
- **Compresión**: Compresión de archivos grandes
- **División de Archivos**: División de archivos grandes

**Componentes**:
- `CSVGenerator` - Generador de CSV
- `CSVWriter` - Escritor de CSV
- `CSVCompressor` - Compresor de CSV
- `CSVSplitter` - Divisor de CSV

#### 5.4 Exportación a JSON

**Características**:
- **Estructura Jerárquica**: Datos en estructura jerárquica
- **Schema Validation**: Validación de esquema
- **Compacidad**: Formato compacto
- **Interoperabilidad**: Interoperabilidad con otras aplicaciones

**Componentes**:
- `JSONGenerator` - Generador de JSON
- `JSONSchema` - Esquema JSON
- `JSONValidator` - Validador JSON

#### 5.5 Exportación a XML

**Características**:
- **Estructura Jerárquica**: Datos en estructura XML
- **Namespaces**: Soporte para namespaces
- **Validación DTD**: Validación DTD
- **Transformación XSLT**: Transformación XSLT

**Componentes**:
- `XMLGenerator` - Generador de XML
- `XMLNamespace` - Namespace XML
- `XMLDTD` - DTD XML
- `XSLTTransformer` - Transformador XSLT

### 6. Programación de Reportes

#### 6.1 Programación Diaria

**Características**:
- **Reporte Diario**: Reporte de actividad diaria
- **Reporte de Cierre**: Reporte de cierre diario
- **Reporte de Resumen**: Resumen diario

**Componentes**:
- `DailyReport` - Reporte diario
- `DailyClosingReport` - Reporte de cierre diario
- `DailySummaryReport` - Reporte de resumen diario

#### 6.2 Programación Semanal

**Características**:
- **Reporte Semanal**: Reporte de actividad semanal
- **Reporte de Tendencias**: Análisis de tendencias semanales
- **Reporte Comparativo**: Comparación semanal

**Componentes**:
- `WeeklyReport` - Reporte semanal
- `WeeklyTrendReport` - Reporte de tendencias semanal
- `WeeklyComparisonReport` - Reporte comparativo semanal

#### 6.3 Programación Mensual

**Características**:
- **Reporte Mensual**: Reporte de actividad mensual
- **Reporte de Resumen**: Resumen mensual
- **Reporte Anual**: Reporte de actividad anual

**Componentes**:
- `MonthlyReport` - Reporte mensual
- `MonthlySummaryReport` - Reporte de resumen mensual
- `AnnualReport` - Reporte anual

#### 6.4 Programación Personalizada

**Características**:
- **Programación por Fechas**: Programación por fechas específicas
- **Programación por Eventos**: Programación por eventos
- **Programación por Condiciones**: Programación por condiciones

**Componentes**:
- `CustomScheduler` - Programador personalizado
- `DateBasedScheduler` - Programador por fechas
- `EventBasedScheduler` - Programador por eventos
- `ConditionBasedScheduler` - Programador por condiciones

### 7. Almacenamiento de Reportes

#### 7.1 Almacenamiento en Base de Datos

**Características**:
- **Almacenamiento Relacional**: Almacenamiento en base de datos relacional
- **Consultas Rápidas**: Consultas rápidas en base de datos
- **Backup Automático**: Backup automático
- **Recuperación**: Recuperación de datos

**Componentes**:
- `DatabaseReportStorage` - Almacenamiento en base de datos
- `ReportMetadata` - Metadatos de reporte
- `ReportContent` - Contenido de reporte
- `ReportBackup` - Backup de reporte

#### 7.2 Almacenamiento en Sistema de Archivos

**Características**:
- **Almacenamiento Local**: Almacenamiento en sistema de archivos local
- **Organización de Archivos**: Organización de archivos
- **Compresión**: Compresión de archivos
- **Indexación**: Indexación de archivos

**Componentes**:
- `FileSystemStorage` - Almacenamiento en sistema de archivos
- `FileOrganizer` - Organizador de archivos
- `FileCompressor` - Compresor de archivos
- `FileIndexer` - Indexador de archivos

#### 7.3 Almacenamiento en Nube

**Características**:
- **Amazon S3**: Almacenamiento en Amazon S3
- **Google Cloud Storage**: Almacenamiento en Google Cloud
- **Azure Blob Storage**: Almacenamiento en Azure
- **Multi-Cloud**: Soporte para múltiples nubes

**Componentes**:
- `S3Storage` - Almacenamiento en S3
- `GCSStorage` - Almacenamiento en GCS
- `AzureStorage` - Almacenamiento en Azure
- `MultiCloudStorage` - Almacenamiento multi-cloud

#### 7.4 Backup de Reportes

**Características**:
- **Backup Diario**: Backup diario
- **Backup Semanal**: Backup semanal
- **Backup Mensual**: Backup mensual
- **Backup Anual**: Backup anual

**Componentes**:
- `DailyBackup` - Backup diario
- `WeeklyBackup` - Backup semanal
- `MonthlyBackup` - Backup mensual
- `AnnualBackup` - Backup anual

### 8. Seguridad de Reportes

#### 8.1 Control de Acceso

**Características**:
- **Control de Acceso Basado en Roles**: Control de acceso basado en roles
- **Control de Acceso Basado en Permisos**: Control de acceso basado en permisos
- **Control de Acceso Basado en Atributos**: Control de acceso basado en atributos
- **Auditoría de Acceso**: Auditoría de acceso

**Componentes**:
- `RoleBasedAccessControl` - Control de acceso basado en roles
- `PermissionBasedAccessControl` - Control de acceso basado en permisos
- `AttributeBasedAccessControl` - Control de acceso basado en atributos
- `AccessAudit` - Auditoría de acceso

#### 8.2 Cifrado de Reportes

**Características**:
- **Cifrado en Reposo**: Cifrado de datos en reposo
- **Cifrado en Tránsito**: Cifrado de datos en tránsito
- **Cifrado de Archivo**: Cifrado de archivos individuales
- **Cifrado de Base de Datos**: Cifrado de base de datos

**Componentes**:
- `AtRestEncryption` - Cifrado en reposo
- `InTransitEncryption` - Cifrado en tránsito
- `FileEncryption` - Cifrado de archivos
- `DatabaseEncryption` - Cifrado de base de datos

#### 8.3 Auditoría de Reportes

**Características**:
- **Registro de Accesos**: Registro de accesos a reportes
- **Registro de Cambios**: Registro de cambios en reportes
- **Registro de Exportaciones**: Registro de exportaciones
- **Registro de Programaciones**: Registro de programaciones

**Componentes**:
- `AccessLog` - Registro de accesos
- `ChangeLog` - Registro de cambios
- `ExportLog` - Registro de exportaciones
- `ScheduleLog` - Registro de programaciones

### 9. Monitoreo de Reportes

#### 9.1 Métricas de Reportes

**Características**:
- **Tiempo de Generación**: Tiempo de generación de reportes
- **Tamaño de Archivo**: Tamaño de archivos de reporte
- **Frecuencia de Uso**: Frecuencia de uso de reportes
- **Tasa de Error**: Tasa de error de reportes

**Componentes**:
- `GenerationTimeMetric` - Métrica de tiempo de generación
- `FileSizeMetric` - Métrica de tamaño de archivo
- `UsageFrequencyMetric` - Métrica de frecuencia de uso
- `ErrorRateMetric` - Métrica de tasa de error

#### 9.2 Alertas de Reportes

**Características**:
- **Alertas de Tiempo**: Alertas por tiempo de generación lento
- **Alertas de Tamaño**: Alertas por tamaño de archivo grande
- **Alertas de Error**: Alertas por errores de generación
- **Alertas de Uso**: Alertas por uso inusual

**Componentes**:
- `TimeAlert` - Alerta por tiempo
- `SizeAlert` - Alerta por tamaño
- `ErrorAlert` - Alerta por error
- `UsageAlert` - Alerta por uso

#### 9.3 Análisis de Reportes

**Características**:
- **Análisis de Patrones**: Análisis de patrones de uso
- **Análisis de Tendencias**: Análisis de tendencias
- **Análisis de Rendimiento**: Análisis de rendimiento
- **Análisis de Calidad**: Análisis de calidad

**Componentes**:
- `PatternAnalysis` - Análisis de patrones
- `TrendAnalysis` - Análisis de tendencias
- `PerformanceAnalysis` - Análisis de rendimiento
- `QualityAnalysis` - Análisis de calidad

## Arquitectura del Sistema de Reportes

### 1. Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────┐
│                    Capa de Presentación                │
│  - Componentes de UI para reportes                      │
│  - Constructores de reportes                            │
│  - Exportadores de reportes                             │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Aplicación                    │
│  - Servicios de reportes                                 │
│  - Programadores de reportes                            │
│  - Almacenadores de reportes                            │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Datos                         │
│  - Almacenamiento de reportes                            │
│  - Base de datos de reportes                            │
│  - Sistemas de archivos de reportes                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Infraestructura                │
│  - Monitoreo de reportes                                │
│  - Alertas de reportes                                  │
│  - Auditoría de reportes                                │
└─────────────────────────────────────────────────────────┘
```

### 2. Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                    Solicitud de Reporte                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Validación de Entrada                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Resolución de Plantilla                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Aplicación de Filtros                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Consulta a Base de Datos                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Procesamiento de Datos                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Aplicación de Formato                      │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Exportación de Archivo                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Almacenamiento de Reporte                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Notificación al Usuario                   │
└─────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. ReportGenerator

**Ubicación**: `frontend/src/services/reportGenerator.ts`

**Características**:
- Generación de reportes
- Validación de entrada
- Resolución de plantillas
- Aplicación de filtros

**Métodos**:
- `generateReport(reportType: string, options: ReportOptions): Promise<Report>`
- `validateInput(input: any): boolean`
- `applyTemplate(template: string, data: any): string`
- `applyFilters(filters: Filter[], data: any): any[]

### 2. ReportExporter

**Ubicación**: `frontend/src/services/reportExporter.ts`

**Características**:
- Exportación de reportes
- Soporte para múltiples formatos
- Compresión de archivos
- División de archivos

**Métodos**:
- `exportToPDF(report: Report): Promise<Blob>`
- `exportToExcel(report: Report): Promise<Blob>`
- `exportToCSV(report: Report): Promise<Blob>`
- `exportToJSON(report: Report): Promise<Blob>`
- `exportToXML(report: Report): Promise<Blob>`

### 3. ReportScheduler

**Ubicación**: `frontend/src/services/reportScheduler.ts`

**Características**:
- Programación de reportes
- Soporte para múltiples programaciones
- Alertas de programación
- Monitoreo de programación

**Métodos**:
- `scheduleReport(reportType: string, schedule: Schedule): Promise<ScheduledReport>`
- `cancelSchedule(scheduleId: string): Promise<boolean>`
- `getScheduledReports(): Promise<ScheduledReport[]>`

### 4. ReportStorage

**Ubicación**: `frontend/src/services/reportStorage.ts`

**Características**:
- Almacenamiento de reportes
- Soporte para múltiples almacenamientos
- Backup de reportes
- Recuperación de reportes

**Métodos**:
- `storeReport(report: Report): Promise<string>`
- `retrieveReport(reportId: string): Promise<Report>`
- `deleteReport(reportId: string): Promise<boolean>`
- `backupReport(reportId: string): Promise<string>`

### 5. ReportMonitor

**Ubicación**: `frontend/src/services/reportMonitor.ts`

**Características**:
- Monitoreo de reportes
- Métricas de reportes
- Alertas de reportes
- Análisis de reportes

**Métodos**:
- `getGenerationTime(reportId: string): Promise<number>`
- `getFileSize(reportId: string): Promise<number>`
- `getUsageFrequency(reportId: string): Promise<number>`
- `getErrorRate(reportId: string): Promise<number>`

## Configuración de Reportes

### 1. Configuración de Plantillas

**Archivo**: `config/report-templates.json`

```json
{
  "templates": {
    "financial_report": {
      "name": "Reporte Financiero",
      "description": "Reporte de estado financiero",
      "path": "templates/financial_report.html",
      "format": "pdf",
      "fields": ["fecha_inicio", "fecha_fin", "cliente_id"]
    },
    "sales_report": {
      "name": "Reporte de Ventas",
      "description": "Reporte de ventas por período",
      "path": "templates/sales_report.html",
      "format": "excel",
      "fields": ["fecha_inicio", "fecha_fin", "producto_id", "categoria_id"]
    },
    "inventory_report": {
      "name": "Reporte de Inventario",
      "description": "Reporte de niveles de inventario",
      "path": "templates/inventory_report.html",
      "format": "csv",
      "fields": ["fecha_inicio", "fecha_fin", "producto_id", "stock_minimo"]
    }
  }
}
```

### 2. Configuración de Filtros

**Archivo**: `config/report-filters.json`

```json
{
  "filters": {
    "date_range": {
      "name": "Rango de Fechas",
      "type": "date_range",
      "fields": ["fecha_inicio", "fecha_fin"]
    },
    "client": {
      "name": "Cliente",
      "type": "dropdown",
      "fields": ["cliente_id"],
      "options": "api/clients"
    },
    "product": {
      "name": "Producto",
      "type": "dropdown",
      "fields": ["producto_id"],
      "options": "api/products"
    },
    "category": {
      "name": "Categoría",
      "type": "dropdown",
      "fields": ["categoria_id"],
      "options": "api/categories"
    }
  }
}
```

### 3. Configuración de Programación

**Archivo**: `config/report-schedules.json`

```json
{
  "schedules": {
    "daily_financial": {
      "name": "Reporte Financiero Diario",
      "type": "daily",
      "time": "09:00",
      "recipients": ["finance@company.com"],
      "template": "financial_report",
      "filters": {"fecha_inicio": "yesterday", "fecha_fin": "today"}
    },
    "weekly_sales": {
      "name": "Reporte de Ventas Semanal",
      "type": "weekly",
      "day": "monday",
      "time": "10:00",
      "recipients": ["sales@company.com"],
      "template": "sales_report",
      "filters": {"fecha_inicio": "last_monday", "fecha_fin": "sunday"}
    },
    "monthly_inventory": {
      "name": "Reporte de Inventario Mensual",
      "type": "monthly",
      "day": "1",
      "time": "08:00",
      "recipients": ["inventory@company.com"],
      "template": "inventory_report",
      "filters": {"fecha_inicio": "first_day_last_month", "fecha_fin": "last_day_last_month"}
    }
  }
}
```

## Ejemplos de Reportes

### 1. Reporte Financiero Diario

**Solicitud**:
```http
GET /reports/financial/daily?fecha_inicio=2024-01-01&fecha_fin=2024-01-01 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "financial_daily",
  "name": "Reporte Financiero Diario - 2024-01-01",
  "generated_at": "2024-01-01T09:00:00Z",
  "format": "pdf",
  "size": 1024000,
  "url": "https://storage.company.com/reports/550e8400-e29b-41d4-a716-446655440000.pdf",
  "recipients": ["finance@company.com"],
  "status": "completed",
  "metrics": {
    "generation_time": 2.5,
    "file_size": 1024000,
    "records_count": 150
  }
}
```

### 2. Reporte de Ventas Semanal

**Solicitud**:
```http
GET /reports/sales/weekly?fecha_inicio=2024-01-01&fecha_fin=2024-01-07 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "sales_weekly",
  "name": "Reporte de Ventas Semanal - 2024-01-01 a 2024-01-07",
  "generated_at": "2024-01-08T10:00:00Z",
  "format": "excel",
  "size": 2048000,
  "url": "https://storage.company.com/reports/550e8400-e29b-41d4-a716-446655440000.xlsx",
  "recipients": ["sales@company.com"],
  "status": "completed",
  "metrics": {
    "generation_time": 5.2,
    "file_size": 2048000,
    "records_count": 500,
    "total_sales": 150000.00,
    "average_sale": 300.00
  }
}
```

### 3. Reporte de Inventario Mensual

**Solicitud**:
```http
GET /reports/inventory/monthly?fecha_inicio=2024-01-01&fecha_fin=2024-01-31 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "inventory_monthly",
  "name": "Reporte de Inventario Mensual - 2024-01",
  "generated_at": "2024-02-01T08:00:00Z",
  "format": "csv",
  "size": 512000,
  "url": "https://storage.company.com/reports/550e8400-e29b-41d4-a716-446655440000.csv",
  "recipients": ["inventory@company.com"],
  "status": "completed",
  "metrics": {
    "generation_time": 1.8,
    "file_size": 512000,
    "records_count": 200,
    "total_products": 100,
    "low_stock_products": 15,
    "out_of_stock_products": 5
  }
}
```

## Conclusión

El sistema de reportes de Caguayo proporciona una plataforma completa y flexible para generar, visualizar y exportar informes financieros y operativos. Características clave:

1. **Tipos de Reportes**: Financieros, operativos, de auditoría y personalizados
2. **Funcionalidades**: Generación, visualización, exportación y almacenamiento
3. **Configuración**: Plantillas, filtros y programación personalizables
4. **Seguridad**: Control de acceso, cifrado y auditoría
5. **Monitoreo**: Métricas, alertas y análisis

El sistema está diseñado para:

- **Productividad**: Generación rápida y automatizada de reportes
- **Precisión**: Datos financieros y operativos precisos
- **Seguridad**: Protección de datos sensibles
- **Escalabilidad**: Soporte para grandes volúmenes de datos
- **Conformidad**: Cumplimiento de regulaciones y auditorías

El sistema de reportes es una herramienta esencial para la toma de decisiones, el cumplimiento regulatorio y la transparencia en el sistema de gestión financiera de Caguayo.