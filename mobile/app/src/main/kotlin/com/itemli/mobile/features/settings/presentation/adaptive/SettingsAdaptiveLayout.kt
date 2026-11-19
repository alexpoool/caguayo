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
import androidx.compose.material.icons.filled.ChevronRight
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
            SettingsOptionCard(
                icon = Icons.Filled.Storage,
                title = "Servidor",
                subtitle = state.baseUrl.ifBlank { "Configurar conexión con el servidor" },
                onClick = { onOpenSection(SettingsSection.SERVER) },
            )
            SettingsOptionCard(
                icon = Icons.Filled.Settings,
                title = "Proxy corporativo",
                subtitle = if (state.useProxy) "Proxy activado · ${state.proxyHost}:${state.proxyPort}" else "Configurar conexión mediante proxy",
                onClick = { onOpenSection(SettingsSection.PROXY) },
            )
            SettingsOptionCard(
                icon = Icons.Filled.Security,
                title = "Seguridad",
                subtitle = if (state.appLockEnabled) "Autenticación biométrica activada" else "Protección de acceso y biometría",
                onClick = { onOpenSection(SettingsSection.SECURITY) },
            )
            SettingsOptionCard(
                icon = Icons.Filled.Settings,
                title = "Tamaño de letra",
                subtitle = "${(fontScale * 100).toInt()} % · Personalizar la lectura",
                onClick = { onOpenSection(SettingsSection.FONT_SIZE) },
            )
            SettingsOptionCard(
                icon = Icons.Filled.Info,
                title = "Acerca de",
                subtitle = "Información y versión de ITEMLI",
                onClick = { onOpenSection(SettingsSection.ABOUT) },
            )
            Column(
                Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text("ITEMLI", style = MaterialTheme.typography.headlineLarge, color = BrandPrimary, fontWeight = FontWeight.Bold)
                Text("Reportes Empresariales", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
            }
        } else {
            when (section) {
                SettingsSection.SERVER -> {
                    SettingsCard {
                        Text("Conexión del servidor", style = MaterialTheme.typography.titleMedium)
                        Text("Dirección del servicio al que se conecta ITEMLI.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = state.baseUrl,
                            onValueChange = onBaseUrlChange,
                            label = { Text("URL base") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text("Descargas de PDF", style = MaterialTheme.typography.titleMedium)
                        Text(
                            pdfDirName?.let { "Carpeta seleccionada: $it" }
                                ?: "Los PDF se guardan en la carpeta interna privada de la aplicación.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = onPickPdfDir) { Text("Elegir carpeta") }
                            if (pdfDirName != null) OutlinedButton(onClick = onResetPdfDir) { Text("Restablecer") }
                        }
                        SettingsActions(isLoading = state.isLoading, isTesting = state.isTesting, onSave = onSave, onTest = onTest)
                        state.message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    }
                }
                SettingsSection.PROXY -> {
                    SettingsCard {
                        Text("Proxy corporativo", style = MaterialTheme.typography.titleMedium)
                        Text("Utiliza un servidor intermediario para conectar con la red de tu organización.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Usar proxy corporativo", fontWeight = FontWeight.Medium)
                                Text(if (state.useProxy) "La conexión utilizará el proxy configurado" else "La conexión directa está activa", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = state.useProxy,
                                onCheckedChange = { enabled -> onProxyChange(enabled, state.proxyHost, state.proxyPort, state.proxyUser, state.proxyPassword) },
                            )
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
                        state.message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    }
                }
                SettingsSection.SECURITY -> {
                    SettingsCard {
                        Text("Protección de acceso", style = MaterialTheme.typography.titleMedium)
                        Text("Controla el acceso a ITEMLI mediante la seguridad biométrica disponible en el dispositivo.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (state.appLockSupported) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("Autenticación biométrica", fontWeight = FontWeight.Medium)
                                    Text("Solicitar desbloqueo al entrar en la aplicación", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Switch(checked = state.appLockEnabled, onCheckedChange = onAppLockChange)
                            }
                        } else {
                            Text("Este dispositivo no dispone de autenticación biométrica compatible.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        state.message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    }
                }
                SettingsSection.FONT_SIZE -> {
                    SettingsCard {
                        Text("Personalizar tamaño de letra", style = MaterialTheme.typography.titleMedium)
                        Text("El cambio se aplica a toda la aplicación y se conserva al volver a abrirla.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Vista previa", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Reportes Empresariales", style = MaterialTheme.typography.headlineSmall)
                        Text("Información clara para trabajar mejor con ITEMLI.", style = MaterialTheme.typography.bodyMedium)
                        Text("${(fontScale * 100).toInt()} %", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                        Slider(
                            value = fontScale,
                            onValueChange = onFontScaleChange,
                            valueRange = FontSizePreferences.MIN_SCALE..FontSizePreferences.MAX_SCALE,
                            steps = 2,
                        )
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Pequeño", style = MaterialTheme.typography.labelSmall)
                            Text("Normal", style = MaterialTheme.typography.labelSmall)
                            Text("Grande", style = MaterialTheme.typography.labelSmall)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { onFontScaleChange(FontSizePreferences.DEFAULT_SCALE) }, modifier = Modifier.weight(1f)) { Text("Restablecer") }
                            Button(onClick = { onOpenSection(null) }, modifier = Modifier.weight(1f)) { Text("Listo") }
                        }
                    }
                }
                SettingsSection.ABOUT -> {
                    SettingsCard {
                        Text("ITEMLI", style = MaterialTheme.typography.headlineMedium, color = BrandPrimary, fontWeight = FontWeight.Bold)
                        Text("Reportes Empresariales", style = MaterialTheme.typography.titleMedium)
                        Text("Versión 1.0.0", style = MaterialTheme.typography.bodyMedium)
                        Text("Información confiable, siempre contigo.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsOptionCard(
    icon: ImageVector,
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
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 17.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = BrandPrimary, modifier = Modifier.size(27.dp))
            Column(Modifier.weight(1f).padding(start = 14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = "Abrir $title", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(
            Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            content = { content() },
        )
    }
}

@Composable
private fun SettingsActions(
    isLoading: Boolean,
    isTesting: Boolean,
    onSave: () -> Unit,
    onTest: () -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(onClick = onSave, enabled = !isLoading, modifier = Modifier.weight(1f)) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp)) else Text("Guardar")
        }
        OutlinedButton(onClick = onTest, enabled = !isTesting, modifier = Modifier.weight(1f)) {
            if (isTesting) CircularProgressIndicator(modifier = Modifier.size(18.dp)) else Text("Probar conexión")
        }
    }
}
