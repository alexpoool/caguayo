package com.itemli.mobile.features.reports.presentation

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Abre un PDF con un lector externo vía FileProvider. Si no hay lector
 * instalado, no lanza nada (el estado queda limpio).
 */
fun openPdf(context: Context, uri: String) {
    runCatching {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(Uri.parse(uri), "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(intent)
    }
}
