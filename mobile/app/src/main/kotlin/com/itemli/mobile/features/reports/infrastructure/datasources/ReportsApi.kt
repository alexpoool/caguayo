package com.itemli.mobile.features.reports.infrastructure.datasources

import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API de reportes. Solo expone los endpoints reales usados hoy.
 */
interface ReportsApi {

    @GET("reportes/existencias/preview")
    suspend fun existenciasPreview(
        @Query("id_dependencia") dependenciaId: String,
    ): ExistenciasPreviewDto
}

@Serializable
data class ExistenciasPreviewDto(
    val items: List<ExistenciasRowDto> = emptyList(),
    val total_items: Int? = null,
    val total_cantidad: Double? = null,
)

@Serializable
data class ExistenciasRowDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val cantidad: Double? = null,
    val dependencia: String? = null,
)
