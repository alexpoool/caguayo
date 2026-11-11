package com.itemli.mobile.features.reports.infrastructure.local

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Base de datos local de la app. Hoy solo cachea previews de reportes;
 * nuevas entidades se agregan aquí.
 */
@Database(
    entities = [ReportPreviewEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class ItemliDatabase : RoomDatabase() {
    abstract fun reportPreviewDao(): ReportPreviewDao

    companion object {
        const val NAME = "itemli.db"
    }
}
