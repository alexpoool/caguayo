package com.itemli.mobile.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Destinos de la navegación de primer nivel.
 * Las pantallas nunca conocen el modo de navegación: solo este archivo y
 * [AdaptiveAppScaffold].
 */
sealed class AppDestination(val route: String, val label: String, val icon: ImageVector?) {
    data object Login : AppDestination("login", "Login", null)
    data object Reports : AppDestination("reports", "Reportes", Icons.Filled.Description)
    data object Settings : AppDestination("settings", "Ajustes", Icons.Filled.Settings)

    /** Detalle de un reporte, no se muestra en la navegación principal. */
    data object ReportDetail : AppDestination("report-detail/{reportId}", "Detalle", null) {
        fun route(reportId: String) = "report-detail/$reportId"
    }
}
