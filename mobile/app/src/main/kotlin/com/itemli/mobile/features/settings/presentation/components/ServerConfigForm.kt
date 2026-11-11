package com.itemli.mobile.features.settings.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Formulario de ajustes (URL base y proxy corporativo).
 */
@Composable
fun ServerConfigForm(
    baseUrl: String,
    proxyHost: String,
    proxyPort: String,
    proxyUser: String,
    proxyPassword: String,
    useProxy: Boolean,
    isLoading: Boolean,
    isTesting: Boolean,
    appLockEnabled: Boolean = false,
    appLockSupported: Boolean = true,
    onBaseUrlChange: (String) -> Unit,
    onProxyChange: (Boolean, String, String, String, String) -> Unit,
    onAppLockChange: (Boolean) -> Unit = {},
    onSave: () -> Unit,
    onTest: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = baseUrl,
            onValueChange = onBaseUrlChange,
            label = { Text("URL base") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(
                checked = useProxy,
                onCheckedChange = { checked -> onProxyChange(checked, proxyHost, proxyPort, proxyUser, proxyPassword) },
            )
            Text("Usar proxy corporativo")
        }

        if (appLockSupported) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = appLockEnabled,
                    onCheckedChange = onAppLockChange,
                )
                Text("Bloquear la app con biometría")
            }
        }

        if (useProxy) {
            OutlinedTextField(
                value = proxyHost,
                onValueChange = { onProxyChange(useProxy, it, proxyPort, proxyUser, proxyPassword) },
                label = { Text("Host del proxy") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = proxyPort,
                onValueChange = { onProxyChange(useProxy, proxyHost, it, proxyUser, proxyPassword) },
                label = { Text("Puerto") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = proxyUser,
                onValueChange = { onProxyChange(useProxy, proxyHost, proxyPort, it, proxyPassword) },
                label = { Text("Usuario (opcional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = proxyPassword,
                onValueChange = { onProxyChange(useProxy, proxyHost, proxyPort, proxyUser, it) },
                label = { Text("Contraseña (opcional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = onSave,
                enabled = !isLoading,
            ) { Text("Guardar") }

            OutlinedButton(
                onClick = onTest,
                enabled = !isTesting && baseUrl.isNotBlank(),
            ) {
                if (isTesting) CircularProgressIndicator() else Text("Probar conexión")
            }
        }
    }
}
