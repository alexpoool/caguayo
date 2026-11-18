package com.itemli.mobile.features.auth.presentation.screens

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.itemli.mobile.features.auth.presentation.adaptive.LoginAdaptiveLayout
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginViewModel
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsViewModel
import com.itemli.mobile.shared.ui.components.SecureScreen
import org.koin.androidx.compose.koinViewModel

@Composable
fun LoginScreen(
    windowSizeClass: WindowSizeClass? = null,
    onLogged: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    SecureScreen()
    val viewModel: LoginViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()
    val settingsViewModel: SettingsViewModel = koinViewModel()
    val settingsState by settingsViewModel.state.collectAsState()
    var connectionFeedback by remember { mutableStateOf<String?>(null) }
    LoginAdaptiveLayout(
        windowSizeClass = windowSizeClass,
        state = state,
        onAliasChange = viewModel::onAliasChanged,
        onPasswordChange = viewModel::onPasswordChanged,
        onBaseChange = viewModel::onBaseSelected,
        onReloadBases = viewModel::loadDatabases,
        onSubmit = { viewModel.submit(onLogged) },
        serverUrl = settingsState.baseUrl,
        isSavingServer = settingsState.isLoading,
        isTestingServer = settingsState.isTesting,
        connectionFeedback = connectionFeedback,
        onServerUrlChange = settingsViewModel::onBaseUrlChange,
        onSaveServerUrl = {
            connectionFeedback = null
            settingsViewModel.save {
                settingsViewModel.testConnection { ok, message ->
                    connectionFeedback = if (ok) "Conexión correcta con el servidor" else "No se pudo conectar: $message"
                }
            }
        },
        onOpenSettings = {
            connectionFeedback = null
            settingsViewModel.load()
            onOpenSettings()
        },
    )
}
