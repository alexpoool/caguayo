package com.itemli.mobile.features.reports.infrastructure.storage

import android.content.Context
import androidx.core.content.FileProvider
import java.io.File

/**
 * Guarda los PDF descargados en almacenamiento específico de la app
 * (`cacheDir/pdf/`, expuesto por el FileProvider en `@xml/file_paths`)
 * y genera el `content://` URI para abrirlos con ACTION_VIEW.
 */
class ReportPdfStorage(private val context: Context) {

    fun save(bytes: ByteArray, fileName: String): File {
        val dir = File(context.cacheDir, PDF_DIR).apply { mkdirs() }
        return File(dir, sanitize(fileName)).apply { writeBytes(bytes) }
    }

    fun openUri(file: File): android.net.Uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )

    private fun sanitize(fileName: String): String =
        fileName.replace(Regex("[^A-Za-z0-9._-]"), "_")

    private companion object {
        const val PDF_DIR = "pdf"
    }
}
