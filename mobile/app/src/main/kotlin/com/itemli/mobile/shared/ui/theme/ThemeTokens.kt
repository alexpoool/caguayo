package com.itemli.mobile.shared.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val BrandPrimary = Color(0xFF3B82F6)
val BrandSecondary = Color(0xFF10B981)
val BrandTertiary = Color(0xFF8B5CF6)
val SurfaceDark = Color(0xFF0F172A)
val SurfaceLight = Color(0xFFF8FAFC)

val ItemliTypography: Typography = Typography(
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
    ),
)
