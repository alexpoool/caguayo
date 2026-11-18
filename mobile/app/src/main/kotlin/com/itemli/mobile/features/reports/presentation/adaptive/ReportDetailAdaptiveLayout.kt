package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
    onDownloadPdf: () -> Unit = {},
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
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(definition.description, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "Vista previa: primeros 3 registros",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF667795),
                    )
                }
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            state.preview?.let { preview ->
                Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Vista previa", style = MaterialTheme.typography.titleMedium)
                        ReportPreviewTable(definition = definition, rows = preview.rows, modifier = Modifier.fillMaxWidth())
                    }
                }
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
