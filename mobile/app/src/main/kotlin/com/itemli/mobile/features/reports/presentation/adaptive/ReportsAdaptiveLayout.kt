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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportsListUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.BrandTertiary
import com.itemli.mobile.shared.ui.theme.OutlineSoft
import com.itemli.mobile.shared.ui.theme.SurfaceLight
import com.itemli.mobile.shared.ui.theme.TextSecondary

/**
 * Catálogo de informes: búsqueda local y filtro por módulo.
 * Los datos siguen llegando del catálogo real del backend.
 */
@Composable
fun ReportsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportsListUiState,
    onOpenReport: (String) -> Unit,
) {
    val columns = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 1
        WindowWidthSizeClass.Medium -> 2
        else -> 3
    }
    val horizontalPadding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 20.dp
        WindowWidthSizeClass.Medium -> 24.dp
        else -> 32.dp
    }

    var search by remember { mutableStateOf("") }
    var selectedModule by remember { mutableStateOf("Todos") }
    val modules = remember(state.definitions) {
        listOf("Todos") + state.definitions.map { it.module.label }.distinct().sorted()
    }
    val filteredReports = remember(state.definitions, search, selectedModule) {
        state.definitions.filter { report ->
            val matchesModule = selectedModule == "Todos" || report.module.label == selectedModule
            val query = search.trim()
            val matchesSearch = query.isEmpty() ||
                report.title.contains(query, ignoreCase = true) ||
                report.description.contains(query, ignoreCase = true) ||
                report.module.label.contains(query, ignoreCase = true)
            matchesModule && matchesSearch
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceLight)
            .padding(horizontal = horizontalPadding)
            .padding(top = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(
                text = "Tus informes",
                style = MaterialTheme.typography.headlineLarge,
            )
            Text(
                text = "Consulta y descarga la información que necesitas.",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
        }

        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color.White,
            shadowElevation = 1.dp,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color(0xFFEAF1FF), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.List, contentDescription = null, tint = BrandPrimary)
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        text = "${state.definitions.size} informes disponibles",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        text = "Información actualizada desde tu servidor",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                    )
                }
            }
        }

        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text("Buscar un informe…") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = Color.White,
                focusedContainerColor = Color.White,
                unfocusedBorderColor = OutlineSoft,
            ),
        )

        androidx.compose.foundation.lazy.LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(modules.size) { index ->
                val module = modules[index]
                FilterChip(
                    selected = selectedModule == module,
                    onClick = { selectedModule = module },
                    label = { Text(module) },
                    shape = RoundedCornerShape(50),
                )
            }
        }

        Text(
            text = "Catálogo de informes",
            style = MaterialTheme.typography.titleLarge,
        )

        if (filteredReports.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Filled.Search,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(36.dp),
                    )
                    Text("No encontramos informes", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Prueba con otro nombre o módulo.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(columns),
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(filteredReports, key = { it.id }) { definition ->
                    ReportCatalogCard(definition = definition) {
                        onOpenReport(definition.id)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportCatalogCard(
    definition: ReportDefinition,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFEAF1FF), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.List,
                        contentDescription = null,
                        tint = if (definition.module.label.hashCode() % 2 == 0) BrandPrimary else BrandTertiary,
                    )
                }
                Spacer(Modifier.weight(1f))
                Icon(
                    Icons.AutoMirrored.Filled.List,
                    contentDescription = "Abrir informe",
                    tint = TextSecondary,
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = definition.module.label.uppercase(),
                    style = MaterialTheme.typography.labelLarge,
                    color = BrandPrimary,
                )
                Text(
                    text = definition.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = definition.description,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
