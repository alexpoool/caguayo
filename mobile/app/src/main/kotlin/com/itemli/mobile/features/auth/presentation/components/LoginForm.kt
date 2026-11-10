package com.itemli.mobile.features.auth.presentation.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Formulario puro de login, sin lógica de negocio en la capa de presentación.
 */
@Composable
fun LoginForm(
    alias: String,
    password: String,
    isLoading: Boolean,
    onAliasChanged: (String) -> Unit,
    onPasswordChanged: (String) -> Unit,
    onSearchBases: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    androidx.compose.foundation.layout.Column(modifier) {
        OutlinedTextField(
            value = alias,
            onValueChange = onAliasChanged,
            label = { Text("Alias") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChanged,
            label = { Text("Contraseña") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(
            onClick = onSearchBases,
            enabled = alias.isNotBlank() && !isLoading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Buscar dependencias")
        }
        Button(
            onClick = onSubmit,
            enabled = !isLoading && password.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (isLoading) CircularProgressIndicator() else Text("Iniciar sesión")
        }
    }
}
