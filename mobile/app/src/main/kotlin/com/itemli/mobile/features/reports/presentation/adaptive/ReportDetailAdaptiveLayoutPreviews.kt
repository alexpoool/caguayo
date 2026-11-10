package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.itemli.mobile.features.reports.domain.entities.ReportColumn
import com.itemli.mobile.features.reports.domain.entities.ReportColumnAlign
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportFilter
import com.itemli.mobile.features.reports.domain.entities.ReportFilterType
import com.itemli.mobile.features.reports.domain.entities.ReportModule
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState

/**
 * Previews del detalle de reporte por breakpoint.
 */
private fun state(): ReportDetailUiState {
    val definition = ReportDefinition(
        id = "existencias",
        title = "Existencias",
        description = "Stock de productos por dependencia",
        module = ReportModule.Inventory,
        filters = listOf(ReportFilter("id_dependencia", "Dependencia", ReportFilterType.NUMBER)),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("cantidad", "Cantidad", ReportColumnAlign.Right),
            ReportColumn("dependencia", "Dependencia"),
        ),
        previewPath = "reportes/existencias/preview",
        pdfPath = "reportes/existencias",
    )
    return ReportDetailUiState(
        definition = definition,
        filters = mapOf("id_dependencia" to "1"),
        preview = null,
    )
}

@Preview(name = "Compact 360dp", widthDp = 360)
@Preview(name = "Medium 700dp", widthDp = 700)
@Preview(name = "Expanded 1000dp", widthDp = 1000)
@Composable
private fun ReportDetailAdaptiveLayoutPreview() {
    ReportDetailAdaptiveLayout(
        windowSizeClass = null,
        state = state(),
        onFilterChange = { _, _ -> },
        onRefresh = {},
    )
}
