package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.itemli.mobile.shared.infrastructure.SessionManager
import org.koin.core.context.GlobalContext
import com.itemli.mobile.features.reports.presentation.adaptive.HomeAdaptiveLayout

@Composable
fun HomeScreen(
    windowSizeClass: WindowSizeClass,
    onOpenReports: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val sessionManager = remember { GlobalContext.get().get<SessionManager>() }
    var alias by remember { mutableStateOf("Usuario") }
    LaunchedEffect(Unit) {
        alias = sessionManager.currentAlias()?.takeIf { it.isNotBlank() } ?: "Usuario"
    }
    HomeAdaptiveLayout(
        alias = alias,
        windowSizeClass = windowSizeClass,
        onOpenReports = onOpenReports,
        onLogout = onLogout,
    )
}
