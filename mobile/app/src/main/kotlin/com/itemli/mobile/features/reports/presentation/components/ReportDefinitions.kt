package com.itemli.mobile.features.reports.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition

/**
 * Tarjeta del catálogo de reportes.
 */
@Composable
fun ReportCard(
    definition: ReportDefinition,
    onOpenReport: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(
        onClick = { onOpenReport(definition.id) },
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Sur: ${definition.module.label}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.tertiary,
            )
            Text(
                definition.title,
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                definition.description,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

/**
 * Formulario de filtros de un reporte.
 */
@Composable
fun ReportFilterForm(
    definition: ReportDefinition,
    values: Map<String, String>,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        definition.filters.forEach { filter ->
            OutlinedTextField(
                value = values[filter.id].orEmpty(),
                onValueChange = { onFilterChange(filter.id, it) },
                label = { Text(filter.label) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            OutlinedButton(onClick = onRefresh) { Text("Actualizar") }
        }
    }
}

/**
 * Render simple de filas para el preview del reporte.
 */
@Composable
fun ReportPreviewTable(
    definition: ReportDefinition,
    rows: List<Map<String, Any?>>,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(modifier = Modifier.fillMaxWidth()) {
            definition.columns.forEach { column ->
                Text(
                    text = column.label,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        rows.forEach { row ->
            Row(modifier = Modifier.fillMaxWidth()) {
                definition.columns.forEach { column ->
                    Text(
                        text = (row[column.key] ?: "").toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f).padding(0.dp),
                    )
                }
            }
        }
    }
}
