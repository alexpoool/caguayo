package com.itemli.mobile.shared.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalView

/**
 * Pantalla sensible: bloquea capturas/grabaciones (FLAG_SECURE) y toques
 * superpuestos (tapjacking) a nivel de ventana mientras la pantalla está viva.
 *
 * Úsala en Login y Ajustes. En pantallas de negocio se decide caso por caso.
 */
@Composable
fun SecureScreen() {
    val view = LocalView.current
    DisposableEffect(view) {
        val window = view.context.findActivity()?.window
        window?.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE,
        )
        // Anti-tapjacking: ignora toques cuando otra vista transparente cubre la app.
        window?.decorView?.filterTouchesWhenObscured = true
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            window?.decorView?.filterTouchesWhenObscured = false
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
