package com.itemli.mobile.features.reports.presentation.screens

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import com.itemli.mobile.features.reports.presentation.adaptive.HomeAdaptiveLayout

@Composable
fun HomeScreen(
    windowSizeClass: WindowSizeClass,
    onOpenReports: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    HomeAdaptiveLayout(onOpenReports = onOpenReports, onOpenSettings = onOpenSettings)
}
