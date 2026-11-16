package com.itemli.mobile.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

/** Destinos principales del cliente de reportes. */
sealed class AppDestination(val route: String, val label: String, val icon: ImageVector?) {
    data object Login : AppDestination("login", "Acceso", null)
    data object Home : AppDestination("home", "Inicio", Icons.Filled.Home)
    data object Reports : AppDestination("reports", "Informes", Icons.AutoMirrored.Filled.List)
    data object Settings : AppDestination("settings", "Ajustes", Icons.Filled.Settings)
    data object ReportDetail : AppDestination("report-detail/{reportId}", "Detalle", null) {
        fun route(reportId: String) = "report-detail/$reportId"
    }
}
