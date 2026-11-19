package com.itemli.mobile.features.reports.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.border
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
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
        ?: if (value.isBlank() && optional) "Todos" else if (value.isBlank()) "Seleccionar $label" else value
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
        MaterialTheme(
            colorScheme = lightColorScheme(),
            typography = MaterialTheme.typography,
            shapes = MaterialTheme.shapes,
        ) {
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
            androidx.compose.material3.DatePicker(
                state = pickerState,
                colors = androidx.compose.material3.DatePickerDefaults.colors(
                    containerColor = Color.White,
                    titleContentColor = Color(0xFF173C78),
                    headlineContentColor = Color(0xFF173C78),
                    weekdayContentColor = Color(0xFF53658C),
                    subheadContentColor = Color(0xFF53658C),
                    yearContentColor = Color(0xFF173C78),
                    currentYearContentColor = Color(0xFF0752D8),
                    selectedYearContainerColor = Color(0xFF0752D8),
                    selectedYearContentColor = Color.White,
                    dayContentColor = Color(0xFF173C78),
                    disabledDayContentColor = Color(0xFFB8C1D1),
                    selectedDayContainerColor = Color(0xFF0752D8),
                    selectedDayContentColor = Color.White,
                    todayContentColor = Color(0xFF0752D8),
                    todayDateBorderColor = Color(0xFF0752D8),
                ),
            )
        }
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
    val columns = definition.columns.take(3)
    val cardShape = RoundedCornerShape(18.dp)
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFFDCE6F5), cardShape),
        shape = cardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFE7F0FF))
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                columns.forEachIndexed { index, column ->
                    Text(
                        text = column.label,
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        ),
                        color = Color(0xFF173C78),
                        modifier = Modifier.weight(1f),
                        textAlign = if (index == 2) androidx.compose.ui.text.style.TextAlign.End
                            else androidx.compose.ui.text.style.TextAlign.Start,
                    )
                }
            }

            rows.forEachIndexed { rowIndex, row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    columns.forEachIndexed { index, column ->
                        val value = (row[column.key] ?: "—").toString()
                        if (index == 2) {
                            Box(
                                modifier = Modifier.weight(1f),
                                contentAlignment = Alignment.CenterEnd,
                            ) {
                                Surface(
                                    color = Color(0xFFE5EFFF),
                                    shape = RoundedCornerShape(50),
                                ) {
                                    Text(
                                        text = value,
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
                                        ),
                                        color = Color(0xFF123D79),
                                        modifier = Modifier.padding(horizontal = 13.dp, vertical = 6.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    )
                                }
                            }
                        } else {
                            Text(
                                text = value,
                                style = MaterialTheme.typography.bodyLarge,
                                color = Color(0xFF53627A),
                                modifier = Modifier.weight(1f),
                                maxLines = 2,
                            )
                        }
                    }
                }
                if (rowIndex < rows.lastIndex) {
                    HorizontalDivider(
                        color = Color(0xFFE8EDF5),
                        thickness = 1.dp,
                    )
                }
            }
        }
    }
}
