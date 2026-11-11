package com.itemli.mobile.features.reports.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState

/**
 * Botón de descarga del PDF de un reporte. Muestra el progreso y el error
 * de descarga/guardado si lo hay.
 */
@Composable
fun ReportPdfButton(
    state: ReportDetailUiState,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Button(
            onClick = onDownload,
            enabled = !state.isPdfLoading && state.definition != null,
        ) {
            Text(if (state.isPdfLoading) "Descargando…" else "Descargar PDF")
        }
        state.pdfError?.let {
            Text(text = it, color = MaterialTheme.colorScheme.error)
        }
    }
}
