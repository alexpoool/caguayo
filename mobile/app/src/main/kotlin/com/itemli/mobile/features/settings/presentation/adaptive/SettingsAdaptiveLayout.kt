package com.itemli.mobile.features.settings.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.settings.presentation.components.ServerConfigForm
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsUiState
import com.itemli.mobile.shared.ui.components.InteriorHeader
import com.itemli.mobile.shared.ui.theme.BrandPrimary

enum class SettingsSection(val title: String, val description: String) {
    HOME("Ajustes", ""),
    SERVER("Servidor", "Dirección del servicio ITEMLI"),
    SECURITY("Seguridad", "Protección de acceso"),
    PROXY("Proxy corporativo", "Conexión mediante proxy"),
    FONT_SIZE("Tamaño de letra", "Personaliza la lectura"),
    DOWNLOADS("Descargas", "Carpeta para guardar reportes PDF"),
    ABOUT("Acerca de", "Información de ITEMLI"),
}

@Composable
fun SettingsAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: SettingsUiState,
    onBaseUrlChange: (String) -> Unit,
    onProxyChange: (Boolean, String, String, String, String) -> Unit,
    onAppLockChange: (Boolean) -> Unit,
    onPickPdfDir: () -> Unit = {},
    onResetPdfDir: () -> Unit = {},
    onSave: () -> Unit,
    onTest: () -> Unit,
    pdfDirName: String? = null,
    section: SettingsSection = SettingsSection.HOME,
    onOpenSection: (SettingsSection) -> Unit = {},
    onBack: () -> Unit = {},
    fontScale: Float = 1f,
    onFontScaleChange: (Float) -> Unit = {},
) {
    Column(
        Modifier.fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(top = 18.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        InteriorHeader(
            title = section.title,
            onBack = if (section == SettingsSection.HOME) onBack else ({ onOpenSection(SettingsSection.HOME) }),
            actionIcon = Icons.Filled.Settings,
            actionDescription = "Ajustes",
        )

        if (section == SettingsSection.HOME) {
            SettingsEntry(Icons.Filled.Storage, "Servidor", "Dirección del servicio ITEMLI") { onOpenSection(SettingsSection.SERVER) }
            SettingsEntry(Icons.Filled.Security, "Seguridad", if (state.appLockEnabled) "Autenticación biométrica activada" else "Autenticación biométrica desactivada") { onOpenSection(SettingsSection.SECURITY) }
            SettingsEntry(Icons.Filled.Storage, "Proxy corporativo", if (state.useProxy) "Configurado y activado" else "Configurar conexión mediante proxy") { onOpenSection(SettingsSection.PROXY) }
            SettingsEntry(Icons.Filled.Settings, "Tamaño de letra", "Personaliza la lectura en toda la aplicación") { onOpenSection(SettingsSection.FONT_SIZE) }
            SettingsEntry(Icons.Filled.Storage, "Descargas", pdfDirName?.let { "Carpeta: $it" } ?: "Carpeta interna para reportes PDF") { onOpenSection(SettingsSection.DOWNLOADS) }
            SettingsEntry(Icons.Filled.Info, "Acerca de", "Versión e información de ITEMLI") { onOpenSection(SettingsSection.ABOUT) }

            Column(
                Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("ITEMLI", style = MaterialTheme.typography.headlineLarge, color = BrandPrimary)
                Text("Reportes Empresariales", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
            }
        } else {
            when (section) {
                SettingsSection.SERVER -> {
                    SettingsDescription("Configura la dirección del servidor al que se conecta la aplicación.")
                    SettingsCard {
                        ServerConfigForm(
                            baseUrl = state.baseUrl,
                            proxyHost = state.proxyHost,
                            proxyPort = state.proxyPort,
                            proxyUser = state.proxyUser,
                            proxyPassword = state.proxyPassword,
                            useProxy = state.useProxy,
                            isLoading = state.isLoading,
                            isTesting = state.isTesting,
                            onBaseUrlChange = onBaseUrlChange,
                            onProxyChange = onProxyChange,
                            onSave = onSave,
                            onTest = onTest,
                            showProxy = false,
                            showSecurity = false,
                            showPdf = false,
                            showServer = true,
                            windowSizeClass = windowSizeClass,
                        )
                    }
                }
                SettingsSection.PROXY -> {
                    SettingsDescription("Introduce los datos proporcionados por el administrador de red. Si no utilizas proxy, deja esta opción desactivada.")
                    SettingsCard {
                        ServerConfigForm(
                            baseUrl = state.baseUrl,
                            proxyHost = state.proxyHost,
                            proxyPort = state.proxyPort,
                            proxyUser = state.proxyUser,
                            proxyPassword = state.proxyPassword,
                            useProxy = state.useProxy,
                            isLoading = state.isLoading,
                            isTesting = state.isTesting,
                            onBaseUrlChange = onBaseUrlChange,
                            onProxyChange = onProxyChange,
                            onSave = onSave,
                            onTest = onTest,
                            showServer = false,
                            showProxy = true,
                            showSecurity = false,
                            showPdf = false,
                            windowSizeClass = windowSizeClass,
                        )
                    }
                }
                SettingsSection.SECURITY -> {
                    SettingsDescription("Controla la protección biométrica para acceder a ITEMLI.")
                    SettingsCard {
                        if (state.appLockSupported) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Security, contentDescription = null, tint = BrandPrimary)
                                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                                    Text("Autenticación biométrica", style = MaterialTheme.typography.titleMedium)
                                    Text("Solicitar autenticación al acceder a la aplicación", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                androidx.compose.material3.Switch(checked = state.appLockEnabled, onCheckedChange = onAppLockChange)
                            }
                        } else {
                            Text("Este dispositivo no tiene autenticación biométrica disponible.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                SettingsSection.FONT_SIZE -> {
                    SettingsDescription("El tamaño seleccionado se aplica a los textos de toda la aplicación.")
                    SettingsCard {
                        Text("Vista previa", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Reportes empresariales ITEMLI", style = MaterialTheme.typography.bodyLarge)
                        Text("Información clara y fácil de leer.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.size(4.dp))
                        Text("Tamaño: ${(fontScale * 100).toInt()} %", style = MaterialTheme.typography.titleMedium)
                        Slider(value = fontScale, onValueChange = onFontScaleChange, valueRange = 0.85f..1.30f)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Pequeño", style = MaterialTheme.typography.labelSmall)
                            Text("Grande", style = MaterialTheme.typography.labelSmall)
                        }
                        androidx.compose.material3.OutlinedButton(onClick = { onFontScaleChange(1f) }) {
                            Text("Restablecer tamaño")
                        }
                    }
                }
                SettingsSection.DOWNLOADS -> {
                    SettingsDescription("Selecciona dónde quieres guardar los reportes PDF exportados.")
                    SettingsCard {
                        Text(pdfDirName?.let { "Carpeta actual: $it" } ?: "Actualmente se utiliza la carpeta interna de ITEMLI.", style = MaterialTheme.typography.bodyMedium)
                        androidx.compose.material3.Button(onClick = onPickPdfDir) { Text("Elegir carpeta") }
                        if (pdfDirName != null) {
                            androidx.compose.material3.OutlinedButton(onClick = onResetPdfDir) { Text("Usar carpeta interna") }
                        }
                    }
                }
                SettingsSection.ABOUT -> {
                    SettingsCard {
                        Text("ITEMLI", style = MaterialTheme.typography.headlineMedium, color = BrandPrimary)
                        Text("Reportes Empresariales", style = MaterialTheme.typography.titleMedium)
                        Text("Versión 1.0.0", style = MaterialTheme.typography.bodyMedium)
                        Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                SettingsSection.HOME -> Unit
            }
        }
        state.message?.let { message ->
            Text(message, color = if (message.contains("guardada", true) || message.contains("activado", true)) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun SettingsEntry(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = BrandPrimary, modifier = Modifier.size(27.dp))
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("›", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SettingsDescription(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
    }
}
