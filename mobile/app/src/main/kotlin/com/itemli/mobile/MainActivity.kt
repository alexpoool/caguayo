package com.itemli.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import com.itemli.mobile.app.navigation.AppRoot
import com.itemli.mobile.shared.ui.theme.ItemliTheme

/**
 * Único Activity de la app. Aquí se calcula el WindowSizeClass una sola vez y
 * se reparte a la navegación y a las pantallas adaptativas.
 */
class MainActivity : ComponentActivity() {

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            ItemliTheme {
                AppRoot(windowSizeClass = windowSizeClass)
            }
        }
    }
}
