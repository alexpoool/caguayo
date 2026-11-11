package com.itemli.mobile.features.reports.infrastructure.repositories

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.features.reports.infrastructure.datasources.ReportsApi
import com.itemli.mobile.features.reports.infrastructure.mappers.ReportCatalog
import com.itemli.mobile.features.reports.infrastructure.mappers.toRows
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import java.io.IOException

/**
 * Repositorio real de reportes. Soporta hoy `existencias`; los demás reportes
 * quedan marcados como pendientes hasta conectar sus endpoints.
 */
class ReportsRepositoryImpl(
    private val apiClient: ApiClient,
) : ReportsRepository {

    override suspend fun catalog(): AppResult<List<ReportDefinition>> =
        AppResult.Success(listOf(ReportCatalog.existencias))

    override suspend fun preview(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ReportPreview> {
        val result = runCatching {
            when (definition.id) {
                ReportCatalog.existencias.id -> {
                    val api = apiClient.createService(ReportsApi::class.java)
                    val dto = api.existenciasPreview(filters["id_dependencia"] ?: "")
                    ReportPreview(
                        rows = dto.toRows(definition),
                        totals = mapOf(
                            "total_items" to (dto.total_items ?: 0),
                            "total_cantidad" to (dto.total_cantidad ?: 0.0),
                        ),
                    )
                }
                else -> throw NotImplementedError("Reporte ${definition.id} sin endpoint conectado")
            }
        }
        return if (result.isSuccess) {
            AppResult.Success(result.getOrThrow())
        } else {
            AppResult.Failure(result.exceptionOrNull() ?: IOException("preview"))
        }
    }

    override suspend fun pdf(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ByteArray> {
        val result = runCatching {
            if (definition.pdfPath.isBlank()) throw IOException("PDF no disponible")
            // TODO: conectar el endpoint de PDF con el cliente real.
            byteArrayOf()
        }
        return if (result.isSuccess) {
            AppResult.Success(result.getOrThrow())
        } else {
            AppResult.Failure(result.exceptionOrNull() ?: IOException("pdf"))
        }
    }
}
