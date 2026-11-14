package com.itemli.mobile.features.reports.infrastructure.storage

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import androidx.core.content.FileProvider
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Guarda los PDF descargados:
 * - Por defecto en el almacén privado de la app (`cacheDir/pdf/`, expuesto
 *   por el FileProvider en `@xml/file_paths`).
 * - O en la carpeta externa que el usuario eligió en Ajustes (SAF tree URI),
 *   visible con el explorador de archivos del teléfono.
 * En ambos casos genera el URI para abrirlos con ACTION_VIEW.
 */
class ReportPdfStorage(private val context: Context) {

    /** Guarda en la carpeta interna y devuelve el URI abrible con ACTION_VIEW. */
    suspend fun save(bytes: ByteArray, fileName: String): Uri = withContext(Dispatchers.IO) {
        val dir = File(context.cacheDir, PDF_DIR).apply { mkdirs() }
        openUri(File(dir, sanitize(fileName)).apply { writeBytes(bytes) })
    }

    /**
     * Guarda en la carpeta elegida por el usuario (tree URI de SAF) y devuelve
     * el content:// del documento creado. Devuelve null si la carpeta ya no es
     * accesible (se revocó el permiso, se borró, etc.) para que el llamador
     * caiga en la carpeta interna.
     */
    suspend fun saveExternal(bytes: ByteArray, fileName: String, treeUri: Uri): Uri? =
        withContext(Dispatchers.IO) {
            runCatching {
                val resolver = context.contentResolver
                val rootDoc = DocumentsContract.buildDocumentUriUsingTree(
                    treeUri,
                    DocumentsContract.getTreeDocumentId(treeUri),
                )
                val doc = DocumentsContract.createDocument(
                    resolver,
                    rootDoc,
                    MIME_PDF,
                    sanitize(fileName),
                ) ?: return@runCatching null
                resolver.openOutputStream(doc)?.use { out ->
                    out.write(bytes)
                    out.flush()
                } ?: return@runCatching null
                doc
            }.getOrNull()
        }

    /** URI abrible con ACTION_VIEW para un archivo de la carpeta interna. */
    fun openUri(file: File): Uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )

    /** Nombre visible de la carpeta elegida, para mostrarla en Ajustes. */
    suspend fun folderName(treeUri: String?): String? = withContext(Dispatchers.IO) {
        if (treeUri.isNullOrBlank()) return@withContext null
        runCatching {
            val uri = Uri.parse(treeUri)
            val docUri = DocumentsContract.buildDocumentUriUsingTree(
                uri,
                DocumentsContract.getTreeDocumentId(uri),
            )
            context.contentResolver.query(
                docUri,
                arrayOf(android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME),
                null,
                null,
                null,
            )?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
        }.getOrNull()
    }

    private fun sanitize(fileName: String): String =
        fileName.replace(Regex("[^A-Za-z0-9._-]"), "_")

    private companion object {
        const val PDF_DIR = "pdf"
        const val MIME_PDF = "application/pdf"
    }
}
