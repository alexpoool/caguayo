package com.itemli.mobile.features.settings.presentation.adaptive

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.WindowHeightSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsUiState

/**
 * Previews obligatorias de ajustes: 360/700/1000dp.
 */
private fun state() = SettingsUiState(
    baseUrl = "http://10.0.0.15:8000/api/v1/",
    proxyHost = "10.0.0.254",
    proxyPort = "3128",
    proxyUser = "usuario",
    proxyPassword = "cl4v3",
    useProxy = true,
)

@Preview(name = "Compact 360dp", widthDp = 360)
@Preview(name = "Medium 700dp", widthDp = 700)
@Preview(name = "Expanded 1000dp", widthDp = 1000)
@Composable
private fun SettingsAdaptiveLayoutPreview() {
    SettingsAdaptiveLayout(
        windowSizeClass = null,
        state = state(),
        onBaseUrlChange = {},
        onProxyChange = { _, _, _, _, _ -> },
        onSave = {},
        onTest = {},
    )
}
