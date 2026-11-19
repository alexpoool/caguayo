package com.itemli.mobile.features.reports.infrastructure.storage

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import androidx.core.content.FileProvider
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class DownloadedReport(
    val fileName: String,
    val displayName: String,
    val uri: Uri,
    val downloadedAt: Long,
    val sizeBytes: Long,
)

class ReportPdfStorage(private val context: Context) {
    private val historyDir: File get() = File(context.filesDir, HISTORY_DIR).apply { mkdirs() }

    /** Guarda siempre una copia privada permanente para que Historial no dependa de SAF ni cache. */
    suspend fun save(bytes: ByteArray, fileName: String): Uri = withContext(Dispatchers.IO) {
        val target = uniqueFile(fileName)
        target.writeBytes(bytes)
        openUri(target)
    }

    suspend fun saveExternal(bytes: ByteArray, fileName: String, treeUri: Uri): Uri? =
        withContext(Dispatchers.IO) {
            runCatching {
                val resolver = context.contentResolver
                val rootDoc = DocumentsContract.buildDocumentUriUsingTree(
                    treeUri, DocumentsContract.getTreeDocumentId(treeUri),
                )
                val doc = DocumentsContract.createDocument(
                    resolver, rootDoc, MIME_PDF, uniqueName(fileName),
                ) ?: return@runCatching null
                resolver.openOutputStream(doc)?.use { it.write(bytes); it.flush() }
                    ?: return@runCatching null
                doc
            }.getOrNull()
        }

    suspend fun saveToHistory(bytes: ByteArray, fileName: String): Uri =
        withContext(Dispatchers.IO) {
            val target = uniqueFile(fileName)
            target.writeBytes(bytes)
            openUri(target)
        }

    suspend fun listDownloads(): List<DownloadedReport> = withContext(Dispatchers.IO) {
        historyDir.listFiles { file -> file.isFile && file.extension.equals("pdf", true) }
            .orEmpty()
            .sortedByDescending { it.lastModified() }
            .map { file ->
                DownloadedReport(
                    fileName = file.name,
                    displayName = file.nameWithoutExtension.replace('_', ' '),
                    uri = openUri(file),
                    downloadedAt = file.lastModified(),
                    sizeBytes = file.length(),
                )
            }
    }

    suspend fun delete(fileName: String): Boolean = withContext(Dispatchers.IO) {
        File(historyDir, fileName).takeIf { it.parentFile == historyDir }?.delete() ?: false
    }

    fun openUri(file: File): Uri = FileProvider.getUriForFile(
        context, "${context.packageName}.fileprovider", file,
    )

    suspend fun folderName(treeUri: String?): String? = withContext(Dispatchers.IO) {
        if (treeUri.isNullOrBlank()) return@withContext null
        runCatching {
            val uri = Uri.parse(treeUri)
            val docUri = DocumentsContract.buildDocumentUriUsingTree(
                uri, DocumentsContract.getTreeDocumentId(uri),
            )
            context.contentResolver.query(
                docUri, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME),
                null, null, null,
            )?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
        }.getOrNull()
    }

    private fun uniqueFile(name: String): File {
        val safe = sanitize(name).removeSuffix(".pdf")
        var candidate = File(historyDir, "${safe}.pdf")
        var suffix = 1
        while (candidate.exists()) {
            candidate = File(historyDir, "${safe}_${System.currentTimeMillis()}_${suffix++}.pdf")
        }
        return candidate
    }

    private fun uniqueName(name: String): String = "${System.currentTimeMillis()}_${sanitize(name)}"
    private fun sanitize(name: String) = name.replace(Regex("[^A-Za-z0-9._-]"), "_")

    private companion object {
        const val HISTORY_DIR = "reports"
        const val MIME_PDF = "application/pdf"
    }
}
