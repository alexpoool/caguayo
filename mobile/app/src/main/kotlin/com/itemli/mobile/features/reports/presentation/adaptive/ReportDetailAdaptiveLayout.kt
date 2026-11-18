package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.components.ReportFilterForm
import com.itemli.mobile.features.reports.presentation.components.ReportPdfButton
import com.itemli.mobile.features.reports.presentation.components.ReportPreviewTable
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.TextSecondary

@Composable
fun ReportDetailAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportDetailUiState,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
    onDownloadPdf: () -> Unit = {},
) {
    val definition = state.definition ?: return
    Column(
        Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).padding(horizontal = 16.dp).padding(top = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Tune, contentDescription = null, tint = BrandPrimary)
            Text("  Filtros del Reporte", style = MaterialTheme.typography.titleLarge, color = Color(0xFF092C63))
        }
        Column(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp),
            ) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(color = Color(0xFFE0EEFF), shape = RoundedCornerShape(14.dp)) {
                        Icon(Icons.Filled.Tune, contentDescription = null, tint = BrandPrimary, modifier = Modifier.padding(12.dp))
                    }
                    Column(Modifier.padding(start = 12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(definition.title, style = MaterialTheme.typography.titleMedium)
                        Text(definition.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Selecciona los parámetros", style = MaterialTheme.typography.titleMedium)
                    ReportFilterForm(
                        definition = definition,
                        values = state.filters,
                        options = state.filterOptions,
                        onFilterChange = onFilterChange,
                        onRefresh = onRefresh,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            Surface(color = Color(0xFFE1EDFF), shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Info, contentDescription = null, tint = BrandPrimary)
                    Text(
                        "Los datos se generarán según los filtros seleccionados.",
                        Modifier.padding(start = 10.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF173C78),
                    )
                }
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            state.preview?.let { preview ->
                Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Vista previa", style = MaterialTheme.typography.titleMedium)
                        ReportPreviewTable(definition = definition, rows = preview.rows, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
        ReportPdfButton(state = state, onDownload = onDownloadPdf, modifier = Modifier.padding(bottom = 10.dp))
    }
}
