package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.components.ReportFilterForm
import com.itemli.mobile.features.reports.presentation.components.ReportPreviewTable
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState

/**
 * Layout adaptativo del detalle de un reporte.
 *
 * - Compact  → filtros y preview en columna.
 * - Medium   → filtros a la izquierda y preview a la derecha.
 * - Expanded → igual a Medium con más padding.
 */
@Composable
fun ReportDetailAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportDetailUiState,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
) {
    val definition = state.definition ?: return
    val isPane = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> false
        else -> true
    }
    val padding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 12.dp
        WindowWidthSizeClass.Medium -> 16.dp
        else -> 24.dp
    }
    val maxWidth = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Expanded -> 900.dp
        WindowWidthSizeClass.Medium -> 720.dp
        else -> 480.dp
    }

    Box(Modifier.fillMaxSize().padding(padding)) {
        Column(Modifier.fillMaxWidth().align(Alignment.TopCenter)) {
            Text(definition.title, style = MaterialTheme.typography.headlineMedium)
            if (isPane) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Column(
                        Modifier.weight(0.35f).widthIn(max = 324.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        ReportFilterForm(
                            definition = definition,
                            values = state.filters,
                            onFilterChange = onFilterChange,
                            onRefresh = onRefresh,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    Column(
                        Modifier.weight(0.65f).fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        state.error?.let {
                            Text(text = it, color = MaterialTheme.colorScheme.error)
                        }
                        state.preview?.let { preview ->
                            ReportPreviewTable(
                                definition = definition,
                                rows = preview.rows,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ReportFilterForm(
                        definition = definition,
                        values = state.filters,
                        onFilterChange = onFilterChange,
                        onRefresh = onRefresh,
                        modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth(),
                    )
                    state.error?.let {
                        Text(text = it, color = MaterialTheme.colorScheme.error)
                    }
                    state.preview?.let { preview ->
                        ReportPreviewTable(
                            definition = definition,
                            rows = preview.rows,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}
