package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.itemli.mobile.features.reports.presentation.adaptive.ReportsAdaptiveLayout
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportsCatalogViewModel
import org.koin.androidx.compose.koinViewModel

/**
 * Catálogo de reportes. La estadística va en [ReportsAdaptiveLayout].
 */
@Composable
fun ReportsCatalogScreen(
    windowSizeClass: WindowSizeClass? = null,
    onOpenReport: (String) -> Unit,
) {
    val viewModel: ReportsCatalogViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.definitions) { /* listo */ }

    Box(Modifier.fillMaxSize()) {
        ReportsAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onOpenReport = onOpenReport,
        )
    }
}
