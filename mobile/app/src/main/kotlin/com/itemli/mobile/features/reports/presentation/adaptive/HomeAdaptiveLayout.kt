package com.itemli.mobile.features.reports.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.TextSecondary

private val Navy = Color(0xFF06275C)
private val Blue = Color(0xFF0752D8)
private val Cyan = Color(0xFF13B9E8)
private val HomeSurface = Color(0xFFF3F6FF)

private data class HomeModule(
    val title: String,
    val icon: ImageVector,
    val tint: Color,
    val background: Color,
)

private val homeModules = listOf(
    HomeModule("Ventas", Icons.Filled.ShoppingCart, Color(0xFF0875E8), Color(0xFFDDEEFF)),
    HomeModule("Inventario", Icons.Filled.Inventory2, Color(0xFF079B69), Color(0xFFD7F6EA)),
    HomeModule("Clientes", Icons.Filled.Groups, Color(0xFF6738D7), Color(0xFFECE3FF)),
    HomeModule("Compras", Icons.Filled.Handshake, Color(0xFFD65B24), Color(0xFFFFE8DC)),
    HomeModule("Proyectos", Icons.Filled.Folder, Color(0xFF079DB5), Color(0xFFDDF6FA)),
    HomeModule("Generales", Icons.Filled.BarChart, Color(0xFF1554C8), Color(0xFFE2EBFF)),
)

/** Inicio ITEMLI: cabecera azul con bienvenida y módulos de acceso rápido. */
@Composable
fun HomeAdaptiveLayout(
    onOpenReports: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HomeSurface)
            .verticalScroll(rememberScrollState()),
    ) {
        Box(modifier = Modifier.fillMaxWidth().height(330.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Navy, Color(0xFF073F91), Blue),
                        ),
                    ),
            )
            // Ondas decorativas que reproducen el remate curvo del encabezado.
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(bottom = 0.dp)
                    .height(92.dp)
                    .clip(RoundedCornerShape(topStart = 100.dp, topEnd = 12.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color(0xFF20C5EA), Color(0xFF0875D8), Color(0xFF0B4BA8)),
                        ),
                    ),
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp)
                    .padding(top = 28.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        ItemliMark()
                        Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                            Text("ITEMLI", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                            Text("Reportes Empresariales", color = Color.White.copy(alpha = .86f), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    Surface(
                        modifier = Modifier.size(42.dp).clickable(onClick = onOpenSettings),
                        shape = RoundedCornerShape(50),
                        color = Color.White.copy(alpha = .12f),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Settings, contentDescription = "Ajustes", tint = Color.White)
                        }
                    }
                }
                Spacer(Modifier.height(28.dp))
                Text("Hola, Usuario", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(5.dp))
                Text(
                    "Accede a tus reportes de forma\nrápida y segura",
                    color = Color.White.copy(alpha = .94f),
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            Row(
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 28.dp, bottom = 18.dp),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                listOf(24.dp, 38.dp, 56.dp).forEach { barHeight ->
                    Box(
                        Modifier.size(width = 16.dp, height = barHeight)
                            .clip(RoundedCornerShape(topStart = 5.dp, topEnd = 5.dp))
                            .background(Cyan),
                    )
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(top = 0.dp),
            shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp, bottomStart = 22.dp, bottomEnd = 22.dp),
            color = Color.White,
            shadowElevation = 4.dp,
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("Reportes Disponibles", style = MaterialTheme.typography.titleLarge)
                    Surface(shape = RoundedCornerShape(50), color = Color(0xFFE3ECFF)) {
                        Text("6", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), color = Navy, fontWeight = FontWeight.Bold)
                    }
                }
                androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.fillMaxWidth().height(220.dp),
                    contentPadding = PaddingValues(0.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    userScrollEnabled = false,
                ) {
                    items(homeModules) { module ->
                        ModuleTile(module = module, onClick = onOpenReports)
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun ModuleTile(module: HomeModule, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().height(104.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = module.background),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Icon(module.icon, contentDescription = null, tint = module.tint, modifier = Modifier.size(34.dp))
            Text(module.title, color = Color(0xFF13264A), style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun ItemliMark() {
    Box(
        modifier = Modifier.size(width = 48.dp, height = 54.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(Brush.linearGradient(listOf(Cyan, Blue))),
        contentAlignment = Alignment.Center,
    ) {
        Text("E", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
    }
}
