package com.itemli.mobile.features.auth.presentation.screens

import androidx.compose.foundation.layout.Alignment
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.auth.presentation.adaptive.LoginAdaptiveLayout
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginViewModel
import org.koin.androidx.compose.koinViewModel

/**
 * Pantalla de login. Delega el layout al contenedor [LoginAdaptiveLayout].
 */
@Composable
fun LoginScreen(
    windowSizeClass: WindowSizeClass? = null,
    onLogged: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val viewModel: LoginViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()

    Box(Modifier.fillMaxSize()) {
        LoginAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onAliasChange = viewModel::onAliasChanged,
            onPasswordChange = viewModel::onPasswordChanged,
            onBaseChange = viewModel::onBaseSelected,
            onSearchBases = viewModel::searchBases,
            onSubmit = { viewModel.submit(onLogged) },
        )
        OutlinedButton(
            onClick = onOpenSettings,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
        ) {
            Text("Ajustes", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
