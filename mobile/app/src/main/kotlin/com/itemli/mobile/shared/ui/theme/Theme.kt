package com.itemli.mobile.shared.ui.theme

import androidx.compose.material3.MaterialTheme
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

/** Tema fijo claro de ITEMLI. */
@Composable
fun ItemliTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = ItemliTypography,
        content = content,
    )
}
