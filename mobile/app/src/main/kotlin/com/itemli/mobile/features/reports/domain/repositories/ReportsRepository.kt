package com.itemli.mobile.features.reports.domain.repositories

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.shared.domain.AppResult

/**
 * Interfaz de repositorio de reportes.
 */
interface ReportsRepository {
    suspend fun catalog(): AppResult<List<ReportDefinition>>
    suspend fun preview(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ReportPreview>
    suspend fun pdf(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ByteArray>
}
