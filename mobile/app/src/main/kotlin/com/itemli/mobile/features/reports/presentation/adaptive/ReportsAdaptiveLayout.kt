package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReportsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportsListUiState,
    onOpenReport: (String) -> Unit,
    initialModule: String? = null,
    onBack: () -> Unit = {},
) {
    var search by remember { mutableStateOf("") }
    var searchVisible by remember { mutableStateOf(false) }
    val searchFocusRequester = remember { FocusRequester() }
    LaunchedEffect(searchVisible) { if (searchVisible) searchFocusRequester.requestFocus() }
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
    val isCompact = windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Compact
    val isExpanded = windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Expanded
    val gridColumns = when {
        isCompact -> 1
        isExpanded -> 3
        else -> 2
    }
    val horizontalPadding = if (isCompact) 16.dp else 24.dp

    Column(
        Modifier.fillMaxSize().background(SurfaceLight).padding(horizontal = horizontalPadding).padding(top = if (isCompact) 12.dp else 20.dp),
        verticalArrangement = Arrangement.spacedBy(if (isCompact) 10.dp else 14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(52.dp)
                .background(Color(0xFF082D66), RoundedCornerShape(0.dp))
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.ArrowBack,
                contentDescription = "Volver",
                tint = Color.White,
                modifier = Modifier.size(22.dp).clickable(onClick = onBack),
            )
            Spacer(Modifier.width(14.dp))
            AnimatedContent(
                targetState = searchVisible,
                modifier = Modifier.weight(1f),
                transitionSpec = {
                    fadeIn(tween(180)) togetherWith fadeOut(tween(120)) using
                        SizeTransform(clip = false)
                },
                label = "reports-header-search",
            ) { expanded ->
                if (expanded) {
                    BasicTextField(
                        value = search,
                        onValueChange = { search = it },
                        modifier = Modifier.fillMaxWidth().focusRequester(searchFocusRequester),
                        singleLine = true,
                        textStyle = TextStyle(
                            color = Color.White,
                            fontSize = MaterialTheme.typography.titleMedium.fontSize,
                            fontWeight = FontWeight.Medium,
                        ),
                        cursorBrush = SolidColor(Color.White),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        decorationBox = { innerTextField ->
                            Box {
                                if (search.isEmpty()) {
                                    Text("Buscar reporte…", color = Color.White.copy(alpha = .68f), style = MaterialTheme.typography.titleMedium)
                                }
                                innerTextField()
                            }
                        },
                    )
                } else {
                    Text("Reportes", color = Color.White, style = MaterialTheme.typography.titleMedium)
                }
            }
            Spacer(Modifier.width(12.dp))
            Icon(
                if (searchVisible) Icons.Filled.Close else Icons.Filled.Search,
                contentDescription = if (searchVisible) "Cerrar búsqueda" else "Buscar reportes",
                tint = Color.White,
                modifier = Modifier.size(23.dp).clickable {
                    searchVisible = !searchVisible
                    if (!searchVisible) search = ""
                },
            )
        }
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            modules.forEach { module ->
                FilterChip(
                    selected = selectedModule == module,
                    onClick = { selectedModule = module },
                    label = { Text(module, maxLines = 1) },
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
            LazyVerticalGrid(
                columns = GridCells.Fixed(gridColumns),
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(if (isCompact) 9.dp else 14.dp),
                horizontalArrangement = Arrangement.spacedBy(if (isCompact) 0.dp else 14.dp),
            ) {
                items(filtered, key = { it.id }) { definition ->
                    ReportRow(
                        definition = definition,
                        compact = isCompact,
                        onClick = { onOpenReport(definition.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ReportRow(definition: ReportDefinition, compact: Boolean, onClick: () -> Unit) {
    val visual = reportVisual(definition.module.label)
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = if (compact) 13.dp else 16.dp, vertical = if (compact) 12.dp else 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(if (compact) 50.dp else 56.dp).background(visual.bg, RoundedCornerShape(15.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(visual.icon, contentDescription = null, tint = visual.tint, modifier = Modifier.size(27.dp))
            }
            Spacer(Modifier.width(if (compact) 13.dp else 16.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(definition.title, style = MaterialTheme.typography.titleSmall, maxLines = 3, overflow = TextOverflow.Clip)
                Text(definition.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = "Abrir", tint = Color(0xFF294B83))
        }
    }
}
