package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportsListUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.SurfaceLight
import com.itemli.mobile.shared.ui.theme.TextSecondary

private data class ReportVisual(val icon: androidx.compose.ui.graphics.vector.ImageVector, val tint: Color, val bg: Color)

private fun reportVisual(module: String): ReportVisual {
    val name = module.lowercase()
    return when {
        "venta" in name -> ReportVisual(Icons.Filled.ShoppingCart, Color(0xFF0875E8), Color(0xFFE0EEFF))
        "invent" in name -> ReportVisual(Icons.Filled.Inventory2, Color(0xFF00A86B), Color(0xFFDDF8ED))
        "client" in name || "persona" in name -> ReportVisual(Icons.Filled.People, Color(0xFF7139D8), Color(0xFFEDE5FF))
        "compra" in name -> ReportVisual(Icons.Filled.Handshake, Color(0xFFE56B22), Color(0xFFFFE9DD))
        "proyect" in name -> ReportVisual(Icons.Filled.Folder, Color(0xFF079DB5), Color(0xFFDDF6FA))
        else -> ReportVisual(Icons.Filled.BarChart, BrandPrimary, Color(0xFFE5EDFF))
    }
}

@Composable
fun ReportsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportsListUiState,
    onOpenReport: (String) -> Unit,
    initialModule: String? = null,
) {
    var search by remember { mutableStateOf("") }
    var selectedModule by remember(initialModule) { mutableStateOf(initialModule ?: "Todos") }
    val modules = remember(state.definitions) {
        listOf("Todos") + state.definitions.map { it.module.label }.distinct().sorted()
    }
    val filtered = remember(state.definitions, search, selectedModule) {
        state.definitions.filter { report ->
            (selectedModule == "Todos" || report.module.label == selectedModule) &&
                (search.isBlank() || report.title.contains(search, true) ||
                    report.description.contains(search, true) || report.module.label.contains(search, true))
        }
    }
    Column(
        Modifier.fillMaxSize().background(SurfaceLight).padding(horizontal = 18.dp).padding(top = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Reportes", style = MaterialTheme.typography.headlineMedium, color = Color(0xFF092C63))
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text("Buscar reporte") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = Color.White,
                focusedContainerColor = Color.White,
            ),
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(modules) { module ->
                FilterChip(
                    selected = selectedModule == module,
                    onClick = { selectedModule = module },
                    label = { Text(module) },
                    shape = RoundedCornerShape(50),
                )
            }
        }
        Text("${filtered.size} informes", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(if (state.isLoading) "Cargando informes…" else "No hay informes para estos filtros", color = TextSecondary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                items(filtered, key = { it.id }) { definition ->
                    ReportRow(definition) { onOpenReport(definition.id) }
                }
            }
        }
    }
}

@Composable
private fun ReportRow(definition: ReportDefinition, onClick: () -> Unit) {
    val visual = reportVisual(definition.module.label)
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(50.dp).background(visual.bg, RoundedCornerShape(15.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(visual.icon, contentDescription = null, tint = visual.tint, modifier = Modifier.size(27.dp))
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(definition.title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(definition.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = "Abrir", tint = Color(0xFF294B83))
        }
    }
}
