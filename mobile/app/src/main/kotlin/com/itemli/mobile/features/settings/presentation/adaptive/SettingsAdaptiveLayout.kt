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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsUiState
import com.itemli.mobile.shared.ui.components.InteriorHeader
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.FontSizePreferences

enum class SettingsSection(val title: String) {
    SERVER("Servidor"),
    PROXY("Proxy corporativo"),
    SECURITY("Seguridad"),
    FONT_SIZE("Tamaño de letra"),
    DOWNLOADS("Descargas"),
    ABOUT("Acerca de"),
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
    fontScale: Float = FontSizePreferences.DEFAULT_SCALE,
    onFontScaleChange: (Float) -> Unit = {},
    section: SettingsSection? = null,
    onOpenSection: (SettingsSection?) -> Unit = {},
    onBack: () -> Unit = {},
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
            title = section?.title ?: "Ajustes",
            onBack = if (section == null) onBack else ({ onOpenSection(null) }),
            actionIcon = Icons.Filled.Settings,
            actionDescription = "Ajustes",
        )

        if (section == null) {
            SettingsEntry(Icons.Filled.Storage, "Servidor", state.baseUrl.ifBlank { "Configurar conexión con el servidor" }) { onOpenSection(SettingsSection.SERVER) }
            SettingsEntry(Icons.Filled.Settings, "Proxy corporativo", if (state.useProxy) "Activado · ${state.proxyHost}:${state.proxyPort}" else "Configurar conexión mediante proxy") { onOpenSection(SettingsSection.PROXY) }
            SettingsEntry(Icons.Filled.Security, "Seguridad", if (state.appLockEnabled) "Autenticación biométrica activada" else "Protección de acceso y biometría") { onOpenSection(SettingsSection.SECURITY) }
            SettingsEntry(Icons.Filled.Settings, "Tamaño de letra", "${(fontScale * 100).toInt()} % · Personalizar la lectura") { onOpenSection(SettingsSection.FONT_SIZE) }
            SettingsEntry(Icons.Filled.Storage, "Descargas", pdfDirName?.let { "Carpeta: $it" } ?: "Ubicación de reportes PDF") { onOpenSection(SettingsSection.DOWNLOADS) }
            SettingsEntry(Icons.Filled.Info, "Acerca de", "Versión e información de ITEMLI") { onOpenSection(SettingsSection.ABOUT) }
            Column(Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("ITEMLI", style = MaterialTheme.typography.headlineLarge, color = BrandPrimary, fontWeight = FontWeight.Bold)
                Text("Reportes Empresariales", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
            }
        } else {
            when (section) {
                SettingsSection.SERVER -> SettingsCard {
                    Text("Conexión del servidor", style = MaterialTheme.typography.titleMedium)
                    Text("Dirección del servicio al que se conecta ITEMLI.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(value = state.baseUrl, onValueChange = onBaseUrlChange, label = { Text("URL base") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    ActionButtons(state.isLoading, state.isTesting, onSave, onTest)
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
                SettingsSection.PROXY -> SettingsCard {
                    Text("Conexión mediante proxy", style = MaterialTheme.typography.titleMedium)
                    Text("Configura los datos proporcionados por el administrador de red.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Usar proxy corporativo", fontWeight = FontWeight.Medium)
                            Text(if (state.useProxy) "Proxy activado" else "Conexión directa", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(checked = state.useProxy, onCheckedChange = { onProxyChange(it, state.proxyHost, state.proxyPort, state.proxyUser, state.proxyPassword) })
                    }
                    if (state.useProxy) {
                        OutlinedTextField(value = state.proxyHost, onValueChange = { onProxyChange(true, it, state.proxyPort, state.proxyUser, state.proxyPassword) }, label = { Text("Servidor / Host") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = state.proxyPort, onValueChange = { onProxyChange(true, state.proxyHost, it, state.proxyUser, state.proxyPassword) }, label = { Text("Puerto") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = state.proxyUser, onValueChange = { onProxyChange(true, state.proxyHost, state.proxyPort, it, state.proxyPassword) }, label = { Text("Usuario (opcional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = state.proxyPassword, onValueChange = { onProxyChange(true, state.proxyHost, state.proxyPort, state.proxyUser, it) }, label = { Text("Contraseña (opcional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    }
                    Button(onClick = onSave, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) {
                        if (state.isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp)) else Text("Guardar configuración")
                    }
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
                SettingsSection.SECURITY -> SettingsCard {
                    Text("Protección de acceso", style = MaterialTheme.typography.titleMedium)
                    Text("Utiliza la autenticación biométrica del dispositivo para proteger el acceso.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    if (state.appLockSupported) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Autenticación biométrica", fontWeight = FontWeight.Medium)
                                Text("Solicitar desbloqueo al abrir ITEMLI", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = state.appLockEnabled, onCheckedChange = onAppLockChange)
                        }
                    } else Text("Este dispositivo no tiene biometría compatible.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
                SettingsSection.FONT_SIZE -> SettingsCard {
                    Text("Personalizar tamaño de letra", style = MaterialTheme.typography.titleMedium)
                    Text("El cambio se aplica a toda la aplicación y se guarda automáticamente.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    Text("Vista previa", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Reportes empresariales ITEMLI", style = MaterialTheme.typography.bodyLarge)
                    Text("Información clara y fácil de leer.", style = MaterialTheme.typography.bodyMedium)
                    Text("${(fontScale * 100).toInt()} %", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                    Slider(value = fontScale, onValueChange = onFontScaleChange, valueRange = FontSizePreferences.MIN_SCALE..FontSizePreferences.MAX_SCALE, steps = 2)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Pequeño", style = MaterialTheme.typography.labelSmall)
                        Text("Normal", style = MaterialTheme.typography.labelSmall)
                        Text("Grande", style = MaterialTheme.typography.labelSmall)
                    }
                    OutlinedButton(onClick = { onFontScaleChange(FontSizePreferences.DEFAULT_SCALE) }) { Text("Restablecer tamaño") }
                }
                SettingsSection.DOWNLOADS -> SettingsCard {
                    Text("Carpeta de descargas", style = MaterialTheme.typography.titleMedium)
                    Text(pdfDirName?.let { "Carpeta seleccionada: $it" } ?: "Los reportes PDF se guardan en la carpeta interna privada de ITEMLI.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = onPickPdfDir) { Text("Elegir carpeta") }
                    if (pdfDirName != null) OutlinedButton(onClick = onResetPdfDir) { Text("Usar carpeta interna") }
                }
                SettingsSection.ABOUT -> SettingsCard {
                    Text("ITEMLI", style = MaterialTheme.typography.headlineMedium, color = BrandPrimary, fontWeight = FontWeight.Bold)
                    Text("Reportes Empresariales", style = MaterialTheme.typography.titleMedium)
                    Text("Versión 1.0.0", style = MaterialTheme.typography.bodyMedium)
                    Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        state.message?.takeIf { section != SettingsSection.SERVER && section != SettingsSection.PROXY && section != SettingsSection.SECURITY }?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SettingsEntry(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 17.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = BrandPrimary, modifier = Modifier.size(27.dp))
            Column(Modifier.weight(1f).padding(start = 14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("›", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
    }
}

@Composable
private fun ActionButtons(isLoading: Boolean, isTesting: Boolean, onSave: () -> Unit, onTest: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(onClick = onSave, enabled = !isLoading, modifier = Modifier.weight(1f)) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp)) else Text("Guardar")
        }
        OutlinedButton(onClick = onTest, enabled = !isTesting, modifier = Modifier.weight(1f)) {
            if (isTesting) CircularProgressIndicator(modifier = Modifier.size(18.dp)) else Text("Probar conexión")
        }
    }
}
