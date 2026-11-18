package com.itemli.mobile.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.PermanentNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.itemli.mobile.shared.ui.theme.BrandPrimary

/** Navegación adaptativa: Inicio, Informes y Ajustes. */
@Composable
fun AdaptiveAppScaffold(
    windowSizeClass: WindowSizeClass,
    currentRoute: String,
    onNavigate: (AppDestination) -> Unit,
    content: @Composable () -> Unit,
) {
    val destinations = if (currentRoute == AppDestination.Login.route) emptyList() else
        listOf(AppDestination.Home, AppDestination.Reports, AppDestination.History, AppDestination.Settings)
    val selectedRoute = if (currentRoute.startsWith("report-detail")) {
        AppDestination.Reports.route
    } else currentRoute

    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> Scaffold(
            containerColor = Color(0xFFF5F7FB),
            bottomBar = {
                if (destinations.isNotEmpty()) {
                    NavigationBar(containerColor = Color.White, contentColor = BrandPrimary, tonalElevation = 8.dp) {
                        destinations.forEach { dest ->
                            NavigationBarItem(
                                selected = selectedRoute == dest.route,
                                onClick = { onNavigate(dest) },
                                icon = { dest.icon?.let { Icon(it, contentDescription = dest.label) } },
                                label = { Text(dest.label) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = BrandPrimary, selectedTextColor = BrandPrimary,
                                    indicatorColor = Color(0xFFEAF1FF),
                                    unselectedIconColor = Color(0xFF667085), unselectedTextColor = Color(0xFF667085),
                                ),
                            )
                        }
                    }
                }
            },
        ) { padding -> Box(Modifier.padding(padding)) { content() } }
        WindowWidthSizeClass.Medium -> Row(Modifier.fillMaxSize()) {
            if (destinations.isNotEmpty()) {
                NavigationRail(containerColor = Color.White) {
                    destinations.forEach { dest ->
                        NavigationRailItem(
                            selected = selectedRoute == dest.route,
                            onClick = { onNavigate(dest) },
                            icon = { dest.icon?.let { Icon(it, contentDescription = dest.label) } },
                            label = { Text(dest.label) },
                        )
                    }
                }
            }
            Box(Modifier.weight(1f)) { content() }
        }
        else -> PermanentNavigationDrawer(
            drawerContent = {
                destinations.forEach { dest ->
                    NavigationDrawerItem(
                        label = { Text(dest.label) },
                        selected = selectedRoute == dest.route,
                        onClick = { onNavigate(dest) },
                        icon = { dest.icon?.let { Icon(it, contentDescription = null) } },
                    )
                }
            },
        ) { Box(Modifier.fillMaxSize()) { content() } }
    }
}
