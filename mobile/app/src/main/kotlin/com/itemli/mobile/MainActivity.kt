package com.itemli.mobile

import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.lifecycle.lifecycleScope
import com.itemli.mobile.app.navigation.ItemliAppRoot
import com.itemli.mobile.shared.infrastructure.SessionManager
import com.itemli.mobile.shared.ui.theme.ItemliTheme
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

/**
 * Único Activity de la app. Aquí se calcula el WindowSizeClass una sola vez y
 * se reparte a la navegación y a las pantallas adaptativas.
 *
 * Seguridad: si la app pasa más de [SESSION_TIMEOUT_MS] en background,
 * la sesión se cierra y la app vuelve al Login al reabrirse.
 */
class MainActivity : ComponentActivity() {

    private var pausedAt: Long = 0L

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            ItemliTheme {
                ItemliAppRoot(windowSizeClass = windowSizeClass)
            }
        }
    }

    override fun onPause() {
        pausedAt = SystemClock.elapsedRealtime()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        val pausedFor = SystemClock.elapsedRealtime() - pausedAt
        if (pausedAt > 0L && pausedFor > SESSION_TIMEOUT_MS) {
            lifecycleScope.launch {
                GlobalContext.get().get<SessionManager>().logout()
                recreate()
            }
        }
    }

    private companion object {
        /** 15 minutos en background invalidan la sesión. */
        const val SESSION_TIMEOUT_MS = 15L * 60L * 1000L
    }
}
