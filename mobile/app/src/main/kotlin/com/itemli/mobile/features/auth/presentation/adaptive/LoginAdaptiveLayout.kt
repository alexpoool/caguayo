package com.itemli.mobile.features.auth.presentation.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.presentation.components.LoginForm
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginUiState

/**
 * Layout adaptativo del login.
 *
 * El contenido del formulario es el mismo en los tres breakpoints; lo único que
 * cambia es el contenedor (ancho y padding). El login no usa list-detail.
 */
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
    val maxWidth = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Expanded -> 600.dp
        else -> 480.dp
    }
    val horizontalPadding = when (windowSizeClass?.widthSizeClass) {
        WindowWidthSizeClass.Compact -> 16.dp
        WindowWidthSizeClass.Medium -> 32.dp
        else -> 48.dp
    }

    Box(
        modifier = Modifier.fillMaxSize().padding(horizontal = horizontalPadding),
        contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = maxWidth)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Bienvenido a Itemli",
                style = MaterialTheme.typography.headlineMedium,
            )
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
}

@Composable
private fun BasePicker(
    bases: List<DependenciaRef>,
    selected: DependenciaRef?,
    onSelected: (DependenciaRef?) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
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
