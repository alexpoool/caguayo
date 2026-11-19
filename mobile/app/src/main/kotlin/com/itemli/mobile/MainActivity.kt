package com.itemli.mobile

import android.os.Bundle
import android.os.SystemClock
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalDensity
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.itemli.mobile.app.navigation.ItemliAppRoot
import com.itemli.mobile.shared.infrastructure.SessionManager
import com.itemli.mobile.shared.ui.components.AppLockGate
import com.itemli.mobile.shared.ui.theme.FontSizePreferences
import com.itemli.mobile.shared.ui.theme.ItemliTheme
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

class MainActivity : FragmentActivity() {
    private var pausedAt: Long = 0L
    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            val fontPreferences = remember { FontSizePreferences(applicationContext) }
            val fontScale by fontPreferences.scale.collectAsState(initial = FontSizePreferences.DEFAULT_SCALE)
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides density.copy(fontScale = fontScale)) {
                ItemliTheme {
                    AppLockGate { ItemliAppRoot(windowSizeClass = windowSizeClass) }
                }
            }
        }
    }
    override fun onPause() { pausedAt = SystemClock.elapsedRealtime(); super.onPause() }
    override fun onResume() {
        super.onResume()
        val pausedFor = SystemClock.elapsedRealtime() - pausedAt
        if (pausedAt > 0L && pausedFor > SESSION_TIMEOUT_MS) {
            lifecycleScope.launch { GlobalContext.get().get<SessionManager>().logout(); recreate() }
        }
    }
    private companion object { const val SESSION_TIMEOUT_MS = 15L * 60L * 1000L }
}
