package com.itemli.mobile.features.settings.presentation.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.itemli.mobile.features.settings.presentation.adaptive.SettingsAdaptiveLayout
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsViewModel
import org.koin.androidx.compose.koinViewModel

/**
 * Pantalla de ajustes: servidor y proxy.
 */
@Composable
fun SettingsScreen(
    windowSizeClass: WindowSizeClass? = null,
    onBack: () -> Unit,
) {
    val viewModel: SettingsViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.message) { /* log si hace falta */ }

    Box(Modifier.fillMaxSize()) {
        SettingsAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onBaseUrlChange = viewModel::onBaseUrlChange,
            onProxyChange = viewModel::onProxyChange,
            onSave = viewModel::save,
            onTest = { viewModel.testConnection { ok, msg ->
                /* snackbar pendiente */
            } },
        )
    }
}
