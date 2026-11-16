package com.itemli.mobile.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Settings
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

/**
 * Navegación adaptativa y deliberadamente sencilla: el producto es un
 * cliente de reportes, por eso solo expone Informes y Ajustes.
 */
@Composable
fun AdaptiveAppScaffold(
    windowSizeClass: WindowSizeClass,
    currentRoute: String,
    onNavigate: (AppDestination) -> Unit,
    content: @Composable () -> Unit,
) {
    val mainDestinations = listOf(AppDestination.Reports, AppDestination.Settings)
    val selectedRoute = if (currentRoute.startsWith("report-detail")) {
        AppDestination.Reports.route
    } else currentRoute

    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> {
            Scaffold(
                containerColor = Color(0xFFF5F7FB),
                bottomBar = {
                    NavigationBar(
                        containerColor = Color.White,
                        contentColor = BrandPrimary,
                        tonalElevation = 8.dp,
                    ) {
                        mainDestinations.forEach { dest ->
                            NavigationBarItem(
                                selected = selectedRoute == dest.route,
                                onClick = { onNavigate(dest) },
                                icon = {
                                    Icon(
                                        if (dest == AppDestination.Reports) Icons.AutoMirrored.Filled.List else Icons.Filled.Settings,
                                        contentDescription = dest.label,
                                    )
                                },
                                label = { Text(if (dest == AppDestination.Reports) "Informes" else "Ajustes") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = BrandPrimary,
                                    selectedTextColor = BrandPrimary,
                                    indicatorColor = Color(0xFFEAF1FF),
                                    unselectedIconColor = Color(0xFF667085),
                                    unselectedTextColor = Color(0xFF667085),
                                ),
                            )
                        }
                    }
                },
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) { content() }
            }
        }
        WindowWidthSizeClass.Medium -> {
            Row(Modifier.fillMaxSize()) {
                NavigationRail(containerColor = Color.White) {
                    mainDestinations.forEach { dest ->
                        NavigationRailItem(
                            selected = selectedRoute == dest.route,
                            onClick = { onNavigate(dest) },
                            icon = {
                                Icon(
                                    if (dest == AppDestination.Reports) Icons.Filled.List else Icons.Filled.Settings,
                                    contentDescription = dest.label,
                                )
                            },
                            label = { Text(if (dest == AppDestination.Reports) "Informes" else "Ajustes") },
                        )
                    }
                }
                Box(Modifier.weight(1f)) { content() }
            }
        }
        else -> {
            PermanentNavigationDrawer(
                drawerContent = {
                    NavigationDrawerItem(
                        label = { Text("Informes") },
                        selected = selectedRoute == AppDestination.Reports.route,
                        onClick = { onNavigate(AppDestination.Reports) },
                        icon = { Icon(Icons.Filled.List, contentDescription = null) },
                    )
                    NavigationDrawerItem(
                        label = { Text("Ajustes") },
                        selected = selectedRoute == AppDestination.Settings.route,
                        onClick = { onNavigate(AppDestination.Settings) },
                        icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                    )
                },
            ) {
                Box(Modifier.fillMaxSize()) { content() }
            }
        }
    }
}
