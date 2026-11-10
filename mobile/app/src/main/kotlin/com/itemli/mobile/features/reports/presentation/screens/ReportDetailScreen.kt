package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.itemli.mobile.features.reports.presentation.adaptive.ReportDetailAdaptiveLayout
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailViewModel
import com.itemli.mobile.shared.ui.components.ErrorView
import com.itemli.mobile.shared.ui.components.LoadingView
import org.koin.androidx.compose.koinViewModel

/**
 * Detalle de un reporte. La pantalla obtiene la definición desde el catálogo.
 */
@Composable
fun ReportDetailScreen(
    windowSizeClass: WindowSizeClass? = null,
    reportId: String,
) {
    val viewModel: ReportDetailViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()

    LaunchedEffect(reportId) { viewModel.loadById(reportId) }

    if (state.definition == null) {
        Box(Modifier.fillMaxSize()) {
            ErrorView("Reporte no encontrado: $reportId")
        }
        return
    }
    if (state.isLoading) {
        Box(Modifier.fillMaxSize()) {
            LoadingView("Cargando ${state.definition?.title}")
        }
        return
    }

    Box(Modifier.fillMaxSize()) {
        ReportDetailAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onFilterChange = viewModel::onFilterChange,
            onRefresh = viewModel::refresh,
        )
    }
}
