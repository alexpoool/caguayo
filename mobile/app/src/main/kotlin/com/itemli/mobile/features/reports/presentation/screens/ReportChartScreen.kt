package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.application.usecases.GetReportPreviewUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.ui.components.InteriorHeader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.koin.compose.koinInject
import java.text.NumberFormat
import java.util.Locale

private data class ChartEntry(val label: String, val value: Double)

@Composable
fun ReportChartScreen(
    reportId: String,
    filters: Map<String, String>,
    onBack: () -> Unit,
) {
    val catalogUseCase: GetReportsCatalogUseCase = koinInject()
    val previewUseCase: GetReportPreviewUseCase = koinInject()
    var title by remember { mutableStateOf("Gráficos del reporte") }
    var entries by remember { mutableStateOf<List<ChartEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(reportId, filters) {
        loading = true
        error = null
        entries = emptyList()
        val definition = when (val catalog = catalogUseCase()) {
            is AppResult.Success -> catalog.value.firstOrNull { it.id == reportId }
            is AppResult.Failure -> null
        }
        if (definition == null) {
            error = "No se pudo localizar la definición del reporte."
            loading = false
            return@LaunchedEffect
        }
        title = definition.title
        val allRows = mutableListOf<Map<String, Any?>>()
        var offset = 0
        var total = Int.MAX_VALUE
        var totals = emptyMap<String, Any?>()
        while (offset < total && offset < 100_000) {
            when (val page = previewUseCase(definition, filters, 10, offset)) {
                is AppResult.Success -> {
                    allRows += page.value.rows
                    totals = page.value.totals
                    val rawTotal = totals["total_items"] ?: totals["total_brackets"]
                    total = (rawTotal as? Number)?.toInt()
                        ?: rawTotal?.toString()?.toIntOrNull()
                        ?: (offset + page.value.rows.size)
                    if (page.value.rows.isEmpty()) break
                    offset += page.value.rows.size
                    if (page.value.rows.size < 10 && offset >= total) break
                    if (page.value.rows.size < 10 && total == offset) break
                }
                is AppResult.Failure -> {
                    error = page.error.message ?: "No se pudieron cargar los datos para el gráfico."
                    break
                }
            }
        }
        if (error == null) {
            entries = buildChartEntries(reportId, allRows, totals)
            if (entries.isEmpty()) error = "Este reporte no contiene datos suficientes para generar un gráfico."
        }
        loading = false
    }

    Column(
        Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).padding(horizontal = 16.dp).padding(top = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        InteriorHeader(title = "Gráficos", onBack = onBack)
        Text(title, style = MaterialTheme.typography.titleLarge, color = Color(0xFF173C78))
        if (loading) {
            Column(Modifier.fillMaxWidth().weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                CircularProgressIndicator(color = Color(0xFF0752D8))
                Text("Analizando todos los registros del reporte…", color = Color(0xFF53658C), modifier = Modifier.padding(top = 12.dp))
            }
        } else if (error != null) {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Text(error.orEmpty(), modifier = Modifier.padding(18.dp), color = Color(0xFF53658C))
            }
        } else {
            val maxValue = entries.maxOfOrNull { it.value }?.coerceAtLeast(0.000001) ?: 1.0
            Card(
                modifier = Modifier.fillMaxWidth().weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(18.dp),
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text("Distribución del reporte", style = MaterialTheme.typography.titleMedium, color = Color(0xFF173C78))
                    entries.forEach { entry ->
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(entry.label, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF344563), modifier = Modifier.weight(1f))
                                Text(formatChartValue(entry.value), style = MaterialTheme.typography.labelLarge, color = Color(0xFF173C78))
                            }
                            LinearProgressIndicator(
                                progress = { (entry.value / maxValue).toFloat().coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth(),
                                color = Color(0xFF0878D1),
                                trackColor = Color(0xFFE7EFFB),
                            )
                        }
                    }
                    Text("Datos calculados con los registros completos y los filtros aplicados.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF667085))
                }
            }
        }
    }
}

private fun buildChartEntries(
    reportId: String,
    rows: List<Map<String, Any?>>,
    totals: Map<String, Any?>,
): List<ChartEntry> {
    fun value(row: Map<String, Any?>, vararg keys: String): Double =
        keys.firstNotNullOfOrNull { key -> (row[key] as? Number)?.toDouble() ?: row[key]?.toString()?.replace(",", ".")?.toDoubleOrNull() } ?: 0.0
    fun text(row: Map<String, Any?>, vararg keys: String): String =
        keys.firstNotNullOfOrNull { key -> row[key]?.toString()?.takeIf { it.isNotBlank() } } ?: "Sin especificar"

    val (groupKey, amountKeys) = when (reportId) {
        "existencias" -> "nombre" to arrayOf("cantidad")
        "movimientos-dependencia" -> "nombre" to arrayOf("saldo_final")
        "movimientos-producto" -> "operacion" to arrayOf("cantidad")
        "clientes" -> "provincia" to arrayOf("nombre")
        "proveedores-dependencia" -> "provincia" to arrayOf("nombre")
        "liquidaciones" -> "cliente_nombre" to arrayOf("devengado", "importe")
        "proyectos" -> "nombre" to arrayOf("valor")
        "realizadores" -> "municipio" to arrayOf("nombre_completo")
        "desempeno" -> "persona_nombre" to arrayOf("cobro", "por_cobrar")
        "onat" -> "persona_nombre" to arrayOf("devengado")
        "mincult" -> "bracket" to arrayOf("total_devengado")
        else -> "nombre" to arrayOf("cantidad")
    }
    if (amountKeys.all { key -> rows.none { it[key] is Number || it[key]?.toString()?.toDoubleOrNull() != null } }) {
        val total = (totals["total_items"] as? Number)?.toDouble() ?: rows.size.toDouble()
        return listOf(ChartEntry("Registros", total)).filter { it.value > 0 }
    }
    return rows.groupBy { text(it, groupKey) }
        .map { (label, group) -> ChartEntry(label, group.sumOf { value(it, *amountKeys) }) }
        .filter { it.value > 0 }
        .sortedByDescending { it.value }
        .take(10)
}

private fun formatChartValue(value: Double): String =
    NumberFormat.getNumberInstance(Locale.getDefault()).apply { maximumFractionDigits = 2 }.format(value)
