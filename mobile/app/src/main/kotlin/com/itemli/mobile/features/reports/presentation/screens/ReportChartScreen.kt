package com.itemli.mobile.features.reports.presentation.screens

import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.application.usecases.GetReportPreviewUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.ui.components.InteriorHeader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.koin.compose.koinInject
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class ChartEntry(val label: String, val value: Double)

@Composable
fun ReportChartScreen(
    reportId: String,
    filters: Map<String, String>,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val catalogUseCase: GetReportsCatalogUseCase = koinInject()
    val previewUseCase: GetReportPreviewUseCase = koinInject()
    var title by remember { mutableStateOf("Gráficos del reporte") }
    var entries by remember { mutableStateOf<List<ChartEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var activeFilters by remember(reportId, filters) { mutableStateOf(filters.toMap()) }
    var draftFilters by remember(reportId, filters) { mutableStateOf(filters.toMap()) }
    var definition by remember { mutableStateOf<ReportDefinition?>(null) }
    var showFilters by remember { mutableStateOf(false) }
    var downloading by remember { mutableStateOf(false) }

    LaunchedEffect(reportId, activeFilters) {
        loading = true
        error = null
        entries = emptyList()
        val reportDefinition = when (val catalog = catalogUseCase()) {
            is AppResult.Success -> catalog.value.firstOrNull { it.id == reportId }
            is AppResult.Failure -> null
        }
        if (reportDefinition == null) {
            error = "No se pudo localizar la definición del reporte."
            loading = false
            return@LaunchedEffect
        }
        definition = reportDefinition
        title = reportDefinition.title
        val allRows = mutableListOf<Map<String, Any?>>()
        var offset = 0
        var total = Int.MAX_VALUE
        var totals = emptyMap<String, Any?>()
        while (offset < total && offset < 100_000) {
            when (val page = previewUseCase(reportDefinition, activeFilters, 10, offset)) {
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
        InteriorHeader(
            title = "Gráficos",
            onBack = onBack,
            leadingActions = {
                IconButton(onClick = {
                    draftFilters = activeFilters.toMap()
                    showFilters = true
                }) {
                    Icon(Icons.Filled.Tune, contentDescription = "Filtrar gráfico", tint = Color.White)
                }
                IconButton(
                    onClick = {
                        val chartTitle = title
                        val chartEntries = entries
                        val chartFilters = activeFilters
                        downloading = true
                        scope.launch {
                            val saved = withContext(Dispatchers.IO) {
                                runCatching { saveChartImage(context, chartTitle, chartEntries, chartFilters) }.getOrDefault(false)
                            }
                            downloading = false
                            Toast.makeText(
                                context,
                                if (saved) "Gráfico guardado en Imágenes/ITEMLI" else "No se pudo guardar el gráfico",
                                Toast.LENGTH_LONG,
                            ).show()
                        }
                    },
                    enabled = !loading && entries.isNotEmpty() && !downloading,
                ) {
                    if (downloading) {
                        CircularProgressIndicator(modifier = Modifier.width(22.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Icon(Icons.Filled.Download, contentDescription = "Descargar gráfico", tint = Color.White)
                    }
                }
            },
        )
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
                    Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(18.dp),
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

    if (showFilters) {
        val reportDefinition = definition
        AlertDialog(
            onDismissRequest = { showFilters = false },
            containerColor = Color.White,
            title = { Text("Filtrar gráfico", style = MaterialTheme.typography.titleLarge) },
            text = {
                Column(
                    Modifier.fillMaxWidth().heightIn(max = 480.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text("Los cambios se aplicarán al gráfico al confirmar.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF667085))
                    reportDefinition?.filters?.forEach { filter ->
                        val label = filter.id.replace('_', ' ').replaceFirstChar { it.uppercase() }
                        OutlinedTextField(
                            value = draftFilters[filter.id].orEmpty(),
                            onValueChange = { value ->
                                draftFilters = if (value.isBlank()) draftFilters - filter.id else draftFilters + (filter.id to value)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text(label + if (filter.required) " *" else "") },
                            singleLine = true,
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    activeFilters = draftFilters.toMap()
                    showFilters = false
                }) { Text("Aplicar") }
            },
            dismissButton = {
                TextButton(onClick = { showFilters = false }) { Text("Cancelar") }
            },
        )
    }
}

private fun saveChartImage(
    context: android.content.Context,
    title: String,
    entries: List<ChartEntry>,
    filters: Map<String, String>,
): Boolean {
    if (entries.isEmpty()) return false
    val width = 1200
    val rowHeight = 112
    val headerHeight = 250
    val height = (headerHeight + entries.size * rowHeight + 80).coerceAtMost(4000)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)
    canvas.drawColor(android.graphics.Color.WHITE)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(23, 60, 120); textSize = 48f; typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD) }
    canvas.drawText(title.take(42), 64f, 86f, paint)
    paint.textSize = 27f
    paint.typeface = Typeface.DEFAULT
    paint.color = android.graphics.Color.rgb(90, 105, 130)
    canvas.drawText("Generado: ${LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))}", 64f, 140f, paint)
    val filterText = if (filters.isEmpty()) "Filtros: ninguno" else "Filtros: " + filters.entries.joinToString(" · ") { "${it.key}=${it.value}" }.take(90)
    canvas.drawText(filterText, 64f, 184f, paint)
    val maxValue = entries.maxOf { it.value }.coerceAtLeast(0.000001)
    entries.forEachIndexed { index, entry ->
        val y = headerHeight + index * rowHeight
        paint.color = android.graphics.Color.rgb(52, 69, 99)
        paint.textSize = 30f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        canvas.drawText(entry.label.take(36), 64f, y.toFloat(), paint)
        paint.color = android.graphics.Color.rgb(23, 60, 120)
        paint.textSize = 28f
        paint.typeface = Typeface.DEFAULT
        canvas.drawText(formatChartValue(entry.value), 1060f - paint.measureText(formatChartValue(entry.value)), y.toFloat(), paint)
        val barTop = y + 22f
        val barBottom = barTop + 28f
        paint.color = android.graphics.Color.rgb(231, 239, 251)
        canvas.drawRoundRect(64f, barTop, 1136f, barBottom, 14f, 14f, paint)
        paint.color = android.graphics.Color.rgb(8, 120, 209)
        canvas.drawRoundRect(64f, barTop, 64f + 1072f * (entry.value / maxValue).toFloat().coerceIn(0f, 1f), barBottom, 14f, 14f, paint)
    }
    val stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
    return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, "ITEMLI_grafico_$stamp.png")
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/ITEMLI")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return false
            context.contentResolver.openOutputStream(uri)?.use { output ->
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) return false
            } ?: return false
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            context.contentResolver.update(uri, values, null, null)
        } else {
            val directory = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir
            val target = java.io.File(directory, "ITEMLI_grafico_$stamp.png")
            target.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
        bitmap.recycle()
        true
    } catch (_: Exception) {
        bitmap.recycle()
        false
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
    val hasNumericValues = amountKeys.any { key ->
        rows.any { it[key] is Number || it[key]?.toString()?.replace(",", ".")?.toDoubleOrNull() != null }
    }
    return rows.groupBy { text(it, groupKey) }
        .map { (label, group) ->
            val amount = if (hasNumericValues) group.sumOf { value(it, *amountKeys) } else group.size.toDouble()
            ChartEntry(label, amount)
        }
        .filter { it.value > 0 }
        .sortedByDescending { it.value }
        .take(10)
}

private fun formatChartValue(value: Double): String =
    NumberFormat.getNumberInstance(Locale.getDefault()).apply { maximumFractionDigits = 2 }.format(value)
