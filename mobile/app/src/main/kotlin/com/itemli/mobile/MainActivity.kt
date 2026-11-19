package com.itemli.mobile

import android.os.Bundle
import android.os.SystemClock
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.runtime.CompositionLocalProvider
import com.itemli.mobile.shared.ui.theme.FontScalePreferences
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.itemli.mobile.app.navigation.ItemliAppRoot
import com.itemli.mobile.shared.infrastructure.SessionManager
import com.itemli.mobile.shared.ui.components.AppLockGate
import com.itemli.mobile.shared.ui.theme.ItemliTheme
import com.itemli.mobile.shared.ui.theme.FontSizePreferences
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

/**
 * Único Activity de la app. Aquí se calcula el WindowSizeClass una sola vez y
 * se reparte a la navegación y a las pantallas adaptativas.
 *
 * Seguridad:
 * - AppLockGate: bloqueo biométrico opcional al abrir la app.
 * - Timeout de sesión tras [SESSION_TIMEOUT_MS] en background.
 */
class MainActivity : FragmentActivity() {

    private var pausedAt: Long = 0L

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            val fontSizePreferences = remember { FontSizePreferences(applicationContext) }
            val fontScale by fontSizePreferences.scale.collectAsState(initial = FontSizePreferences.DEFAULT_SCALE)
            val density = LocalDensity.current
            val fontScalePreferences = remember { FontScalePreferences(applicationContext) }
            val fontScale by fontScalePreferences.scale.collectAsState(initial = 1f)
            CompositionLocalProvider(LocalDensity provides density.copy(fontScale = fontScale)) {
              ItemliTheme {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides density.copy(fontScale = fontScale)) {
                AppLockGate {
                    ItemliAppRoot(windowSizeClass = windowSizeClass)
                }
              }
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
