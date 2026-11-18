package com.itemli.mobile.features.auth.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.presentation.components.LoginForm
import com.itemli.mobile.features.auth.presentation.viewmodels.DatabaseConnectionStatus
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary

private val Navy = Color(0xFF062B63)
private val DeepBlue = Color(0xFF041C49)
private val BrightBlue = Color(0xFF0752D8)
private val PaleBlue = Color(0xFFE8F1FF)
private val MutedText = Color(0xFF657493)

@Composable
fun LoginAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: LoginUiState,
    onAliasChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onBaseChange: (DependenciaRef?) -> Unit,
    onReloadBases: () -> Unit,
    onSubmit: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val maxWidth = if (windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Expanded) 480.dp else 440.dp
    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(DeepBlue, Navy, Color(0xFF0C4D9D), Color(0xFFF3F6FF)))
        ),
    ) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                Modifier.widthIn(max = maxWidth).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("ITEMLI", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Reportes Empresariales", color = Color(0xFFD8E8FF), style = MaterialTheme.typography.bodySmall)
                }
                IconButton(onClick = onOpenSettings) {
                    Icon(Icons.Filled.Settings, contentDescription = "Configurar servidor", tint = Color.White)
                }
            }
            Spacer(Modifier.height(34.dp))
            Column(
                Modifier.widthIn(max = maxWidth).fillMaxWidth().padding(bottom = 22.dp),
                horizontalAlignment = Alignment.Start,
            ) {
                Text("Bienvenido", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                Text(
                    "Accede de forma segura a los reportes de tu organización.",
                    color = Color(0xFFE0ECFF),
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(top = 7.dp),
                )
            }
            Card(
                modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(22.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
                    Text("Iniciar Sesión", style = MaterialTheme.typography.titleLarge, color = Navy, fontWeight = FontWeight.SemiBold)
                    DatabasePicker(
                        bases = state.bases,
                        selected = state.selectedBase,
                        loading = state.isLoadingBases,
                        status = state.connectionStatus,
                        onSelected = onBaseChange,
                        onReload = onReloadBases,
                    )
                    LoginForm(
                        alias = state.alias,
                        password = state.password,
                        isLoading = state.isLoading,
                        enabled = state.connectionStatus == DatabaseConnectionStatus.CONNECTED,
                        onAliasChanged = onAliasChange,
                        onPasswordChanged = onPasswordChange,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = onSubmit,
                        enabled = !state.isLoading && !state.isLoadingBases &&
                            state.connectionStatus == DatabaseConnectionStatus.CONNECTED &&
                            state.alias.isNotBlank() && state.password.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrightBlue),
                    ) {
                        if (state.isLoading) CircularProgressIndicator(color = Color.White)
                        else Text("Iniciar Sesión", fontWeight = FontWeight.SemiBold)
                    }
                    state.error?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Text(
                "Información confiable, siempre contigo",
                modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth().padding(top = 24.dp, bottom = 18.dp),
                color = Color(0xFFE7F0FF),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun DatabasePicker(
    bases: List<DependenciaRef>,
    selected: DependenciaRef?,
    loading: Boolean,
    status: DatabaseConnectionStatus,
    onSelected: (DependenciaRef?) -> Unit,
    onReload: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val statusText = when (status) {
        DatabaseConnectionStatus.TESTING -> "Comprobando conexión…"
        DatabaseConnectionStatus.CONNECTED -> "Conectado"
        DatabaseConnectionStatus.ERROR -> "Error de conexión"
        DatabaseConnectionStatus.IDLE -> null
    }
    val statusColor = when (status) {
        DatabaseConnectionStatus.TESTING -> Color(0xFFB7791F)
        DatabaseConnectionStatus.CONNECTED -> Color(0xFF15945B)
        DatabaseConnectionStatus.ERROR -> Color(0xFFD13B45)
        DatabaseConnectionStatus.IDLE -> MutedText
    }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Box {
            OutlinedTextField(
                value = selected?.baseDatos.orEmpty(),
                onValueChange = {},
                readOnly = true,
                enabled = !loading,
                placeholder = { Text(if (loading) "Cargando bases de datos…" else "Base de Datos") },
                leadingIcon = { Icon(Icons.Filled.Storage, contentDescription = null, tint = BrandPrimary) },
                trailingIcon = {
                    if (loading || status == DatabaseConnectionStatus.TESTING) {
                        CircularProgressIndicator(modifier = Modifier.padding(12.dp), strokeWidth = 2.dp)
                    } else {
                        Text("⌄", color = Navy, modifier = Modifier.padding(horizontal = 14.dp))
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(15.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Box(Modifier.matchParentSize().background(Color.Transparent).padding(end = 46.dp).then(Modifier)) {
                androidx.compose.foundation.clickable(onClick = { expanded = true })
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                bases.forEach { base ->
                    DropdownMenuItem(
                        text = { Text(base.baseDatos) },
                        onClick = { expanded = false; onSelected(base) },
                    )
                }
                if (bases.isEmpty() && !loading) {
                    DropdownMenuItem(text = { Text("No hay bases disponibles") }, onClick = { expanded = false })
                }
            }
        }
        if (statusText != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = statusColor, shape = CircleShape, modifier = Modifier.padding(start = 4.dp).height(7.dp).width(7.dp)) {}
                Text(statusText, color = statusColor, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 7.dp))
            }
        }
        if (bases.isEmpty() && !loading) {
            Text("No se pudieron cargar las bases. Revisa el servidor o vuelve a intentarlo.", color = MutedText, style = MaterialTheme.typography.bodySmall)
            Text(
                "Volver a cargar",
                color = BrightBlue,
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(start = 4.dp).then(Modifier),
            )
        }
    }
}
