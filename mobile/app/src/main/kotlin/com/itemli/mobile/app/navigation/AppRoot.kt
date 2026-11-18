package com.itemli.mobile.app.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.itemli.mobile.features.auth.presentation.screens.LoginScreen
import com.itemli.mobile.features.reports.presentation.screens.HomeScreen
import com.itemli.mobile.features.reports.presentation.screens.HistoryScreen
import com.itemli.mobile.features.reports.presentation.screens.ReportDetailScreen
import com.itemli.mobile.features.reports.presentation.screens.ReportsCatalogScreen
import com.itemli.mobile.features.settings.presentation.screens.SettingsScreen
import com.itemli.mobile.shared.infrastructure.SessionManager
import com.itemli.mobile.shared.ui.components.LoadingView
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

@Composable
fun ItemliAppRoot(windowSizeClass: WindowSizeClass) {
    val sessionManager = remember { GlobalContext.get().get<SessionManager>() }
    var startDestination by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        startDestination = if (sessionManager.currentToken() != null) {
            AppDestination.Home.route
        } else AppDestination.Login.route
    }
    when (val destination = startDestination) {
        null -> LoadingView("Cargando…")
        else -> AppRoot(windowSizeClass = windowSizeClass, startDestination = destination)
    }
}

@Composable
fun AppRoot(
    windowSizeClass: WindowSizeClass,
    startDestination: String = AppDestination.Login.route,
) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: startDestination
    val sessionManager = remember { GlobalContext.get().get<SessionManager>() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        sessionManager.sessionCleared.collectLatest {
            navController.navigate(AppDestination.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    AdaptiveAppScaffold(
        windowSizeClass = windowSizeClass,
        currentRoute = currentRoute,
        onNavigate = { dest -> navController.navigate(dest.route) { launchSingleTop = true } },
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
                        navController.navigate(AppDestination.Home.route) {
                            popUpTo(AppDestination.Login.route) { inclusive = true }
                        }
                    },
                    onOpenSettings = { /* El engranaje del login abre el diálogo local de URL. */ },
                )
            }
            composable(AppDestination.Home.route) {
                HomeScreen(
                    windowSizeClass = windowSizeClass,
                    onOpenReports = { module -> navController.navigate(AppDestination.Reports.route(module)) },
                    onLogout = { coroutineScope.launch { sessionManager.logout() } },
                )
            }
            composable(
                AppDestination.Reports.route,
                arguments = listOf(navArgument("module") { nullable = true; defaultValue = null }),
            ) { entry ->
                ReportsCatalogScreen(
                    windowSizeClass = windowSizeClass,
                    initialModule = entry.arguments?.getString("module"),
                    onOpenReport = { reportId ->
                        navController.navigate(AppDestination.ReportDetail.route(reportId))
                    },
                )
            }
            composable(
                AppDestination.ReportDetail.route,
                arguments = listOf(navArgument("reportId") { defaultValue = "" }),
            ) { entry ->
                ReportDetailScreen(
                    windowSizeClass = windowSizeClass,
                    reportId = entry.arguments?.getString("reportId").orEmpty(),
                )
            }
            composable(AppDestination.History.route) {
                HistoryScreen()
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
