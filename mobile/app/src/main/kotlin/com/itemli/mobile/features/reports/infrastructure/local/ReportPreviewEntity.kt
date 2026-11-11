package com.itemli.mobile.features.reports.infrastructure.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Fila de caché del preview de un reporte. Las filas y los totales se guardan
 * como JSON (kotlinx.serialization) en campos String.
 */
@Entity(tableName = "report_previews")
data class ReportPreviewEntity(
    /** Clave de caché: id del reporte + filtros aplicados. */
    @PrimaryKey val cacheKey: String,
    val reportId: String,
    val rowsJson: String,
    val totalsJson: String,
    val createdAt: Long,
)
