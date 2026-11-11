package com.itemli.mobile.features.reports.application.usecases

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.shared.domain.AppResult

/**
 * Devuelve el catálogo de reportes. Base de la Home adaptativa.
 */
class GetReportsCatalogUseCase(
    private val repository: ReportsRepository,
) {
    suspend operator fun invoke(): AppResult<List<ReportDefinition>> = repository.catalog()
}

/**
 * Obtiene el preview de un reporte según sus filtros.
 */
class GetReportPreviewUseCase(
    private val repository: ReportsRepository,
) {
    suspend operator fun invoke(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ReportPreview> = repository.preview(definition, filters)
}

/**
 * Descarga el PDF de un reporte con los filtros aplicados.
 */
class DownloadReportPdfUseCase(
    private val repository: ReportsRepository,
) {
    suspend operator fun invoke(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ByteArray> = repository.pdf(definition, filters)
}
