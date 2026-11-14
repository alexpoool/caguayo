package com.itemli.mobile.features.reports.presentation

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Abre un PDF con un lector externo vía FileProvider. Devuelve false si no
 * hay visor (o el intent falla), para que la UI lo comunique.
 *
 * Nota: no se usa resolveActivity() porque desde Android 11 el filtrado de
 * paquetes lo oculta aunque haya visores; startActivity lanza el selector
 * del sistema, que no está filtrado.
 */
fun openPdf(context: Context, uri: String): Boolean = runCatching {
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(Uri.parse(uri), "application/pdf")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(intent)
    true
}.recoverCatching { error ->
    if (error is android.content.ActivityNotFoundException) {
        false
    } else {
        throw error
    }
}.getOrDefault(false)
