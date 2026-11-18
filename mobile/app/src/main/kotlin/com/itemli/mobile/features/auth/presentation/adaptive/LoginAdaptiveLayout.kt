package com.itemli.mobile.features.auth.presentation.adaptive

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.presentation.components.LoginForm
import com.itemli.mobile.features.auth.presentation.viewmodels.DatabaseConnectionStatus
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary

private val Navy = Color(0xFF062B63)
private val DeepBlue = Color(0xFF031A43)
private val BrightBlue = Color(0xFF0752D8)
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
    Box(Modifier.fillMaxSize().background(Color(0xFFF2F5FC))) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
            // Hero ITEMLI: degradado profundo, marca y ondas curvas como la referencia.
            Box(Modifier.fillMaxWidth().height(340.dp)) {
                Canvas(Modifier.fillMaxSize()) {
                    drawRect(brush = Brush.verticalGradient(listOf(Color(0xFF031A43), Color(0xFF0752A4))))
                    val wave1 = Path().apply {
                        moveTo(0f, size.height * .72f)
                        cubicTo(size.width * .20f, size.height * .55f, size.width * .42f, size.height * .92f, size.width, size.height * .53f)
                        lineTo(size.width, size.height)
                        lineTo(0f, size.height)
                        close()
                    }
                    drawPath(wave1, Color(0xFF087ACB).copy(alpha = .58f))
                    val wave2 = Path().apply {
                        moveTo(0f, size.height * .83f)
                        cubicTo(size.width * .28f, size.height * .65f, size.width * .52f, size.height * 1.02f, size.width, size.height * .70f)
                        lineTo(size.width, size.height)
                        lineTo(0f, size.height)
                        close()
                    }
                    drawPath(wave2, Color(0xFF18B9E8).copy(alpha = .88f))
                    drawCircle(Color.White.copy(alpha = .06f), size.minDimension * .38f, Offset(size.width * .92f, size.height * .28f))
                }
                Column(Modifier.fillMaxWidth().padding(horizontal = 25.dp, vertical = 22.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ItemliMark(Modifier.size(54.dp))
                        Column(Modifier.padding(start = 10.dp).weight(1f)) {
                            Text("ITEMLI", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                            Text("Reportes Empresariales", color = Color(0xFFD6E8FF), style = MaterialTheme.typography.labelSmall)
                        }
                        IconButton(onClick = onOpenSettings) {
                            Icon(Icons.Filled.Settings, contentDescription = "Configurar servidor", tint = Color.White)
                        }
                    }
                    Spacer(Modifier.height(31.dp))
                    Text("Bienvenido", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                    Text(
                        "Accede a tus reportes de forma\nrápida y segura",
                        color = Color(0xFFE7F1FF),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                    // Motivo gráfico decorativo del panel de bienvenida.
                    Row(
                        Modifier.align(Alignment.End).padding(top = 10.dp, end = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(7.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        listOf(22.dp, 38.dp, 56.dp).forEach { h ->
                            Box(Modifier.size(width = 15.dp, height = h).clip(RoundedCornerShape(4.dp)).background(Color(0xFF12BCEB)))
                        }
                    }
                }
            }
            Card(
                modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth().padding(horizontal = 17.dp).offset(y = (-28).dp),
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp, bottomStart = 25.dp, bottomEnd = 25.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
            ) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 25.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Iniciar Sesión", style = MaterialTheme.typography.titleLarge, color = Navy, fontWeight = FontWeight.Bold)
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
                        modifier = Modifier.fillMaxWidth().height(55.dp),
                        shape = RoundedCornerShape(17.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrightBlue),
                    ) {
                        if (state.isLoading) CircularProgressIndicator(color = Color.White)
                        else Text("Iniciar Sesión", fontWeight = FontWeight.Bold)
                    }
                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = Color(0xFFE7F7F1), shape = CircleShape, modifier = Modifier.size(23.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text("✓", color = Color(0xFF15945B), fontWeight = FontWeight.Bold) }
                        }
                        Text(" Conexión segura", color = MutedText, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Text(
                "Información confiable, siempre contigo",
                modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth().padding(horizontal = 20.dp).offset(y = (-12).dp).padding(bottom = 20.dp),
                color = MutedText,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun ItemliMark(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        val p1 = Path().apply {
            moveTo(w * .08f, h * .30f); lineTo(w * .62f, h * .02f); lineTo(w * .96f, h * .20f)
            lineTo(w * .42f, h * .49f); lineTo(w * .42f, h * .91f); lineTo(w * .08f, h * .72f); close()
        }
        val p2 = Path().apply {
            moveTo(w * .48f, h * .55f); lineTo(w * .94f, h * .31f); lineTo(w * .94f, h * .70f)
            lineTo(w * .42f, h * .98f); lineTo(w * .42f, h * .61f); close()
        }
        drawPath(p1, Color(0xFF13B8E8))
        drawPath(p2, Color(0xFF0875D1))
        drawPath(p2, Color.White.copy(alpha = .32f), style = Stroke(width = 1.5.dp.toPx()))
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
                    if (loading || status == DatabaseConnectionStatus.TESTING) CircularProgressIndicator(modifier = Modifier.padding(12.dp), strokeWidth = 2.dp)
                    else Text("⌄", color = Navy, modifier = Modifier.padding(horizontal = 14.dp))
                },
                singleLine = true,
                shape = RoundedCornerShape(15.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth(),
            )
            Box(Modifier.matchParentSize().padding(end = 46.dp).clickable { expanded = true })
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                bases.forEach { base ->
                    DropdownMenuItem(text = { Text(base.baseDatos) }, onClick = { expanded = false; onSelected(base) })
                }
                if (bases.isEmpty() && !loading) DropdownMenuItem(text = { Text("No hay bases disponibles") }, onClick = { expanded = false })
            }
        }
        if (statusText != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = statusColor, shape = CircleShape, modifier = Modifier.padding(start = 4.dp).size(7.dp)) {}
                Text(statusText, color = statusColor, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 7.dp))
            }
        }
        if (bases.isEmpty() && !loading) {
            Text("No se pudieron cargar las bases de datos.", color = MutedText, style = MaterialTheme.typography.bodySmall)
            Text("Volver a cargar", color = BrightBlue, style = MaterialTheme.typography.labelMedium, modifier = Modifier.clickable(onClick = onReload).padding(start = 4.dp))
        }
    }
}
