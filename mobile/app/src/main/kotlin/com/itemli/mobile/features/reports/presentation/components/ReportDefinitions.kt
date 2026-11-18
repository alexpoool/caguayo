package com.itemli.mobile.features.reports.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
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
                "Módulo: ${definition.module.label}",
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
 * Filtros guiados: fechas con calendario y el resto con selectores.
 * Ningún parámetro de un informe requiere escritura libre.
 */
@Composable
fun ReportFilterForm(
    definition: ReportDefinition,
    values: Map<String, String>,
    options: Map<String, List<com.itemli.mobile.features.reports.infrastructure.datasources.ReportFilterOption>>,
    onFilterChange: (String, String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        definition.filters.forEach { filter ->
            if (filter.type == com.itemli.mobile.features.reports.domain.entities.ReportFilterType.DATE) {
                ReportDateSelector(
                    label = filter.label,
                    value = values[filter.id].orEmpty(),
                    onSelected = { onFilterChange(filter.id, it) },
                )
            } else {
                ReportChoiceSelector(
                    label = filter.label,
                    value = values[filter.id].orEmpty(),
                    options = options[filter.id].orEmpty(),
                    optional = !filter.required,
                    onSelected = { onFilterChange(filter.id, it) },
                )
            }
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            OutlinedButton(onClick = onRefresh) { Text("Aplicar filtros") }
        }
    }
}

@Composable
private fun ReportChoiceSelector(
    label: String,
    value: String,
    options: List<com.itemli.mobile.features.reports.infrastructure.datasources.ReportFilterOption>,
    optional: Boolean,
    onSelected: (String) -> Unit,
) {
    var expanded by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.value == value }?.label
        ?: if (value.isBlank()) "Seleccionar $label" else value
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        androidx.compose.foundation.layout.Box {
            OutlinedButton(
                onClick = { expanded = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = options.isNotEmpty(),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.White,
                    contentColor = Color(0xFF173C78),
                    disabledContainerColor = Color.White,
                    disabledContentColor = Color(0xFF8995AA),
                ),
            ) {
                Text(
                    if (options.isEmpty()) "Opciones no disponibles" else selectedLabel,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            androidx.compose.material3.DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                containerColor = Color.White,
            ) {
                if (optional) {
                    androidx.compose.material3.DropdownMenuItem(
                        text = { Text("Todos") },
                        onClick = { onSelected(""); expanded = false },
                    )
                }
                options.forEach { option ->
                    androidx.compose.material3.DropdownMenuItem(
                        text = { Text(option.label) },
                        onClick = { onSelected(option.value); expanded = false },
                    )
                }
            }
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun ReportDateSelector(
    label: String,
    value: String,
    onSelected: (String) -> Unit,
) {
    var showPicker by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    val pickerState = androidx.compose.material3.rememberDatePickerState()
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        OutlinedButton(
            onClick = { showPicker = true },
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                containerColor = Color.White,
                contentColor = Color(0xFF173C78),
            ),
        ) {
            Text(value.ifBlank { "Seleccionar fecha" }, modifier = Modifier.fillMaxWidth())
        }
    }
    if (showPicker) {
        androidx.compose.material3.DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                androidx.compose.material3.TextButton(
                    onClick = {
                        pickerState.selectedDateMillis?.let { millis ->
                            val date = java.time.Instant.ofEpochMilli(millis)
                                .atZone(java.time.ZoneOffset.UTC).toLocalDate()
                            onSelected(date.toString())
                        }
                        showPicker = false
                    },
                ) { Text("Aceptar") }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { showPicker = false }) {
                    Text("Cancelar")
                }
            },
        ) {
            androidx.compose.material3.DatePicker(state = pickerState)
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
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ReportPreviewChart(definition = definition, rows = rows)
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

 
@Composable
private fun ReportPreviewChart(
    definition: ReportDefinition,
    rows: List<Map<String, Any?>>,
) {
    val numericColumn = definition.columns.firstOrNull { column ->
        rows.any { row ->
            (row[column.key] as? Number) != null ||
                row[column.key]?.toString()?.replace(",", ".")?.toDoubleOrNull() != null
        }
    } ?: return
    val values = rows.mapNotNull { row ->
        val raw = row[numericColumn.key] ?: return@mapNotNull null
        (raw as? Number)?.toFloat() ?: raw.toString().replace(",", ".").toFloatOrNull()
    }
    if (values.isEmpty()) return
    val max = values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
    Canvas(Modifier.fillMaxWidth().padding(vertical = 8.dp).size(height = 132.dp, width = 300.dp)) {
        val gap = 10.dp.toPx()
        val barWidth = ((size.width - gap * (values.size + 1)) / values.size).coerceAtLeast(4f)
        values.forEachIndexed { index, value ->
            val height = (value / max) * size.height * 0.88f
            val x = gap + index * (barWidth + gap)
            drawRoundRect(
                color = Color(0xFF1686E8),
                topLeft = Offset(x, size.height - height),
                size = Size(barWidth, height),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx(), 6.dp.toPx()),
            )
        }
    }
}
