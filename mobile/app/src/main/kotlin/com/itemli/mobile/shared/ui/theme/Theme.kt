package com.itemli.mobile.shared.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = androidx.compose.ui.graphics.Color(0xFFEAF1FF),
    onPrimaryContainer = BrandPrimaryDark,
    secondary = BrandSecondary,
    tertiary = BrandTertiary,
    background = SurfaceLight,
    onBackground = TextPrimary,
    surface = SurfaceCard,
    onSurface = TextPrimary,
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFFEEF2F7),
    onSurfaceVariant = TextSecondary,
    outline = OutlineSoft,
)

private val ColorDarkPrimary = androidx.compose.ui.graphics.Color(0xFF8CB4FF)

private val DarkColors = darkColorScheme(
    primary = ColorDarkPrimary,
    onPrimary = androidx.compose.ui.graphics.Color(0xFF071426),
    primaryContainer = androidx.compose.ui.graphics.Color(0xFF18345D),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFFD8E6FF),
    secondary = androidx.compose.ui.graphics.Color(0xFF67D3CD),
    onSecondary = androidx.compose.ui.graphics.Color(0xFF062D2B),
    tertiary = androidx.compose.ui.graphics.Color(0xFFB9A7FF),
    background = SurfaceDark,
    onBackground = androidx.compose.ui.graphics.Color(0xFFE7ECF4),
    surface = androidx.compose.ui.graphics.Color(0xFF182230),
    onSurface = androidx.compose.ui.graphics.Color(0xFFF2F4F7),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF263548),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFB5C0D0),
    outline = androidx.compose.ui.graphics.Color(0xFF52647A),
)

@Composable
fun ItemliTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ItemliTypography,
        content = content,
    )
}
