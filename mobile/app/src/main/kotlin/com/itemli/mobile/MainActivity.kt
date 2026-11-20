package com.itemli.mobile

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.fragment.app.FragmentActivity
import com.itemli.mobile.app.navigation.ItemliAppRoot
import com.itemli.mobile.shared.ui.components.AppLockGate
import com.itemli.mobile.shared.ui.theme.FontSizePreferences
import com.itemli.mobile.shared.ui.theme.ItemliTheme

/**
 * Único Activity de la app. Calcula el WindowSizeClass y distribuye
 * la preferencia de tamaño de texto a toda la interfaz.
 */
class MainActivity : FragmentActivity() {


    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            val fontPreferences = remember { FontSizePreferences(applicationContext) }
            val fontScale by fontPreferences.scale.collectAsState(
                initial = FontSizePreferences.DEFAULT_SCALE,
            )

            ItemliTheme {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(density = density.density, fontScale = fontScale)) {
                    AppLockGate {
                        ItemliAppRoot(windowSizeClass = windowSizeClass)
                    }
                }
            }
        }
    }

}
