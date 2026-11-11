package com.itemli.mobile.features.reports.domain.entities

/**
 * Modelos de la feature reports. No saben nada de Android ni HTTP.
 */
enum class ReportModule(val id: String, val label: String) {
    Inventory("inventario", "Inventario"),
    Store("tienda", "Tienda"),
    Buy("compra", "Compra"),
    Projects("proyectos", "Proyectos"),
    Ministries("ministerios", "Ministerios"),
}

enum class ReportFilterType { NUMBER, TEXT, DATE }
enum class ReportColumnAlign { Left, Right }

data class ReportFilter(
    val id: String,
    val label: String,
    val type: ReportFilterType = ReportFilterType.TEXT,
    /** Los filtros opcionales pueden dejarse vacíos (no se envían al backend). */
    val required: Boolean = true,
)

data class ReportColumn(
    val key: String,
    val label: String,
    val align: ReportColumnAlign = ReportColumnAlign.Left,
)

data class ReportDefinition(
    val id: String,
    val title: String,
    val description: String,
    val module: ReportModule,
    val filters: List<ReportFilter>,
    val columns: List<ReportColumn>,
    val previewPath: String,
    val pdfPath: String,
)

/**
 * Resultado de un reporte inline. Filas genéricas que la UI pinta por definición.
 */
data class ReportPreview(
    val rows: List<Map<String, Any?>>,
    val totals: Map<String, Any?>,
)
