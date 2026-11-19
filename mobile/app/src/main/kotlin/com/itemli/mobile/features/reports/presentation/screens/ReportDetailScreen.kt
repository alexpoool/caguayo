package com.itemli.mobile.features.reports.presentation.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.itemli.mobile.features.reports.presentation.adaptive.ReportDetailAdaptiveLayout
import com.itemli.mobile.features.reports.presentation.openPdf
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
    onBack: () -> Unit = {},
    onOpenChart: (String, Map<String, String>) -> Unit = { _, _ -> },
) {
    val viewModel: ReportDetailViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(reportId) { viewModel.loadById(reportId) }

    // Al terminar la descarga se abre el PDF con un lector externo.
    LaunchedEffect(state.sharePdfUri) {
        state.sharePdfUri?.let { rawUri ->
            runCatching {
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, Uri.parse(rawUri))
                    putExtra(Intent.EXTRA_SUBJECT, state.definition?.title ?: "Reporte ITEMLI")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(shareIntent, "Compartir reporte PDF"))
            }.onFailure {
                viewModel.onPdfOpenFailed("No se pudo abrir el menú para compartir el PDF")
            }
            viewModel.onPdfShared()
        }
    }

    LaunchedEffect(state.pdfUri) {
        state.pdfUri?.let { uri ->
            if (!openPdf(context, uri)) {
                viewModel.onPdfOpenFailed("No hay un visor de PDF instalado en el teléfono")
            } else {
                viewModel.onPdfOpened()
            }
        }
    }

    if (state.definition == null) {
        Box(Modifier.fillMaxSize()) {
            if (state.error != null) {
                ErrorView(state.error ?: "Reporte no encontrado: $reportId")
            } else {
                LoadingView("Cargando reporte…")
            }
        }
        return
    }

    Box(Modifier.fillMaxSize()) {
        ReportDetailAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onFilterChange = viewModel::onFilterChange,
            onRefresh = viewModel::refresh,
            onLoadMore = viewModel::loadMore,
            onDownloadPdf = viewModel::downloadPdf,
            onShare = viewModel::sharePdf,
            onChart = { state.definition?.let { onOpenChart(it.id, state.filters) } },
            onBack = onBack,
        )
    }
}
