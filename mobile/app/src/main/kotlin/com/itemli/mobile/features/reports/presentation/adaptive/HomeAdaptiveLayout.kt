package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.BrandTertiary
import com.itemli.mobile.shared.ui.theme.TextSecondary

/** Portada de inicio del cliente de reportes. */
@Composable
fun HomeAdaptiveLayout(
    onOpenReports: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF5F7FB))
            .padding(horizontal = 22.dp).padding(top = 26.dp, bottom = 18.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("ITEMLI", color = BrandPrimary, style = MaterialTheme.typography.titleMedium)
            Text("Centro de reportes", style = MaterialTheme.typography.headlineLarge)
            Text("Consulta la información de tu organización y genera informes en PDF.",
                color = TextSecondary, style = MaterialTheme.typography.bodyLarge)
        }
        Surface(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenReports),
            shape = RoundedCornerShape(24.dp), color = BrandPrimary, shadowElevation = 3.dp,
        ) {
            Row(Modifier.padding(22.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Icon(Icons.AutoMirrored.Filled.List, null, tint = Color.White, modifier = Modifier.size(34.dp))
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("Explorar informes", color = Color.White, style = MaterialTheme.typography.titleLarge)
                    Text("Busca por módulo, selecciona un informe y configura sus parámetros.",
                        color = Color.White.copy(alpha = 0.86f), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        Text("Acceso rápido", style = MaterialTheme.typography.titleLarge)
        LazyVerticalGrid(
            columns = GridCells.Fixed(2), modifier = Modifier.fillMaxWidth().weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(listOf(
                HomeAction("Catálogo", "Todos los informes disponibles", Icons.AutoMirrored.Filled.List, onOpenReports),
                HomeAction("Consultas", "Filtra por fechas y opciones", Icons.Filled.Search, onOpenReports),
                HomeAction("PDF", "Previsualiza y descarga resultados", Icons.Filled.Download, onOpenReports),
                HomeAction("Ajustes", "Servidor y preferencias", Icons.Filled.Assessment, onOpenSettings),
            )) { action ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable(onClick = action.onClick),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(action.icon, null, tint = BrandTertiary, modifier = Modifier.size(28.dp))
                        Text(action.title, style = MaterialTheme.typography.titleMedium)
                        Text(action.subtitle, color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

private data class HomeAction(
    val title: String,
    val subtitle: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val onClick: () -> Unit,
)
