package com.itemli.mobile.features.auth.presentation.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.presentation.components.LoginForm
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginUiState
import com.itemli.mobile.shared.ui.theme.BrandPrimary
import com.itemli.mobile.shared.ui.theme.TextSecondary

/** Acceso adaptativo al cliente de reportes ITEMLI. */
@Composable
fun LoginAdaptiveLayout(
    windowSizeClass: WindowSizeClass?,
    state: LoginUiState,
    onAliasChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onBaseChange: (DependenciaRef?) -> Unit,
    onSearchBases: () -> Unit,
    onSubmit: () -> Unit,
) {
    val maxWidth = if (windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Expanded) 560.dp else 460.dp
    val horizontalPadding = if (windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Compact) 22.dp else 32.dp

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF5F7FB))
            .padding(horizontal = horizontalPadding),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = Color(0xFFEAF1FF),
                ) {
                    Icon(
                        Icons.Filled.Description,
                        contentDescription = "ITEMLI Reportes",
                        tint = BrandPrimary,
                        modifier = Modifier.padding(14.dp),
                    )
                }
                Text("ITEMLI", style = MaterialTheme.typography.titleLarge, color = BrandPrimary)
                Text("Tus reportes, en un solo lugar", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Accede de forma segura a la información de tu organización.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            }

            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Iniciar sesión", style = MaterialTheme.typography.titleLarge)
                    LoginForm(
                        alias = state.alias,
                        password = state.password,
                        isLoading = state.isLoading,
                        onAliasChanged = onAliasChange,
                        onPasswordChanged = onPasswordChange,
                        onSearchBases = onSearchBases,
                        onSubmit = onSubmit,
                    )
                    if (state.bases.isNotEmpty()) {
                        BasePicker(
                            bases = state.bases,
                            selected = state.selectedBase,
                            onSelected = onBaseChange,
                        )
                    }
                    state.error?.let {
                        Text(text = it, color = MaterialTheme.colorScheme.error)
                    }
                }
            }
            Text(
                "Conexión segura · Consulta y descarga de informes",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
            )
        }
    }
}

@Composable
private fun BasePicker(
    bases: List<DependenciaRef>,
    selected: DependenciaRef?,
    onSelected: (DependenciaRef?) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Selecciona una dependencia", style = MaterialTheme.typography.titleMedium)
        bases.forEach { base ->
            OutlinedButton(
                onClick = { onSelected(base) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("${base.nombre} (base: ${base.baseDatos})")
            }
        }
    }
}
