package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.components.ReportCard
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportsListUiState

/**
 * Layout adaptativo del catálogo de reportes.
 *
 * - Compact  → grid de 1 columna.
 * - Medium   → grid de 2 columnas.
 * - Expanded → grid de 3 columnas.
 */
@Composable
fun ReportsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: ReportsListUiState,
    onOpenReport: (String) -> Unit,
) {
    val cells = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 1
        WindowWidthSizeClass.Medium -> 2
        else -> 3
    }
    val padding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 12.dp
        WindowWidthSizeClass.Medium -> 16.dp
        else -> 24.dp
    }

    Column(Modifier.fillMaxSize().padding(padding)) {
        Text(
            text = "Reportes",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(cells),
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(state.definitions) { definition ->
                ReportCard(definition = definition, onOpenReport = onOpenReport)
            }
        }
    }
}
