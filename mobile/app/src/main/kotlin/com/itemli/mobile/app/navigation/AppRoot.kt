package com.itemli.mobile.app.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.itemli.mobile.features.auth.presentation.screens.LoginScreen
import com.itemli.mobile.features.reports.presentation.screens.ReportDetailScreen
import com.itemli.mobile.features.reports.presentation.screens.ReportsCatalogScreen
import com.itemli.mobile.features.settings.presentation.screens.SettingsScreen

/**
 * Raíz de navegación. Une [AdaptiveAppScaffold] con el [NavHost].
 *
 * Las features llamadas aquí son las de presentación de la feature que corresponde.
 */
@Composable
fun AppRoot(
    windowSizeClass: WindowSizeClass,
    startDestination: String = AppDestination.Login.route,
) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: startDestination

    AdaptiveAppScaffold(
        windowSizeClass = windowSizeClass,
        currentRoute = currentRoute,
        onNavigate = { dest ->
            navController.navigate(dest.route) { launchSingleTop = true }
        },
    ) {
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.fillMaxSize(),
        ) {
            composable(AppDestination.Login.route) {
                LoginScreen(
                    windowSizeClass = windowSizeClass,
                    onLogged = {
                        navController.navigate(AppDestination.Reports.route) {
                            popUpTo(AppDestination.Login.route) { inclusive = true }
                        }
                    },
                    onOpenSettings = { navController.navigate(AppDestination.Settings.route) },
                )
            }

            composable(AppDestination.Reports.route) {
                ReportsCatalogScreen(
                    windowSizeClass = windowSizeClass,
                    onOpenReport = { reportId ->
                        navController.navigate(AppDestination.ReportDetail.route(reportId))
                    },
                )
            }

            composable(
                AppDestination.ReportDetail.route,
                arguments = listOf(navArgument("reportId") { defaultValue = "" }),
            ) { entry ->
                val reportId = entry.arguments?.getString("reportId").orEmpty()
                ReportDetailScreen(
                    windowSizeClass = windowSizeClass,
                    reportId = reportId,
                )
            }

            composable(AppDestination.Settings.route) {
                SettingsScreen(
                    windowSizeClass = windowSizeClass,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
