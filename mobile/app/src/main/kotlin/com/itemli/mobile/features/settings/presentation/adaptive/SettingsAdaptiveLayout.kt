package com.itemli.mobile.features.settings.presentation.adaptive

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Settings
import com.itemli.mobile.shared.ui.components.InteriorHeader
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.settings.presentation.components.ServerConfigForm
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.TextSecondary

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
    onBack: () -> Unit = {},
) {
    Column(
        Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp).padding(top = 18.dp, bottom = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        InteriorHeader(title = "Ajustes", onBack = onBack, actionIcon = Icons.Filled.Settings, actionDescription = "Ajustes")
        Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Storage, contentDescription = null, tint = BrandPrimary)
                    Column(Modifier.padding(start = 10.dp)) {
                        Text("Servidor", style = MaterialTheme.typography.titleMedium)
                        Text(state.baseUrl, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
                ServerConfigForm(
                    baseUrl = state.baseUrl,
                    proxyHost = state.proxyHost,
                    proxyPort = state.proxyPort,
                    proxyUser = state.proxyUser,
                    proxyPassword = state.proxyPassword,
                    useProxy = state.useProxy,
                    isLoading = state.isLoading,
                    isTesting = state.isTesting,
                    appLockEnabled = state.appLockEnabled,
                    appLockSupported = state.appLockSupported,
                    pdfDirName = pdfDirName,
                    onBaseUrlChange = onBaseUrlChange,
                    onProxyChange = onProxyChange,
                    onAppLockChange = onAppLockChange,
                    onPickPdfDir = onPickPdfDir,
                    onResetPdfDir = onResetPdfDir,
                    onSave = onSave,
                    onTest = onTest,
                    windowSizeClass = windowSizeClass,
                )
                state.message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }
        Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Security, contentDescription = null, tint = BrandPrimary)
                Column(Modifier.padding(start = 12.dp)) {
                    Text("Seguridad", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (state.appLockEnabled) "Autenticación biométrica activada" else "Autenticación biométrica desactivada",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                    )
                }
            }
        }
        Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Info, contentDescription = null, tint = BrandPrimary)
                Column(Modifier.padding(start = 12.dp)) {
                    Text("Acerca de ITEMLI", style = MaterialTheme.typography.titleMedium)
                    Text("Cliente de reportes · Versión 1.0.0", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
            }
        }
        Column(Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("ITEMLI", style = MaterialTheme.typography.headlineLarge, color = BrandPrimary)
            Text("Reportes Empresariales", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Text("Información confiable, siempre contigo", style = MaterialTheme.typography.bodyMedium, color = TextSecondary, modifier = Modifier.padding(top = 8.dp))
        }
    }
}
