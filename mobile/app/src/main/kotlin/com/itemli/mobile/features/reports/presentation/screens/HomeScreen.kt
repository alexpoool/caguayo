package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import com.itemli.mobile.features.reports.presentation.adaptive.HomeAdaptiveLayout

@Composable
fun HomeScreen(
    windowSizeClass: WindowSizeClass,
    onOpenReports: (String) -> Unit,
    onLogout: () -> Unit,
) {
    HomeAdaptiveLayout(onOpenReports = onOpenReports, onLogout = onLogout)
}
