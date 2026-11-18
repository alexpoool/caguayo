package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.History
import com.itemli.mobile.shared.ui.components.InteriorHeader
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Historial: no presenta registros ficticios; muestra el estado vacío hasta tener descargas registradas. */
@Composable
fun HistoryScreen(onBack: () -> Unit = {}) {
    Box(Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).padding(20.dp), contentAlignment = Alignment.TopStart) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            InteriorHeader(title = "Historial", onBack = onBack, actionIcon = Icons.Filled.History, actionDescription = "Historial", onAction = {})
            Surface(color = Color.White, shape = RoundedCornerShape(20.dp), shadowElevation = 1.dp) {
                Column(
                    Modifier.fillMaxSize().padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Surface(color = Color(0xFFE5EEFF), shape = RoundedCornerShape(18.dp)) {
                        Icon(Icons.Filled.Description, contentDescription = null, tint = Color(0xFF0752D8), modifier = Modifier.padding(18.dp).size(36.dp))
                    }
                    Text("Aún no hay reportes descargados", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
                    Text(
                        "Cuando descargues un PDF, podrás consultarlo desde esta sección.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF53658C),
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }
    }
}

