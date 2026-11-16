package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.components.ReportFilterForm
import com.itemli.mobile.features.reports.presentation.components.ReportPdfButton
import com.itemli.mobile.features.reports.presentation.components.ReportPreviewTable
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState
import com.itemli.mobile.shared.ui.theme.TextSecondary

/** Pantalla de parámetros y resultado de un informe. */
@Composable
fun ReportDetailAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportDetailUiState,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
    onDownloadPdf: () -> Unit = {},
) {
    val definition = state.definition ?: return
    val isPane = windowSizeClass?.widthSizeClass != WindowWidthSizeClass.Compact
    val horizontalPadding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 18.dp
        WindowWidthSizeClass.Medium -> 22.dp
        else -> 30.dp
    }
    val maxWidth = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Expanded -> 960.dp
        WindowWidthSizeClass.Medium -> 760.dp
        else -> 520.dp
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = horizontalPadding)
            .padding(top = 22.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("Parámetros del informe", style = MaterialTheme.typography.headlineMedium)
            Text(
                definition.title,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                definition.description,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
            )
        }

        if (isPane) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(
                    Modifier.weight(0.38f).widthIn(max = 360.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                    ) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Filtros", style = MaterialTheme.typography.titleMedium)
                            ReportFilterForm(
                                definition = definition,
                                values = state.filters,
                                onFilterChange = onFilterChange,
                                onRefresh = onRefresh,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                    ReportPdfButton(state = state, onDownload = onDownloadPdf)
                }
                Column(
                    Modifier.weight(0.62f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    state.error?.let {
                        Text(text = it, color = MaterialTheme.colorScheme.error)
                    }
                    state.preview?.let { preview ->
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                        ) {
                            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Vista previa", style = MaterialTheme.typography.titleMedium)
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
        } else {
            Column(
                Modifier.widthIn(max = maxWidth).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Filtros", style = MaterialTheme.typography.titleMedium)
                        ReportFilterForm(
                            definition = definition,
                            values = state.filters,
                            onFilterChange = onFilterChange,
                            onRefresh = onRefresh,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                ReportPdfButton(state = state, onDownload = onDownloadPdf)
                state.error?.let {
                    Text(text = it, color = MaterialTheme.colorScheme.error)
                }
                state.preview?.let { preview ->
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                    ) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Vista previa", style = MaterialTheme.typography.titleMedium)
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
        Box(Modifier.fillMaxWidth().padding(bottom = 12.dp))
    }
}
