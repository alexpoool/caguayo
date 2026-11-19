package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.ui.Alignment
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.components.ReportFilterForm
import com.itemli.mobile.features.reports.presentation.components.ReportPdfButton
import com.itemli.mobile.features.reports.presentation.components.ReportPreviewTable
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState
import com.itemli.mobile.shared.ui.components.InteriorHeader

@Composable
fun ReportDetailAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportDetailUiState,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit = {},
    onDownloadPdf: () -> Unit = {},
    onShare: () -> Unit = {},
    onChart: () -> Unit = {},
    onBack: () -> Unit = {},
) {
    val definition = state.definition ?: return
    var showFilters by remember(definition.id) { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).padding(horizontal = 16.dp).padding(top = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        InteriorHeader(
            title = definition.title,
            onBack = onBack,
            actionIcon = Icons.Filled.Tune,
            actionDescription = "Abrir filtros",
            onAction = { showFilters = true },
            leadingActions = {
                IconButton(onClick = onShare, enabled = !state.isShareLoading) {
                    if (state.isShareLoading) CircularProgressIndicator(
                        modifier = Modifier.padding(3.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    ) else Icon(Icons.Filled.Share, contentDescription = "Generar y compartir PDF", tint = Color.White)
                }
                IconButton(onClick = onChart) {
                    Icon(Icons.Filled.BarChart, contentDescription = "Ver gráficos del reporte", tint = Color.White)
                }
            },
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (state.isLoading && state.preview == null) {
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = Color(0xFF0752D8)) }
            }
            state.preview?.let { preview ->
                ReportPreviewTable(
                    definition = definition,
                    rows = preview.rows,
                    visibleColumnCount = if (windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Compact) 3 else 5,
                    isLoadingMore = state.isLoadingMore,
                    hasMore = state.hasMore,
                    onLoadMore = onLoadMore,
                    modifier = Modifier.fillMaxWidth().weight(1f),
                )
            }
        }
        ReportPdfButton(state = state, onDownload = onDownloadPdf, modifier = Modifier.padding(bottom = 10.dp))
    }

    if (showFilters) {
        AlertDialog(
            onDismissRequest = { showFilters = false },
            containerColor = Color.White,
            title = { Text(definition.title, style = MaterialTheme.typography.titleLarge) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Ajusta los parámetros del reporte", style = MaterialTheme.typography.bodySmall)
                    ReportFilterForm(
                        definition = definition,
                        values = state.filters,
                        options = state.filterOptions,
                        onFilterChange = onFilterChange,
                        onRefresh = {
                            showFilters = false
                            onRefresh()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showFilters = false }) { Text("Cerrar") }
            },
        )
    }
}
