package com.itemli.mobile.features.auth.presentation.screens

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.itemli.mobile.features.auth.presentation.adaptive.LoginAdaptiveLayout
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginViewModel
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
    LoginAdaptiveLayout(
        windowSizeClass = windowSizeClass,
        state = state,
        onAliasChange = viewModel::onAliasChanged,
        onPasswordChange = viewModel::onPasswordChanged,
        onBaseChange = viewModel::onBaseSelected,
        onReloadBases = viewModel::loadDatabases,
        onSubmit = { viewModel.submit(onLogged) },
        onOpenSettings = onOpenSettings,
    )
}
