package com.itemli.mobile.shared.ui.adaptive

import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.WindowSizeClass

/**
 * Small helpers around WindowSizeClass used across features.
 */
val WindowSizeClass.isCompact: Boolean
    get() = widthSizeClass == WindowWidthSizeClass.Compact

val WindowSizeClass.isMedium: Boolean
    get() = widthSizeClass == WindowWidthSizeClass.Medium

val WindowSizeClass.isExpanded: Boolean
    get() = widthSizeClass == WindowWidthSizeClass.Expanded
