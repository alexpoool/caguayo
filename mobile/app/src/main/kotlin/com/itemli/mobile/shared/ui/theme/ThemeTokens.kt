package com.itemli.mobile.shared.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Identidad visual ITEMLI: azul profundo, azul vivo y superficies frías.
val BrandPrimary = Color(0xFF155EEF)
val BrandPrimaryDark = Color(0xFF123B7A)
val BrandSecondary = Color(0xFF16A6A1)
val BrandTertiary = Color(0xFF7257D8)
val SurfaceDark = Color(0xFF101828)
val SurfaceLight = Color(0xFFF5F7FB)
val SurfaceCard = Color(0xFFFFFFFF)
val TextPrimary = Color(0xFF172B4D)
val TextSecondary = Color(0xFF667085)
val OutlineSoft = Color(0xFFE4EAF2)
val SuccessSoft = Color(0xFFE7F7F1)

val ItemliTypography: Typography = Typography(
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 36.sp,
        color = TextPrimary,
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 25.sp,
        lineHeight = 31.sp,
        color = TextPrimary,
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        color = TextPrimary,
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        color = TextPrimary,
    ),
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        lineHeight = 23.sp,
        color = TextPrimary,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = TextSecondary,
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
    ),
)
