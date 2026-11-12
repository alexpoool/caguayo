package com.itemli.mobile.features.settings.presentation.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Modal de ayuda "Cómo conectarse al proxy corporativo".
 * Solo UI: no toca ViewModel ni dominio.
 */
@Composable
fun ProxyHelpDialog(
    windowSizeClass: WindowSizeClass?,
    onDismiss: () -> Unit,
) {
    val maxWidth = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Medium -> 560.dp
        WindowWidthSizeClass.Expanded -> 640.dp
        else -> 480.dp
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.widthIn(max = maxWidth),
        title = { Text("Cómo conectarse al proxy") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
            ) {
                HelpSection("¿Qué es?") {
                    Text(
                        "Es el servidor que tu institución usa para dar salida a " +
                            "internet. Si tu red lo exige, la app también debe pasar por ahí.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                HelpSection("¿Cuándo activarlo?") {
                    Text(
                        "Solo si tu red lo pide. Si la app conecta bien sin proxy, " +
                            "déjalo apagado.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                HelpSection("Datos que necesitas") {
                    Text("• Host: IP o nombre del proxy (ej. 10.0.0.254)", style = MaterialTheme.typography.bodyMedium)
                    Text("• Puerto: normalmente 3128 u 8080", style = MaterialTheme.typography.bodyMedium)
                    Text("• Usuario y contraseña: solo si el proxy los pide", style = MaterialTheme.typography.bodyMedium)
                }
                HelpSection("¿Dónde consigo estos datos?") {
                    Text(
                        "Pídelos al administrador de redes de tu institución.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                HelpSection("Último paso") {
                    Text(
                        "Guarda la configuración y usa \"Probar conexión\" para verificarla.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                HelpSection("Seguridad") {
                    Text(
                        "El usuario y la contraseña del proxy se guardan cifrados en " +
                            "este dispositivo (Keystore de Android) y nunca se registran en logs.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Entendido") }
        },
    )
}

@Composable
private fun HelpSection(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        content()
    }
}
