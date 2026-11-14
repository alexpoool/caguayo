package com.itemli.mobile.features.settings.presentation.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.settings.presentation.components.ServerConfigForm
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsUiState

/**
 * Layout adaptativo de ajustes, idéntico en los tres breakpoints, cambiando
 * solo padding y ancho máximo. No necesita list-detail.
 */
@Composable
fun SettingsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: SettingsUiState,
    onBaseUrlChange: (String) -> Unit,
    onProxyChange: (Boolean, String, String, String, String) -> Unit,
    onAppLockChange: (Boolean) -> Unit,
    onPickPdfDir: () -> Unit = {},
    onResetPdfDir: () -> Unit = {},
    onSave: () -> Unit,
    onTest: () -> Unit,
    /** Nombre visible de la carpeta de PDFs (null = interna). */
    pdfDirName: String? = null,
) {
    val maxWidth = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Expanded -> 600.dp
        else -> 480.dp
    }
    val horizontalPadding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 16.dp
        WindowWidthSizeClass.Medium -> 32.dp
        else -> 48.dp
    }

    Box(
        modifier = Modifier.fillMaxSize().padding(horizontal = horizontalPadding),
        contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
        Column(
            modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Ajustes del servidor",
                style = MaterialTheme.typography.headlineMedium,
            )
            ServerConfigForm(
                baseUrl = state.baseUrl,
                proxyHost = state.proxyHost,
                proxyPort = state.proxyPort,
                proxyUser = state.proxyUser,
                proxyPassword = state.proxyPassword,
                useProxy = state.useProxy,
                isLoading = state.isLoading,
                isTesting = state.isTesting,
                appLockEnabled = state.appLockEnabled,
                appLockSupported = state.appLockSupported,
                pdfDirName = pdfDirName,
                onBaseUrlChange = onBaseUrlChange,
                onProxyChange = onProxyChange,
                onAppLockChange = onAppLockChange,
                onPickPdfDir = onPickPdfDir,
                onResetPdfDir = onResetPdfDir,
                onSave = onSave,
                onTest = onTest,
                windowSizeClass = windowSizeClass,
            )
            state.message?.let {
                Text(text = it, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}
