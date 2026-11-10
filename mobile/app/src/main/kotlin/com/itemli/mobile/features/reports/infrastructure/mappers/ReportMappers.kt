package com.itemli.mobile.features.reports.infrastructure.mappers

import com.itemli.mobile.features.reports.domain.entities.ReportColumn
import com.itemli.mobile.features.reports.domain.entities.ReportColumnAlign
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportFilter
import com.itemli.mobile.features.reports.domain.entities.ReportFilterType
import com.itemli.mobile.features.reports.domain.entities.ReportModule
import com.itemli.mobile.features.reports.infrastructure.datasources.ExistenciasPreviewDto

/**
 * Mapper del DTO de existencias al modelo genérico de preview.
 * Sirve para que la UI no conozca el contrato específico del backend.
 */
fun ExistenciasPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "nombre" to (item.nombre ?: ""),
        "cantidad" to (item.cantidad ?: 0),
        "dependencia" to (item.dependencia ?: ""),
    ) }

/**
 * Catálogo de reportes. Conforme a los endpoints reales del backend.
 */
@Suppress("unused")
object ReportCatalog {
    val existencias = ReportDefinition(
        id = "existencias",
        title = "Existencias",
        description = "Stock de productos por dependencia",
        module = ReportModule.Inventory,
        filters = listOf(
            ReportFilter(id = "id_dependencia", label = "Dependencia", type = ReportFilterType.NUMBER),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("cantidad", "Cantidad", align = ReportColumnAlign.Right),
            ReportColumn("dependencia", "Dependencia"),
        ),
        previewPath = "reportes/existencias/preview",
        pdfPath = "reportes/existencias",
    )
}
