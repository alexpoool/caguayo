package com.itemli.mobile.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
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

/**
 * Contenedor adaptativo de navegación.
 *
 * - Compact  → NavigationBar inferior.
 * - Medium   → NavigationRail.
 * - Expanded → PermanentNavigationDrawer.
 *
 * Las pantallas no conocen este detalle; solo reciben callbacks.
 */
@Composable
fun AdaptiveAppScaffold(
    windowSizeClass: WindowSizeClass,
    currentRoute: String,
    onNavigate: (AppDestination) -> Unit,
    content: @Composable () -> Unit,
) {
    val mainDestinations = listOf(AppDestination.Reports, AppDestination.Settings)

    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> {
            Scaffold(bottomBar = {
                NavigationBar {
                    mainDestinations.forEach { dest ->
                        NavigationBarItem(
                            selected = currentRoute == dest.route,
                            onClick = { onNavigate(dest) },
                            icon = { dest.icon?.let { Icon(it, contentDescription = dest.label) } },
                            label = { Text(dest.label) },
                        )
                    }
                }
            }) { innerPadding ->
                Box(Modifier.padding(innerPadding)) { content() }
            }
        }
        WindowWidthSizeClass.Medium -> {
            Row(Modifier.fillMaxSize()) {
                NavigationRail {
                    mainDestinations.forEach { dest ->
                        NavigationRailItem(
                            selected = currentRoute == dest.route,
                            onClick = { onNavigate(dest) },
                            icon = { dest.icon?.let { Icon(it, contentDescription = dest.label) } },
                            label = { Text(dest.label) },
                        )
                    }
                }
                Box(Modifier.weight(1f)) { content() }
            }
        }
        else -> {
            PermanentNavigationDrawer(drawerContent = {
                NavigationDrawerItem(
                    label = { Text("Reportes") },
                    selected = currentRoute == AppDestination.Reports.route,
                    onClick = { onNavigate(AppDestination.Reports) },
                    icon = { Icon(Icons.Filled.List, contentDescription = null) },
                )
                NavigationDrawerItem(
                    label = { Text("Ajustes") },
                    selected = currentRoute == AppDestination.Settings.route,
                    onClick = { onNavigate(AppDestination.Settings) },
                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                )
            }) {
                Box(Modifier.fillMaxSize()) { content() }
            }
        }
    }
}
