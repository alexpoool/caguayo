package com.itemli.mobile.features.reports.infrastructure.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert

/**
 * DAO de la caché de previews. Solo Room la implementa; los tests usan fakes.
 */
@Dao
interface ReportPreviewDao {

    @Query("SELECT * FROM report_previews WHERE cacheKey = :cacheKey LIMIT 1")
    suspend fun get(cacheKey: String): ReportPreviewEntity?

    @Upsert
    suspend fun upsert(entity: ReportPreviewEntity)

    @Query("DELETE FROM report_previews WHERE reportId = :reportId")
    suspend fun deleteByReport(reportId: String)

    @Query("DELETE FROM report_previews")
    suspend fun clear()
}
